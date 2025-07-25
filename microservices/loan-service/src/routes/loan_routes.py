"""
Loan application and management routes
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

class LoanStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISBURSED = "disbursed"
    ACTIVE = "active"
    CLOSED = "closed"

class LoanType(str, Enum):
    WORKING_CAPITAL = "working_capital"
    TERM_LOAN = "term_loan"
    EQUIPMENT_FINANCE = "equipment_finance"
    INVOICE_DISCOUNTING = "invoice_discounting"
    TRADE_CREDIT = "trade_credit"

class LoanApplicationRequest(BaseModel):
    business_id: str = Field(..., description="Unique business identifier")
    loan_type: LoanType = Field(..., description="Type of loan requested")
    amount: float = Field(..., gt=0, description="Loan amount requested")
    tenure_months: int = Field(..., gt=0, le=360, description="Loan tenure in months")
    purpose: str = Field(..., min_length=10, description="Purpose of the loan")
    collateral_details: Optional[Dict[str, Any]] = Field(None, description="Collateral information")
    guarantor_details: Optional[Dict[str, Any]] = Field(None, description="Guarantor information")

class LoanApplication(BaseModel):
    id: str
    business_id: str
    loan_type: LoanType
    amount: float
    tenure_months: int
    purpose: str
    status: LoanStatus
    created_at: datetime
    updated_at: datetime
    collateral_details: Optional[Dict[str, Any]] = None
    guarantor_details: Optional[Dict[str, Any]] = None
    risk_score: Optional[float] = None
    interest_rate: Optional[float] = None

class LoanApplicationResponse(BaseModel):
    id: str
    status: LoanStatus
    message: str
    next_steps: List[str]

@router.post("/applications", response_model=LoanApplicationResponse)
async def create_loan_application(
    application: LoanApplicationRequest,
    token: str = Depends(security)
):
    """
    Create a new loan application
    """
    try:
        # Validate business exists and user has permission
        # This would typically involve database queries and auth validation
        
        # Create loan application ID
        application_id = f"LA_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{application.business_id[:8]}"
        
        # Save to database (placeholder)
        logger.info(f"Creating loan application {application_id} for business {application.business_id}")
        
        return LoanApplicationResponse(
            id=application_id,
            status=LoanStatus.DRAFT,
            message="Loan application created successfully",
            next_steps=[
                "Upload required documents",
                "Complete KYC verification",
                "Submit application for review"
            ]
        )
    
    except Exception as e:
        logger.error(f"Error creating loan application: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create loan application"
        )

@router.get("/applications/{application_id}", response_model=LoanApplication)
async def get_loan_application(
    application_id: str,
    token: str = Depends(security)
):
    """
    Get loan application details by ID
    """
    try:
        # Fetch from database (placeholder)
        logger.info(f"Fetching loan application {application_id}")
        
        # This would be a database query
        application = LoanApplication(
            id=application_id,
            business_id="BUSINESS_123",
            loan_type=LoanType.WORKING_CAPITAL,
            amount=500000.0,
            tenure_months=24,
            purpose="Working capital for inventory purchase",
            status=LoanStatus.UNDER_REVIEW,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            risk_score=75.5,
            interest_rate=12.5
        )
        
        return application
    
    except Exception as e:
        logger.error(f"Error fetching loan application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan application not found"
        )

@router.get("/applications", response_model=List[LoanApplication])
async def list_loan_applications(
    business_id: Optional[str] = None,
    status: Optional[LoanStatus] = None,
    limit: int = 10,
    offset: int = 0,
    token: str = Depends(security)
):
    """
    List loan applications with filtering
    """
    try:
        logger.info(f"Listing loan applications with filters: business_id={business_id}, status={status}")
        
        # This would be a database query with filters
        applications = []  # Placeholder
        
        return applications
    
    except Exception as e:
        logger.error(f"Error listing loan applications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list loan applications"
        )

@router.put("/applications/{application_id}/submit")
async def submit_loan_application(
    application_id: str,
    token: str = Depends(security)
):
    """
    Submit loan application for review
    """
    try:
        logger.info(f"Submitting loan application {application_id}")
        
        # Validate all required documents are uploaded
        # Update status to submitted
        # Trigger underwriting workflow
        
        return {
            "id": application_id,
            "status": LoanStatus.SUBMITTED,
            "message": "Application submitted successfully",
            "next_steps": ["Application is under review", "You will be notified of the decision"]
        }
    
    except Exception as e:
        logger.error(f"Error submitting loan application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit loan application"
        )

@router.delete("/applications/{application_id}")
async def cancel_loan_application(
    application_id: str,
    token: str = Depends(security)
):
    """
    Cancel a loan application (only if in draft or submitted status)
    """
    try:
        logger.info(f"Cancelling loan application {application_id}")
        
        # Check if application can be cancelled
        # Update status and send notifications
        
        return {"message": "Loan application cancelled successfully"}
    
    except Exception as e:
        logger.error(f"Error cancelling loan application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel loan application"
        )