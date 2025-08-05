from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserRead, UserCreate
from app.services.user_service import create_user, get_user_by_id

router = APIRouter()

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate):
    """
    Registers a new user in the system.
    """
    user = await create_user(payload)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User could not be created")
    return user

@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int):
    """
    Fetch a single user by ID.
    """
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
