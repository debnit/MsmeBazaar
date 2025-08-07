from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import verify_password, create_access_token
from app.models.user import User

async def authenticate_user(db: AsyncSession, username: str, password: str):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_jwt_for_user(user: User) -> str:
    access_token_expires = timedelta(minutes=30)
    return create_access_token({"sub": user.username}, expires_delta=access_token_expires)

async def create_user(user_in: UserCreate, db: AsyncSession):
    user = User(
        id=str(uuid4()),
        phone=user_in.phone,
        email=user_in.email,
        name=user_in.name,
        password=get_password_hash(user_in.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
