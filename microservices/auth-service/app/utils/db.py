from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from loguru import logger
from app.config import settings

engine = None
AsyncSessionLocal = None

async def connect_db():
    global engine, AsyncSessionLocal
    logger.info("Connecting to PostgreSQL...")
    engine = create_async_engine(settings.DATABASE_URL, future=True, echo=False)
    AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    logger.info("✅ PostgreSQL connected")

async def disconnect_db():
    global engine
    if engine:
        await engine.dispose()
        logger.info("✅ PostgreSQL connection closed")
