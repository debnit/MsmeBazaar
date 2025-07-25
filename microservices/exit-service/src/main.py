"""
Exit-as-a-Service microservice for MSME lifecycle management
Provides exit strategy planning, valuation, and execution services
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
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uvicorn
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

security = HTTPBearer()

class ExitType(str, Enum):
    ACQUISITION = "acquisition"
    MERGER = "merger"
    IPO = "ipo"
    STRATEGIC_SALE = "strategic_sale"
    MANAGEMENT_BUYOUT = "management_buyout"
    LIQUIDATION = "liquidation"
    SUCCESSION = "succession"

class ExitStatus(str, Enum):
    PLANNING = "planning"
    PREPARATION = "preparation"
    MARKETING = "marketing"
    NEGOTIATION = "negotiation"
    DUE_DILIGENCE = "due_diligence"
    CLOSING = "closing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ExitStrategy(BaseModel):
    id: str
    business_id: str
    exit_type: ExitType
    target_valuation: float
    timeline_months: int
    status: ExitStatus
    created_at: datetime
    updated_at: datetime
    completion_percentage: float = 0.0

class ExitStrategyRequest(BaseModel):
    business_id: str = Field(..., description="Unique business identifier")
    exit_type: ExitType = Field(..., description="Type of exit strategy")
    target_valuation: float = Field(..., gt=0, description="Target valuation amount")
    timeline_months: int = Field(..., gt=0, le=120, description="Target timeline in months")
    reasons: List[str] = Field(..., description="Reasons for exit")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Exit Service...")
    yield
    logger.info("Shutting down Exit Service...")

app = FastAPI(
    title="Exit-as-a-Service API",
    description="Comprehensive exit strategy and business transition services for MSMEs",
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

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Exit Service is running", "version": "1.0.0", "service": "exit-service"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "exit-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.post("/api/v1/exit-strategies", response_model=ExitStrategy)
async def create_exit_strategy(request: ExitStrategyRequest):
    """Create a new exit strategy for a business"""
    try:
        logger.info(f"Creating exit strategy for business {request.business_id}")
        
        # Generate strategy ID
        strategy_id = f"ES_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.business_id[:8]}"
        
        # Create exit strategy
        strategy = ExitStrategy(
            id=strategy_id,
            business_id=request.business_id,
            exit_type=request.exit_type,
            target_valuation=request.target_valuation,
            timeline_months=request.timeline_months,
            status=ExitStatus.PLANNING,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            completion_percentage=5.0
        )
        
        logger.info(f"Exit strategy {strategy_id} created successfully")
        return strategy
    
    except Exception as e:
        logger.error(f"Error creating exit strategy: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create exit strategy"
        )

@app.get("/api/v1/exit-strategies/{strategy_id}", response_model=ExitStrategy)
async def get_exit_strategy(strategy_id: str):
    """Get exit strategy details by ID"""
    try:
        logger.info(f"Fetching exit strategy {strategy_id}")
        
        # This would be a database query
        strategy = ExitStrategy(
            id=strategy_id,
            business_id="BUSINESS_123",
            exit_type=ExitType.ACQUISITION,
            target_valuation=5000000.0,
            timeline_months=18,
            status=ExitStatus.PREPARATION,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            completion_percentage=25.0
        )
        
        return strategy
    
    except Exception as e:
        logger.error(f"Error fetching exit strategy {strategy_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exit strategy not found"
        )

@app.get("/api/v1/exit-types")
async def get_exit_types():
    """Get available exit types with descriptions"""
    exit_types = [
        {
            "type": ExitType.ACQUISITION,
            "name": "Acquisition",
            "description": "Sale to another company or investor",
            "typical_timeline": "12-24 months",
            "complexity": "Medium"
        },
        {
            "type": ExitType.MERGER,
            "name": "Merger", 
            "description": "Combination with another business",
            "typical_timeline": "18-36 months",
            "complexity": "High"
        },
        {
            "type": ExitType.IPO,
            "name": "Initial Public Offering",
            "description": "Going public through stock exchange listing",
            "typical_timeline": "24-48 months",
            "complexity": "Very High"
        }
    ]
    
    return {"exit_types": exit_types}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
        log_level="info"
    )