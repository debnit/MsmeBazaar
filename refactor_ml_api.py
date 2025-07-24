# refactor_ml_api.py

import os
import shutil

BASE_DIR = "apps/ml-api"

folders_to_create = [
    "api/valuation",
    "schemas",
    "services",
    "models",
    "utils",
    "logs",
    "train",
]

files_to_create = {
    "schemas/valuation.py": """from pydantic import BaseModel

class ValuationRequest(BaseModel):
    revenue: float
    profit: float
    industry: str
    age: int
""",
    "services/predictor.py": """import os
import pickle
import numpy as np

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/valuation_xgb.pkl"))

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

def predict_valuation(revenue: float, profit: float, age: int) -> float:
    input_data = np.array([[revenue, profit, age]])
    prediction = model.predict(input_data)[0]
    return round(prediction, 2)
""",
    "api/valuation/feedback.py": """from fastapi import APIRouter
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
""",
    "main.py": """from fastapi import FastAPI
from api.valuation.feedback import router as valuation_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.include_router(valuation_router, prefix="/valuation", tags=["Valuation"])
""",
    ".env": """MODEL_NAME=valuation_xgb
PORT=8000
"""
}

# Create directories
for path in folders_to_create:
    os.makedirs(os.path.join(BASE_DIR, path), exist_ok=True)

# Move models to models/
for model_file in ["valuation_xgb.pkl", "valuation_xgb_latest.pkl"]:
    src = os.path.join(BASE_DIR, "models", model_file)
    if os.path.exists(src):
        shutil.move(src, os.path.join(BASE_DIR, "models", model_file))

# Move training-related files
train_dir = os.path.join(BASE_DIR, "train")
if not os.path.exists(train_dir):
    os.makedirs(train_dir)
for file in ["train_model.py", "dataset.csv", "requirements.txt"]:
    f = os.path.join(BASE_DIR, file)
    if os.path.exists(f):
        shutil.move(f, os.path.join(train_dir, file))

# Move logs
if os.path.exists(os.path.join(BASE_DIR, "logs/metrics.json")):
    shutil.move(os.path.join(BASE_DIR, "logs/metrics.json"), os.path.join(BASE_DIR, "logs/metrics.json"))

# Generate scaffolded files
for rel_path, content in files_to_create.items():
    file_path = os.path.join(BASE_DIR, rel_path)
    with open(file_path, "w") as f:
        f.write(content)

print("✅ Refactoring complete. Please verify and test the new structure.")
