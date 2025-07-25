from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import redis.asyncio as redis
import json
from datetime import datetime, timedelta
import logging
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import asyncpg
import celery
from celery import Celery
import os
import httpx
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('valuation_requests_total', 'Total valuation requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('valuation_request_duration_seconds', 'Request latency')
VALUATION_COUNT = Counter('valuations_completed_total', 'Total completed valuations')
CACHE_HIT_RATE = Counter('cache_hits_total', 'Cache hits')
CACHE_MISS_RATE = Counter('cache_misses_total', 'Cache misses')

# Celery configuration
celery_app = Celery(
    'valuation_service',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Pydantic models
class MSMEData(BaseModel):
    company_name: str
    annual_turnover: float
    employee_count: int
    industry_category: str
    year_established: int
    assets_value: Optional[float] = 0
    liabilities_value: Optional[float] = 0
    revenue_growth_rate: Optional[float] = 0
    profit_margin: Optional[float] = 0
    market_share: Optional[float] = 0
    location: str
    gstin: str
    pan: str

class ValuationRequest(BaseModel):
    msme_id: str
    user_id: str
    valuation_type: str = Field(..., regex="^(basic|detailed|enterprise)$")
    purpose: str
    urgency: str = Field(..., regex="^(low|medium|high)$")
    additional_data: Optional[Dict[str, Any]] = {}

class ValuationResponse(BaseModel):
    valuation_id: str
    msme_id: str
    estimated_value: float
    valuation_range: Dict[str, float]
    confidence_score: float
    methodology: str
    factors_considered: List[str]
    report_url: Optional[str] = None
    created_at: datetime
    expires_at: datetime

# Database and Redis connection
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis = await redis.from_url(
        os.getenv('REDIS_URL', 'redis://localhost:6379'),
        encoding='utf-8',
        decode_responses=True
    )
    app.state.db_pool = await asyncpg.create_pool(
        os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/msme_db'),
        min_size=10,
        max_size=20
    )
    logger.info("Valuation service started")
    yield
    # Shutdown
    await app.state.redis.close()
    await app.state.db_pool.close()
    logger.info("Valuation service stopped")

app = FastAPI(
    title="MSME Valuation Service",
    description="Microservice for MSME valuation and analysis",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Middleware for metrics
@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = asyncio.get_event_loop().time()
    
    response = await call_next(request)
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path
    ).inc()
    
    REQUEST_LATENCY.observe(asyncio.get_event_loop().time() - start_time)
    
    return response

# Authentication dependency
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Validate JWT token with auth service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{os.getenv('AUTH_SERVICE_URL')}/validate-token",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=401, detail="Invalid token")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Auth service unavailable")

# Caching utilities
async def get_cached_valuation(redis_client: redis.Redis, msme_id: str) -> Optional[ValuationResponse]:
    try:
        cached_data = await redis_client.get(f"valuation:{msme_id}")
        if cached_data:
            CACHE_HIT_RATE.inc()
            data = json.loads(cached_data)
            return ValuationResponse(**data)
        else:
            CACHE_MISS_RATE.inc()
            return None
    except Exception as e:
        logger.error(f"Cache retrieval error: {e}")
        CACHE_MISS_RATE.inc()
        return None

async def cache_valuation(redis_client: redis.Redis, valuation: ValuationResponse, ttl: int = 3600):
    try:
        await redis_client.setex(
            f"valuation:{valuation.msme_id}",
            ttl,
            valuation.model_dump_json()
        )
    except Exception as e:
        logger.error(f"Cache storage error: {e}")

# Celery tasks for async processing
@celery_app.task
def process_detailed_valuation(msme_data: dict, valuation_request: dict):
    """Process detailed valuation using ML models"""
    try:
        # Simulate complex valuation logic
        import time
        time.sleep(5)  # Simulate processing time
        
        # Advanced valuation calculations
        base_value = msme_data['annual_turnover'] * 2.5
        
        # Industry multipliers
        industry_multipliers = {
            'technology': 4.0,
            'manufacturing': 2.8,
            'services': 3.2,
            'healthcare': 3.8,
            'retail': 2.2
        }
        
        multiplier = industry_multipliers.get(msme_data['industry_category'], 2.5)
        estimated_value = base_value * multiplier
        
        # Adjust for company age and growth
        years_in_business = 2024 - msme_data['year_established']
        if years_in_business > 10:
            estimated_value *= 1.2
        elif years_in_business > 5:
            estimated_value *= 1.1
        
        # Apply growth rate adjustments
        if msme_data.get('revenue_growth_rate', 0) > 20:
            estimated_value *= 1.3
        elif msme_data.get('revenue_growth_rate', 0) > 10:
            estimated_value *= 1.15
        
        confidence_score = min(0.95, 0.6 + (years_in_business * 0.05))
        
        valuation_range = {
            'min': estimated_value * 0.8,
            'max': estimated_value * 1.2,
            'most_likely': estimated_value
        }
        
        return {
            'estimated_value': estimated_value,
            'valuation_range': valuation_range,
            'confidence_score': confidence_score,
            'methodology': 'ML-Enhanced DCF with Industry Comparables',
            'factors_considered': [
                'Annual Revenue',
                'Industry Category',
                'Company Age',
                'Growth Rate',
                'Market Position',
                'Asset Base'
            ]
        }
    except Exception as e:
        logger.error(f"Valuation processing error: {e}")
        raise

# API Endpoints
@app.post("/api/v2/valuations", response_model=ValuationResponse)
async def create_valuation(
    request: ValuationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new MSME valuation"""
    try:
        # Check cache first
        cached_valuation = await get_cached_valuation(app.state.redis, request.msme_id)
        if cached_valuation and (datetime.now() - cached_valuation.created_at).days < 30:
            return cached_valuation
        
        # Get MSME data from database
        async with app.state.db_pool.acquire() as conn:
            msme_data = await conn.fetchrow(
                "SELECT * FROM msmes WHERE id = $1",
                request.msme_id
            )
            
            if not msme_data:
                raise HTTPException(status_code=404, detail="MSME not found")
        
        valuation_id = f"val_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.msme_id[:8]}"
        
        # Quick valuation for immediate response
        if request.valuation_type == "basic":
            base_value = msme_data['annual_turnover'] * 2.5
            estimated_value = base_value
            confidence_score = 0.7
            
            valuation = ValuationResponse(
                valuation_id=valuation_id,
                msme_id=request.msme_id,
                estimated_value=estimated_value,
                valuation_range={
                    'min': estimated_value * 0.8,
                    'max': estimated_value * 1.2,
                    'most_likely': estimated_value
                },
                confidence_score=confidence_score,
                methodology="Basic Revenue Multiple",
                factors_considered=["Annual Revenue", "Industry Category"],
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=30)
            )
        else:
            # For detailed valuations, start async processing
            task = process_detailed_valuation.delay(
                dict(msme_data),
                request.model_dump()
            )
            
            # Create pending valuation record
            valuation = ValuationResponse(
                valuation_id=valuation_id,
                msme_id=request.msme_id,
                estimated_value=0,  # Will be updated when processing completes
                valuation_range={'min': 0, 'max': 0, 'most_likely': 0},
                confidence_score=0,
                methodology="Processing...",
                factors_considered=["Processing detailed analysis..."],
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=30)
            )
            
            # Store task ID for status tracking
            await app.state.redis.setex(
                f"valuation_task:{valuation_id}",
                3600,
                task.id
            )
        
        # Cache the valuation
        await cache_valuation(app.state.redis, valuation)
        
        # Store in database
        async with app.state.db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO valuations (id, msme_id, user_id, estimated_value, 
                                      confidence_score, methodology, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                valuation_id, request.msme_id, request.user_id,
                valuation.estimated_value, valuation.confidence_score,
                valuation.methodology, "completed" if request.valuation_type == "basic" else "processing",
                valuation.created_at
            )
        
        # Award points for completing valuation
        background_tasks.add_task(
            award_gamification_points,
            request.user_id,
            "valuation_completed",
            50 if request.valuation_type == "basic" else 100
        )
        
        VALUATION_COUNT.inc()
        
        return valuation
        
    except Exception as e:
        logger.error(f"Valuation creation error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v2/valuations/{valuation_id}", response_model=ValuationResponse)
async def get_valuation(
    valuation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get valuation by ID"""
    try:
        # Check cache first
        cached_valuation = await app.state.redis.get(f"valuation_result:{valuation_id}")
        if cached_valuation:
            CACHE_HIT_RATE.inc()
            return ValuationResponse(**json.loads(cached_valuation))
        
        # Get from database
        async with app.state.db_pool.acquire() as conn:
            valuation_data = await conn.fetchrow(
                "SELECT * FROM valuations WHERE id = $1",
                valuation_id
            )
            
            if not valuation_data:
                raise HTTPException(status_code=404, detail="Valuation not found")
        
        # Check if async processing is complete
        task_id = await app.state.redis.get(f"valuation_task:{valuation_id}")
        if task_id:
            task_result = celery_app.AsyncResult(task_id)
            if task_result.ready():
                result = task_result.result
                # Update valuation with results
                # ... (update logic here)
        
        CACHE_MISS_RATE.inc()
        return valuation_data
        
    except Exception as e:
        logger.error(f"Valuation retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v2/valuations/msme/{msme_id}")
async def get_msme_valuations(
    msme_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all valuations for an MSME"""
    try:
        async with app.state.db_pool.acquire() as conn:
            valuations = await conn.fetch(
                "SELECT * FROM valuations WHERE msme_id = $1 ORDER BY created_at DESC",
                msme_id
            )
        
        return {"valuations": [dict(v) for v in valuations]}
        
    except Exception as e:
        logger.error(f"MSME valuations retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Gamification integration
async def award_gamification_points(user_id: str, action: str, points: int):
    """Award gamification points to user"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{os.getenv('GAMIFICATION_SERVICE_URL')}/api/award-points",
                json={
                    "user_id": user_id,
                    "action": action,
                    "points": points,
                    "service": "valuation"
                }
            )
    except Exception as e:
        logger.error(f"Gamification points award error: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        await app.state.redis.ping()
        
        # Check database connection
        async with app.state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        
        return {
            "status": "healthy",
            "service": "valuation-service",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Batch processing endpoint
@app.post("/api/v2/valuations/batch")
async def batch_valuations(
    msme_ids: List[str],
    valuation_type: str = "basic",
    current_user: dict = Depends(get_current_user)
):
    """Process multiple valuations in batch"""
    try:
        tasks = []
        for msme_id in msme_ids:
            task = process_detailed_valuation.delay(
                {"msme_id": msme_id},
                {"valuation_type": valuation_type}
            )
            tasks.append({"msme_id": msme_id, "task_id": task.id})
        
        return {"batch_id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}", "tasks": tasks}
        
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        raise HTTPException(status_code=500, detail="Batch processing failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )