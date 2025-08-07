from libs.db.session import get_db
"""
Valuation Engine - Python ML Model (XGBoost/CatBoost/LightGBM)
Predicts fair market value based on turnover, assets, sector, location
"""

from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import asyncpg
from datetime import datetime
import os
import requests
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import xgboost as xgb
import catboost as cb
import lightgbm as lgb
import joblib
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="Valuation Engine", description="ML-based Business Valuation Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msme_valuations")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
LISTING_SERVICE_URL = os.getenv("LISTING_SERVICE_URL", "http://localhost:8003")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")

# Create models directory
os.makedirs(MODEL_PATH, exist_ok=True)

# Database connection
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# Authentication dependency
async def verify_token(authorization: str = None):
    """Verify JWT token with auth service"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        response = requests.post(
            f"{AUTH_SERVICE_URL}/validate-token",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

# Pydantic models
class ValuationRequest(BaseModel):
    msme_id: Optional[int] = None
    company_name: str
    business_type: str
    industry: str
    location: str
    establishment_year: int
    annual_revenue: float
    annual_profit: float
    total_assets: float
    current_assets: float
    current_liabilities: float
    total_debt: float
    employee_count: int
    market_share: Optional[float] = None
    growth_rate: Optional[float] = None
    ebitda: Optional[float] = None
    
    @validator('annual_revenue', 'annual_profit', 'total_assets')
    def validate_financial_amounts(cls, v):
        if v < 0:
            raise ValueError('Financial amounts cannot be negative')
        return v
    
    @validator('establishment_year')
    def validate_establishment_year(cls, v):
        current_year = datetime.now().year
        if v < 1800 or v > current_year:
            raise ValueError('Invalid establishment year')
        return v

class ValuationResult(BaseModel):
    msme_id: Optional[int] = None
    estimated_value: float
    valuation_range: Dict[str, float]
    confidence_score: float
    valuation_method: str
    key_factors: List[str]
    risk_factors: List[str]
    growth_indicators: List[str]
    market_multiples: Dict[str, float]
    comparable_companies: List[Dict]
    timestamp: datetime

class ModelTrainingRequest(BaseModel):
    model_type: str = "xgboost"  # xgboost, catboost, lightgbm, random_forest
    retrain: bool = False
    
class ModelPerformance(BaseModel):
    model_type: str
    mae: float
    mse: float
    rmse: float
    r2_score: float
    training_samples: int
    feature_importance: Dict[str, float]
    timestamp: datetime

# Industry multipliers and benchmarks
INDUSTRY_MULTIPLIERS = {
    "technology": {"revenue": 3.5, "profit": 15, "assets": 1.8},
    "healthcare": {"revenue": 2.8, "profit": 12, "assets": 1.5},
    "manufacturing": {"revenue": 1.5, "profit": 8, "assets": 1.2},
    "retail": {"revenue": 0.8, "profit": 6, "assets": 0.9},
    "services": {"revenue": 1.2, "profit": 10, "assets": 1.1},
    "agriculture": {"revenue": 0.6, "profit": 4, "assets": 0.8},
    "education": {"revenue": 1.0, "profit": 8, "assets": 1.0},
    "hospitality": {"revenue": 1.1, "profit": 7, "assets": 1.1},
    "transportation": {"revenue": 1.0, "profit": 6, "assets": 1.0},
    "default": {"revenue": 1.0, "profit": 8, "assets": 1.0}
}

LOCATION_MULTIPLIERS = {
    "tier_1": 1.4,  # Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad
    "tier_2": 1.2,  # Pune, Ahmedabad, Jaipur, Lucknow, Kanpur, Nagpur
    "tier_3": 1.0,  # Other cities
    "rural": 0.8
}

TIER_1_CITIES = ["mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad"]
TIER_2_CITIES = ["pune", "ahmedabad", "jaipur", "lucknow", "kanpur", "nagpur", "indore", "bhopal", "patna"]

# ML Models
class ValuationEngine:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_columns = []
        self.is_trained = False
        
    def get_location_tier(self, location: str) -> str:
        """Determine location tier"""
        location_lower = location.lower()
        if any(city in location_lower for city in TIER_1_CITIES):
            return "tier_1"
        elif any(city in location_lower for city in TIER_2_CITIES):
            return "tier_2"
        elif "rural" in location_lower or "village" in location_lower:
            return "rural"
        else:
            return "tier_3"
    
    def prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare features for ML models"""
        features = []
        
        # Financial features
        features.extend([
            data["annual_revenue"],
            data["annual_profit"],
            data["total_assets"],
            data["current_assets"],
            data["current_liabilities"],
            data["total_debt"],
            data.get("ebitda", data["annual_profit"] * 1.2),
        ])
        
        # Operational features
        features.extend([
            data["employee_count"],
            datetime.now().year - data["establishment_year"],  # company_age
            data.get("market_share", 0.1),
            data.get("growth_rate", 0.05),
        ])
        
        # Calculated ratios
        profit_margin = data["annual_profit"] / data["annual_revenue"] if data["annual_revenue"] > 0 else 0
        asset_turnover = data["annual_revenue"] / data["total_assets"] if data["total_assets"] > 0 else 0
        current_ratio = data["current_assets"] / data["current_liabilities"] if data["current_liabilities"] > 0 else 1
        debt_ratio = data["total_debt"] / data["total_assets"] if data["total_assets"] > 0 else 0
        
        features.extend([profit_margin, asset_turnover, current_ratio, debt_ratio])
        
        # Categorical features (encoded)
        business_type_encoded = self.encoders.get("business_type", {}).get(data["business_type"], 0)
        industry_encoded = self.encoders.get("industry", {}).get(data["industry"], 0)
        location_tier = self.get_location_tier(data["location"])
        location_encoded = self.encoders.get("location_tier", {}).get(location_tier, 0)
        
        features.extend([business_type_encoded, industry_encoded, location_encoded])
        
        return np.array(features).reshape(1, -1)
    
    def calculate_heuristic_valuation(self, data: Dict) -> Dict:
        """Calculate valuation using heuristic methods"""
        # Get industry multipliers
        industry_mult = INDUSTRY_MULTIPLIERS.get(data["industry"].lower(), INDUSTRY_MULTIPLIERS["default"])
        
        # Get location multiplier
        location_tier = self.get_location_tier(data["location"])
        location_mult = LOCATION_MULTIPLIERS.get(location_tier, 1.0)
        
        # Calculate different valuation methods
        revenue_multiple = data["annual_revenue"] * industry_mult["revenue"] * location_mult
        profit_multiple = data["annual_profit"] * industry_mult["profit"] * location_mult
        asset_based = data["total_assets"] * industry_mult["assets"] * location_mult
        
        # DCF approximation
        growth_rate = data.get("growth_rate", 0.05)
        discount_rate = 0.12
        terminal_growth = 0.03
        
        future_cash_flows = []
        for year in range(1, 6):
            cf = data["annual_profit"] * (1 + growth_rate) ** year
            pv = cf / (1 + discount_rate) ** year
            future_cash_flows.append(pv)
        
        terminal_value = (future_cash_flows[-1] * (1 + terminal_growth)) / (discount_rate - terminal_growth)
        dcf_value = sum(future_cash_flows) + terminal_value / (1 + discount_rate) ** 5
        
        # Weight different methods
        estimated_value = (
            revenue_multiple * 0.3 +
            profit_multiple * 0.4 +
            asset_based * 0.2 +
            dcf_value * 0.1
        )
        
        # Apply adjustments
        company_age = datetime.now().year - data["establishment_year"]
        if company_age < 3:
            estimated_value *= 0.8  # Young company discount
        elif company_age > 15:
            estimated_value *= 1.1  # Established company premium
        
        # Risk adjustments
        debt_ratio = data["total_debt"] / data["total_assets"] if data["total_assets"] > 0 else 0
        if debt_ratio > 0.6:
            estimated_value *= 0.85  # High debt discount
        
        profit_margin = data["annual_profit"] / data["annual_revenue"] if data["annual_revenue"] > 0 else 0
        if profit_margin < 0.05:
            estimated_value *= 0.9  # Low margin discount
        
        # Confidence calculation
        confidence_factors = []
        if data["annual_revenue"] > 0:
            confidence_factors.append(0.2)
        if data["annual_profit"] > 0:
            confidence_factors.append(0.3)
        if data["total_assets"] > 0:
            confidence_factors.append(0.2)
        if data["employee_count"] > 0:
            confidence_factors.append(0.1)
        if company_age >= 2:
            confidence_factors.append(0.2)
        
        confidence_score = sum(confidence_factors)
        
        return {
            "estimated_value": max(estimated_value, 0),
            "confidence_score": confidence_score,
            "method_values": {
                "revenue_multiple": revenue_multiple,
                "profit_multiple": profit_multiple,
                "asset_based": asset_based,
                "dcf_value": dcf_value
            },
            "multipliers_used": {
                "industry": industry_mult,
                "location": location_mult
            }
        }
    
    async def train_models(self, training_data: List[Dict]) -> Dict:
        """Train ML models with historical data"""
        if len(training_data) < 50:
            raise ValueError("Insufficient training data (minimum 50 samples required)")
        
        # Prepare training data
        X_data = []
        y_data = []
        
        for record in training_data:
            try:
                features = self.prepare_features(record)
                X_data.append(features.flatten())
                y_data.append(record["actual_value"])
            except Exception as e:
                print(f"Error processing record: {e}")
                continue
        
        if len(X_data) < 50:
            raise ValueError("Insufficient valid training samples")
        
        X = np.array(X_data)
        y = np.array(y_data)
        
        # Feature scaling
        self.scalers["features"] = StandardScaler()
        X_scaled = self.scalers["features"].fit_transform(X)
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Train multiple models
        models_config = {
            "xgboost": xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42
            ),
            "catboost": cb.CatBoostRegressor(
                iterations=100,
                depth=6,
                learning_rate=0.1,
                random_state=42,
                verbose=False
            ),
            "lightgbm": lgb.LGBMRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                verbose=-1
            ),
            "random_forest": RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
        }
        
        model_performances = {}
        
        for name, model in models_config.items():
            try:
                # Train model
                model.fit(X_train, y_train)
                
                # Make predictions
                y_pred = model.predict(X_test)
                
                # Calculate metrics
                mae = mean_absolute_error(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                rmse = np.sqrt(mse)
                r2 = r2_score(y_test, y_pred)
                
                # Feature importance
                if hasattr(model, 'feature_importances_'):
                    feature_importance = dict(zip(
                        [f"feature_{i}" for i in range(len(model.feature_importances_))],
                        model.feature_importances_
                    ))
                else:
                    feature_importance = {}
                
                # Store model and performance
                self.models[name] = model
                model_performances[name] = {
                    "mae": mae,
                    "mse": mse,
                    "rmse": rmse,
                    "r2_score": r2,
                    "feature_importance": feature_importance
                }
                
                # Save model to disk
                joblib.dump(model, f"{MODEL_PATH}/{name}_model.pkl")
                
            except Exception as e:
                print(f"Error training {name} model: {e}")
                continue
        
        # Select best model based on R²
        best_model = max(model_performances.items(), key=lambda x: x[1]["r2_score"])
        
        # Save scalers and encoders
        joblib.dump(self.scalers, f"{MODEL_PATH}/scalers.pkl")
        joblib.dump(self.encoders, f"{MODEL_PATH}/encoders.pkl")
        
        self.is_trained = True
        
        return {
            "best_model": best_model[0],
            "performances": model_performances,
            "training_samples": len(training_data),
            "features_count": X.shape[1]
        }
    
    def predict_valuation(self, data: Dict, model_name: str = "xgboost") -> Dict:
        """Predict valuation using trained ML model"""
        try:
            if not self.is_trained or model_name not in self.models:
                # Fall back to heuristic method
                return self.calculate_heuristic_valuation(data)
            
            # Prepare features
            features = self.prepare_features(data)
            
            # Scale features
            features_scaled = self.scalers["features"].transform(features)
            
            # Make prediction
            model = self.models[model_name]
            prediction = model.predict(features_scaled)[0]
            
            # Calculate confidence based on model performance
            # This is a simplified confidence calculation
            confidence_score = 0.85 if model_name == "xgboost" else 0.80
            
            # Get heuristic valuation for comparison
            heuristic_result = self.calculate_heuristic_valuation(data)
            
            # Combine ML and heuristic results
            ml_weight = confidence_score
            heuristic_weight = 1 - confidence_score
            
            final_valuation = (
                prediction * ml_weight +
                heuristic_result["estimated_value"] * heuristic_weight
            )
            
            return {
                "estimated_value": max(final_valuation, 0),
                "confidence_score": confidence_score,
                "method_values": {
                    "ml_prediction": prediction,
                    "heuristic_value": heuristic_result["estimated_value"]
                },
                "model_used": model_name
            }
            
        except Exception as e:
            print(f"ML prediction failed: {e}")
            return self.calculate_heuristic_valuation(data)
    
    def load_models(self):
        """Load trained models from disk"""
        try:
            model_files = ["xgboost", "catboost", "lightgbm", "random_forest"]
            
            for model_name in model_files:
                model_path = f"{MODEL_PATH}/{model_name}_model.pkl"
                if os.path.exists(model_path):
                    self.models[model_name] = joblib.load(model_path)
            
            # Load scalers and encoders
            scalers_path = f"{MODEL_PATH}/scalers.pkl"
            encoders_path = f"{MODEL_PATH}/encoders.pkl"
            
            if os.path.exists(scalers_path):
                self.scalers = joblib.load(scalers_path)
            
            if os.path.exists(encoders_path):
                self.encoders = joblib.load(encoders_path)
            
            if self.models:
                self.is_trained = True
                
        except Exception as e:
            print(f"Error loading models: {e}")

# Initialize valuation engine
valuation_engine = ValuationEngine()

# API Endpoints

@app.post("/valuations", response_model=ValuationResult)
async def create_valuation(
    request: ValuationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(verify_token)
):
    """Create a business valuation"""
    try:
        # Perform valuation
        valuation_data = request.dict()
        result = valuation_engine.predict_valuation(valuation_data)
        
        # Calculate valuation range (±20% of estimated value)
        estimated_value = result["estimated_value"]
        valuation_range = {
            "min": estimated_value * 0.8,
            "max": estimated_value * 1.2,
            "median": estimated_value
        }
        
        # Generate insights
        key_factors = []
        risk_factors = []
        growth_indicators = []
        
        # Key factors analysis
        profit_margin = request.annual_profit / request.annual_revenue if request.annual_revenue > 0 else 0
        if profit_margin > 0.15:
            key_factors.append("High profit margin")
        if profit_margin < 0.05:
            risk_factors.append("Low profit margin")
        
        company_age = datetime.now().year - request.establishment_year
        if company_age > 10:
            key_factors.append("Established business")
        elif company_age < 3:
            risk_factors.append("Young company with limited track record")
        
        if request.annual_revenue > 10000000:  # 1 crore
            key_factors.append("Strong revenue base")
        
        if request.employee_count > 50:
            key_factors.append("Substantial workforce")
        
        growth_rate = request.growth_rate or 0.05
        if growth_rate > 0.1:
            growth_indicators.append("High growth rate")
        elif growth_rate < 0:
            risk_factors.append("Declining growth")
        
        # Market multiples
        industry_mult = INDUSTRY_MULTIPLIERS.get(request.industry.lower(), INDUSTRY_MULTIPLIERS["default"])
        market_multiples = {
            "revenue_multiple": industry_mult["revenue"],
            "profit_multiple": industry_mult["profit"],
            "asset_multiple": industry_mult["assets"]
        }
        
        # Store valuation in database
        conn = await get_db_connection()
        
        valuation_id = await conn.fetchval(
            """
            INSERT INTO valuations (
                msme_id, requester_id, company_name, business_type, industry,
                location, estimated_value, confidence_score, valuation_method,
                key_factors, risk_factors, growth_indicators, market_multiples,
                valuation_range, input_data, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
            """,
            request.msme_id, current_user["user_id"], request.company_name,
            request.business_type, request.industry, request.location,
            estimated_value, result["confidence_score"], result.get("model_used", "heuristic"),
            key_factors, risk_factors, growth_indicators, json.dumps(market_multiples),
            json.dumps(valuation_range), json.dumps(valuation_data), datetime.utcnow()
        )
        
        await conn.close()
        
        # Create response
        valuation_result = ValuationResult(
            msme_id=request.msme_id,
            estimated_value=estimated_value,
            valuation_range=valuation_range,
            confidence_score=result["confidence_score"],
            valuation_method=result.get("model_used", "heuristic"),
            key_factors=key_factors,
            risk_factors=risk_factors,
            growth_indicators=growth_indicators,
            market_multiples=market_multiples,
            comparable_companies=[],  # This would be populated with actual comparables
            timestamp=datetime.utcnow()
        )
        
        return valuation_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Valuation failed: {str(e)}"
        )

@app.get("/valuations/{valuation_id}")
async def get_valuation(valuation_id: int, current_user: dict = Depends(verify_token)):
    """Get a specific valuation"""
    try:
        conn = await get_db_connection()
        
        valuation = await conn.fetchrow(
            "SELECT * FROM valuations WHERE id = $1",
            valuation_id
        )
        
        await conn.close()
        
        if not valuation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Valuation not found"
            )
        
        return dict(valuation)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get valuation: {str(e)}"
        )

@app.get("/valuations/msme/{msme_id}")
async def get_msme_valuations(msme_id: int, current_user: dict = Depends(verify_token)):
    """Get all valuations for a specific MSME"""
    try:
        conn = await get_db_connection()
        
        valuations = await conn.fetch(
            """
            SELECT * FROM valuations 
            WHERE msme_id = $1 
            ORDER BY created_at DESC
            """,
            msme_id
        )
        
        await conn.close()
        
        return [dict(valuation) for valuation in valuations]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get valuations: {str(e)}"
        )

@app.post("/train-model")
async def train_valuation_model(
    request: ModelTrainingRequest,
    current_user: dict = Depends(verify_token)
):
    """Train/retrain valuation models"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can train models"
        )
    
    try:
        conn = await get_db_connection()
        
        # Get training data (valuations with actual sale prices)
        training_data = await conn.fetch(
            """
            SELECT v.*, s.actual_sale_price as actual_value
            FROM valuations v
            JOIN sales s ON v.msme_id = s.msme_id
            WHERE s.actual_sale_price IS NOT NULL
            """
        )
        
        await conn.close()
        
        if len(training_data) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient training data (minimum 50 samples required)"
            )
        
        # Convert to dict format
        training_records = []
        for record in training_data:
            input_data = json.loads(record["input_data"])
            input_data["actual_value"] = float(record["actual_value"])
            training_records.append(input_data)
        
        # Train models
        training_result = await valuation_engine.train_models(training_records)
        
        return {
            "message": "Model training completed successfully",
            "training_result": training_result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}"
        )

@app.get("/model-performance")
async def get_model_performance(current_user: dict = Depends(verify_token)):
    """Get model performance metrics"""
    try:
        if not valuation_engine.is_trained:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trained models available"
            )
        
        # This would typically be stored during training
        # For now, return a placeholder response
        return {
            "models": list(valuation_engine.models.keys()),
            "is_trained": valuation_engine.is_trained,
            "last_trained": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model performance: {str(e)}"
        )

@app.get("/valuation-stats")
async def get_valuation_stats():
    """Get valuation statistics"""
    try:
        conn = await get_db_connection()
        
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_valuations,
                AVG(estimated_value) as avg_valuation,
                AVG(confidence_score) as avg_confidence,
                COUNT(DISTINCT msme_id) as unique_msmes,
                COUNT(DISTINCT requester_id) as unique_requesters
            FROM valuations
            """
        )
        
        # Industry breakdown
        industry_stats = await conn.fetch(
            """
            SELECT industry, COUNT(*) as count, AVG(estimated_value) as avg_value
            FROM valuations
            GROUP BY industry
            ORDER BY count DESC
            """
        )
        
        await conn.close()
        
        return {
            "overall_stats": dict(stats),
            "industry_breakdown": [dict(stat) for stat in industry_stats]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = await get_db_connection()
        await conn.fetchval("SELECT 1")
        await conn.close()
        
        return {
            "status": "healthy",
            "service": "valuation-engine",
            "models_loaded": list(valuation_engine.models.keys()),
            "is_trained": valuation_engine.is_trained,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

# Load models on startup
@app.on_event("startup")
async def startup_event():
    """Load trained models on startup"""
    valuation_engine.load_models()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)