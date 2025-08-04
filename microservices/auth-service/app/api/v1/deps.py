"""
deps.py
Central place for FastAPI dependencies like DB sessions, Redis connections, and security utilities.
"""

from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from redis.asyncio import Redis

from app.config import get_settings
from app.services.db import async_session
from app.services.redis_service import get_redis_client

settings = get_settings()

# -----------------------
# Database Dependency
# -----------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide a SQLAlchemy async DB session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# -----------------------
# Redis Dependency
# -----------------------
async def get_redis() -> Redis:
    """Provide a Redis async client."""
    return get_redis_client()

# -----------------------
# Auth / Security Dependency
# -----------------------
def get_current_user(token: str = Depends(...)) -> dict:
    """
    Decode JWT and return current user payload.
    Replace `...` with your token extraction dependency (e.g., OAuth2PasswordBearer).
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
