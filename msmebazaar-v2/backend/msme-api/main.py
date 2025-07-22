from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import asyncpg
import redis
from pydantic import BaseModel

# Create FastAPI app
app = FastAPI(
    title="MSMEBazaar MSME API",
    description="MSME management and data processing microservice",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    database: str
    redis: str
    environment: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring and load balancer"""
    
    # Check database connection
    database_status = "unknown"
    try:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            conn = await asyncpg.connect(database_url)
            await conn.execute("SELECT 1")
            await conn.close()
            database_status = "healthy"
    except Exception as e:
        database_status = f"unhealthy: {str(e)}"
    
    # Check Redis connection
    redis_status = "unknown"
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(redis_url)
        r.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
    
    return HealthResponse(
        status="healthy" if database_status == "healthy" and redis_status == "healthy" else "unhealthy",
        service="msme-api",
        version="2.0.0",
        timestamp=datetime.utcnow().isoformat(),
        database=database_status,
        redis=redis_status,
        environment=os.getenv("ENVIRONMENT", "development")
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MSMEBazaar MSME API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs"
    }

# Add your MSME routes here
# from routes import msmes, documents
# app.include_router(msmes.router, prefix="/msmes", tags=["MSMEs"])
# app.include_router(documents.router, prefix="/documents", tags=["Documents"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable in production
        log_level="info"
    )