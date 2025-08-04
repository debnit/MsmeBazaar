# app/services/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

# Globals for engine and session factory
_engine = None
_async_session = None


async def init_db(database_url:str):
    """
    Initialize the async database engine and session factory.
    Uses asyncpg driver for PostgreSQL.
    """
    global _engine, _async_session

    # Ensure asyncpg driver is used
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    _engine = create_async_engine(database_url, echo=False, future=True)

    _async_session = sessionmaker(
        _engine, expire_on_commit=False, class_=AsyncSession
    )


async def close_db():
    """Dispose of the database engine."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


def get_session() -> AsyncSession:
    """
    Dependency function for FastAPI routes.
    Returns a new async database session.
    """
    if _async_session is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _async_session()
