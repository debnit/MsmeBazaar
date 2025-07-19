from fastapi import FastAPI
from apps.payments-api.routers.razorpay_routes import router as razorpay_router

app = FastAPI()

app.include_router(razorpay_router, prefix="/api/payment", tags=["Payment"])