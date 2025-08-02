import joblib

def load_model():
    return joblib.load("models/valuation_xgb_latest.pkl")

def predict(model, data: dict):
    # Stubbed return — replace with actual model.predict() logic
    return {
        "prediction": 42,         # predicted price
        "confidence": 0.91        # dummy confidence score
    }
