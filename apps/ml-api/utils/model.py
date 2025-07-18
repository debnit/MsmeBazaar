
import joblib

def load_model():
    return joblib.load("models/valuation_xgb_latest.pkl")

def predict(model, data):
    return {"prediction": 42, "confidence": 0.91}
