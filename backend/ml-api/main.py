
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.valuation import router as valuation_router
from routes.match import router as match_router

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
app.include_router(valuation_router, prefix="/api/valuation")
app.include_router(match_router, prefix="/api/match")

@app.get("/metrics")
def metrics():
    return {"requests": 100, "errors": 2}

from app.api.valuation.feedback.route import router as feedback_router
app.include_router(feedback_router)

