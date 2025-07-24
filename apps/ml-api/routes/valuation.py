from fastapi import APIRouter
from pydantic import BaseModel
import pickle
import numpy as np
import os

router = APIRouter()
# Resolve the model path relative to this file
model_path = os.path.join(os.path.dirname(__file__), "..", "models", "valuation_xgb.pkl")
model_path = os.path.abspath(model_path)



# Load model
with open(model_path, "rb") as f:
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
