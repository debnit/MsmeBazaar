from fastapi import FastAPI
from app.api.v1.routes import health, recommendations
from app.core.logger import logger
from app.core import exceptions

app = FastAPI(title="Recommendation Service")

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(recommendations.router, prefix="/recommend", tags=["Recommendations"])

app.add_exception_handler(Exception, exceptions.http_error_handler)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Recommendation Service starting...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Recommendation Service shutting down...")
