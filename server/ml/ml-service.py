#!/usr/bin/env python3
"""
FastAPI ML Service for MSME Valuation and Matchmaking
Uses XGBoost and CatBoost for advanced ML predictions
"""

import os
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

import xgboost as xgb
import catboost as cb
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MSME ML Service",
    description="Machine Learning service for business valuation and matchmaking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
API_KEY = os.getenv("ML_API_KEY", "your-secure-api-key")

def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials

# Data models
class BusinessFeatures(BaseModel):
    revenue: float = Field(..., description="Annual revenue")
    profit: float = Field(..., description="Annual profit")
    assets: float = Field(..., description="Total assets")
    employees: int = Field(..., description="Number of employees")
    business_age: int = Field(..., description="Years in business")
    growth_rate: float = Field(..., description="Annual growth rate %")
    debt_to_equity: float = Field(..., description="Debt to equity ratio")
    current_ratio: float = Field(..., description="Current ratio")
    market_share: float = Field(..., description="Market share %")
    customer_retention: float = Field(..., description="Customer retention %")
    digital_presence: float = Field(..., description="Digital presence score")
    profit_margin: float = Field(..., description="Profit margin %")
    revenue_per_employee: float = Field(..., description="Revenue per employee")
    asset_turnover: float = Field(..., description="Asset turnover ratio")
    roa: float = Field(..., description="Return on assets %")
    industry_technology: int = Field(..., description="Technology industry flag")
    industry_healthcare: int = Field(..., description="Healthcare industry flag")
    industry_finance: int = Field(..., description="Finance industry flag")
    industry_manufacturing: int = Field(..., description="Manufacturing industry flag")
    location_tier1: int = Field(..., description="Tier 1 city flag")
    location_tier2: int = Field(..., description="Tier 2 city flag")
    has_iso_certification: int = Field(..., description="ISO certification flag")
    risk_factor_count: int = Field(..., description="Number of risk factors")

class ValuationRequest(BaseModel):
    features: BusinessFeatures
    model_version: str = "1.0.0"

class ValuationResponse(BaseModel):
    valuation: float
    confidence: float
    features_importance: Dict[str, float]
    model_version: str
    prediction_time: float

class MatchmakingRequest(BaseModel):
    buyer_profile: Dict[str, Any]
    preferences: Dict[str, Any]
    model_version: str = "1.0.0"

class MatchmakingResponse(BaseModel):
    matches: List[Dict[str, Any]]
    confidence: float
    match_scores: List[float]
    model_version: str

class TrainingData(BaseModel):
    features: List[BusinessFeatures]
    targets: List[float]
    model_version: str = "1.0.0"

class HealthResponse(BaseModel):
    status: str
    model_version: str
    last_update: str
    models_loaded: Dict[str, bool]

# ML Models Manager
class MLModelsManager:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.model_versions = {}
        self.feature_importance = {}
        self.model_dir = "models"
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Load or create models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize or load existing models"""
        try:
            # Try loading existing models
            self._load_models()
        except Exception as e:
            logger.warning(f"Could not load existing models: {e}")
            # Create new models with sample data
            self._create_initial_models()
    
    def _load_models(self):
        """Load pre-trained models from disk"""
        model_files = {
            'valuation_xgb': 'valuation_xgboost.joblib',
            'valuation_catboost': 'valuation_catboost.joblib',
            'matchmaking_xgb': 'matchmaking_xgboost.joblib',
            'scaler': 'feature_scaler.joblib',
            'encoder': 'label_encoder.joblib'
        }
        
        for model_name, filename in model_files.items():
            filepath = os.path.join(self.model_dir, filename)
            if os.path.exists(filepath):
                if model_name == 'scaler':
                    self.scalers['default'] = joblib.load(filepath)
                elif model_name == 'encoder':
                    self.encoders['default'] = joblib.load(filepath)
                else:
                    self.models[model_name] = joblib.load(filepath)
                logger.info(f"Loaded {model_name} from {filepath}")
    
    def _create_initial_models(self):
        """Create initial models with synthetic training data"""
        logger.info("Creating initial models with synthetic data...")
        
        # Generate synthetic training data
        n_samples = 1000
        features_data = []
        valuations = []
        
        np.random.seed(42)
        
        for _ in range(n_samples):
            # Generate realistic business features
            revenue = np.random.lognormal(14, 1.5)  # Log-normal distribution
            profit = revenue * np.random.uniform(0.05, 0.25)
            assets = revenue * np.random.uniform(0.8, 2.0)
            employees = max(1, int(revenue / np.random.uniform(80000, 200000)))
            
            features = {
                'revenue': revenue,
                'profit': profit,
                'assets': assets,
                'employees': employees,
                'business_age': np.random.randint(1, 30),
                'growth_rate': np.random.normal(15, 10),
                'debt_to_equity': np.random.uniform(0.1, 3.0),
                'current_ratio': np.random.uniform(0.5, 3.0),
                'market_share': np.random.uniform(0.1, 20),
                'customer_retention': np.random.uniform(60, 95),
                'digital_presence': np.random.uniform(20, 90),
                'profit_margin': (profit / revenue) * 100 if revenue > 0 else 0,
                'revenue_per_employee': revenue / employees if employees > 0 else 0,
                'asset_turnover': revenue / assets if assets > 0 else 0,
                'roa': (profit / assets) * 100 if assets > 0 else 0,
                'industry_technology': np.random.choice([0, 1], p=[0.8, 0.2]),
                'industry_healthcare': np.random.choice([0, 1], p=[0.9, 0.1]),
                'industry_finance': np.random.choice([0, 1], p=[0.9, 0.1]),
                'industry_manufacturing': np.random.choice([0, 1], p=[0.7, 0.3]),
                'location_tier1': np.random.choice([0, 1], p=[0.7, 0.3]),
                'location_tier2': np.random.choice([0, 1], p=[0.8, 0.2]),
                'has_iso_certification': np.random.choice([0, 1], p=[0.6, 0.4]),
                'risk_factor_count': np.random.randint(0, 8)
            }
            
            # Calculate valuation using business logic
            industry_multiplier = 12 if features['industry_technology'] else 6
            location_multiplier = 1.3 if features['location_tier1'] else 1.0
            
            base_valuation = (
                revenue * industry_multiplier * 0.4 +
                profit * 15 * 0.4 +
                assets * 0.8 * 0.2
            )
            
            valuation = base_valuation * location_multiplier * (1 + features['growth_rate'] / 100)
            
            features_data.append(features)
            valuations.append(valuation)
        
        # Create DataFrame
        df = pd.DataFrame(features_data)
        y = np.array(valuations)
        
        # Train models
        self._train_valuation_models(df, y)
        
        # Save models
        self._save_models()
        
        logger.info("Initial models created and saved successfully")
    
    def _train_valuation_models(self, X: pd.DataFrame, y: np.array):
        """Train valuation models"""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        self.scalers['default'] = scaler
        
        # Train XGBoost model
        xgb_model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        
        xgb_model.fit(X_train_scaled, y_train)
        
        # Train CatBoost model
        cb_model = cb.CatBoostRegressor(
            iterations=100,
            depth=8,
            learning_rate=0.1,
            loss_function='RMSE',
            random_seed=42,
            verbose=False
        )
        
        cb_model.fit(X_train_scaled, y_train)
        
        # Store models
        self.models['valuation_xgb'] = xgb_model
        self.models['valuation_catboost'] = cb_model
        
        # Calculate feature importance
        feature_names = X.columns.tolist()
        self.feature_importance['valuation_xgb'] = dict(zip(
            feature_names, xgb_model.feature_importances_
        ))
        self.feature_importance['valuation_catboost'] = dict(zip(
            feature_names, cb_model.feature_importances_
        ))
        
        # Evaluate models
        xgb_pred = xgb_model.predict(X_test_scaled)
        cb_pred = cb_model.predict(X_test_scaled)
        
        logger.info(f"XGBoost R² Score: {r2_score(y_test, xgb_pred):.4f}")
        logger.info(f"CatBoost R² Score: {r2_score(y_test, cb_pred):.4f}")
        
        self.model_versions['valuation'] = datetime.now().isoformat()
    
    def _save_models(self):
        """Save models to disk"""
        model_files = {
            'valuation_xgb': 'valuation_xgboost.joblib',
            'valuation_catboost': 'valuation_catboost.joblib',
            'scaler': 'feature_scaler.joblib'
        }
        
        # Save models
        for model_name, filename in model_files.items():
            filepath = os.path.join(self.model_dir, filename)
            if model_name == 'scaler':
                joblib.dump(self.scalers['default'], filepath)
            else:
                joblib.dump(self.models[model_name], filepath)
            logger.info(f"Saved {model_name} to {filepath}")
    
    def predict_valuation(self, features: BusinessFeatures) -> Dict[str, Any]:
        """Predict business valuation"""
        # Convert features to DataFrame
        feature_dict = features.dict()
        df = pd.DataFrame([feature_dict])
        
        # Scale features
        X_scaled = self.scalers['default'].transform(df)
        
        # Get predictions from both models
        xgb_pred = self.models['valuation_xgb'].predict(X_scaled)[0]
        cb_pred = self.models['valuation_catboost'].predict(X_scaled)[0]
        
        # Ensemble prediction (weighted average)
        ensemble_pred = (xgb_pred * 0.6 + cb_pred * 0.4)
        
        # Calculate confidence based on prediction consistency
        prediction_diff = abs(xgb_pred - cb_pred)
        max_diff = max(xgb_pred, cb_pred) * 0.3  # 30% tolerance
        confidence = max(0.1, 1 - (prediction_diff / max_diff))
        
        return {
            'valuation': float(ensemble_pred),
            'confidence': float(confidence),
            'features_importance': self.feature_importance['valuation_xgb'],
            'model_version': self.model_versions.get('valuation', '1.0.0')
        }
    
    def retrain_models(self, training_data: List[BusinessFeatures], targets: List[float]):
        """Retrain models with new data"""
        # Convert to DataFrame
        feature_dicts = [f.dict() for f in training_data]
        df = pd.DataFrame(feature_dicts)
        y = np.array(targets)
        
        # Retrain models
        self._train_valuation_models(df, y)
        
        # Save updated models
        self._save_models()
        
        return {
            'success': True,
            'model_version': self.model_versions.get('valuation', '1.0.0'),
            'samples_trained': len(training_data)
        }

# Global ML manager instance
ml_manager = MLModelsManager()

# API Routes
@app.get("/", response_model=Dict[str, str])
async def root():
    return {
        "message": "MSME ML Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        model_version=ml_manager.model_versions.get('valuation', '1.0.0'),
        last_update=datetime.now().isoformat(),
        models_loaded={
            'valuation_xgb': 'valuation_xgb' in ml_manager.models,
            'valuation_catboost': 'valuation_catboost' in ml_manager.models,
            'matchmaking_xgb': 'matchmaking_xgb' in ml_manager.models
        }
    )

@app.post("/predict/valuation", response_model=ValuationResponse)
async def predict_valuation(
    request: ValuationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    try:
        start_time = datetime.now()
        
        result = ml_manager.predict_valuation(request.features)
        
        prediction_time = (datetime.now() - start_time).total_seconds()
        
        return ValuationResponse(
            valuation=result['valuation'],
            confidence=result['confidence'],
            features_importance=result['features_importance'],
            model_version=result['model_version'],
            prediction_time=prediction_time
        )
    
    except Exception as e:
        logger.error(f"Valuation prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/matchmaking", response_model=MatchmakingResponse)
async def predict_matchmaking(
    request: MatchmakingRequest,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    # Placeholder for matchmaking logic
    # TODO: Implement matchmaking ML model
    return MatchmakingResponse(
        matches=[
            {"id": "1", "name": "Tech Startup", "score": 0.95},
            {"id": "2", "name": "Healthcare Co", "score": 0.87}
        ],
        confidence=0.85,
        match_scores=[0.95, 0.87],
        model_version="1.0.0"
    )

@app.post("/retrain")
async def retrain_models(
    request: TrainingData,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    try:
        # Extract features and targets
        features = request.features
        targets = request.targets
        
        if len(features) != len(targets):
            raise HTTPException(
                status_code=400,
                detail="Features and targets must have the same length"
            )
        
        # Retrain models
        result = ml_manager.retrain_models(features, targets)
        
        return {
            "success": result['success'],
            "message": f"Models retrained with {result['samples_trained']} samples",
            "model_version": result['model_version']
        }
    
    except Exception as e:
        logger.error(f"Model retraining error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

@app.get("/models/info")
async def get_model_info(
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    return {
        "models": list(ml_manager.models.keys()),
        "versions": ml_manager.model_versions,
        "feature_importance": ml_manager.feature_importance
    }

if __name__ == "__main__":
    uvicorn.run(
        "ml-service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )