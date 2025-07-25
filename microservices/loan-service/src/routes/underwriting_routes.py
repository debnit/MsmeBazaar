"""
Underwriting and risk assessment routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter()

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class UnderwritingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REQUIRES_MANUAL_REVIEW = "requires_manual_review"
    APPROVED = "approved"
    REJECTED = "rejected"

class RiskAssessmentRequest(BaseModel):
    application_id: str = Field(..., description="Loan application ID")
    financial_data: Dict[str, Any] = Field(..., description="Business financial information")
    credit_history: Optional[Dict[str, Any]] = Field(None, description="Credit history data")
    industry_data: Optional[Dict[str, Any]] = Field(None, description="Industry-specific data")

class RiskAssessment(BaseModel):
    id: str
    application_id: str
    risk_score: float = Field(..., ge=0, le=100, description="Risk score out of 100")
    risk_level: RiskLevel
    confidence_score: float = Field(..., ge=0, le=1, description="Model confidence")
    factors: List[Dict[str, Any]] = Field(..., description="Key risk factors")
    recommendations: List[str] = Field(..., description="Underwriter recommendations")
    created_at: datetime
    model_version: str

class UnderwritingDecision(BaseModel):
    application_id: str
    decision: str  # approved, rejected, conditional_approval
    approved_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    conditions: Optional[List[str]] = None
    reasons: List[str]
    underwriter_id: str
    decision_date: datetime

@router.post("/risk-assessment", response_model=RiskAssessment)
async def perform_risk_assessment(
    request: RiskAssessmentRequest,
    token: str = Depends(security)
):
    """
    Perform automated risk assessment for a loan application
    """
    try:
        logger.info(f"Performing risk assessment for application {request.application_id}")
        
        # This would integrate with ML models for risk scoring
        # For now, using placeholder logic
        
        # Calculate risk score based on financial data
        revenue = request.financial_data.get("annual_revenue", 0)
        profit_margin = request.financial_data.get("profit_margin", 0)
        debt_to_equity = request.financial_data.get("debt_to_equity_ratio", 0)
        
        # Simple risk scoring logic (would be replaced with ML model)
        base_score = 50
        if revenue > 1000000:
            base_score += 20
        elif revenue > 500000:
            base_score += 10
        
        if profit_margin > 0.15:
            base_score += 15
        elif profit_margin > 0.1:
            base_score += 10
        
        if debt_to_equity < 0.5:
            base_score += 15
        elif debt_to_equity < 1.0:
            base_score += 5
        else:
            base_score -= 10
        
        risk_score = min(max(base_score, 0), 100)
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = RiskLevel.LOW
        elif risk_score >= 60:
            risk_level = RiskLevel.MEDIUM
        elif risk_score >= 40:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.VERY_HIGH
        
        # Generate factors and recommendations
        factors = [
            {"factor": "Annual Revenue", "value": revenue, "impact": "positive" if revenue > 500000 else "negative"},
            {"factor": "Profit Margin", "value": profit_margin, "impact": "positive" if profit_margin > 0.1 else "negative"},
            {"factor": "Debt-to-Equity Ratio", "value": debt_to_equity, "impact": "negative" if debt_to_equity > 1.0 else "positive"}
        ]
        
        recommendations = []
        if risk_level == RiskLevel.LOW:
            recommendations.append("Approve with standard terms")
        elif risk_level == RiskLevel.MEDIUM:
            recommendations.append("Approve with moderate interest rate")
            recommendations.append("Consider additional collateral")
        else:
            recommendations.append("Requires manual review")
            recommendations.append("Consider higher interest rate or additional guarantees")
        
        assessment_id = f"RA_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.application_id[-8:]}"
        
        assessment = RiskAssessment(
            id=assessment_id,
            application_id=request.application_id,
            risk_score=risk_score,
            risk_level=risk_level,
            confidence_score=0.85,  # Would come from ML model
            factors=factors,
            recommendations=recommendations,
            created_at=datetime.now(),
            model_version="v1.0.0"
        )
        
        return assessment
    
    except Exception as e:
        logger.error(f"Error performing risk assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform risk assessment"
        )

@router.get("/risk-assessment/{application_id}", response_model=RiskAssessment)
async def get_risk_assessment(
    application_id: str,
    token: str = Depends(security)
):
    """
    Get risk assessment for a loan application
    """
    try:
        logger.info(f"Fetching risk assessment for application {application_id}")
        
        # This would be a database query
        # Placeholder response
        assessment = RiskAssessment(
            id=f"RA_20240101_120000_{application_id[-8:]}",
            application_id=application_id,
            risk_score=75.0,
            risk_level=RiskLevel.MEDIUM,
            confidence_score=0.85,
            factors=[
                {"factor": "Annual Revenue", "value": 750000, "impact": "positive"},
                {"factor": "Profit Margin", "value": 0.12, "impact": "positive"}
            ],
            recommendations=["Approve with moderate interest rate"],
            created_at=datetime.now(),
            model_version="v1.0.0"
        )
        
        return assessment
    
    except Exception as e:
        logger.error(f"Error fetching risk assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk assessment not found"
        )

@router.post("/decisions", response_model=UnderwritingDecision)
async def make_underwriting_decision(
    decision_data: Dict[str, Any],
    token: str = Depends(security)
):
    """
    Make final underwriting decision for a loan application
    """
    try:
        application_id = decision_data.get("application_id")
        logger.info(f"Making underwriting decision for application {application_id}")
        
        # Validate underwriter permissions
        # Process decision logic
        # Update application status
        # Send notifications
        
        decision = UnderwritingDecision(
            application_id=application_id,
            decision=decision_data.get("decision", "approved"),
            approved_amount=decision_data.get("approved_amount"),
            interest_rate=decision_data.get("interest_rate"),
            tenure_months=decision_data.get("tenure_months"),
            conditions=decision_data.get("conditions", []),
            reasons=decision_data.get("reasons", []),
            underwriter_id=decision_data.get("underwriter_id", "SYSTEM"),
            decision_date=datetime.now()
        )
        
        return decision
    
    except Exception as e:
        logger.error(f"Error making underwriting decision: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to make underwriting decision"
        )

@router.get("/decisions/{application_id}", response_model=UnderwritingDecision)
async def get_underwriting_decision(
    application_id: str,
    token: str = Depends(security)
):
    """
    Get underwriting decision for a loan application
    """
    try:
        logger.info(f"Fetching underwriting decision for application {application_id}")
        
        # This would be a database query
        # Placeholder response
        decision = UnderwritingDecision(
            application_id=application_id,
            decision="approved",
            approved_amount=450000.0,
            interest_rate=12.5,
            tenure_months=24,
            conditions=["Monthly financial reporting required"],
            reasons=["Good credit history", "Stable business performance"],
            underwriter_id="UW_001",
            decision_date=datetime.now()
        )
        
        return decision
    
    except Exception as e:
        logger.error(f"Error fetching underwriting decision: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Underwriting decision not found"
        )

@router.get("/queue", response_model=List[Dict[str, Any]])
async def get_underwriting_queue(
    priority: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    token: str = Depends(security)
):
    """
    Get applications in underwriting queue
    """
    try:
        logger.info("Fetching underwriting queue")
        
        # This would fetch from database with proper filtering
        queue = []  # Placeholder
        
        return queue
    
    except Exception as e:
        logger.error(f"Error fetching underwriting queue: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch underwriting queue"
        )