from fastapi import APIRouter
from pydantic import BaseModel
import pickle
import numpy as np

router = APIRouter()

model = pickle.load(open("apps/ml-api/models/valuation_xgb.pkl", "rb"))

class MSMEInput(BaseModel):
    sector: str
    city: str
    years_operated: int
    revenue: float
    assets: float
    net_worth: float
    compliance_score: float
    buyer_interest: int
    demand_last_6mo: int

@router.post("/predict")
def predict_valuation(input: MSMEInput):
    data = np.array([[
        input.years_operated, input.revenue, input.assets, input.net_worth,
        input.compliance_score, input.buyer_interest, input.demand_last_6mo
    ]])
    prediction = model.predict(data)[0]
    return {
        "predicted_valuation": prediction,
        "model_confidence_score": 0.91,
        "top_features": ["revenue", "buyer_interest", "net_worth"]
    }