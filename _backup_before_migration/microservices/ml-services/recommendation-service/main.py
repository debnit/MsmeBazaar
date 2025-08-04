
from fastapi import FastAPI
from .routes.valuation import router as valuation_router
from .routes.match import router as match_router

app = FastAPI()
app.include_router(valuation_router, prefix="/api/valuation")
app.include_router(match_router, prefix="/api/match")

@app.get("/metrics")
def metrics():
    return {"requests": 100, "errors": 2}

from app.api.valuation.feedback.route import router as feedback_router
app.include_router(feedback_router)

