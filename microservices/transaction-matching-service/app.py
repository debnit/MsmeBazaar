from libs.db.session import get_db
"""
Transaction Matching Service for MSMEBazaar v2.0
Intelligent matching of buyers and sellers based on requirements and offerings
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import json
import math

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import asyncpg
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import structlog
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from fuzzywuzzy import fuzz, process
import aiofiles

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/msmebazaar")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Initialize FastAPI app
app = FastAPI(
    title="Transaction Matching Service",
    description="Intelligent buyer-seller matching for MSMEBazaar platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
matching_requests_counter = Counter(
    'matching_requests_total',
    'Total number of matching requests',
    ['match_type', 'status']
)

matching_latency_histogram = Histogram(
    'matching_latency_seconds',
    'Matching request latency in seconds',
    ['match_type']
)

successful_matches_gauge = Gauge(
    'successful_matches_total',
    'Total number of successful matches',
    ['category']
)

# Pydantic models
class BuyerRequirement(BaseModel):
    buyer_id: str
    requirement_id: str
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location: str
    preferred_locations: List[str] = []
    quantity: Optional[int] = None
    unit: Optional[str] = None
    delivery_timeline: Optional[str] = None
    quality_requirements: List[str] = []
    certifications_required: List[str] = []
    tags: List[str] = []
    created_at: datetime

class SellerOffering(BaseModel):
    seller_id: str
    offering_id: str
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    location: str
    service_areas: List[str] = []
    capacity: Optional[int] = None
    unit: Optional[str] = None
    delivery_capability: Optional[str] = None
    certifications: List[str] = []
    quality_standards: List[str] = []
    tags: List[str] = []
    rating: Optional[float] = None
    created_at: datetime

class MatchRequest(BaseModel):
    type: str = Field(..., description="Type of match: 'buyer_to_seller' or 'seller_to_buyer'")
    entity_id: str = Field(..., description="ID of buyer requirement or seller offering")
    limit: int = Field(default=10, description="Maximum number of matches to return")
    filters: Optional[Dict[str, Any]] = None
    include_scores: bool = Field(default=True, description="Include match scores in response")

class MatchResult(BaseModel):
    match_id: str
    buyer_requirement: Optional[BuyerRequirement] = None
    seller_offering: Optional[SellerOffering] = None
    match_score: float
    match_factors: Dict[str, float]
    confidence_level: str
    estimated_success_probability: float
    match_reasons: List[str]
    potential_issues: List[str] = []
    created_at: datetime

class MatchingStats(BaseModel):
    total_matches_today: int
    successful_transactions: int
    average_match_score: float
    top_categories: List[Dict[str, Any]]
    matching_success_rate: float

# Database connection
async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

# Redis connection
async def get_redis_connection():
    """Get Redis connection"""
    return redis.from_url(REDIS_URL)

class TransactionMatcher:
    """Core transaction matching engine"""
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.scaler = StandardScaler()
        self.redis_client = None
        
    async def initialize(self):
        """Initialize the matcher with Redis connection"""
        self.redis_client = await get_redis_connection()
        
    async def find_matches(
        self,
        requirement: BuyerRequirement,
        offerings: List[SellerOffering],
        limit: int = 10
    ) -> List[MatchResult]:
        """Find best matching sellers for a buyer requirement"""
        
        if not offerings:
            return []
            
        matches = []
        
        for offering in offerings:
            match_score, match_factors = await self._calculate_match_score(
                requirement, offering
            )
            
            if match_score > 0.3:  # Minimum threshold for matching
                match_result = MatchResult(
                    match_id=f"{requirement.requirement_id}_{offering.offering_id}",
                    buyer_requirement=requirement,
                    seller_offering=offering,
                    match_score=match_score,
                    match_factors=match_factors,
                    confidence_level=self._get_confidence_level(match_score),
                    estimated_success_probability=self._estimate_success_probability(
                        match_score, match_factors
                    ),
                    match_reasons=self._generate_match_reasons(match_factors),
                    potential_issues=self._identify_potential_issues(
                        requirement, offering, match_factors
                    ),
                    created_at=datetime.now()
                )
                matches.append(match_result)
        
        # Sort by match score and return top matches
        matches.sort(key=lambda x: x.match_score, reverse=True)
        return matches[:limit]
    
    async def find_reverse_matches(
        self,
        offering: SellerOffering,
        requirements: List[BuyerRequirement],
        limit: int = 10
    ) -> List[MatchResult]:
        """Find best matching buyers for a seller offering"""
        
        if not requirements:
            return []
            
        matches = []
        
        for requirement in requirements:
            match_score, match_factors = await self._calculate_match_score(
                requirement, offering
            )
            
            if match_score > 0.3:  # Minimum threshold for matching
                match_result = MatchResult(
                    match_id=f"{requirement.requirement_id}_{offering.offering_id}",
                    buyer_requirement=requirement,
                    seller_offering=offering,
                    match_score=match_score,
                    match_factors=match_factors,
                    confidence_level=self._get_confidence_level(match_score),
                    estimated_success_probability=self._estimate_success_probability(
                        match_score, match_factors
                    ),
                    match_reasons=self._generate_match_reasons(match_factors),
                    potential_issues=self._identify_potential_issues(
                        requirement, offering, match_factors
                    ),
                    created_at=datetime.now()
                )
                matches.append(match_result)
        
        # Sort by match score and return top matches
        matches.sort(key=lambda x: x.match_score, reverse=True)
        return matches[:limit]
    
    async def _calculate_match_score(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> Tuple[float, Dict[str, float]]:
        """Calculate comprehensive match score between requirement and offering"""
        
        factors = {}
        
        # 1. Category and subcategory match (25% weight)
        category_score = self._calculate_category_match(requirement, offering)
        factors['category_match'] = category_score
        
        # 2. Text similarity (20% weight)
        text_score = await self._calculate_text_similarity(requirement, offering)
        factors['text_similarity'] = text_score
        
        # 3. Price/budget compatibility (20% weight)
        price_score = self._calculate_price_compatibility(requirement, offering)
        factors['price_compatibility'] = price_score
        
        # 4. Location compatibility (15% weight)
        location_score = self._calculate_location_compatibility(requirement, offering)
        factors['location_compatibility'] = location_score
        
        # 5. Quantity/capacity match (10% weight)
        quantity_score = self._calculate_quantity_match(requirement, offering)
        factors['quantity_match'] = quantity_score
        
        # 6. Quality and certification match (10% weight)
        quality_score = self._calculate_quality_match(requirement, offering)
        factors['quality_match'] = quality_score
        
        # Calculate weighted overall score
        weights = {
            'category_match': 0.25,
            'text_similarity': 0.20,
            'price_compatibility': 0.20,
            'location_compatibility': 0.15,
            'quantity_match': 0.10,
            'quality_match': 0.10
        }
        
        overall_score = sum(factors[key] * weights[key] for key in factors)
        
        return overall_score, factors
    
    def _calculate_category_match(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate category match score"""
        
        # Exact category match
        if requirement.category.lower() == offering.category.lower():
            category_score = 1.0
        else:
            # Fuzzy category match
            category_score = fuzz.ratio(
                requirement.category.lower(),
                offering.category.lower()
            ) / 100.0
        
        # Subcategory bonus
        subcategory_score = 0.0
        if requirement.subcategory and offering.subcategory:
            if requirement.subcategory.lower() == offering.subcategory.lower():
                subcategory_score = 0.2
            else:
                subcategory_score = fuzz.ratio(
                    requirement.subcategory.lower(),
                    offering.subcategory.lower()
                ) / 100.0 * 0.2
        
        return min(1.0, category_score + subcategory_score)
    
    async def _calculate_text_similarity(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate text similarity between requirement and offering descriptions"""
        
        try:
            # Combine title and description for both
            req_text = f"{requirement.title} {requirement.description}"
            off_text = f"{offering.title} {offering.description}"
            
            # Use TF-IDF for semantic similarity
            texts = [req_text, off_text]
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarity_matrix = cosine_similarity(tfidf_matrix)
            similarity_score = similarity_matrix[0][1]
            
            # Add tag similarity bonus
            tag_similarity = self._calculate_tag_similarity(
                requirement.tags, offering.tags
            )
            
            return min(1.0, similarity_score + tag_similarity * 0.1)
            
        except Exception as e:
            logger.warning("Text similarity calculation failed", error=str(e))
            return 0.5  # Default score
    
    def _calculate_price_compatibility(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate price/budget compatibility score"""
        
        # If no budget/price info available, return neutral score
        if (not requirement.budget_min and not requirement.budget_max and
            not offering.price_min and not offering.price_max):
            return 0.7
        
        # Extract budget and price ranges
        req_min = requirement.budget_min or 0
        req_max = requirement.budget_max or float('inf')
        off_min = offering.price_min or 0
        off_max = offering.price_max or float('inf')
        
        # Calculate overlap
        overlap_min = max(req_min, off_min)
        overlap_max = min(req_max, off_max)
        
        if overlap_min <= overlap_max:
            # There's an overlap - calculate how much
            req_range = req_max - req_min if req_max != float('inf') else req_min * 2
            off_range = off_max - off_min if off_max != float('inf') else off_min * 2
            overlap_size = overlap_max - overlap_min
            
            if req_range > 0 and off_range > 0:
                compatibility = min(
                    overlap_size / req_range,
                    overlap_size / off_range
                )
                return min(1.0, compatibility)
            else:
                return 1.0  # Perfect match if ranges are points
        else:
            # No overlap - calculate distance penalty
            if req_max < off_min:
                # Budget too low
                gap = off_min - req_max
                penalty = gap / (req_max if req_max > 0 else 1)
            else:
                # Budget too high (less of an issue)
                gap = req_min - off_max
                penalty = gap / (off_max if off_max > 0 else 1)
            
            return max(0.0, 1.0 - penalty)
    
    def _calculate_location_compatibility(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate location compatibility score"""
        
        # Exact location match
        if requirement.location.lower() == offering.location.lower():
            return 1.0
        
        # Check if buyer's location is in seller's service areas
        if offering.service_areas:
            for area in offering.service_areas:
                if (requirement.location.lower() in area.lower() or
                    area.lower() in requirement.location.lower()):
                    return 0.9
        
        # Check if seller's location is in buyer's preferred locations
        if requirement.preferred_locations:
            for pref_loc in requirement.preferred_locations:
                if (offering.location.lower() in pref_loc.lower() or
                    pref_loc.lower() in offering.location.lower()):
                    return 0.8
        
        # Fuzzy location matching
        location_similarity = fuzz.ratio(
            requirement.location.lower(),
            offering.location.lower()
        ) / 100.0
        
        return location_similarity * 0.6  # Reduced score for fuzzy matches
    
    def _calculate_quantity_match(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate quantity/capacity match score"""
        
        # If no quantity info, return neutral score
        if not requirement.quantity or not offering.capacity:
            return 0.7
        
        # Check unit compatibility
        if requirement.unit and offering.unit:
            if requirement.unit.lower() != offering.unit.lower():
                return 0.3  # Unit mismatch penalty
        
        # Calculate capacity match
        if offering.capacity >= requirement.quantity:
            # Seller can fulfill requirement
            if offering.capacity <= requirement.quantity * 2:
                return 1.0  # Perfect range
            else:
                # Overcapacity (might be expensive)
                return 0.8
        else:
            # Seller cannot fully fulfill
            partial_fulfillment = offering.capacity / requirement.quantity
            return partial_fulfillment * 0.6
    
    def _calculate_quality_match(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering
    ) -> float:
        """Calculate quality and certification match score"""
        
        score = 0.5  # Base score
        
        # Check required certifications
        if requirement.certifications_required:
            req_certs = set(cert.lower() for cert in requirement.certifications_required)
            off_certs = set(cert.lower() for cert in offering.certifications)
            
            if req_certs.issubset(off_certs):
                score += 0.3  # All required certifications met
            else:
                # Partial match
                matched_certs = len(req_certs.intersection(off_certs))
                score += 0.3 * (matched_certs / len(req_certs))
        
        # Check quality requirements
        if requirement.quality_requirements:
            req_quality = set(q.lower() for q in requirement.quality_requirements)
            off_quality = set(q.lower() for q in offering.quality_standards)
            
            if req_quality.issubset(off_quality):
                score += 0.2  # All quality requirements met
            else:
                # Partial match
                matched_quality = len(req_quality.intersection(off_quality))
                if len(req_quality) > 0:
                    score += 0.2 * (matched_quality / len(req_quality))
        
        return min(1.0, score)
    
    def _calculate_tag_similarity(self, tags1: List[str], tags2: List[str]) -> float:
        """Calculate similarity between tag lists"""
        
        if not tags1 or not tags2:
            return 0.0
        
        tags1_lower = set(tag.lower() for tag in tags1)
        tags2_lower = set(tag.lower() for tag in tags2)
        
        intersection = len(tags1_lower.intersection(tags2_lower))
        union = len(tags1_lower.union(tags2_lower))
        
        return intersection / union if union > 0 else 0.0
    
    def _get_confidence_level(self, score: float) -> str:
        """Get confidence level based on match score"""
        
        if score >= 0.8:
            return "high"
        elif score >= 0.6:
            return "medium"
        elif score >= 0.4:
            return "low"
        else:
            return "very_low"
    
    def _estimate_success_probability(
        self,
        match_score: float,
        match_factors: Dict[str, float]
    ) -> float:
        """Estimate probability of successful transaction"""
        
        # Base probability from match score
        base_prob = match_score * 0.8
        
        # Adjustments based on specific factors
        if match_factors.get('price_compatibility', 0) > 0.8:
            base_prob += 0.1
        
        if match_factors.get('location_compatibility', 0) > 0.8:
            base_prob += 0.05
        
        if match_factors.get('quality_match', 0) > 0.8:
            base_prob += 0.05
        
        return min(1.0, base_prob)
    
    def _generate_match_reasons(self, match_factors: Dict[str, float]) -> List[str]:
        """Generate human-readable match reasons"""
        
        reasons = []
        
        if match_factors.get('category_match', 0) > 0.8:
            reasons.append("Perfect category match")
        elif match_factors.get('category_match', 0) > 0.6:
            reasons.append("Good category alignment")
        
        if match_factors.get('price_compatibility', 0) > 0.8:
            reasons.append("Budget and pricing are well aligned")
        
        if match_factors.get('location_compatibility', 0) > 0.8:
            reasons.append("Excellent location compatibility")
        
        if match_factors.get('text_similarity', 0) > 0.7:
            reasons.append("Strong content and description match")
        
        if match_factors.get('quality_match', 0) > 0.8:
            reasons.append("Quality requirements fully met")
        
        if match_factors.get('quantity_match', 0) > 0.8:
            reasons.append("Quantity/capacity requirements satisfied")
        
        return reasons or ["Basic compatibility match"]
    
    def _identify_potential_issues(
        self,
        requirement: BuyerRequirement,
        offering: SellerOffering,
        match_factors: Dict[str, float]
    ) -> List[str]:
        """Identify potential issues with the match"""
        
        issues = []
        
        if match_factors.get('price_compatibility', 0) < 0.5:
            issues.append("Budget and pricing may not align well")
        
        if match_factors.get('location_compatibility', 0) < 0.6:
            issues.append("Location distance may impact delivery")
        
        if match_factors.get('quantity_match', 0) < 0.6:
            issues.append("Capacity constraints may limit fulfillment")
        
        if match_factors.get('quality_match', 0) < 0.7:
            issues.append("Some quality requirements may not be met")
        
        return issues

# Initialize matcher
matcher = TransactionMatcher()

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = await get_db_connection()
        await conn.close()
        
        # Check Redis connection
        redis_conn = await get_redis_connection()
        await redis_conn.ping()
        await redis_conn.close()
        
        return {"status": "healthy", "timestamp": datetime.now()}
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/api/match")
async def find_matches(match_request: MatchRequest):
    """Find matches for a buyer requirement or seller offering"""
    
    start_time = datetime.now()
    
    try:
        with matching_latency_histogram.labels(match_type=match_request.type).time():
            
            if match_request.type == "buyer_to_seller":
                matches = await _find_seller_matches(match_request)
            elif match_request.type == "seller_to_buyer":
                matches = await _find_buyer_matches(match_request)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid match type. Use 'buyer_to_seller' or 'seller_to_buyer'"
                )
            
            # Update metrics
            matching_requests_counter.labels(
                match_type=match_request.type,
                status="success"
            ).inc()
            
            # Store match results for analytics
            await _store_match_results(match_request, matches)
            
            return {
                "matches": matches,
                "total_matches": len(matches),
                "processing_time_ms": (datetime.now() - start_time).total_seconds() * 1000
            }
    
    except Exception as e:
        matching_requests_counter.labels(
            match_type=match_request.type,
            status="error"
        ).inc()
        
        logger.error("Matching failed", error=str(e), request=match_request.dict())
        raise HTTPException(status_code=500, detail="Matching process failed")

async def _find_seller_matches(match_request: MatchRequest) -> List[MatchResult]:
    """Find seller matches for a buyer requirement"""
    
    # Get buyer requirement
    requirement = await _get_buyer_requirement(match_request.entity_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="Buyer requirement not found")
    
    # Get potential seller offerings
    offerings = await _get_seller_offerings(
        category=requirement.category,
        filters=match_request.filters
    )
    
    # Find matches
    matches = await matcher.find_matches(requirement, offerings, match_request.limit)
    
    return [match.dict() for match in matches] if match_request.include_scores else [
        {
            "match_id": match.match_id,
            "seller_offering": match.seller_offering.dict(),
            "confidence_level": match.confidence_level,
            "match_reasons": match.match_reasons
        } for match in matches
    ]

async def _find_buyer_matches(match_request: MatchRequest) -> List[MatchResult]:
    """Find buyer matches for a seller offering"""
    
    # Get seller offering
    offering = await _get_seller_offering(match_request.entity_id)
    if not offering:
        raise HTTPException(status_code=404, detail="Seller offering not found")
    
    # Get potential buyer requirements
    requirements = await _get_buyer_requirements(
        category=offering.category,
        filters=match_request.filters
    )
    
    # Find matches
    matches = await matcher.find_reverse_matches(offering, requirements, match_request.limit)
    
    return [match.dict() for match in matches] if match_request.include_scores else [
        {
            "match_id": match.match_id,
            "buyer_requirement": match.buyer_requirement.dict(),
            "confidence_level": match.confidence_level,
            "match_reasons": match.match_reasons
        } for match in matches
    ]

@app.get("/api/matching_stats")
async def get_matching_stats():
    """Get matching statistics and metrics"""
    
    try:
        conn = await get_db_connection()
        
        # Get today's match count
        today_matches_query = """
        SELECT COUNT(*) as total_matches
        FROM transaction_matches
        WHERE created_at >= CURRENT_DATE
        """
        
        today_matches = await conn.fetchval(today_matches_query)
        
        # Get successful transactions
        success_transactions_query = """
        SELECT COUNT(*) as successful_transactions
        FROM transaction_matches tm
        JOIN transactions t ON tm.match_id = t.match_id
        WHERE tm.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND t.status = 'completed'
        """
        
        successful_transactions = await conn.fetchval(success_transactions_query) or 0
        
        # Get average match score
        avg_score_query = """
        SELECT AVG(match_score) as avg_score
        FROM transaction_matches
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        """
        
        avg_score = await conn.fetchval(avg_score_query) or 0.0
        
        # Get top categories
        top_categories_query = """
        SELECT category, COUNT(*) as match_count
        FROM transaction_matches
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY category
        ORDER BY match_count DESC
        LIMIT 5
        """
        
        top_categories_rows = await conn.fetch(top_categories_query)
        top_categories = [
            {"category": row["category"], "match_count": row["match_count"]}
            for row in top_categories_rows
        ]
        
        # Calculate success rate
        total_matches_30days = await conn.fetchval("""
        SELECT COUNT(*) FROM transaction_matches
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        """) or 1
        
        success_rate = successful_transactions / total_matches_30days * 100
        
        await conn.close()
        
        stats = MatchingStats(
            total_matches_today=today_matches or 0,
            successful_transactions=successful_transactions,
            average_match_score=float(avg_score),
            top_categories=top_categories,
            matching_success_rate=success_rate
        )
        
        return stats
    
    except Exception as e:
        logger.error("Failed to get matching stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

@app.get("/metrics")
async def get_prometheus_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

# Helper functions

async def _get_buyer_requirement(requirement_id: str) -> Optional[BuyerRequirement]:
    """Get buyer requirement by ID"""
    
    try:
        conn = await get_db_connection()
        
        query = """
        SELECT * FROM buyer_requirements
        WHERE requirement_id = $1 AND is_active = true
        """
        
        row = await conn.fetchrow(query, requirement_id)
        await conn.close()
        
        if row:
            return BuyerRequirement(
                buyer_id=row['buyer_id'],
                requirement_id=row['requirement_id'],
                title=row['title'],
                description=row['description'],
                category=row['category'],
                subcategory=row['subcategory'],
                budget_min=row['budget_min'],
                budget_max=row['budget_max'],
                location=row['location'],
                preferred_locations=json.loads(row['preferred_locations']) if row['preferred_locations'] else [],
                quantity=row['quantity'],
                unit=row['unit'],
                delivery_timeline=row['delivery_timeline'],
                quality_requirements=json.loads(row['quality_requirements']) if row['quality_requirements'] else [],
                certifications_required=json.loads(row['certifications_required']) if row['certifications_required'] else [],
                tags=json.loads(row['tags']) if row['tags'] else [],
                created_at=row['created_at']
            )
        
        return None
    
    except Exception as e:
        logger.error("Failed to get buyer requirement", error=str(e))
        return None

async def _get_seller_offering(offering_id: str) -> Optional[SellerOffering]:
    """Get seller offering by ID"""
    
    try:
        conn = await get_db_connection()
        
        query = """
        SELECT * FROM seller_offerings
        WHERE offering_id = $1 AND is_active = true
        """
        
        row = await conn.fetchrow(query, offering_id)
        await conn.close()
        
        if row:
            return SellerOffering(
                seller_id=row['seller_id'],
                offering_id=row['offering_id'],
                title=row['title'],
                description=row['description'],
                category=row['category'],
                subcategory=row['subcategory'],
                price_min=row['price_min'],
                price_max=row['price_max'],
                location=row['location'],
                service_areas=json.loads(row['service_areas']) if row['service_areas'] else [],
                capacity=row['capacity'],
                unit=row['unit'],
                delivery_capability=row['delivery_capability'],
                certifications=json.loads(row['certifications']) if row['certifications'] else [],
                quality_standards=json.loads(row['quality_standards']) if row['quality_standards'] else [],
                tags=json.loads(row['tags']) if row['tags'] else [],
                rating=row['rating'],
                created_at=row['created_at']
            )
        
        return None
    
    except Exception as e:
        logger.error("Failed to get seller offering", error=str(e))
        return None

async def _get_seller_offerings(
    category: str,
    filters: Optional[Dict[str, Any]] = None
) -> List[SellerOffering]:
    """Get seller offerings by category with optional filters"""
    
    try:
        conn = await get_db_connection()
        
        base_query = """
        SELECT * FROM seller_offerings
        WHERE category = $1 AND is_active = true
        """
        params = [category]
        
        # Apply filters
        if filters:
            if 'location' in filters:
                base_query += " AND (location ILIKE $2 OR service_areas::text ILIKE $2)"
                params.append(f"%{filters['location']}%")
            
            if 'max_price' in filters:
                base_query += f" AND (price_min <= ${len(params) + 1} OR price_min IS NULL)"
                params.append(filters['max_price'])
        
        base_query += " ORDER BY rating DESC NULLS LAST, created_at DESC LIMIT 100"
        
        rows = await conn.fetch(base_query, *params)
        await conn.close()
        
        offerings = []
        for row in rows:
            offerings.append(SellerOffering(
                seller_id=row['seller_id'],
                offering_id=row['offering_id'],
                title=row['title'],
                description=row['description'],
                category=row['category'],
                subcategory=row['subcategory'],
                price_min=row['price_min'],
                price_max=row['price_max'],
                location=row['location'],
                service_areas=json.loads(row['service_areas']) if row['service_areas'] else [],
                capacity=row['capacity'],
                unit=row['unit'],
                delivery_capability=row['delivery_capability'],
                certifications=json.loads(row['certifications']) if row['certifications'] else [],
                quality_standards=json.loads(row['quality_standards']) if row['quality_standards'] else [],
                tags=json.loads(row['tags']) if row['tags'] else [],
                rating=row['rating'],
                created_at=row['created_at']
            ))
        
        return offerings
    
    except Exception as e:
        logger.error("Failed to get seller offerings", error=str(e))
        return []

async def _get_buyer_requirements(
    category: str,
    filters: Optional[Dict[str, Any]] = None
) -> List[BuyerRequirement]:
    """Get buyer requirements by category with optional filters"""
    
    try:
        conn = await get_db_connection()
        
        base_query = """
        SELECT * FROM buyer_requirements
        WHERE category = $1 AND is_active = true
        """
        params = [category]
        
        # Apply filters
        if filters:
            if 'location' in filters:
                base_query += " AND (location ILIKE $2 OR preferred_locations::text ILIKE $2)"
                params.append(f"%{filters['location']}%")
            
            if 'min_budget' in filters:
                base_query += f" AND (budget_max >= ${len(params) + 1} OR budget_max IS NULL)"
                params.append(filters['min_budget'])
        
        base_query += " ORDER BY created_at DESC LIMIT 100"
        
        rows = await conn.fetch(base_query, *params)
        await conn.close()
        
        requirements = []
        for row in rows:
            requirements.append(BuyerRequirement(
                buyer_id=row['buyer_id'],
                requirement_id=row['requirement_id'],
                title=row['title'],
                description=row['description'],
                category=row['category'],
                subcategory=row['subcategory'],
                budget_min=row['budget_min'],
                budget_max=row['budget_max'],
                location=row['location'],
                preferred_locations=json.loads(row['preferred_locations']) if row['preferred_locations'] else [],
                quantity=row['quantity'],
                unit=row['unit'],
                delivery_timeline=row['delivery_timeline'],
                quality_requirements=json.loads(row['quality_requirements']) if row['quality_requirements'] else [],
                certifications_required=json.loads(row['certifications_required']) if row['certifications_required'] else [],
                tags=json.loads(row['tags']) if row['tags'] else [],
                created_at=row['created_at']
            ))
        
        return requirements
    
    except Exception as e:
        logger.error("Failed to get buyer requirements", error=str(e))
        return []

async def _store_match_results(
    match_request: MatchRequest,
    matches: List[Dict[str, Any]]
):
    """Store match results for analytics"""
    
    try:
        conn = await get_db_connection()
        
        for match in matches:
            query = """
            INSERT INTO transaction_matches 
            (match_id, entity_id, match_type, match_score, match_factors, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (match_id) DO NOTHING
            """
            
            await conn.execute(
                query,
                match['match_id'],
                match_request.entity_id,
                match_request.type,
                match.get('match_score', 0.0),
                json.dumps(match.get('match_factors', {})),
                datetime.now()
            )
        
        await conn.close()
        
    except Exception as e:
        logger.warning("Failed to store match results", error=str(e))

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("Transaction Matching Service starting up")
    await matcher.initialize()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Transaction Matching Service shutting down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)