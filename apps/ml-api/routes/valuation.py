
from fastapi import APIRouter, Request
from utils.model import load_model, predict
from utils.explain import explain_model

router = APIRouter()

model = load_model()

@router.post("/predict")
def valuation_predict(request: Request):
    data = request.json()
    result = predict(model, data)
    return result

@router.get("/explain")
def valuation_explain():
    return explain_model(model)
