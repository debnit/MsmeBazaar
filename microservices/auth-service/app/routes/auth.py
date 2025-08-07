from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserIn
from app.services.auth_service import authenticate_user, create_jwt_for_user
from libs.db.session import get_async_session

router = APIRouter()

@router.post("/token")
async def login(user_in: UserIn, db: AsyncSession = Depends(get_async_session)):
    user = await authenticate_user(db, user_in.username, user_in.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt_for_user(user)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_async_session)):
    user = await create_user(user_in, db)
    return user

