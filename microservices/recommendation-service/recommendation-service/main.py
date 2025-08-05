from fastapi import FastAPI
from .api import routes
from .core.config import settings

app = FastAPI(title="recommendation-service")

app.include_router(routes.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
