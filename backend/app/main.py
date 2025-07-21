from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.routes import admin
import logging
import time
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MSMEBazaar API",
    description="MSME Platform Backend API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None
)

# Secure CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5000",
    "https://your-production-domain.com"  # Replace with actual production domain
]

# Only allow wildcard in development
if os.getenv("NODE_ENV") == "development":
    allowed_origins.append("http://localhost:*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"]
)

# Add trusted host middleware for production
if os.getenv("NODE_ENV") == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["your-production-domain.com", "api.your-domain.com"]
    )

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)} - Path: {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Generate request ID
    request_id = f"{int(time.time())}-{hash(str(request.url))}"
    
    # Log incoming request
    logger.info(f"Request ID: {request_id} - {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Add headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log response
    logger.info(f"Request ID: {request_id} - Status: {response.status_code} - Time: {process_time:.4f}s")
    
    return response

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "msmebazaar-backend",
        "version": "1.0.0"
    }

# Metrics endpoint for Prometheus
@app.get("/metrics")
async def metrics():
    """Metrics endpoint for Prometheus monitoring"""
    # This would typically integrate with prometheus_client
    return {
        "requests_total": 0,  # Would be actual metrics
        "requests_duration_seconds": 0,
        "active_connections": 0
    }

# Include routers
app.include_router(admin.router, prefix="/api")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("MSMEBazaar Backend API starting up...")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("MSMEBazaar Backend API shutting down...")
