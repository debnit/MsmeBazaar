from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    print("🔌 Auth service starting up...")
    yield
    print("🛑 Auth service shutting down...")
