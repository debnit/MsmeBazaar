# app/utils/db.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ✅ Add these functions so events.py can import them
async def connect_db():
    """Ensure the DB connection is established (called on startup)."""
    async with engine.begin() as conn:
        # Optional: Test DB connection
        await conn.run_sync(lambda sync_conn: None)
    print("✅ Database connected")

async def disconnect_db():
    """Close the DB connection (called on shutdown)."""
    await engine.dispose()
    print("🛑 Database disconnected")
