from fastapi import APIRouter
from schemas.valuation import ValuationRequest
from services.predictor import predict_valuation

router = APIRouter()

@router.post("/predict")
def predict(payload: ValuationRequest):
    valuation = predict_valuation(payload.revenue, payload.profit, payload.age)
    return {
        "valuation": valuation,
        "confidence": "medium",
        "top_features": ["revenue", "profit", "age"]
    }
