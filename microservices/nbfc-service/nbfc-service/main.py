from fastapi import FastAPI
from .api import routes
from .core.config import settings

app = FastAPI(title="nbfc-service")

app.include_router(routes.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
