from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from libs.db.session import get_session
from app.services.user_service import get_user_by_id

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{user_id}")
async def read_user(user_id: int, db: AsyncSession = Depends(get_session)):
    user = await get_user_by_id(db, user_id)
    return {"user": user}
