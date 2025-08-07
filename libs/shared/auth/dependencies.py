# libs/shared/auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from libs.db.session import get_session
from libs.db.models.user import User
from libs.shared.auth.tokens import decode_access_token
from libs.shared.exceptions import raise_unauthorized

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")  # adjust path as needed

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise_unauthorized("Invalid credentials")

        # Fetch user from DB
        result = await session.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalars().first()
        if user is None:
            raise_unauthorized("User not found")

        return user

    except Exception:
        raise_unauthorized("Invalid token or user not found")

async def get_active_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if not current_user.is_active:
        raise_unauthorized("Inactive user")
    return current_user
