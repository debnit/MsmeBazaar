# libs/shared/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from libs.db.session import get_session
from libs.db.models.user import User
from libs.shared.auth.schemas import TokenRequest, TokenResponse
from libs.shared.auth.security import verify_password
from libs.shared.auth.tokens import create_access_token
from libs.shared.auth.settings import get_auth_settings

from sqlalchemy.future import select
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/token", response_model=TokenResponse, summary="Login and get JWT token")
async def login_for_access_token(
    credentials: TokenRequest,
    session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    result = await session.execute(
        select(User).where(User.phone == credentials.username)
    )
    user: User | None = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_auth_settings()
    token_expiry = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=token_expiry
    )

    return TokenResponse(access_token=access_token, token_type="bearer")
