from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
from typing import List, Optional
import logging
import os
import asyncpg
import jwt
from datetime import datetime

router = APIRouter()
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
DATABASE_URL = os.getenv("DATABASE_URL")

class MSME(BaseModel):
    id: str
    name: str
    phone: str
    state: str
    agreement_base64: str
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Invalid phone number')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Invalid name')
        return v.strip()

class MSMEResponse(BaseModel):
    success: bool
    data: Optional[List[MSME]] = None
    message: str
    timestamp: datetime

# Database connection
async def get_db_connection():
    """Get database connection with error handling"""
    try:
        if not DATABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database not configured"
            )
        return await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )

# Authentication dependency
async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and ensure admin role"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        user_role = payload.get("role")
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Expired token access attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        logger.warning("Invalid token access attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@router.get("/admin/msmes", response_model=MSMEResponse)
async def get_msmes(current_user = Depends(verify_admin_token)):
    """
    Get all MSME listings with authentication and proper error handling
    """
    try:
        logger.info(f"Admin {current_user.get('user_id')} accessing MSME listings")
        
        conn = await get_db_connection()
        try:
            # Query actual database instead of dummy data
            query = """
                SELECT id, name, phone, state, agreement_base64 
                FROM msme_listings 
                WHERE status = 'active'
                ORDER BY created_at DESC
                LIMIT 100
            """
            rows = await conn.fetch(query)
            
            msmes = []
            for row in rows:
                msme = MSME(
                    id=str(row['id']),
                    name=row['name'],
                    phone=row['phone'],
                    state=row['state'],
                    agreement_base64=row['agreement_base64'] or ""
                )
                msmes.append(msme)
            
            logger.info(f"Retrieved {len(msmes)} MSME listings")
            
            return MSMEResponse(
                success=True,
                data=msmes,
                message=f"Retrieved {len(msmes)} MSME listings",
                timestamp=datetime.utcnow()
            )
            
        finally:
            await conn.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving MSME listings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve MSME listings"
        )

@router.get("/admin/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        conn = await get_db_connection()
        await conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "service": "admin-api",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow(),
            "service": "admin-api",
            "database": "disconnected",
            "error": str(e)
        }
