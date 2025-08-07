from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create async session factory
async_session = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

# Base for models
Base = declarative_base()

# Dependency override
async def get_db():
    async with async_session() as session:
        yield session
