# microservices/auth-service/app/api/v1/routes/users.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class UserCreateRequest(BaseModel):
    phone: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str] = None


# Example in-memory storage (replace with DB logic)
fake_users_db = {}


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreateRequest):
    logger.info(f"Creating user: {payload.phone}")

    if payload.phone in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )

    user_id = len(fake_users_db) + 1
    fake_users_db[payload.phone] = {
        "id": user_id,
        "phone": payload.phone,
        "name": payload.name
    }

    return UserResponse(id=user_id, phone=payload.phone, name=payload.name)


@router.get("/{phone}", response_model=UserResponse)
async def get_user(phone: str):
    logger.info(f"Fetching user: {phone}")

    user = fake_users_db.get(phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(**user)
