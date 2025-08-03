from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from .config import settings
from .core.logger import configure_logging
from .api.routes import notifications, status

# Configure logging
logger = configure_logging()

# App initialization
app = FastAPI(
    title="MSMEBazaar Notification Service",
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None
)

# Include routes
app.include_router(status.router, prefix="/status", tags=["Status"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup_event():
    logger.info("Notification Service started", extra={"env": settings.ENVIRONMENT})

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Notification Service shutting down")
