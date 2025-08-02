# main.py
from fastapi import FastAPI
from routers.razorpay_router import router as razorpay_router

app = FastAPI()
app.include_router(razorpay_router)

@app.get("/")
def read_root():
    return {"message": "Payments API is live"}
