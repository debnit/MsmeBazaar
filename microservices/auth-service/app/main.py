import uvicorn
from fastapi import FastAPI
from app.config import settings
from app.events import register_startup_shutdown
from app.api.v1.routes import auth, users, health
from app.logging_config import configure_logging
from prometheus_fastapi_instrumentator import Instrumentator

configure_logging()
app = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG)

register_startup_shutdown(app)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

if settings.PROMETHEUS_ENABLED:
    Instrumentator().instrument(app).expose(app)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
