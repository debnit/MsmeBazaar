# microservices/auth-service/app/api/v1/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Example request/response models
class LoginRequest(BaseModel):
    phone: str
    otp: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    logger.info(f"Login request for {payload.phone}")

    # Example OTP verification logic (replace with real)
    if payload.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP"
        )

    # Simulated JWT token (replace with real JWT generation)
    token = f"fake-jwt-token-for-{payload.phone}"
    return LoginResponse(access_token=token)
