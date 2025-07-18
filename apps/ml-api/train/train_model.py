import pandas as pd
from xgboost import XGBRegressor
import pickle

df = pd.read_csv("apps/ml-api/train/dataset.csv")
X = df.drop("valuation", axis=1)
y = df["valuation"]

model = XGBRegressor()
model.fit(X, y)
pickle.dump(model, open("apps/ml-api/models/valuation_xgb.pkl", "wb"))