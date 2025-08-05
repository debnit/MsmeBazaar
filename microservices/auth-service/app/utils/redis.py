import redis.asyncio as aioredis
from loguru import logger
from app.config import settings

redis_client = None

async def connect_redis():
    global redis_client
    logger.info("Connecting to Redis...")
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    # Optional: ping to verify connection
    try:
        await redis_client.ping()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        redis_client = None

async def disconnect_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("✅ Redis connection closed")
