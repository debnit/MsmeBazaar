from fastapi import FastAPI
from app.routes import admin
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend calls (adjust origin in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or use ["http://localhost:3000"] in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api")
