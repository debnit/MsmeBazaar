"""
MSMEBazaar v2.0 - ML Model Monitoring & Retraining System
Features:
- Automated model performance monitoring
- Model drift detection
- Intelligent retraining triggers
- Model versioning with MLflow
- Performance metrics tracking
- Data quality monitoring
- Automated retraining pipelines
"""

import asyncio
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import redis
import mlflow
import mlflow.sklearn
import mlflow.tracking
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import joblib
import asyncpg
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from celery import Celery
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import logging
import os
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MLflow
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("msmebazaar-models")

# Prometheus metrics
model_predictions = Counter('model_predictions_total', 'Total model predictions', ['model_name', 'version'])
model_accuracy = Gauge('model_accuracy', 'Model accuracy score', ['model_name', 'version'])
model_drift_score = Gauge('model_drift_score', 'Model drift detection score', ['model_name'])
retraining_jobs = Counter('retraining_jobs_total', 'Total retraining jobs', ['model_name', 'status'])
model_latency = Histogram('model_prediction_latency_seconds', 'Model prediction response time', ['model_name'])

# Initialize Celery for background tasks
celery_app = Celery(
    'ml_monitoring',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

app = FastAPI(title="MSMEBazaar ML Monitoring & Retraining", version="2.0.0")

# Pydantic Models
class ModelPerformanceMetrics(BaseModel):
    model_name: str
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: Optional[float] = None
    timestamp: datetime

class RetrainingRequest(BaseModel):
    model_name: str
    trigger_reason: str
    force_retrain: bool = False
    hyperparameters: Optional[Dict] = None

class ModelDriftReport(BaseModel):
    model_name: str
    drift_detected: bool
    drift_score: float
    affected_features: List[str]
    recommended_action: str
    timestamp: datetime

class DataQualityReport(BaseModel):
    total_records: int
    missing_values: Dict[str, int]
    outliers_detected: int
    data_freshness_hours: float
    quality_score: float
    issues: List[str]

class ModelMonitoringService:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.db_pool = None
        
        # Model configurations
        self.models_config = {
            'valuation_model': {
                'type': 'regression',
                'performance_threshold': 0.85,
                'drift_threshold': 0.3,
                'retrain_interval_days': 7,
                'min_samples_retrain': 1000
            },
            'recommendation_model': {
                'type': 'classification',
                'performance_threshold': 0.80,
                'drift_threshold': 0.25,
                'retrain_interval_days': 3,
                'min_samples_retrain': 500
            },
            'risk_assessment_model': {
                'type': 'classification',
                'performance_threshold': 0.82,
                'drift_threshold': 0.28,
                'retrain_interval_days': 14,
                'min_samples_retrain': 2000
            },
            'transaction_matching_model': {
                'type': 'clustering',
                'performance_threshold': 0.75,
                'drift_threshold': 0.35,
                'retrain_interval_days': 30,
                'min_samples_retrain': 1500
            }
        }
        
        # Model storage
        self.models = {}
        self.model_versions = {}
        self.baseline_metrics = {}
        self.drift_baselines = {}

    async def initialize(self):
        """Initialize database connection and load models"""
        try:
            self.db_pool = await asyncpg.create_pool(
                host='localhost',
                port=5432,
                user='postgres',
                password='password',
                database='msmebazaar',
                min_size=10,
                max_size=20
            )
            
            # Load existing models
            await self.load_models()
            
            # Initialize baseline metrics
            await self.initialize_baseline_metrics()
            
            logger.info("ML Monitoring service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ML monitoring service: {e}")
            raise

    async def load_models(self):
        """Load trained models from MLflow"""
        try:
            for model_name in self.models_config.keys():
                try:
                    # Get latest version from MLflow
                    client = mlflow.tracking.MlflowClient()
                    model_version = client.get_latest_versions(
                        model_name, 
                        stages=["Production"]
                    )
                    
                    if model_version:
                        latest_version = model_version[0]
                        model_uri = f"models:/{model_name}/Production"
                        
                        # Load model
                        self.models[model_name] = mlflow.sklearn.load_model(model_uri)
                        self.model_versions[model_name] = latest_version.version
                        
                        logger.info(f"Loaded {model_name} version {latest_version.version}")
                    else:
                        logger.warning(f"No production model found for {model_name}")
                        
                except Exception as e:
                    logger.error(f"Failed to load {model_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to load models: {e}")

    async def initialize_baseline_metrics(self):
        """Initialize baseline performance metrics for drift detection"""
        try:
            for model_name in self.models_config.keys():
                # Load historical performance data
                baseline_metrics = await self.get_historical_performance(model_name, days=30)
                if baseline_metrics:
                    self.baseline_metrics[model_name] = baseline_metrics
                    logger.info(f"Initialized baseline metrics for {model_name}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize baseline metrics: {e}")

    async def monitor_model_performance(self, model_name: str) -> ModelPerformanceMetrics:
        """Monitor and evaluate model performance"""
        try:
            if model_name not in self.models:
                raise ValueError(f"Model {model_name} not found")
            
            # Get recent predictions and ground truth
            test_data = await self.get_test_data(model_name)
            
            if not test_data or len(test_data) < 50:
                logger.warning(f"Insufficient test data for {model_name}")
                return None
            
            model = self.models[model_name]
            X_test = test_data['features']
            y_true = test_data['labels']
            
            # Make predictions
            with model_latency.labels(model_name=model_name).time():
                y_pred = model.predict(X_test)
                if hasattr(model, 'predict_proba'):
                    y_pred_proba = model.predict_proba(X_test)[:, 1]
                else:
                    y_pred_proba = None
            
            # Calculate metrics
            model_type = self.models_config[model_name]['type']
            
            if model_type == 'classification':
                accuracy = accuracy_score(y_true, y_pred)
                precision = precision_score(y_true, y_pred, average='weighted')
                recall = recall_score(y_true, y_pred, average='weighted')
                f1 = f1_score(y_true, y_pred, average='weighted')
                roc_auc = roc_auc_score(y_true, y_pred_proba) if y_pred_proba is not None else None
                
            elif model_type == 'regression':
                from sklearn.metrics import mean_squared_error, r2_score
                mse = mean_squared_error(y_true, y_pred)
                r2 = r2_score(y_true, y_pred)
                accuracy = r2  # Use R² as accuracy metric for regression
                precision = 1 / (1 + mse)  # Inverse of MSE normalized
                recall = r2
                f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                roc_auc = None
                
            else:  # clustering
                from sklearn.metrics import silhouette_score
                silhouette = silhouette_score(X_test, y_pred) if len(set(y_pred)) > 1 else 0
                accuracy = (silhouette + 1) / 2  # Normalize to 0-1
                precision = accuracy
                recall = accuracy
                f1 = accuracy
                roc_auc = None
            
            # Update Prometheus metrics
            model_accuracy.labels(
                model_name=model_name, 
                version=self.model_versions.get(model_name, 'unknown')
            ).set(accuracy)
            
            model_predictions.labels(
                model_name=model_name, 
                version=self.model_versions.get(model_name, 'unknown')
            ).inc(len(y_pred))
            
            # Create performance metrics object
            metrics = ModelPerformanceMetrics(
                model_name=model_name,
                model_version=self.model_versions.get(model_name, 'unknown'),
                accuracy=accuracy,
                precision=precision,
                recall=recall,
                f1_score=f1,
                roc_auc=roc_auc,
                timestamp=datetime.now()
            )
            
            # Store metrics in database
            await self.store_performance_metrics(metrics)
            
            # Check if retraining is needed
            await self.check_retraining_trigger(model_name, metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error monitoring {model_name}: {e}")
            return None

    async def detect_model_drift(self, model_name: str) -> ModelDriftReport:
        """Detect model drift using statistical tests"""
        try:
            # Get training data baseline
            training_data = await self.get_training_baseline(model_name)
            
            # Get recent production data
            production_data = await self.get_recent_production_data(model_name, days=7)
            
            if not training_data or not production_data:
                logger.warning(f"Insufficient data for drift detection on {model_name}")
                return None
            
            drift_detected = False
            drift_scores = []
            affected_features = []
            
            # Compare feature distributions
            for feature in training_data.columns:
                if feature in production_data.columns:
                    # Kolmogorov-Smirnov test for distribution comparison
                    ks_statistic, p_value = stats.ks_2samp(
                        training_data[feature].dropna(),
                        production_data[feature].dropna()
                    )
                    
                    drift_scores.append(ks_statistic)
                    
                    # Check if drift is significant
                    if p_value < 0.05:  # Significant drift detected
                        affected_features.append(feature)
                        drift_detected = True
            
            overall_drift_score = np.mean(drift_scores) if drift_scores else 0
            drift_threshold = self.models_config[model_name]['drift_threshold']
            
            if overall_drift_score > drift_threshold:
                drift_detected = True
            
            # Update Prometheus metrics
            model_drift_score.labels(model_name=model_name).set(overall_drift_score)
            
            # Determine recommended action
            if drift_detected:
                if overall_drift_score > drift_threshold * 1.5:
                    recommended_action = "immediate_retrain"
                else:
                    recommended_action = "schedule_retrain"
            else:
                recommended_action = "monitor"
            
            drift_report = ModelDriftReport(
                model_name=model_name,
                drift_detected=drift_detected,
                drift_score=overall_drift_score,
                affected_features=affected_features,
                recommended_action=recommended_action,
                timestamp=datetime.now()
            )
            
            # Store drift report
            await self.store_drift_report(drift_report)
            
            return drift_report
            
        except Exception as e:
            logger.error(f"Error detecting drift for {model_name}: {e}")
            return None

    async def check_data_quality(self) -> DataQualityReport:
        """Monitor data quality for model inputs"""
        try:
            async with self.db_pool.acquire() as conn:
                # Check data freshness
                freshness_query = """
                    SELECT 
                        EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as hours_since_last
                    FROM model_predictions
                """
                freshness_result = await conn.fetchrow(freshness_query)
                data_freshness_hours = freshness_result['hours_since_last'] or 0
                
                # Check for missing values
                missing_values_query = """
                    SELECT 
                        COUNT(*) as total_records,
                        COUNT(CASE WHEN feature_data IS NULL THEN 1 END) as missing_features,
                        COUNT(CASE WHEN prediction IS NULL THEN 1 END) as missing_predictions
                    FROM model_predictions
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                """
                missing_result = await conn.fetchrow(missing_values_query)
                
                total_records = missing_result['total_records']
                missing_values = {
                    'features': missing_result['missing_features'],
                    'predictions': missing_result['missing_predictions']
                }
                
                # Detect outliers (simplified example)
                outliers_query = """
                    SELECT COUNT(*) as outlier_count
                    FROM model_predictions
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    AND ABS(prediction - (
                        SELECT AVG(prediction) 
                        FROM model_predictions 
                        WHERE created_at >= NOW() - INTERVAL '7 days'
                    )) > 3 * (
                        SELECT STDDEV(prediction) 
                        FROM model_predictions 
                        WHERE created_at >= NOW() - INTERVAL '7 days'
                    )
                """
                outliers_result = await conn.fetchrow(outliers_query)
                outliers_detected = outliers_result['outlier_count'] or 0
                
                # Calculate quality score
                quality_score = 1.0
                issues = []
                
                if data_freshness_hours > 24:
                    quality_score -= 0.3
                    issues.append("Data staleness detected")
                
                if total_records > 0:
                    missing_ratio = sum(missing_values.values()) / (total_records * len(missing_values))
                    if missing_ratio > 0.1:
                        quality_score -= 0.4
                        issues.append("High missing value ratio")
                
                if outliers_detected > total_records * 0.05:  # More than 5% outliers
                    quality_score -= 0.3
                    issues.append("High outlier ratio")
                
                quality_score = max(0, quality_score)
                
                return DataQualityReport(
                    total_records=total_records,
                    missing_values=missing_values,
                    outliers_detected=outliers_detected,
                    data_freshness_hours=data_freshness_hours,
                    quality_score=quality_score,
                    issues=issues
                )
                
        except Exception as e:
            logger.error(f"Error checking data quality: {e}")
            return None

    async def check_retraining_trigger(self, model_name: str, current_metrics: ModelPerformanceMetrics):
        """Check if model needs retraining based on performance and rules"""
        try:
            config = self.models_config[model_name]
            should_retrain = False
            trigger_reasons = []
            
            # Performance degradation check
            if current_metrics.accuracy < config['performance_threshold']:
                should_retrain = True
                trigger_reasons.append(f"Accuracy below threshold: {current_metrics.accuracy:.3f} < {config['performance_threshold']}")
            
            # Time-based retraining
            last_retrain = await self.get_last_retrain_time(model_name)
            if last_retrain:
                days_since_retrain = (datetime.now() - last_retrain).days
                if days_since_retrain >= config['retrain_interval_days']:
                    should_retrain = True
                    trigger_reasons.append(f"Scheduled retrain: {days_since_retrain} days since last retrain")
            
            # Data volume check
            new_samples = await self.get_new_samples_count(model_name)
            if new_samples >= config['min_samples_retrain']:
                should_retrain = True
                trigger_reasons.append(f"Sufficient new data: {new_samples} samples")
            
            # Drift-based retraining
            drift_report = await self.detect_model_drift(model_name)
            if drift_report and drift_report.recommended_action in ['immediate_retrain', 'schedule_retrain']:
                should_retrain = True
                trigger_reasons.append(f"Model drift detected: {drift_report.drift_score:.3f}")
            
            if should_retrain:
                logger.info(f"Triggering retraining for {model_name}: {', '.join(trigger_reasons)}")
                
                # Queue retraining job
                retrain_request = RetrainingRequest(
                    model_name=model_name,
                    trigger_reason='; '.join(trigger_reasons),
                    force_retrain=False
                )
                
                # Use Celery for background retraining
                celery_app.send_task('retrain_model_task', args=[retrain_request.dict()])
                
        except Exception as e:
            logger.error(f"Error checking retraining trigger for {model_name}: {e}")

    # Database helper methods
    async def get_test_data(self, model_name: str) -> Optional[Dict]:
        """Get test data for model evaluation"""
        try:
            async with self.db_pool.acquire() as conn:
                # This is a simplified example - adapt based on your data structure
                query = """
                    SELECT feature_data, ground_truth
                    FROM model_test_data
                    WHERE model_name = $1
                    AND created_at >= NOW() - INTERVAL '7 days'
                    ORDER BY created_at DESC
                    LIMIT 1000
                """
                results = await conn.fetch(query, model_name)
                
                if not results:
                    return None
                
                features = []
                labels = []
                
                for row in results:
                    if row['feature_data'] and row['ground_truth'] is not None:
                        features.append(json.loads(row['feature_data']))
                        labels.append(row['ground_truth'])
                
                return {
                    'features': np.array(features),
                    'labels': np.array(labels)
                }
                
        except Exception as e:
            logger.error(f"Error getting test data for {model_name}: {e}")
            return None

    async def store_performance_metrics(self, metrics: ModelPerformanceMetrics):
        """Store performance metrics in database"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO model_performance_metrics 
                    (model_name, model_version, accuracy, precision, recall, f1_score, roc_auc, timestamp)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, 
                metrics.model_name, metrics.model_version, metrics.accuracy,
                metrics.precision, metrics.recall, metrics.f1_score, 
                metrics.roc_auc, metrics.timestamp
                )
                
        except Exception as e:
            logger.error(f"Error storing performance metrics: {e}")

    async def get_historical_performance(self, model_name: str, days: int = 30) -> Optional[Dict]:
        """Get historical performance metrics"""
        try:
            async with self.db_pool.acquire() as conn:
                query = """
                    SELECT AVG(accuracy) as avg_accuracy, AVG(precision) as avg_precision,
                           AVG(recall) as avg_recall, AVG(f1_score) as avg_f1
                    FROM model_performance_metrics
                    WHERE model_name = $1 
                    AND timestamp >= NOW() - INTERVAL '%s days'
                """ % days
                
                result = await conn.fetchrow(query, model_name)
                
                if result and result['avg_accuracy']:
                    return {
                        'accuracy': float(result['avg_accuracy']),
                        'precision': float(result['avg_precision']),
                        'recall': float(result['avg_recall']),
                        'f1_score': float(result['avg_f1'])
                    }
                    
                return None
                
        except Exception as e:
            logger.error(f"Error getting historical performance: {e}")
            return None

@celery_app.task
def retrain_model_task(retrain_request_dict: Dict):
    """Celery task for model retraining"""
    import asyncio
    
    async def run_retraining():
        try:
            retrain_request = RetrainingRequest(**retrain_request_dict)
            logger.info(f"Starting retraining for {retrain_request.model_name}")
            
            # Initialize retraining pipeline
            pipeline = ModelRetrainingPipeline()
            await pipeline.initialize()
            
            # Execute retraining
            result = await pipeline.retrain_model(retrain_request)
            
            if result['success']:
                retraining_jobs.labels(
                    model_name=retrain_request.model_name, 
                    status='success'
                ).inc()
                logger.info(f"Retraining completed for {retrain_request.model_name}")
            else:
                retraining_jobs.labels(
                    model_name=retrain_request.model_name, 
                    status='failed'
                ).inc()
                logger.error(f"Retraining failed for {retrain_request.model_name}: {result['error']}")
                
        except Exception as e:
            logger.error(f"Retraining task error: {e}")
            retraining_jobs.labels(
                model_name=retrain_request.model_name, 
                status='error'
            ).inc()
    
    # Run the async function
    asyncio.run(run_retraining())

class ModelRetrainingPipeline:
    """Pipeline for automated model retraining"""
    
    def __init__(self):
        self.db_pool = None
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
    
    async def initialize(self):
        """Initialize database connection"""
        self.db_pool = await asyncpg.create_pool(
            host='localhost',
            port=5432,
            user='postgres',
            password='password',
            database='msmebazaar',
            min_size=5,
            max_size=10
        )
    
    async def retrain_model(self, request: RetrainingRequest) -> Dict:
        """Execute model retraining pipeline"""
        try:
            model_name = request.model_name
            
            # Step 1: Load training data
            training_data = await self.load_training_data(model_name)
            if not training_data:
                return {'success': False, 'error': 'No training data available'}
            
            # Step 2: Prepare data
            X, y = self.prepare_data(training_data, model_name)
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Step 3: Train model with hyperparameter tuning
            model, best_params = await self.train_model_with_tuning(
                X_train, y_train, X_test, y_test, model_name, request.hyperparameters
            )
            
            # Step 4: Evaluate model
            evaluation_metrics = self.evaluate_model(model, X_test, y_test, model_name)
            
            # Step 5: Register model in MLflow
            model_version = await self.register_model_mlflow(
                model, model_name, evaluation_metrics, best_params
            )
            
            # Step 6: Deploy model if performance is satisfactory
            if evaluation_metrics['accuracy'] > 0.7:  # Minimum threshold
                await self.deploy_model(model_name, model_version)
                
                return {
                    'success': True,
                    'model_version': model_version,
                    'metrics': evaluation_metrics,
                    'hyperparameters': best_params
                }
            else:
                return {
                    'success': False, 
                    'error': f'Model performance below threshold: {evaluation_metrics["accuracy"]:.3f}'
                }
                
        except Exception as e:
            logger.error(f"Retraining pipeline error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def train_model_with_tuning(self, X_train, y_train, X_test, y_test, model_name: str, custom_params: Optional[Dict] = None) -> Tuple:
        """Train model with hyperparameter tuning"""
        from sklearn.model_selection import GridSearchCV
        
        # Define model and parameter grids based on model type
        if 'classification' in model_name or 'risk' in model_name:
            base_model = RandomForestClassifier(random_state=42)
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            }
        else:
            from sklearn.ensemble import RandomForestRegressor
            base_model = RandomForestRegressor(random_state=42)
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            }
        
        # Override with custom parameters if provided
        if custom_params:
            param_grid.update(custom_params)
        
        # Hyperparameter tuning
        grid_search = GridSearchCV(
            base_model, param_grid, cv=5, scoring='accuracy', n_jobs=-1
        )
        grid_search.fit(X_train, y_train)
        
        best_model = grid_search.best_estimator_
        best_params = grid_search.best_params_
        
        return best_model, best_params

# Initialize monitoring service
monitoring_service = ModelMonitoringService()

@app.on_event("startup")
async def startup_event():
    await monitoring_service.initialize()

@app.post("/api/monitor/{model_name}")
async def monitor_model(model_name: str):
    """Trigger manual model monitoring"""
    try:
        if model_name not in monitoring_service.models_config:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        metrics = await monitoring_service.monitor_model_performance(model_name)
        if metrics:
            return {"status": "success", "metrics": metrics.dict()}
        else:
            return {"status": "warning", "message": "Insufficient data for monitoring"}
            
    except Exception as e:
        logger.error(f"Monitoring error: {e}")
        raise HTTPException(status_code=500, detail="Failed to monitor model")

@app.post("/api/retrain/{model_name}")
async def trigger_retrain(model_name: str, background_tasks: BackgroundTasks, force: bool = False):
    """Trigger manual model retraining"""
    try:
        if model_name not in monitoring_service.models_config:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        retrain_request = RetrainingRequest(
            model_name=model_name,
            trigger_reason="Manual trigger",
            force_retrain=force
        )
        
        # Queue retraining job
        background_tasks.add_task(
            celery_app.send_task, 
            'retrain_model_task', 
            args=[retrain_request.dict()]
        )
        
        return {"status": "success", "message": f"Retraining queued for {model_name}"}
        
    except Exception as e:
        logger.error(f"Retrain trigger error: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

@app.get("/api/drift/{model_name}")
async def check_drift(model_name: str):
    """Check model drift for a specific model"""
    try:
        if model_name not in monitoring_service.models_config:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        drift_report = await monitoring_service.detect_model_drift(model_name)
        if drift_report:
            return {"status": "success", "drift_report": drift_report.dict()}
        else:
            return {"status": "warning", "message": "Unable to detect drift - insufficient data"}
            
    except Exception as e:
        logger.error(f"Drift detection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check model drift")

@app.get("/api/data_quality")
async def check_data_quality():
    """Check overall data quality"""
    try:
        quality_report = await monitoring_service.check_data_quality()
        if quality_report:
            return {"status": "success", "quality_report": quality_report.dict()}
        else:
            return {"status": "error", "message": "Unable to assess data quality"}
            
    except Exception as e:
        logger.error(f"Data quality check error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check data quality")

@app.get("/api/models/status")
async def get_models_status():
    """Get status of all monitored models"""
    try:
        status = {}
        
        for model_name in monitoring_service.models_config.keys():
            # Get latest metrics
            metrics = await monitoring_service.monitor_model_performance(model_name)
            
            # Get drift status
            drift_report = await monitoring_service.detect_model_drift(model_name)
            
            status[model_name] = {
                "version": monitoring_service.model_versions.get(model_name, "unknown"),
                "performance": metrics.dict() if metrics else None,
                "drift_status": {
                    "drift_detected": drift_report.drift_detected if drift_report else False,
                    "drift_score": drift_report.drift_score if drift_report else 0
                },
                "last_updated": datetime.now().isoformat()
            }
        
        return {"status": "success", "models": status}
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get models status")

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)