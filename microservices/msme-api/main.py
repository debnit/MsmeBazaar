from fastapi import FastAPI
from app.api.routes import router as msme_router

app = FastAPI(title="MSME API")

app.include_router(msme_router, prefix="/api/msme")
