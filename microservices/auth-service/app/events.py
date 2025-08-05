from fastapi import FastAPI
from loguru import logger
from app.utils.db import connect_db, disconnect_db
from app.utils.redis import connect_redis, disconnect_redis

def register_startup_shutdown(app: FastAPI):
    @app.on_event("startup")
    async def startup_event():
        logger.info("🚀 Starting Auth Service...")
        await connect_db()
        await connect_redis()
        logger.info("✅ Startup tasks completed")

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("🛑 Shutting down Auth Service...")
        await disconnect_db()
        await disconnect_redis()
        logger.info("✅ Shutdown tasks completed")
