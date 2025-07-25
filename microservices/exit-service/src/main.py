"""
Exit-as-a-Service microservice for MSME lifecycle management
Provides exit strategy planning, valuation, and execution services
"""
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
    estimated_completion: Optional[datetime] = None

class ExitStrategyRequest(BaseModel):
    business_id: str = Field(..., description="Unique business identifier")
    exit_type: ExitType = Field(..., description="Type of exit strategy")
    target_valuation: float = Field(..., gt=0, description="Target valuation amount")
    timeline_months: int = Field(..., gt=0, le=120, description="Target timeline in months")
    reasons: List[str] = Field(..., description="Reasons for exit")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="Exit preferences")

class ValuationRequest(BaseModel):
    business_id: str
    valuation_method: str = Field(..., description="DCF, Market, Asset, etc.")
    financial_data: Dict[str, Any]
    market_data: Optional[Dict[str, Any]] = None

class Valuation(BaseModel):
    id: str
    business_id: str
    method: str
    valuation_amount: float
    confidence_level: float
    factors: List[Dict[str, Any]]
    created_at: datetime
    valid_until: datetime

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Exit Service...")
    # Initialize database connections, etc.
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
    return {"message": "Exit Service is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "exit-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/exit-strategies", response_model=ExitStrategy)
async def create_exit_strategy(
    request: ExitStrategyRequest,
    token: str = Depends(security)
):
    """
    Create a new exit strategy for a business
    """
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
            completion_percentage=5.0,  # Initial planning phase
            estimated_completion=datetime.now().replace(
                month=datetime.now().month + request.timeline_months
            ) if request.timeline_months <= 12 else None
        )
        
        # Save to database (placeholder)
        logger.info(f"Exit strategy {strategy_id} created successfully")
        
        return strategy
    
    except Exception as e:
        logger.error(f"Error creating exit strategy: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create exit strategy"
        )

@app.get("/api/v1/exit-strategies/{strategy_id}", response_model=ExitStrategy)
async def get_exit_strategy(
    strategy_id: str,
    token: str = Depends(security)
):
    """
    Get exit strategy details by ID
    """
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
            completion_percentage=25.0,
            estimated_completion=datetime.now().replace(
                month=datetime.now().month + 15
            )
        )
        
        return strategy
    
    except Exception as e:
        logger.error(f"Error fetching exit strategy {strategy_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exit strategy not found"
        )

@app.get("/api/v1/businesses/{business_id}/exit-strategies", response_model=List[ExitStrategy])
async def list_business_exit_strategies(
    business_id: str,
    status_filter: Optional[ExitStatus] = None,
    token: str = Depends(security)
):
    """
    List all exit strategies for a business
    """
    try:
        logger.info(f"Listing exit strategies for business {business_id}")
        
        # This would be a database query with filters
        strategies = []  # Placeholder
        
        return strategies
    
    except Exception as e:
        logger.error(f"Error listing exit strategies: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list exit strategies"
        )

@app.post("/api/v1/valuations", response_model=Valuation)
async def perform_business_valuation(
    request: ValuationRequest,
    token: str = Depends(security)
):
    """
    Perform business valuation for exit planning
    """
    try:
        logger.info(f"Performing valuation for business {request.business_id}")
        
        # This would integrate with valuation models
        # For now, using placeholder logic
        
        revenue = request.financial_data.get("annual_revenue", 0)
        profit = request.financial_data.get("net_profit", 0)
        assets = request.financial_data.get("total_assets", 0)
        
        # Simple valuation calculation (would be replaced with sophisticated models)
        if request.valuation_method.lower() == "dcf":
            # Discounted Cash Flow
            valuation_amount = profit * 8  # 8x net profit multiple
            confidence_level = 0.75
        elif request.valuation_method.lower() == "market":
            # Market multiple
            valuation_amount = revenue * 2.5  # Industry multiple
            confidence_level = 0.65
        elif request.valuation_method.lower() == "asset":
            # Asset-based
            valuation_amount = assets * 1.2  # Asset value with premium
            confidence_level = 0.85
        else:
            valuation_amount = (revenue * 2 + profit * 6) / 2  # Hybrid approach
            confidence_level = 0.70
        
        valuation_id = f"VAL_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.business_id[:8]}"
        
        valuation = Valuation(
            id=valuation_id,
            business_id=request.business_id,
            method=request.valuation_method,
            valuation_amount=valuation_amount,
            confidence_level=confidence_level,
            factors=[
                {"factor": "Revenue Growth", "impact": "positive", "weight": 0.3},
                {"factor": "Profit Margins", "impact": "positive", "weight": 0.25},
                {"factor": "Market Position", "impact": "positive", "weight": 0.2},
                {"factor": "Industry Trends", "impact": "neutral", "weight": 0.15},
                {"factor": "Management Quality", "impact": "positive", "weight": 0.1}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now().replace(month=datetime.now().month + 6)
        )
        
        return valuation
    
    except Exception as e:
        logger.error(f"Error performing valuation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform valuation"
        )

@app.get("/api/v1/valuations/{valuation_id}", response_model=Valuation)
async def get_valuation(
    valuation_id: str,
    token: str = Depends(security)
):
    """
    Get valuation details by ID
    """
    try:
        logger.info(f"Fetching valuation {valuation_id}")
        
        # This would be a database query
        valuation = Valuation(
            id=valuation_id,
            business_id="BUSINESS_123",
            method="DCF",
            valuation_amount=4500000.0,
            confidence_level=0.75,
            factors=[
                {"factor": "Revenue Growth", "impact": "positive", "weight": 0.3},
                {"factor": "Profit Margins", "impact": "positive", "weight": 0.25}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now().replace(month=datetime.now().month + 6)
        )
        
        return valuation
    
    except Exception as e:
        logger.error(f"Error fetching valuation {valuation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valuation not found"
        )

@app.get("/api/v1/exit-types", response_model=List[Dict[str, Any]])
async def get_exit_types():
    """
    Get available exit types with descriptions
    """
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
        },
        {
            "type": ExitType.STRATEGIC_SALE,
            "name": "Strategic Sale",
            "description": "Sale to strategic buyer in same industry",
            "typical_timeline": "12-18 months",
            "complexity": "Medium"
        },
        {
            "type": ExitType.MANAGEMENT_BUYOUT,
            "name": "Management Buyout",
            "description": "Sale to existing management team",
            "typical_timeline": "6-12 months",
            "complexity": "Low"
        },
        {
            "type": ExitType.SUCCESSION,
            "name": "Family Succession",
            "description": "Transfer to family members",
            "typical_timeline": "12-60 months",
            "complexity": "Medium"
        }
    ]
    
    return exit_types

@app.put("/api/v1/exit-strategies/{strategy_id}/status")
async def update_exit_strategy_status(
    strategy_id: str,
    status_data: Dict[str, Any],
    token: str = Depends(security)
):
    """
    Update exit strategy status and progress
    """
    try:
        logger.info(f"Updating exit strategy {strategy_id} status")
        
        new_status = status_data.get("status")
        progress = status_data.get("completion_percentage", 0)
        notes = status_data.get("notes", "")
        
        # Update in database (placeholder)
        # Send notifications to stakeholders
        
        return {
            "strategy_id": strategy_id,
            "status": new_status,
            "completion_percentage": progress,
            "message": "Exit strategy status updated successfully",
            "updated_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error updating exit strategy status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update exit strategy status"
        )

@app.get("/api/v1/market-insights")
async def get_market_insights(
    industry: Optional[str] = None,
    business_size: Optional[str] = None,
    region: Optional[str] = None
):
    """
    Get market insights for exit planning
    """
    try:
        logger.info("Fetching market insights")
        
        # This would integrate with market data providers
        insights = {
            "market_conditions": {
                "overall_sentiment": "positive",
                "m_and_a_activity": "high",
                "average_multiples": {
                    "revenue_multiple": 2.5,
                    "ebitda_multiple": 8.2
                }
            },
            "industry_trends": [
                "Digital transformation driving valuations",
                "ESG compliance becoming important",
                "Consolidation in traditional sectors"
            ],
            "timing_recommendations": {
                "current_market": "favorable",
                "recommended_action": "proceed_with_caution",
                "best_timing": "Q2-Q3 2024"
            },
            "valuation_benchmarks": {
                "industry_average": 4200000,
                "top_quartile": 6800000,
                "median": 3500000
            }
        }
        
        return insights
    
    except Exception as e:
        logger.error(f"Error fetching market insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch market insights"
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
        log_level="info"
    )