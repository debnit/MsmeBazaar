"""
🧠 Valuation Model (XGBoost / CatBoost)
Advanced ML-based MSME valuation engine with confidence scoring
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import xgboost as xgb
from catboost import CatBoostRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import logging
from datetime import datetime
import mlflow
import mlflow.sklearn
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import uvicorn
import json
import os
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MSMEValuationRequest(BaseModel):
    company_name: str
    industry: str
    annual_turnover: float
    net_profit: float
    total_assets: float
    total_liabilities: float
    employee_count: int
    established_year: int
    city: str
    state: str
    is_distressed: bool = False
    growth_rate: Optional[float] = None
    debt_to_equity: Optional[float] = None
    
class ValuationResponse(BaseModel):
    estimated_value: float
    confidence_score: float
    valuation_breakdown: Dict[str, float]
    model_used: str
    risk_factors: List[str]
    comparables: List[Dict]
    
class MSMEValuationEngine:
    def __init__(self):
        self.xgb_model = None
        self.catboost_model = None
        self.scaler = StandardScaler()
        self.industry_encoder = LabelEncoder()
        self.state_encoder = LabelEncoder()
        self.feature_names = [
            'annual_turnover', 'net_profit', 'total_assets', 'total_liabilities',
            'employee_count', 'company_age', 'debt_to_equity', 'profit_margin',
            'asset_turnover', 'roa', 'roe', 'current_ratio', 'industry_encoded',
            'state_encoded', 'is_distressed', 'growth_rate'
        ]
        
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering for MSME valuation"""
        
        # Calculate derived features
        df['company_age'] = 2024 - df['established_year']
        df['debt_to_equity'] = df['total_liabilities'] / (df['total_assets'] - df['total_liabilities'])
        df['profit_margin'] = df['net_profit'] / df['annual_turnover']
        df['asset_turnover'] = df['annual_turnover'] / df['total_assets']
        df['roa'] = df['net_profit'] / df['total_assets']
        df['roe'] = df['net_profit'] / (df['total_assets'] - df['total_liabilities'])
        df['current_ratio'] = df['total_assets'] / df['total_liabilities']
        
        # Handle missing values
        df['growth_rate'] = df['growth_rate'].fillna(0.05)  # Default 5% growth
        
        # Cap extreme values
        df['debt_to_equity'] = df['debt_to_equity'].clip(0, 10)
        df['profit_margin'] = df['profit_margin'].clip(-1, 1)
        
        # Encode categorical variables
        if not hasattr(self.industry_encoder, 'classes_'):
            self.industry_encoder.fit(df['industry'])
        if not hasattr(self.state_encoder, 'classes_'):
            self.state_encoder.fit(df['state'])
            
        df['industry_encoded'] = self.industry_encoder.transform(df['industry'])
        df['state_encoded'] = self.state_encoder.transform(df['state'])
        
        # Convert boolean to int
        df['is_distressed'] = df['is_distressed'].astype(int)
        
        return df[self.feature_names]
    
    def generate_synthetic_data(self, n_samples: int = 10000) -> pd.DataFrame:
        """Generate synthetic MSME data for training"""
        np.random.seed(42)
        
        industries = ['Manufacturing', 'Services', 'Retail', 'Technology', 'Healthcare', 
                     'Food Processing', 'Textiles', 'Automotive', 'Electronics', 'Chemicals']
        states = ['Maharashtra', 'Gujarat', 'Tamil Nadu', 'Karnataka', 'Delhi', 
                 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Andhra Pradesh', 'Haryana']
        
        data = []
        for _ in range(n_samples):
            # Base financial metrics
            annual_turnover = np.random.lognormal(15, 1.5)  # 1M to 100M range
            profit_margin = np.random.normal(0.08, 0.05)  # 8% average margin
            net_profit = annual_turnover * max(profit_margin, -0.2)
            
            # Asset structure
            asset_turnover = np.random.normal(1.5, 0.5)
            total_assets = annual_turnover / max(asset_turnover, 0.1)
            
            # Debt structure
            debt_ratio = np.random.beta(2, 3)  # Skewed towards lower debt
            total_liabilities = total_assets * debt_ratio
            
            # Operational metrics
            employee_count = int(np.random.exponential(25) + 1)
            established_year = np.random.randint(1990, 2020)
            
            # Market factors
            is_distressed = np.random.choice([True, False], p=[0.15, 0.85])
            growth_rate = np.random.normal(0.12, 0.08) if not is_distressed else np.random.normal(-0.05, 0.1)
            
            # Valuation calculation (simplified DCF approach)
            base_value = net_profit * 8  # P/E multiple
            growth_factor = 1 + (growth_rate * 3)  # 3-year growth impact
            size_factor = 1 + np.log(annual_turnover / 1000000) * 0.1  # Size premium
            distress_factor = 0.7 if is_distressed else 1.0
            
            market_value = base_value * growth_factor * size_factor * distress_factor
            market_value = max(market_value, total_assets * 0.3)  # Minimum asset value
            
            data.append({
                'company_name': f'Company_{_}',
                'industry': np.random.choice(industries),
                'annual_turnover': annual_turnover,
                'net_profit': net_profit,
                'total_assets': total_assets,
                'total_liabilities': total_liabilities,
                'employee_count': employee_count,
                'established_year': established_year,
                'city': f'City_{_}',
                'state': np.random.choice(states),
                'is_distressed': is_distressed,
                'growth_rate': growth_rate,
                'market_value': market_value
            })
        
        return pd.DataFrame(data)
    
    def train_models(self, df: pd.DataFrame):
        """Train both XGBoost and CatBoost models"""
        
        # Prepare features
        X = self.prepare_features(df)
        y = df['market_value']
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Train XGBoost
        logger.info("Training XGBoost model...")
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        self.xgb_model.fit(X_train, y_train)
        
        # Train CatBoost
        logger.info("Training CatBoost model...")
        self.catboost_model = CatBoostRegressor(
            iterations=200,
            depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=False
        )
        self.catboost_model.fit(X_train, y_train)
        
        # Evaluate models
        xgb_pred = self.xgb_model.predict(X_test)
        cat_pred = self.catboost_model.predict(X_test)
        
        xgb_mae = mean_absolute_error(y_test, xgb_pred)
        cat_mae = mean_absolute_error(y_test, cat_pred)
        
        logger.info(f"XGBoost MAE: {xgb_mae:.2f}")
        logger.info(f"CatBoost MAE: {cat_mae:.2f}")
        
        # Save models
        joblib.dump(self.xgb_model, 'models/xgb_valuation_model.pkl')
        joblib.dump(self.catboost_model, 'models/catboost_valuation_model.pkl')
        joblib.dump(self.scaler, 'models/scaler.pkl')
        joblib.dump(self.industry_encoder, 'models/industry_encoder.pkl')
        joblib.dump(self.state_encoder, 'models/state_encoder.pkl')
        
        # Log to MLflow
        with mlflow.start_run():
            mlflow.log_metric("xgb_mae", xgb_mae)
            mlflow.log_metric("cat_mae", cat_mae)
            mlflow.sklearn.log_model(self.xgb_model, "xgb_model")
            mlflow.sklearn.log_model(self.catboost_model, "catboost_model")
    
    def load_models(self):
        """Load trained models"""
        try:
            self.xgb_model = joblib.load('models/xgb_valuation_model.pkl')
            self.catboost_model = joblib.load('models/catboost_valuation_model.pkl')
            self.scaler = joblib.load('models/scaler.pkl')
            self.industry_encoder = joblib.load('models/industry_encoder.pkl')
            self.state_encoder = joblib.load('models/state_encoder.pkl')
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            # Generate and train on synthetic data
            logger.info("Generating synthetic data and training models...")
            os.makedirs('models', exist_ok=True)
            synthetic_data = self.generate_synthetic_data()
            self.train_models(synthetic_data)
    
    def predict_valuation(self, request: MSMEValuationRequest) -> ValuationResponse:
        """Predict MSME valuation using ensemble approach"""
        
        # Convert request to DataFrame
        df = pd.DataFrame([request.dict()])
        
        # Prepare features
        X = self.prepare_features(df)
        X_scaled = self.scaler.transform(X)
        
        # Get predictions from both models
        xgb_pred = self.xgb_model.predict(X_scaled)[0]
        cat_pred = self.catboost_model.predict(X_scaled)[0]
        
        # Ensemble prediction (weighted average)
        ensemble_pred = 0.6 * xgb_pred + 0.4 * cat_pred
        
        # Calculate confidence score
        prediction_variance = abs(xgb_pred - cat_pred) / ensemble_pred
        confidence_score = max(0.5, 1 - prediction_variance)
        
        # Determine primary model based on confidence
        model_used = "XGBoost" if abs(xgb_pred - ensemble_pred) < abs(cat_pred - ensemble_pred) else "CatBoost"
        
        # Calculate valuation breakdown
        asset_value = request.total_assets - request.total_liabilities
        earnings_value = request.net_profit * 8  # P/E multiple
        market_value = ensemble_pred
        
        breakdown = {
            "asset_based_value": asset_value,
            "earnings_based_value": earnings_value,
            "market_based_value": market_value,
            "final_valuation": ensemble_pred
        }
        
        # Identify risk factors
        risk_factors = []
        if request.is_distressed:
            risk_factors.append("Company is in distressed state")
        if request.net_profit < 0:
            risk_factors.append("Negative profitability")
        if request.total_liabilities / request.total_assets > 0.7:
            risk_factors.append("High debt-to-asset ratio")
        if 2024 - request.established_year < 3:
            risk_factors.append("Young company with limited track record")
        
        # Mock comparables (in production, this would query actual data)
        comparables = [
            {
                "company_name": f"Similar {request.industry} Co 1",
                "valuation_multiple": 6.5,
                "annual_turnover": request.annual_turnover * 1.2
            },
            {
                "company_name": f"Similar {request.industry} Co 2", 
                "valuation_multiple": 7.8,
                "annual_turnover": request.annual_turnover * 0.9
            }
        ]
        
        return ValuationResponse(
            estimated_value=ensemble_pred,
            confidence_score=confidence_score,
            valuation_breakdown=breakdown,
            model_used=model_used,
            risk_factors=risk_factors,
            comparables=comparables
        )

# Initialize the valuation engine
valuation_engine = MSMEValuationEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup
    valuation_engine.load_models()
    yield

# FastAPI app
app = FastAPI(
    title="MSME Valuation API",
    description="Advanced ML-powered MSME valuation service",
    version="1.0.0",
    lifespan=lifespan
)

@app.post("/valuation/predict", response_model=ValuationResponse)
async def predict_valuation(request: MSMEValuationRequest):
    """Predict MSME valuation"""
    try:
        result = valuation_engine.predict_valuation(request)
        return result
    except Exception as e:
        logger.error(f"Valuation prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/valuation/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": valuation_engine.xgb_model is not None}

@app.post("/valuation/retrain")
async def retrain_models():
    """Retrain models with new data"""
    try:
        # In production, this would use real data
        synthetic_data = valuation_engine.generate_synthetic_data()
        valuation_engine.train_models(synthetic_data)
        return {"status": "success", "message": "Models retrained successfully"}
    except Exception as e:
        logger.error(f"Model retraining error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)