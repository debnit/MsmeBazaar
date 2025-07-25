import os
import pickle
import numpy as np

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/valuation_xgb.pkl"))

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

def predict_valuation(revenue: float, profit: float, age: int) -> float:
    input_data = np.array([[revenue, profit, age]])
    prediction = model.predict(input_data)[0]
    return round(prediction, 2)
