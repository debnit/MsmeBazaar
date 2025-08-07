from libs.db.session import get_db
import os
import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean, Integer, ForeignKey, Enum, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
import jwt
import redis
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response
import enum
import weaviate
from weaviate.classes.init import Auth
import openai
from openai import OpenAI
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests
from celery import Celery
import elasticsearch
from elasticsearch import Elasticsearch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msmebazaar")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis configuration
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True
)

# Celery configuration
celery_app = Celery(
    "match_tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"

# OpenAI configuration
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Weaviate configuration
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

# Initialize Weaviate client
weaviate_client = weaviate.Client(
    url=WEAVIATE_URL,
    auth_client_secret=Auth.api_key(WEAVIATE_API_KEY) if WEAVIATE_API_KEY else None,
    additional_headers={"X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY")}
)

# Elasticsearch configuration (fallback)
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
es_client = Elasticsearch([ELASTICSEARCH_URL])

# Prometheus metrics
REQUEST_COUNT = Counter('match_api_requests_total', 'Total requests', ['method', 'endpoint'])
MATCH_REQUESTS = Counter('match_requests_total', 'Total match requests', ['type'])
EMBEDDING_GENERATIONS = Counter('embedding_generations_total', 'Total embedding generations')
VECTOR_SEARCHES = Counter('vector_searches_total', 'Total vector searches')

# Enums
class MatchType(str, enum.Enum):
    BUYER_MSME = "BUYER_MSME"
    MSME_BUYER = "MSME_BUYER"
    INVESTOR_MSME = "INVESTOR_MSME"
    ACQUISITION_MSME = "ACQUISITION_MSME"

class MatchStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class MatchScore(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

# Database Models
class MatchRequest(Base):
    __tablename__ = "match_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    profile_id = Column(UUID(as_uuid=True), nullable=False)  # MSME or Buyer profile ID
    match_type = Column(Enum(MatchType), nullable=False)
    status = Column(Enum(MatchStatus), default=MatchStatus.PENDING)
    
    # Search criteria
    search_criteria = Column(JSON)
    embedding_vector = Column(JSON)  # Store as JSON array
    
    # Processing info
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    matches = relationship("MatchResult", back_populates="request")

class MatchResult(Base):
    __tablename__ = "match_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("match_requests.id"), nullable=False)
    matched_profile_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Match details
    match_score = Column(Float, nullable=False)
    match_grade = Column(Enum(MatchScore), nullable=False)
    match_factors = Column(JSON)
    similarity_score = Column(Float)
    
    # Profile info (cached)
    profile_data = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    request = relationship("MatchRequest", back_populates="matches")

class ProfileEmbedding(Base):
    __tablename__ = "profile_embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    profile_type = Column(String(50), nullable=False)  # MSME, BUYER, INVESTOR
    
    # Embedding data
    embedding_vector = Column(JSON)  # OpenAI embedding
    text_content = Column(Text)  # Original text used for embedding
    
    # Metadata
    industry = Column(String(100))
    location = Column(String(100))
    size_category = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class MatchRequestCreate(BaseModel):
    profile_id: str
    match_type: MatchType
    search_criteria: Optional[Dict[str, Any]] = {}
    
    # Optional filters
    industry_filter: Optional[List[str]] = None
    location_filter: Optional[List[str]] = None
    size_filter: Optional[List[str]] = None
    min_score: Optional[float] = 0.7

class MatchRequestResponse(BaseModel):
    id: str
    user_id: str
    profile_id: str
    match_type: MatchType
    status: MatchStatus
    search_criteria: Optional[Dict[str, Any]]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MatchResultResponse(BaseModel):
    id: str
    request_id: str
    matched_profile_id: str
    match_score: float
    match_grade: MatchScore
    match_factors: Optional[Dict[str, Any]]
    similarity_score: Optional[float]
    profile_data: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProfileEmbeddingResponse(BaseModel):
    id: str
    profile_id: str
    profile_type: str
    text_content: str
    industry: Optional[str]
    location: Optional[str]
    size_category: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Embedding and Vector Search Manager
class EmbeddingManager:
    def __init__(self):
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimension = 1536
        self.setup_weaviate_schema()
    
    def setup_weaviate_schema(self):
        """Setup Weaviate schema for profile embeddings"""
        try:
            # Check if schema exists
            schema = weaviate_client.schema.get()
            class_names = [cls['class'] for cls in schema['classes']]
            
            if 'MSMEProfile' not in class_names:
                msme_class = {
                    "class": "MSMEProfile",
                    "description": "MSME profile embeddings",
                    "vectorizer": "text2vec-openai",
                    "moduleConfig": {
                        "text2vec-openai": {
                            "model": "text-embedding-3-small",
                            "dimensions": 1536,
                            "type": "text"
                        }
                    },
                    "properties": [
                        {"name": "profileId", "dataType": ["string"]},
                        {"name": "companyName", "dataType": ["string"]},
                        {"name": "industry", "dataType": ["string"]},
                        {"name": "location", "dataType": ["string"]},
                        {"name": "size", "dataType": ["string"]},
                        {"name": "description", "dataType": ["text"]},
                        {"name": "products", "dataType": ["text"]},
                        {"name": "services", "dataType": ["text"]},
                        {"name": "textContent", "dataType": ["text"]},
                        {"name": "annualTurnover", "dataType": ["number"]},
                        {"name": "employeeCount", "dataType": ["int"]},
                        {"name": "createdAt", "dataType": ["date"]}
                    ]
                }
                weaviate_client.schema.create_class(msme_class)
            
            if 'BuyerProfile' not in class_names:
                buyer_class = {
                    "class": "BuyerProfile",
                    "description": "Buyer profile embeddings",
                    "vectorizer": "text2vec-openai",
                    "moduleConfig": {
                        "text2vec-openai": {
                            "model": "text-embedding-3-small",
                            "dimensions": 1536,
                            "type": "text"
                        }
                    },
                    "properties": [
                        {"name": "profileId", "dataType": ["string"]},
                        {"name": "companyName", "dataType": ["string"]},
                        {"name": "industry", "dataType": ["string"]},
                        {"name": "location", "dataType": ["string"]},
                        {"name": "requirements", "dataType": ["text"]},
                        {"name": "budget", "dataType": ["number"]},
                        {"name": "textContent", "dataType": ["text"]},
                        {"name": "createdAt", "dataType": ["date"]}
                    ]
                }
                weaviate_client.schema.create_class(buyer_class)
            
            logger.info("Weaviate schema setup completed")
            
        except Exception as e:
            logger.error(f"Weaviate schema setup error: {e}")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI"""
        try:
            response = openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            EMBEDDING_GENERATIONS.inc()
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return []
    
    async def create_profile_embedding(self, profile_data: Dict[str, Any], profile_type: str) -> str:
        """Create and store profile embedding"""
        try:
            # Extract text content for embedding
            text_content = self._extract_text_content(profile_data, profile_type)
            
            # Generate embedding
            embedding = await self.generate_embedding(text_content)
            
            if not embedding:
                raise Exception("Failed to generate embedding")
            
            # Store in database
            db = SessionLocal()
            try:
                embedding_record = ProfileEmbedding(
                    profile_id=profile_data['id'],
                    profile_type=profile_type,
                    embedding_vector=embedding,
                    text_content=text_content,
                    industry=profile_data.get('industry'),
                    location=profile_data.get('location') or profile_data.get('state'),
                    size_category=profile_data.get('msme_size') or profile_data.get('company_size')
                )
                
                db.add(embedding_record)
                db.commit()
                db.refresh(embedding_record)
                
                # Store in Weaviate
                await self._store_in_weaviate(profile_data, profile_type, text_content)
                
                return str(embedding_record.id)
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Profile embedding creation error: {e}")
            raise
    
    async def _store_in_weaviate(self, profile_data: Dict[str, Any], profile_type: str, text_content: str):
        """Store profile in Weaviate"""
        try:
            class_name = f"{profile_type.title()}Profile"
            
            properties = {
                "profileId": profile_data['id'],
                "textContent": text_content,
                "createdAt": datetime.utcnow().isoformat()
            }
            
            if profile_type == "MSME":
                properties.update({
                    "companyName": profile_data.get('company_name', ''),
                    "industry": profile_data.get('industry', ''),
                    "location": profile_data.get('state', ''),
                    "size": profile_data.get('msme_size', ''),
                    "description": profile_data.get('description', ''),
                    "products": profile_data.get('products_services', ''),
                    "services": profile_data.get('products_services', ''),
                    "annualTurnover": profile_data.get('annual_turnover', 0),
                    "employeeCount": profile_data.get('employee_count', 0)
                })
            elif profile_type == "BUYER":
                properties.update({
                    "companyName": profile_data.get('company_name', ''),
                    "industry": profile_data.get('industry', ''),
                    "location": profile_data.get('location', ''),
                    "requirements": profile_data.get('requirements', ''),
                    "budget": profile_data.get('budget', 0)
                })
            
            weaviate_client.data_object.create(
                data_object=properties,
                class_name=class_name
            )
            
        except Exception as e:
            logger.error(f"Weaviate storage error: {e}")
    
    def _extract_text_content(self, profile_data: Dict[str, Any], profile_type: str) -> str:
        """Extract text content from profile for embedding"""
        if profile_type == "MSME":
            content_parts = [
                profile_data.get('company_name', ''),
                profile_data.get('industry', ''),
                profile_data.get('description', ''),
                profile_data.get('products_services', ''),
                profile_data.get('target_market', ''),
                f"Size: {profile_data.get('msme_size', '')}",
                f"Location: {profile_data.get('state', '')}",
                f"Business Type: {profile_data.get('business_type', '')}"
            ]
        elif profile_type == "BUYER":
            content_parts = [
                profile_data.get('company_name', ''),
                profile_data.get('industry', ''),
                profile_data.get('requirements', ''),
                profile_data.get('description', ''),
                f"Location: {profile_data.get('location', '')}",
                f"Budget: {profile_data.get('budget', '')}"
            ]
        else:
            content_parts = [str(v) for v in profile_data.values() if v]
        
        return " ".join(filter(None, content_parts))
    
    async def find_similar_profiles(
        self, 
        query_embedding: List[float], 
        profile_type: str, 
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Find similar profiles using vector search"""
        try:
            class_name = f"{profile_type.title()}Profile"
            
            # Build where filter
            where_filter = {}
            if filters:
                if filters.get('industry'):
                    where_filter['industry'] = {"operator": "Equal", "valueString": filters['industry']}
                if filters.get('location'):
                    where_filter['location'] = {"operator": "Equal", "valueString": filters['location']}
            
            # Perform vector search
            result = weaviate_client.query.get(
                class_name, 
                ["profileId", "companyName", "industry", "location", "textContent"]
            ).with_near_vector({
                "vector": query_embedding
            }).with_limit(limit).with_additional(["certainty", "distance"]).do()
            
            VECTOR_SEARCHES.inc()
            
            # Process results
            matches = []
            if result.get('data') and result['data'].get('Get') and result['data']['Get'].get(class_name):
                for item in result['data']['Get'][class_name]:
                    matches.append({
                        'profile_id': item['profileId'],
                        'company_name': item.get('companyName', ''),
                        'industry': item.get('industry', ''),
                        'location': item.get('location', ''),
                        'similarity_score': item['_additional']['certainty'],
                        'distance': item['_additional']['distance']
                    })
            
            return matches
            
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []
    
    async def fallback_search(
        self, 
        query_text: str, 
        profile_type: str, 
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Fallback to Elasticsearch for text search"""
        try:
            index_name = f"{profile_type.lower()}_profiles"
            
            # Build search query
            query = {
                "query": {
                    "bool": {
                        "must": [
                            {"multi_match": {
                                "query": query_text,
                                "fields": ["company_name^2", "industry", "description", "products_services"]
                            }}
                        ]
                    }
                },
                "size": limit
            }
            
            # Add filters
            if filters:
                filters_list = []
                if filters.get('industry'):
                    filters_list.append({"term": {"industry.keyword": filters['industry']}})
                if filters.get('location'):
                    filters_list.append({"term": {"location.keyword": filters['location']}})
                
                if filters_list:
                    query["query"]["bool"]["filter"] = filters_list
            
            # Execute search
            response = es_client.search(index=index_name, body=query)
            
            # Process results
            matches = []
            for hit in response['hits']['hits']:
                source = hit['_source']
                matches.append({
                    'profile_id': source['id'],
                    'company_name': source.get('company_name', ''),
                    'industry': source.get('industry', ''),
                    'location': source.get('location', ''),
                    'similarity_score': hit['_score'] / 100,  # Normalize score
                    'distance': 1 - (hit['_score'] / 100)
                })
            
            return matches
            
        except Exception as e:
            logger.error(f"Elasticsearch fallback error: {e}")
            return []

# Initialize embedding manager
embedding_manager = EmbeddingManager()

# FastAPI app
app = FastAPI(
    title="Match API",
    description="AI-powered matching service for MSMEs and buyers",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT token validation
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Helper functions
async def get_profile_data(profile_id: str, profile_type: str) -> Dict[str, Any]:
    """Fetch profile data from appropriate API"""
    try:
        if profile_type == "MSME":
            # Call MSME API
            response = requests.get(f"http://msme-api:8002/api/msme/profile/{profile_id}")
            if response.status_code == 200:
                return response.json()
        elif profile_type == "BUYER":
            # Call Buyer API (would be implemented)
            pass
        
        # Mock data for development
        return {
            "id": profile_id,
            "company_name": "Sample Company",
            "industry": "Manufacturing",
            "state": "Maharashtra",
            "description": "Sample description",
            "products_services": "Sample products and services"
        }
    except Exception as e:
        logger.error(f"Error fetching profile data: {e}")
        return {}

def calculate_match_score(similarity_score: float, factors: Dict[str, Any]) -> tuple:
    """Calculate match score and grade"""
    # Base score from similarity
    base_score = similarity_score * 0.6
    
    # Factor-based scoring
    factor_score = 0
    if factors.get('industry_match'):
        factor_score += 0.2
    if factors.get('location_match'):
        factor_score += 0.1
    if factors.get('size_match'):
        factor_score += 0.1
    
    total_score = base_score + factor_score
    
    # Determine grade
    if total_score >= 0.8:
        grade = MatchScore.HIGH
    elif total_score >= 0.6:
        grade = MatchScore.MEDIUM
    else:
        grade = MatchScore.LOW
    
    return total_score, grade

# Celery tasks
@celery_app.task
def process_match_request_task(request_id: str):
    """Background task to process match request"""
    db = SessionLocal()
    try:
        request = db.query(MatchRequest).filter(MatchRequest.id == request_id).first()
        if not request:
            return {"error": "Match request not found"}
        
        # Update status
        request.status = MatchStatus.PROCESSING
        request.processing_started_at = datetime.utcnow()
        db.commit()
        
        # Get profile data
        profile_type = "MSME" if request.match_type in [MatchType.MSME_BUYER] else "BUYER"
        profile_data = asyncio.run(get_profile_data(str(request.profile_id), profile_type))
        
        # Generate embedding if not exists
        if not request.embedding_vector:
            text_content = embedding_manager._extract_text_content(profile_data, profile_type)
            embedding = asyncio.run(embedding_manager.generate_embedding(text_content))
            request.embedding_vector = embedding
            db.commit()
        
        # Determine target profile type
        target_type = "BUYER" if profile_type == "MSME" else "MSME"
        
        # Find similar profiles
        matches = asyncio.run(embedding_manager.find_similar_profiles(
            request.embedding_vector,
            target_type,
            limit=50,
            filters=request.search_criteria
        ))
        
        # If no matches from vector search, try fallback
        if not matches:
            text_content = embedding_manager._extract_text_content(profile_data, profile_type)
            matches = asyncio.run(embedding_manager.fallback_search(
                text_content,
                target_type,
                limit=50,
                filters=request.search_criteria
            ))
        
        # Process and store results
        for match in matches:
            # Calculate match factors
            match_factors = {
                'industry_match': profile_data.get('industry') == match.get('industry'),
                'location_match': profile_data.get('state') == match.get('location'),
                'similarity_score': match['similarity_score']
            }
            
            # Calculate final score
            final_score, grade = calculate_match_score(match['similarity_score'], match_factors)
            
            # Skip low-quality matches
            if final_score < request.search_criteria.get('min_score', 0.5):
                continue
            
            # Get full profile data
            full_profile_data = asyncio.run(get_profile_data(match['profile_id'], target_type))
            
            # Create match result
            match_result = MatchResult(
                request_id=request.id,
                matched_profile_id=match['profile_id'],
                match_score=final_score,
                match_grade=grade,
                match_factors=match_factors,
                similarity_score=match['similarity_score'],
                profile_data=full_profile_data
            )
            
            db.add(match_result)
        
        # Update request status
        request.status = MatchStatus.COMPLETED
        request.processing_completed_at = datetime.utcnow()
        db.commit()
        
        return {"success": True, "request_id": request_id}
        
    except Exception as e:
        logger.error(f"Match processing error: {e}")
        request.status = MatchStatus.FAILED
        request.error_message = str(e)
        db.commit()
        return {"error": str(e)}
    finally:
        db.close()

# API Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

@app.post("/api/match/request", response_model=MatchRequestResponse)
async def create_match_request(
    request_data: MatchRequestCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/match/request").inc()
    
    # Create match request
    match_request = MatchRequest(
        user_id=user_id,
        profile_id=request_data.profile_id,
        match_type=request_data.match_type,
        search_criteria=request_data.search_criteria
    )
    
    db.add(match_request)
    db.commit()
    db.refresh(match_request)
    
    # Start background processing
    background_tasks.add_task(process_match_request_task.delay, str(match_request.id))
    
    MATCH_REQUESTS.labels(type=request_data.match_type.value).inc()
    
    return MatchRequestResponse.from_orm(match_request)

@app.get("/api/match/request/{request_id}", response_model=MatchRequestResponse)
async def get_match_request(
    request_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/match/request").inc()
    
    request = db.query(MatchRequest).filter(
        MatchRequest.id == request_id,
        MatchRequest.user_id == user_id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Match request not found")
    
    return MatchRequestResponse.from_orm(request)

@app.get("/api/match/request/{request_id}/results")
async def get_match_results(
    request_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    min_score: Optional[float] = Query(None, ge=0, le=1),
    grade: Optional[MatchScore] = None,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/match/results").inc()
    
    # Verify request exists and belongs to user
    request = db.query(MatchRequest).filter(
        MatchRequest.id == request_id,
        MatchRequest.user_id == user_id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Match request not found")
    
    # Build query
    query = db.query(MatchResult).filter(MatchResult.request_id == request_id)
    
    if min_score is not None:
        query = query.filter(MatchResult.match_score >= min_score)
    
    if grade:
        query = query.filter(MatchResult.match_grade == grade)
    
    # Order by match score
    query = query.order_by(MatchResult.match_score.desc())
    
    total = query.count()
    results = query.offset(skip).limit(limit).all()
    
    return {
        "results": [MatchResultResponse.from_orm(result) for result in results],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.post("/api/match/embedding")
async def create_profile_embedding(
    profile_id: str,
    profile_type: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/match/embedding").inc()
    
    # Get profile data
    profile_data = await get_profile_data(profile_id, profile_type)
    if not profile_data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    try:
        # Create embedding
        embedding_id = await embedding_manager.create_profile_embedding(profile_data, profile_type)
        
        return {"embedding_id": embedding_id, "message": "Embedding created successfully"}
        
    except Exception as e:
        logger.error(f"Embedding creation error: {e}")
        raise HTTPException(status_code=500, detail="Embedding creation failed")

@app.get("/api/match/embedding/{profile_id}", response_model=ProfileEmbeddingResponse)
async def get_profile_embedding(
    profile_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/match/embedding").inc()
    
    embedding = db.query(ProfileEmbedding).filter(
        ProfileEmbedding.profile_id == profile_id
    ).first()
    
    if not embedding:
        raise HTTPException(status_code=404, detail="Embedding not found")
    
    return ProfileEmbeddingResponse.from_orm(embedding)

@app.get("/api/match/requests")
async def list_match_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    match_type: Optional[MatchType] = None,
    status: Optional[MatchStatus] = None,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/match/requests").inc()
    
    query = db.query(MatchRequest).filter(MatchRequest.user_id == user_id)
    
    if match_type:
        query = query.filter(MatchRequest.match_type == match_type)
    
    if status:
        query = query.filter(MatchRequest.status == status)
    
    # Order by creation date
    query = query.order_by(MatchRequest.created_at.desc())
    
    total = query.count()
    requests = query.offset(skip).limit(limit).all()
    
    return {
        "requests": [MatchRequestResponse.from_orm(req) for req in requests],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.post("/api/match/search")
async def semantic_search(
    query: str,
    profile_type: str,
    limit: int = Query(20, ge=1, le=100),
    filters: Optional[Dict[str, Any]] = None,
    user_id: str = Depends(verify_token)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/match/search").inc()
    
    try:
        # Generate embedding for query
        query_embedding = await embedding_manager.generate_embedding(query)
        
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")
        
        # Search for similar profiles
        matches = await embedding_manager.find_similar_profiles(
            query_embedding,
            profile_type,
            limit=limit,
            filters=filters
        )
        
        # If no matches, try fallback search
        if not matches:
            matches = await embedding_manager.fallback_search(
                query,
                profile_type,
                limit=limit,
                filters=filters
            )
        
        return {
            "query": query,
            "matches": matches,
            "total": len(matches)
        }
        
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@app.get("/api/match/stats")
async def get_match_stats(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/match/stats").inc()
    
    # Get user's match statistics
    total_requests = db.query(MatchRequest).filter(MatchRequest.user_id == user_id).count()
    completed_requests = db.query(MatchRequest).filter(
        MatchRequest.user_id == user_id,
        MatchRequest.status == MatchStatus.COMPLETED
    ).count()
    
    # Get match results statistics
    total_matches = db.query(MatchResult).join(MatchRequest).filter(
        MatchRequest.user_id == user_id
    ).count()
    
    high_grade_matches = db.query(MatchResult).join(MatchRequest).filter(
        MatchRequest.user_id == user_id,
        MatchResult.match_grade == MatchScore.HIGH
    ).count()
    
    # Get average match score
    avg_score_result = db.query(db.func.avg(MatchResult.match_score)).join(MatchRequest).filter(
        MatchRequest.user_id == user_id
    ).scalar()
    
    avg_match_score = float(avg_score_result) if avg_score_result else 0.0
    
    return {
        "total_requests": total_requests,
        "completed_requests": completed_requests,
        "completion_rate": completed_requests / total_requests if total_requests > 0 else 0,
        "total_matches": total_matches,
        "high_grade_matches": high_grade_matches,
        "high_grade_rate": high_grade_matches / total_matches if total_matches > 0 else 0,
        "average_match_score": avg_match_score
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)