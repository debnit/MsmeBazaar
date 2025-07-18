import pandas as pd
import joblib
import xgboost as xgb
import json
from pathlib import Path

# Load base dataset
df = pd.read_csv('apps/ml-api/train/dataset.csv')

# Load feedback corrections if available
feedback_path = Path('apps/ml-api/feedback/corrections.jsonl')
if feedback_path.exists():
    with open(feedback_path) as f:
        corrections = [json.loads(line) for line in f]
    correction_df = pd.DataFrame([c['input'] | {'actual': c['actual']} for c in corrections])
    correction_df['target'] = correction_df['actual']
    df = pd.concat([df, correction_df.drop(columns='actual')], ignore_index=True)

# Train model
X = df.drop(columns=['target'])
y = df['target']
model = xgb.XGBRegressor()
model.fit(X, y)

# Save model
joblib.dump(model, 'apps/ml-api/models/valuation_xgb.pkl')
print("✅ Model retrained and saved.")