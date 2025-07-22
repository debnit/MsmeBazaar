# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.razorpay_router import router as razorpay_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vyapaarmitra.in",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(razorpay_router)

@app.get("/")
def read_root():
    return {"message": "Payments API is live"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "payments-api"}
