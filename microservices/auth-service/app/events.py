import logging
from fastapi import FastAPI
from app.config import get_settings
from app.services.db import init_db, close_db
from app.services.redis_service import init_redis, close_redis

logger = logging.getLogger(__name__)
settings = get_settings()


async def on_startup() -> None:
    """Runs when FastAPI starts up."""
    logger.info("🚀 Starting %s", settings.PROJECT_NAME)
    logger.info("📦 Environment: %s", settings.ENV)

    # Initialize DB
    await init_db(settings.DATABASE_URL)
    logger.info("✅ Database initialized")

    # Initialize Redis
    await init_redis(settings.REDIS_URL)
    logger.info("✅ Redis initialized")


async def on_shutdown() -> None:
    """Runs when FastAPI shuts down."""
    logger.info("🛑 Shutting down %s", settings.PROJECT_NAME)

    # Close DB
    await close_db()
    logger.info("🗄️ Database connection closed")

    # Close Redis
    await close_redis()
    logger.info("📦 Redis connection closed")


def register_startup_shutdown(app: FastAPI) -> None:
    """Registers startup and shutdown events with the FastAPI app."""
    app.add_event_handler("startup", on_startup)
    app.add_event_handler("shutdown", on_shutdown)