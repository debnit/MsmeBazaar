"""
Search & Matchmaking Service - ElasticSearch + Python ML
Handles buyer-seller matching, filtering, ranking
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import asyncpg
from datetime import datetime
import os
import requests
import json
from elasticsearch import AsyncElasticsearch
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import pandas as pd

app = FastAPI(title="Search & Matchmaking Service", description="Search and ML-based Matchmaking")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msme_search")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
LISTING_SERVICE_URL = os.getenv("LISTING_SERVICE_URL", "http://localhost:8003")

# Elasticsearch client
es = AsyncElasticsearch([ELASTICSEARCH_URL])

# Database connection
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# Authentication dependency
async def verify_token(authorization: str = None):
    """Verify JWT token with auth service"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        response = requests.post(
            f"{AUTH_SERVICE_URL}/validate-token",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

# Pydantic models
class SearchQuery(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = {}
    sort_by: Optional[str] = "relevance"
    page: int = 1
    per_page: int = 20
    
    @validator('per_page')
    def validate_per_page(cls, v):
        if v > 100:
            raise ValueError('per_page cannot exceed 100')
        return v

class MatchingPreferences(BaseModel):
    buyer_id: int
    preferred_business_types: List[str] = []
    preferred_industries: List[str] = []
    preferred_locations: List[str] = []
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_revenue: Optional[float] = None
    max_revenue: Optional[float] = None
    min_employees: Optional[int] = None
    max_employees: Optional[int] = None
    risk_tolerance: str = "medium"  # low, medium, high
    growth_preference: str = "stable"  # declining, stable, growing
    
class MLMatchingRequest(BaseModel):
    buyer_id: int
    limit: int = 10
    include_scores: bool = True
    
class SearchFilters(BaseModel):
    business_type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    price_range: Optional[Dict[str, float]] = None
    revenue_range: Optional[Dict[str, float]] = None
    employee_range: Optional[Dict[str, int]] = None
    establishment_year_range: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None

class MatchScore(BaseModel):
    msme_id: int
    buyer_id: int
    overall_score: float
    category_scores: Dict[str, float]
    match_reasons: List[str]
    confidence_level: str
    
class RankingFactors(BaseModel):
    relevance_weight: float = 0.3
    financial_weight: float = 0.25
    location_weight: float = 0.15
    industry_weight: float = 0.15
    growth_weight: float = 0.1
    risk_weight: float = 0.05

# ML Models and Utilities
class MatchingEngine:
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()
        self.model_trained = False
        
    async def train_model(self):
        """Train ML models with existing data"""
        try:
            # Fetch training data
            conn = await get_db_connection()
            
            # Get buyer preferences
            buyer_prefs = await conn.fetch(
                """
                SELECT buyer_id, preferred_business_types, preferred_industries,
                       preferred_locations, min_price, max_price, min_revenue,
                       max_revenue, risk_tolerance, growth_preference
                FROM buyer_preferences
                """
            )
            
            # Get MSME listings
            listings_response = requests.get(f"{LISTING_SERVICE_URL}/listings?limit=1000")
            if listings_response.status_code != 200:
                raise Exception("Failed to fetch listings")
            
            listings_data = listings_response.json()
            listings = listings_data.get("listings", [])
            
            if not listings:
                print("No listings found for training")
                return
            
            # Prepare text features
            text_features = []
            for listing in listings:
                text = f"{listing.get('company_name', '')} {listing.get('description', '')} {listing.get('industry', '')} {' '.join(listing.get('tags', []))}"
                text_features.append(text)
            
            # Fit TF-IDF vectorizer
            if text_features:
                self.tfidf_vectorizer.fit(text_features)
            
            # Prepare numerical features
            numerical_features = []
            for listing in listings:
                financial_data = listing.get('financial_data', {})
                features = [
                    listing.get('asking_price', 0),
                    financial_data.get('annual_revenue', 0),
                    financial_data.get('annual_profit', 0),
                    listing.get('establishment_year', 2020),
                    listing.get('operational_data', {}).get('employee_count', 0)
                ]
                numerical_features.append(features)
            
            # Fit scaler
            if numerical_features:
                self.scaler.fit(numerical_features)
            
            self.model_trained = True
            await conn.close()
            
        except Exception as e:
            print(f"Model training failed: {e}")
    
    def calculate_text_similarity(self, query_text: str, listing_texts: List[str]) -> List[float]:
        """Calculate text similarity using TF-IDF"""
        if not self.model_trained:
            return [0.0] * len(listing_texts)
        
        try:
            # Transform query and listings
            all_texts = [query_text] + listing_texts
            tfidf_matrix = self.tfidf_vectorizer.transform(all_texts)
            
            # Calculate cosine similarity
            query_vector = tfidf_matrix[0]
            listing_vectors = tfidf_matrix[1:]
            
            similarities = cosine_similarity(query_vector, listing_vectors).flatten()
            return similarities.tolist()
            
        except Exception as e:
            print(f"Text similarity calculation failed: {e}")
            return [0.0] * len(listing_texts)
    
    def calculate_numerical_similarity(self, buyer_prefs: Dict, listings: List[Dict]) -> List[float]:
        """Calculate numerical feature similarity"""
        if not self.model_trained:
            return [0.0] * len(listings)
        
        try:
            # Prepare buyer feature vector
            buyer_features = [
                buyer_prefs.get('max_price', 0),
                buyer_prefs.get('max_revenue', 0),
                buyer_prefs.get('max_revenue', 0) * 0.1,  # Expected profit
                2020,  # Current year preference
                buyer_prefs.get('max_employees', 0)
            ]
            
            # Prepare listing features
            listing_features = []
            for listing in listings:
                financial_data = listing.get('financial_data', {})
                features = [
                    listing.get('asking_price', 0),
                    financial_data.get('annual_revenue', 0),
                    financial_data.get('annual_profit', 0),
                    listing.get('establishment_year', 2020),
                    listing.get('operational_data', {}).get('employee_count', 0)
                ]
                listing_features.append(features)
            
            # Normalize features
            all_features = [buyer_features] + listing_features
            normalized_features = self.scaler.transform(all_features)
            
            # Calculate similarity
            buyer_vector = normalized_features[0]
            listing_vectors = normalized_features[1:]
            
            similarities = cosine_similarity([buyer_vector], listing_vectors).flatten()
            return similarities.tolist()
            
        except Exception as e:
            print(f"Numerical similarity calculation failed: {e}")
            return [0.0] * len(listings)

# Initialize ML engine
matching_engine = MatchingEngine()

# Elasticsearch helpers
async def index_listing(listing_data: Dict):
    """Index a listing in Elasticsearch"""
    try:
        await es.index(
            index="msme_listings",
            id=listing_data["id"],
            body=listing_data
        )
    except Exception as e:
        print(f"Failed to index listing {listing_data.get('id')}: {e}")

async def search_listings_es(query: str, filters: Dict, page: int, per_page: int):
    """Search listings using Elasticsearch"""
    try:
        # Build Elasticsearch query
        es_query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": ["company_name^2", "description", "industry", "tags", "keywords"],
                                "fuzziness": "AUTO"
                            }
                        }
                    ],
                    "filter": []
                }
            },
            "from": (page - 1) * per_page,
            "size": per_page,
            "sort": [
                {"_score": {"order": "desc"}},
                {"created_at": {"order": "desc"}}
            ]
        }
        
        # Add filters
        if filters.get("business_type"):
            es_query["query"]["bool"]["filter"].append({
                "term": {"business_type": filters["business_type"]}
            })
        
        if filters.get("industry"):
            es_query["query"]["bool"]["filter"].append({
                "term": {"industry": filters["industry"]}
            })
        
        if filters.get("location"):
            es_query["query"]["bool"]["filter"].append({
                "bool": {
                    "should": [
                        {"match": {"city": filters["location"]}},
                        {"match": {"state": filters["location"]}}
                    ]
                }
            })
        
        if filters.get("price_range"):
            price_range = filters["price_range"]
            range_filter = {"range": {"asking_price": {}}}
            if price_range.get("min"):
                range_filter["range"]["asking_price"]["gte"] = price_range["min"]
            if price_range.get("max"):
                range_filter["range"]["asking_price"]["lte"] = price_range["max"]
            es_query["query"]["bool"]["filter"].append(range_filter)
        
        if filters.get("tags"):
            es_query["query"]["bool"]["filter"].append({
                "terms": {"tags": filters["tags"]}
            })
        
        # Execute search
        response = await es.search(index="msme_listings", body=es_query)
        
        return {
            "hits": response["hits"]["hits"],
            "total": response["hits"]["total"]["value"],
            "max_score": response["hits"]["max_score"]
        }
        
    except Exception as e:
        print(f"Elasticsearch search failed: {e}")
        return {"hits": [], "total": 0, "max_score": 0}

# API Endpoints

@app.post("/search")
async def search_listings(search_query: SearchQuery, current_user: dict = Depends(verify_token)):
    """Search MSME listings"""
    try:
        # Search using Elasticsearch
        es_results = await search_listings_es(
            search_query.query,
            search_query.filters,
            search_query.page,
            search_query.per_page
        )
        
        # Format results
        listings = []
        for hit in es_results["hits"]:
            listing = hit["_source"]
            listing["search_score"] = hit["_score"]
            listings.append(listing)
        
        return {
            "listings": listings,
            "total_results": es_results["total"],
            "page": search_query.page,
            "per_page": search_query.per_page,
            "max_score": es_results["max_score"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@app.post("/index-listing")
async def index_msme_listing(listing_data: Dict, current_user: dict = Depends(verify_token)):
    """Index a new MSME listing"""
    try:
        await index_listing(listing_data)
        return {"message": "Listing indexed successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {str(e)}"
        )

@app.post("/matchmaking")
async def find_matches(request: MLMatchingRequest, current_user: dict = Depends(verify_token)):
    """Find ML-based matches for a buyer"""
    try:
        conn = await get_db_connection()
        
        # Get buyer preferences
        buyer_prefs = await conn.fetchrow(
            """
            SELECT * FROM buyer_preferences 
            WHERE buyer_id = $1
            """,
            request.buyer_id
        )
        
        if not buyer_prefs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer preferences not found"
            )
        
        # Get active listings
        listings_response = requests.get(
            f"{LISTING_SERVICE_URL}/listings?status=active&limit=1000"
        )
        
        if listings_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Listing service unavailable"
            )
        
        listings_data = listings_response.json()
        listings = listings_data.get("listings", [])
        
        if not listings:
            return {"matches": [], "total_matches": 0}
        
        # Calculate matches using ML
        matches = []
        
        # Prepare buyer query text
        buyer_query = f"{' '.join(buyer_prefs.get('preferred_industries', []))} {' '.join(buyer_prefs.get('preferred_business_types', []))}"
        
        # Prepare listing texts
        listing_texts = []
        for listing in listings:
            text = f"{listing.get('company_name', '')} {listing.get('description', '')} {listing.get('industry', '')} {' '.join(listing.get('tags', []))}"
            listing_texts.append(text)
        
        # Calculate text similarities
        text_similarities = matching_engine.calculate_text_similarity(buyer_query, listing_texts)
        
        # Calculate numerical similarities
        numerical_similarities = matching_engine.calculate_numerical_similarity(
            dict(buyer_prefs), listings
        )
        
        # Combine scores and create matches
        for i, listing in enumerate(listings):
            # Check basic filters
            if buyer_prefs.get("min_price") and listing.get("asking_price", 0) < buyer_prefs["min_price"]:
                continue
            if buyer_prefs.get("max_price") and listing.get("asking_price", 0) > buyer_prefs["max_price"]:
                continue
            
            # Calculate overall score
            text_score = text_similarities[i] if i < len(text_similarities) else 0
            numerical_score = numerical_similarities[i] if i < len(numerical_similarities) else 0
            
            # Industry match bonus
            industry_bonus = 0
            if listing.get("industry") in buyer_prefs.get("preferred_industries", []):
                industry_bonus = 0.2
            
            # Location match bonus
            location_bonus = 0
            buyer_locations = buyer_prefs.get("preferred_locations", [])
            if listing.get("city") in buyer_locations or listing.get("state") in buyer_locations:
                location_bonus = 0.1
            
            # Business type match bonus
            business_type_bonus = 0
            if listing.get("business_type") in buyer_prefs.get("preferred_business_types", []):
                business_type_bonus = 0.15
            
            # Calculate final score
            overall_score = (
                text_score * 0.3 +
                numerical_score * 0.25 +
                industry_bonus +
                location_bonus +
                business_type_bonus
            )
            
            # Generate match reasons
            match_reasons = []
            if text_score > 0.3:
                match_reasons.append("High content relevance")
            if industry_bonus > 0:
                match_reasons.append("Industry preference match")
            if location_bonus > 0:
                match_reasons.append("Location preference match")
            if business_type_bonus > 0:
                match_reasons.append("Business type preference match")
            
            # Determine confidence level
            confidence_level = "low"
            if overall_score > 0.7:
                confidence_level = "high"
            elif overall_score > 0.4:
                confidence_level = "medium"
            
            match = {
                "msme_id": listing["id"],
                "buyer_id": request.buyer_id,
                "overall_score": round(overall_score, 3),
                "category_scores": {
                    "text_relevance": round(text_score, 3),
                    "numerical_match": round(numerical_score, 3),
                    "industry_match": round(industry_bonus, 3),
                    "location_match": round(location_bonus, 3),
                    "business_type_match": round(business_type_bonus, 3)
                },
                "match_reasons": match_reasons,
                "confidence_level": confidence_level,
                "listing": listing if request.include_scores else None
            }
            
            matches.append(match)
        
        # Sort by score and limit results
        matches.sort(key=lambda x: x["overall_score"], reverse=True)
        matches = matches[:request.limit]
        
        # Store matches in database
        for match in matches:
            await conn.execute(
                """
                INSERT INTO match_results (buyer_id, msme_id, overall_score, category_scores, match_reasons, confidence_level, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (buyer_id, msme_id) DO UPDATE SET
                overall_score = $3, category_scores = $4, match_reasons = $5, confidence_level = $6, updated_at = $7
                """,
                match["buyer_id"], match["msme_id"], match["overall_score"],
                json.dumps(match["category_scores"]), match["match_reasons"],
                match["confidence_level"], datetime.utcnow()
            )
        
        await conn.close()
        
        return {
            "matches": matches,
            "total_matches": len(matches),
            "buyer_id": request.buyer_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Matchmaking failed: {str(e)}"
        )

@app.post("/buyer-preferences")
async def save_buyer_preferences(preferences: MatchingPreferences, current_user: dict = Depends(verify_token)):
    """Save buyer matching preferences"""
    try:
        conn = await get_db_connection()
        
        await conn.execute(
            """
            INSERT INTO buyer_preferences (
                buyer_id, preferred_business_types, preferred_industries,
                preferred_locations, min_price, max_price, min_revenue,
                max_revenue, min_employees, max_employees, risk_tolerance,
                growth_preference, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (buyer_id) DO UPDATE SET
            preferred_business_types = $2, preferred_industries = $3,
            preferred_locations = $4, min_price = $5, max_price = $6,
            min_revenue = $7, max_revenue = $8, min_employees = $9,
            max_employees = $10, risk_tolerance = $11, growth_preference = $12,
            updated_at = $14
            """,
            preferences.buyer_id, preferences.preferred_business_types,
            preferences.preferred_industries, preferences.preferred_locations,
            preferences.min_price, preferences.max_price, preferences.min_revenue,
            preferences.max_revenue, preferences.min_employees, preferences.max_employees,
            preferences.risk_tolerance, preferences.growth_preference,
            datetime.utcnow(), datetime.utcnow()
        )
        
        await conn.close()
        
        return {"message": "Buyer preferences saved successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save preferences: {str(e)}"
        )

@app.get("/buyer-preferences/{buyer_id}")
async def get_buyer_preferences(buyer_id: int, current_user: dict = Depends(verify_token)):
    """Get buyer matching preferences"""
    try:
        conn = await get_db_connection()
        
        preferences = await conn.fetchrow(
            "SELECT * FROM buyer_preferences WHERE buyer_id = $1",
            buyer_id
        )
        
        await conn.close()
        
        if not preferences:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer preferences not found"
            )
        
        return dict(preferences)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get preferences: {str(e)}"
        )

@app.get("/matches/{buyer_id}")
async def get_saved_matches(buyer_id: int, current_user: dict = Depends(verify_token)):
    """Get saved matches for a buyer"""
    try:
        conn = await get_db_connection()
        
        matches = await conn.fetch(
            """
            SELECT * FROM match_results 
            WHERE buyer_id = $1 
            ORDER BY overall_score DESC, created_at DESC
            """,
            buyer_id
        )
        
        await conn.close()
        
        return [dict(match) for match in matches]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get matches: {str(e)}"
        )

@app.post("/retrain-model")
async def retrain_matching_model(current_user: dict = Depends(verify_token)):
    """Retrain the matching model"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can retrain the model"
        )
    
    try:
        await matching_engine.train_model()
        return {"message": "Model retrained successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model retraining failed: {str(e)}"
        )

@app.get("/search-stats")
async def get_search_stats():
    """Get search and matching statistics"""
    try:
        conn = await get_db_connection()
        
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_matches,
                COUNT(DISTINCT buyer_id) as unique_buyers,
                COUNT(DISTINCT msme_id) as unique_msmes,
                AVG(overall_score) as avg_match_score,
                COUNT(*) FILTER (WHERE confidence_level = 'high') as high_confidence_matches,
                COUNT(*) FILTER (WHERE confidence_level = 'medium') as medium_confidence_matches,
                COUNT(*) FILTER (WHERE confidence_level = 'low') as low_confidence_matches
            FROM match_results
            """
        )
        
        await conn.close()
        
        return dict(stats)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = await get_db_connection()
        await conn.fetchval("SELECT 1")
        await conn.close()
        
        # Check Elasticsearch connection
        await es.info()
        
        return {
            "status": "healthy",
            "service": "search-matchmaking-service",
            "model_trained": matching_engine.model_trained,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

# Initialize model on startup
@app.on_event("startup")
async def startup_event():
    """Initialize the matching model on startup"""
    await matching_engine.train_model()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)