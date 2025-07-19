import asyncpg
import redis.asyncio as redis
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from config import settings
import structlog

logger = structlog.get_logger()

class Database:
    def __init__(self):
        self.pool = None
        self.redis_client = None
    
    async def connect(self):
        """Initialize database connections"""
        try:
            # PostgreSQL connection pool
            self.pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=5,
                max_size=20,
                command_timeout=60
            )
            
            # Redis connection
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                retry_on_timeout=True
            )
            
            # Test connections
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            
            await self.redis_client.ping()
            
            logger.info("Database connections established")
            
        except Exception as e:
            logger.error("Failed to connect to databases", error=str(e))
            raise
    
    async def disconnect(self):
        """Close database connections"""
        if self.pool:
            await self.pool.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info("Database connections closed")
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Get a database connection from the pool"""
        async with self.pool.acquire() as conn:
            yield conn
    
    async def get_redis(self) -> redis.Redis:
        """Get Redis client"""
        return self.redis_client

# Global database instance
db = Database()

async def get_db_connection():
    """Dependency to get database connection"""
    async with db.get_connection() as conn:
        yield conn

async def get_redis_client():
    """Dependency to get Redis client"""
    return await db.get_redis()