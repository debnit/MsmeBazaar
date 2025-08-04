

import pickle
import xgboost as xgb

def explain_model():
    # Load the XGBoost model
    with open("models/valuation_xgb.pkl", "rb") as f:
        model = pickle.load(f)

    if not isinstance(model, xgb.XGBRegressor):
        return {"error": "Loaded model is not an XGBRegressor"}

    booster = model.get_booster()
    importance = booster.get_score(importance_type='gain')

    # Format and sort by importance
    sorted_features = sorted(
        [{"feature": k, "importance": round(v, 2)} for k, v in importance.items()],
        key=lambda x: x["importance"],
        reverse=True
    )

    return {
        "model_type": "XGBoost",
        "importance_type": "gain",
        "top_features": sorted_features
    }


 