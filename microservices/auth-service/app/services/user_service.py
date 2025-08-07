from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from libs.shared.models import.user import User
from app.schemas.user import UserCreate, UserRead
from app.core.security import hash_password
from uuid import uuid4

async def create_user(db: AsyncSession, payload: UserCreate) -> UserRead:
    db_user = User(
        id=str(uuid4()),
        phone=payload.phone,
        email=payload.email,
        name=payload.full_name,
        role=payload.role,
        is_verified=False,
        is_active=True,
        hashed_password=hash_password(payload.password)
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return UserRead.model_validate(db_user)

async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: str):
    """Fetch a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
