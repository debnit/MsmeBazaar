# microservices/auth-service/app/services/redis_service.py
import logging
from typing import Optional
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_redis_client: Optional[Redis] = None


async def init_redis(redis_url: str):
    """
    Initialize Redis connection (async).
    """
    global _redis_client
    logger.info("📦 Connecting to Redis...")

    _redis_client = Redis.from_url(redis_url, decode_responses=True)
    try:
        pong = await _redis_client.ping()
        if pong:
            logger.info("✅ Redis connected successfully.")
    except Exception as e:
        logger.error("❌ Failed to connect to Redis: %s", e)
        raise


async def close_redis():
    """
    Close Redis connection.
    """
    global _redis_client
    if _redis_client:
        logger.info("🔻 Closing Redis connection...")
        await _redis_client.close()
        logger.info("✅ Redis connection closed.")


def get_redis() -> Redis:
    """
    Returns the Redis client.
    """
    if not _redis_client:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return _redis_client
