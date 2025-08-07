from fastapi import FastAPI
from app.api.v1.routes import items, health
from app.core.logger import logger

app = FastAPI(title="Service API")

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(items.router, prefix="/items", tags=["Items"])

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Service starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Service shutting down...")
