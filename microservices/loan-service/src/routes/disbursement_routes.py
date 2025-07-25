"""
Loan disbursement and fund transfer routes
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

class DisbursementStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DisbursementMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    RTGS = "rtgs"
    NEFT = "neft"
    IMPS = "imps"
    UPI = "upi"

class DisbursementRequest(BaseModel):
    application_id: str = Field(..., description="Approved loan application ID")
    amount: float = Field(..., gt=0, description="Disbursement amount")
    method: DisbursementMethod = Field(..., description="Disbursement method")
    bank_details: Dict[str, Any] = Field(..., description="Beneficiary bank details")
    purpose: str = Field(..., description="Purpose of disbursement")
    scheduled_date: Optional[datetime] = Field(None, description="Scheduled disbursement date")

class Disbursement(BaseModel):
    id: str
    application_id: str
    amount: float
    method: DisbursementMethod
    status: DisbursementStatus
    bank_details: Dict[str, Any]
    purpose: str
    transaction_reference: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    processed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    failure_reason: Optional[str] = None

class DisbursementResponse(BaseModel):
    id: str
    status: DisbursementStatus
    message: str
    transaction_reference: Optional[str] = None
    estimated_completion: Optional[datetime] = None

@router.post("/initiate", response_model=DisbursementResponse)
async def initiate_disbursement(
    request: DisbursementRequest,
    token: str = Depends(security)
):
    """
    Initiate loan disbursement for an approved application
    """
    try:
        logger.info(f"Initiating disbursement for application {request.application_id}")
        
        # Validate application is approved and ready for disbursement
        # Check if amount matches approved amount
        # Validate bank details
        # Create disbursement record
        
        disbursement_id = f"DISB_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.application_id[-8:]}"
        transaction_ref = f"TXN_{disbursement_id[-12:]}"
        
        # In real implementation, this would:
        # 1. Validate the loan application status
        # 2. Check approved amount vs requested amount
        # 3. Validate bank account details
        # 4. Create disbursement record in database
        # 5. Initiate payment through banking partner APIs
        
        return DisbursementResponse(
            id=disbursement_id,
            status=DisbursementStatus.PENDING,
            message="Disbursement initiated successfully",
            transaction_reference=transaction_ref,
            estimated_completion=datetime.now().replace(hour=datetime.now().hour + 2)
        )
    
    except Exception as e:
        logger.error(f"Error initiating disbursement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate disbursement"
        )

@router.get("/status/{disbursement_id}", response_model=Disbursement)
async def get_disbursement_status(
    disbursement_id: str,
    token: str = Depends(security)
):
    """
    Get disbursement status and details
    """
    try:
        logger.info(f"Fetching disbursement status for {disbursement_id}")
        
        # This would be a database query
        # Placeholder response
        disbursement = Disbursement(
            id=disbursement_id,
            application_id="LA_20240101_120000_BUSINESS1",
            amount=450000.0,
            method=DisbursementMethod.RTGS,
            status=DisbursementStatus.COMPLETED,
            bank_details={
                "account_number": "1234****5678",
                "ifsc_code": "HDFC0001234",
                "bank_name": "HDFC Bank",
                "account_holder": "ABC Enterprises Pvt Ltd"
            },
            purpose="Working capital loan disbursement",
            transaction_reference="TXN_240101_001",
            scheduled_date=None,
            processed_date=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            failure_reason=None
        )
        
        return disbursement
    
    except Exception as e:
        logger.error(f"Error fetching disbursement status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disbursement not found"
        )

@router.get("/application/{application_id}", response_model=List[Disbursement])
async def get_application_disbursements(
    application_id: str,
    token: str = Depends(security)
):
    """
    Get all disbursements for a loan application
    """
    try:
        logger.info(f"Fetching disbursements for application {application_id}")
        
        # This would be a database query
        disbursements = []  # Placeholder
        
        return disbursements
    
    except Exception as e:
        logger.error(f"Error fetching application disbursements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch disbursements"
        )

@router.post("/validate-bank-details")
async def validate_bank_details(
    bank_details: Dict[str, Any],
    token: str = Depends(security)
):
    """
    Validate bank account details for disbursement
    """
    try:
        logger.info("Validating bank details")
        
        account_number = bank_details.get("account_number")
        ifsc_code = bank_details.get("ifsc_code")
        
        # This would integrate with bank verification APIs
        # For now, basic validation
        
        if not account_number or len(account_number) < 9:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account number"
            )
        
        if not ifsc_code or len(ifsc_code) != 11:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IFSC code"
            )
        
        return {
            "valid": True,
            "bank_name": "HDFC Bank",  # Would come from IFSC lookup
            "branch": "Mumbai Main Branch",
            "account_holder_verified": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating bank details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate bank details"
        )

@router.put("/cancel/{disbursement_id}")
async def cancel_disbursement(
    disbursement_id: str,
    reason: str,
    token: str = Depends(security)
):
    """
    Cancel a pending disbursement
    """
    try:
        logger.info(f"Cancelling disbursement {disbursement_id}")
        
        # Check if disbursement can be cancelled (only pending/in_progress)
        # Update status and send notifications
        
        return {
            "id": disbursement_id,
            "status": DisbursementStatus.CANCELLED,
            "message": "Disbursement cancelled successfully",
            "reason": reason
        }
    
    except Exception as e:
        logger.error(f"Error cancelling disbursement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel disbursement"
        )

@router.get("/reports/summary")
async def get_disbursement_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    token: str = Depends(security)
):
    """
    Get disbursement summary report
    """
    try:
        logger.info("Generating disbursement summary report")
        
        # This would aggregate data from database
        summary = {
            "total_disbursements": 0,
            "total_amount": 0.0,
            "successful_disbursements": 0,
            "failed_disbursements": 0,
            "pending_disbursements": 0,
            "average_processing_time_hours": 0.0,
            "disbursement_methods": {
                "RTGS": 0,
                "NEFT": 0,
                "IMPS": 0,
                "UPI": 0
            }
        }
        
        return summary
    
    except Exception as e:
        logger.error(f"Error generating disbursement summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary report"
        )

@router.post("/webhook/status-update")
async def handle_disbursement_webhook(
    webhook_data: Dict[str, Any]
):
    """
    Handle disbursement status updates from banking partners
    """
    try:
        logger.info("Processing disbursement status webhook")
        
        # Validate webhook signature
        # Update disbursement status
        # Send notifications to stakeholders
        
        return {"status": "processed", "message": "Webhook processed successfully"}
    
    except Exception as e:
        logger.error(f"Error processing disbursement webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )