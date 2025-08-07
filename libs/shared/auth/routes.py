# libs/shared/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from libs.db.session import get_session
from libs.db.models.user import User
from libs.shared.auth.security import verify_password
from libs.shared.auth.tokens import create_access_token
from libs.shared.auth.settings import get_auth_settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/token", summary="Login and get JWT token", response_model=dict)
async def login_for_access_token(
    username: str = Form(...),
    password: str = Form(...),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Login route to retrieve an access token for a valid user.
    """
    result = await session.execute(
        select(User).where(User.phone == username)  # Optionally match on email/username too
    )
    user: User | None = result.scalars().first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_auth_settings()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
