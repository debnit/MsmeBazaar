"""
🎯 Buyer Scoring (Real-time Feedback Loops)
Real-time buyer behavior analysis and scoring system
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from dataclasses import dataclass
from enum import Enum
import redis
import asyncpg
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
import uvicorn
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
import joblib
import time
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BuyerActionType(str, Enum):
    PAGE_VIEW = "page_view"
    LISTING_VIEW = "listing_view"
    SEARCH = "search"
    FILTER = "filter"
    INTEREST_EXPRESSION = "interest_expression"
    CONTACT_SELLER = "contact_seller"
    DOCUMENT_DOWNLOAD = "document_download"
    VALUATION_REQUEST = "valuation_request"
    SHORTLIST = "shortlist"
    REMOVE_SHORTLIST = "remove_shortlist"

@dataclass
class BuyerAction:
    buyer_id: str
    action_type: BuyerActionType
    msme_id: Optional[str] = None
    session_id: str = ""
    timestamp: datetime = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}

class BuyerScoreRequest(BaseModel):
    buyer_id: str
    action_type: BuyerActionType
    msme_id: Optional[str] = None
    session_id: str = ""
    metadata: Dict[str, Any] = {}

class BuyerScoreResponse(BaseModel):
    buyer_id: str
    score: float
    segment: str
    intent_level: str
    recommendations: List[str]
    updated_at: datetime

class BuyerSegment(str, Enum):
    EXPLORER = "explorer"  # Just browsing
    EVALUATOR = "evaluator"  # Serious consideration
    READY_BUYER = "ready_buyer"  # High purchase intent
    DORMANT = "dormant"  # Inactive

class BuyerScoringEngine:
    def __init__(self):
        self.redis_client = None
        self.db_pool = None
        self.scaler = StandardScaler()
        self.classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.clustering_model = KMeans(n_clusters=4, random_state=42)
        self.feature_columns = [
            'total_actions', 'unique_listings_viewed', 'avg_time_on_listing',
            'search_frequency', 'filter_usage', 'interest_expressions',
            'document_downloads', 'valuation_requests', 'session_frequency',
            'days_since_last_action', 'conversion_rate'
        ]
        self.action_weights = {
            BuyerActionType.PAGE_VIEW: 1.0,
            BuyerActionType.LISTING_VIEW: 2.0,
            BuyerActionType.SEARCH: 1.5,
            BuyerActionType.FILTER: 2.0,
            BuyerActionType.INTEREST_EXPRESSION: 10.0,
            BuyerActionType.CONTACT_SELLER: 8.0,
            BuyerActionType.DOCUMENT_DOWNLOAD: 5.0,
            BuyerActionType.VALUATION_REQUEST: 6.0,
            BuyerActionType.SHORTLIST: 4.0,
            BuyerActionType.REMOVE_SHORTLIST: -1.0
        }
    
    async def init_connections(self):
        """Initialize Redis and PostgreSQL connections"""
        try:
            self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            # Test Redis connection
            await asyncio.to_thread(self.redis_client.ping)
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            # Fallback to in-memory storage
            self.redis_client = {}
    
    async def track_action(self, action: BuyerAction):
        """Track buyer action in real-time"""
        action_data = {
            'buyer_id': action.buyer_id,
            'action_type': action.action_type.value,
            'msme_id': action.msme_id,
            'session_id': action.session_id,
            'timestamp': action.timestamp.isoformat(),
            'metadata': json.dumps(action.metadata)
        }
        
        # Store in Redis streams for real-time processing
        stream_key = f"buyer_actions:{action.buyer_id}"
        
        if hasattr(self.redis_client, 'xadd'):
            await asyncio.to_thread(self.redis_client.xadd, stream_key, action_data)
        else:
            # Fallback for in-memory storage
            if stream_key not in self.redis_client:
                self.redis_client[stream_key] = []
            self.redis_client[stream_key].append(action_data)
        
        # Update buyer profile
        await self.update_buyer_profile(action)
    
    async def update_buyer_profile(self, action: BuyerAction):
        """Update buyer profile with new action"""
        profile_key = f"buyer_profile:{action.buyer_id}"
        
        # Get current profile
        if hasattr(self.redis_client, 'hgetall'):
            profile = await asyncio.to_thread(self.redis_client.hgetall, profile_key)
        else:
            profile = self.redis_client.get(profile_key, {})
        
        # Update counters
        profile['total_actions'] = int(profile.get('total_actions', 0)) + 1
        profile['last_action_timestamp'] = action.timestamp.isoformat()
        
        # Action-specific updates
        if action.action_type == BuyerActionType.LISTING_VIEW:
            profile['listings_viewed'] = int(profile.get('listings_viewed', 0)) + 1
            
            # Track unique listings
            viewed_listings = profile.get('viewed_listings', '').split(',') if profile.get('viewed_listings') else []
            if action.msme_id and action.msme_id not in viewed_listings:
                viewed_listings.append(action.msme_id)
                profile['viewed_listings'] = ','.join(viewed_listings)
        
        elif action.action_type == BuyerActionType.INTEREST_EXPRESSION:
            profile['interest_expressions'] = int(profile.get('interest_expressions', 0)) + 1
        
        elif action.action_type == BuyerActionType.DOCUMENT_DOWNLOAD:
            profile['document_downloads'] = int(profile.get('document_downloads', 0)) + 1
        
        elif action.action_type == BuyerActionType.VALUATION_REQUEST:
            profile['valuation_requests'] = int(profile.get('valuation_requests', 0)) + 1
        
        # Save updated profile
        if hasattr(self.redis_client, 'hset'):
            await asyncio.to_thread(self.redis_client.hset, profile_key, mapping=profile)
        else:
            self.redis_client[profile_key] = profile
    
    async def calculate_buyer_score(self, buyer_id: str) -> BuyerScoreResponse:
        """Calculate comprehensive buyer score"""
        profile_key = f"buyer_profile:{buyer_id}"
        
        # Get buyer profile
        if hasattr(self.redis_client, 'hgetall'):
            profile = await asyncio.to_thread(self.redis_client.hgetall, profile_key)
        else:
            profile = self.redis_client.get(profile_key, {})
        
        if not profile:
            return BuyerScoreResponse(
                buyer_id=buyer_id,
                score=0.0,
                segment=BuyerSegment.EXPLORER,
                intent_level="low",
                recommendations=["Start exploring MSME listings"],
                updated_at=datetime.utcnow()
            )
        
        # Calculate feature vector
        features = self.extract_features(profile)
        
        # Calculate weighted score
        score = self.calculate_weighted_score(profile)
        
        # Determine segment
        segment = self.determine_segment(score, features)
        
        # Determine intent level
        intent_level = self.determine_intent_level(score, features)
        
        # Generate recommendations
        recommendations = self.generate_recommendations(segment, features, profile)
        
        return BuyerScoreResponse(
            buyer_id=buyer_id,
            score=score,
            segment=segment,
            intent_level=intent_level,
            recommendations=recommendations,
            updated_at=datetime.utcnow()
        )
    
    def extract_features(self, profile: Dict[str, Any]) -> Dict[str, float]:
        """Extract features from buyer profile"""
        features = {}
        
        # Basic activity metrics
        features['total_actions'] = float(profile.get('total_actions', 0))
        features['listings_viewed'] = float(profile.get('listings_viewed', 0))
        features['interest_expressions'] = float(profile.get('interest_expressions', 0))
        features['document_downloads'] = float(profile.get('document_downloads', 0))
        features['valuation_requests'] = float(profile.get('valuation_requests', 0))
        
        # Derived metrics
        viewed_listings = profile.get('viewed_listings', '').split(',') if profile.get('viewed_listings') else []
        features['unique_listings_viewed'] = len([l for l in viewed_listings if l])
        
        # Engagement ratios
        if features['total_actions'] > 0:
            features['interest_ratio'] = features['interest_expressions'] / features['total_actions']
            features['download_ratio'] = features['document_downloads'] / features['total_actions']
        else:
            features['interest_ratio'] = 0.0
            features['download_ratio'] = 0.0
        
        # Recency
        last_action = profile.get('last_action_timestamp')
        if last_action:
            last_action_dt = datetime.fromisoformat(last_action)
            features['days_since_last_action'] = (datetime.utcnow() - last_action_dt).days
        else:
            features['days_since_last_action'] = 999
        
        return features
    
    def calculate_weighted_score(self, profile: Dict[str, Any]) -> float:
        """Calculate weighted buyer score"""
        score = 0.0
        
        # Activity-based scoring
        score += float(profile.get('total_actions', 0)) * 0.1
        score += float(profile.get('listings_viewed', 0)) * 0.5
        score += float(profile.get('interest_expressions', 0)) * 5.0
        score += float(profile.get('document_downloads', 0)) * 2.0
        score += float(profile.get('valuation_requests', 0)) * 3.0
        
        # Recency decay
        last_action = profile.get('last_action_timestamp')
        if last_action:
            last_action_dt = datetime.fromisoformat(last_action)
            days_since = (datetime.utcnow() - last_action_dt).days
            decay_factor = max(0.1, 1 - (days_since / 30))  # 30-day decay
            score *= decay_factor
        
        return min(score, 100.0)  # Cap at 100
    
    def determine_segment(self, score: float, features: Dict[str, float]) -> BuyerSegment:
        """Determine buyer segment based on score and features"""
        if score >= 50 and features['interest_expressions'] > 0:
            return BuyerSegment.READY_BUYER
        elif score >= 20 and features['unique_listings_viewed'] >= 5:
            return BuyerSegment.EVALUATOR
        elif features['days_since_last_action'] > 30:
            return BuyerSegment.DORMANT
        else:
            return BuyerSegment.EXPLORER
    
    def determine_intent_level(self, score: float, features: Dict[str, float]) -> str:
        """Determine buyer intent level"""
        if score >= 60:
            return "high"
        elif score >= 30:
            return "medium"
        else:
            return "low"
    
    def generate_recommendations(self, segment: BuyerSegment, features: Dict[str, float], profile: Dict[str, Any]) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        if segment == BuyerSegment.READY_BUYER:
            recommendations.extend([
                "Contact our acquisition specialist for personalized assistance",
                "Schedule a site visit for your shortlisted businesses",
                "Review financing options for your preferred listings"
            ])
        
        elif segment == BuyerSegment.EVALUATOR:
            recommendations.extend([
                "Compare similar businesses in your preferred industry",
                "Download detailed financials for deeper analysis",
                "Use our valuation tool to assess fair market value"
            ])
        
        elif segment == BuyerSegment.EXPLORER:
            recommendations.extend([
                "Explore businesses in trending industries",
                "Set up search alerts for your preferred criteria",
                "Learn about the acquisition process in our guide"
            ])
        
        elif segment == BuyerSegment.DORMANT:
            recommendations.extend([
                "Check out new listings matching your previous interests",
                "Discover businesses with recent price reductions",
                "Schedule a call with our market experts"
            ])
        
        return recommendations

# Initialize scoring engine
scoring_engine = BuyerScoringEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize connections
    await scoring_engine.init_connections()
    yield

# FastAPI app
app = FastAPI(
    title="Buyer Scoring API",
    description="Real-time buyer behavior analysis and scoring",
    version="1.0.0",
    lifespan=lifespan
)

@app.post("/buyer/track", response_model=Dict[str, str])
async def track_buyer_action(request: BuyerScoreRequest, background_tasks: BackgroundTasks):
    """Track buyer action"""
    action = BuyerAction(
        buyer_id=request.buyer_id,
        action_type=request.action_type,
        msme_id=request.msme_id,
        session_id=request.session_id,
        metadata=request.metadata
    )
    
    background_tasks.add_task(scoring_engine.track_action, action)
    return {"status": "success", "message": "Action tracked"}

@app.get("/buyer/score/{buyer_id}", response_model=BuyerScoreResponse)
async def get_buyer_score(buyer_id: str):
    """Get buyer score and recommendations"""
    try:
        score_response = await scoring_engine.calculate_buyer_score(buyer_id)
        return score_response
    except Exception as e:
        logger.error(f"Error calculating buyer score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/buyer/analytics/{buyer_id}")
async def get_buyer_analytics(buyer_id: str):
    """Get detailed buyer analytics"""
    try:
        profile_key = f"buyer_profile:{buyer_id}"
        
        if hasattr(scoring_engine.redis_client, 'hgetall'):
            profile = await asyncio.to_thread(scoring_engine.redis_client.hgetall, profile_key)
        else:
            profile = scoring_engine.redis_client.get(profile_key, {})
        
        if not profile:
            return {"error": "Buyer profile not found"}
        
        features = scoring_engine.extract_features(profile)
        
        return {
            "buyer_id": buyer_id,
            "profile": profile,
            "features": features,
            "activity_summary": {
                "total_actions": profile.get('total_actions', 0),
                "listings_viewed": profile.get('listings_viewed', 0),
                "interest_expressions": profile.get('interest_expressions', 0),
                "last_activity": profile.get('last_action_timestamp')
            }
        }
    except Exception as e:
        logger.error(f"Error getting buyer analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/buyer/realtime/{buyer_id}")
async def buyer_realtime_updates(websocket: WebSocket, buyer_id: str):
    """WebSocket endpoint for real-time buyer updates"""
    await websocket.accept()
    
    try:
        while True:
            # Get current buyer score
            score_response = await scoring_engine.calculate_buyer_score(buyer_id)
            
            # Send score update
            await websocket.send_json({
                "type": "score_update",
                "data": score_response.dict()
            })
            
            # Wait for next update
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for buyer {buyer_id}")
    except Exception as e:
        logger.error(f"WebSocket error for buyer {buyer_id}: {e}")

@app.get("/buyer/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)