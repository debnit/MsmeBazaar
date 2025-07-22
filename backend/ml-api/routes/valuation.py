from fastapi import APIRouter
from pydantic import BaseModel
import pickle
import numpy as np

router = APIRouter()

# Load model
with open("models/valuation_xgb.pkl", "rb") as f:
    model = pickle.load(f)

class ValuationRequest(BaseModel):
    revenue: float
    profit: float
    industry: str
    age: int

@router.post("/predict")
def predict_valuation(payload: ValuationRequest):
    input_data = np.array([[payload.revenue, payload.profit, payload.age]])
    prediction = model.predict(input_data)[0]
    return {
        "valuation": round(prediction, 2),
        "confidence": "medium",
        "top_features": ["revenue", "profit", "age"]
    }
