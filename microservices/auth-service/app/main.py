from fastapi import FastAPI
from api.routes import auth

app = FastAPI()
app.include_router(auth.router, prefix="/auth", tags=["auth"])
