"""
Simple disbursement routes placeholder
"""
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def disbursement_health():
    """Health check for disbursement routes"""
    return {"status": "healthy", "module": "disbursement_routes"}