"""
Loan-as-a-Service microservice for NBFCs/Banks
Provides loan application, underwriting, and disbursement workflows
"""
import os
import sys
from pathlib import Path

# Add the workspace root to Python path for imports
workspace_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(workspace_root))

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import Dict, Any

# Import routes with relative imports
from routes import loan_routes, underwriting_routes, disbursement_routes
from workflows import loan_workflow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Loan Service...")
    # Initialize database connections, ML models, etc.
    yield
    logger.info("Shutting down Loan Service...")

app = FastAPI(
    title="Loan-as-a-Service API",
    description="Comprehensive loan processing service for NBFCs and Banks",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(loan_routes.router, prefix="/api/v1/loans", tags=["loans"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Loan Service is running", "version": "1.0.0", "service": "loan-service"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "loan-service",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )