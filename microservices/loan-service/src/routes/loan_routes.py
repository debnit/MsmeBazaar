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

class LoanApplicationResponse(BaseModel):
    id: str
    status: LoanStatus
    message: str
    next_steps: List[str]

@router.get("/health")
async def loans_health():
    """Health check for loans routes"""
    return {"status": "healthy", "module": "loan_routes"}

@router.post("/applications", response_model=LoanApplicationResponse)
async def create_loan_application(
    application: LoanApplicationRequest
):
    """
    Create a new loan application
    """
    try:
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
async def get_loan_application(application_id: str):
    """
    Get loan application details by ID
    """
    try:
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
            updated_at=datetime.now()
        )
        
        return application
    
    except Exception as e:
        logger.error(f"Error fetching loan application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan application not found"
        )

@router.get("/applications")
async def list_loan_applications(
    business_id: Optional[str] = None,
    status: Optional[LoanStatus] = None,
    limit: int = 10,
    offset: int = 0
):
    """
    List loan applications with filtering
    """
    try:
        logger.info(f"Listing loan applications with filters: business_id={business_id}, status={status}")
        
        # This would be a database query with filters
        applications = []  # Placeholder
        
        return {
            "applications": applications,
            "total": 0,
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Error listing loan applications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list loan applications"
        )