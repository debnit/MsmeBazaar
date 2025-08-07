from libs.db.session import get_db
"""
ML Monitoring Service for MSMEBazaar v2.0
Monitors machine learning model performance, data drift, and system metrics
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import asyncpg
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import structlog
from celery import Celery
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import mlflow
import mlflow.sklearn

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/msmebazaar")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Initialize FastAPI app
app = FastAPI(
    title="ML Monitoring Service",
    description="Machine Learning model monitoring and performance tracking for MSMEBazaar",
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

# Initialize MLflow
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

# Initialize Celery
celery_app = Celery(
    "ml_monitoring",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['app.tasks']
)

# Prometheus metrics
model_prediction_counter = Counter(
    'ml_model_predictions_total',
    'Total number of ML model predictions',
    ['model_name', 'model_version']
)

model_accuracy_gauge = Gauge(
    'ml_model_accuracy',
    'Current model accuracy',
    ['model_name', 'model_version']
)

prediction_latency_histogram = Histogram(
    'ml_prediction_latency_seconds',
    'ML prediction latency in seconds',
    ['model_name']
)

data_drift_gauge = Gauge(
    'ml_data_drift_score',
    'Data drift detection score',
    ['feature_name', 'model_name']
)

# Pydantic models
class ModelMetrics(BaseModel):
    model_name: str
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    timestamp: datetime

class PredictionRecord(BaseModel):
    model_name: str
    model_version: str
    input_features: Dict[str, Any]
    prediction: Any
    confidence: Optional[float] = None
    latency_ms: float
    timestamp: datetime

class DataDriftAlert(BaseModel):
    feature_name: str
    model_name: str
    drift_score: float
    threshold: float
    alert_level: str
    timestamp: datetime

class ModelStatus(BaseModel):
    model_name: str
    model_version: str
    status: str
    last_updated: datetime
    performance_metrics: Dict[str, float]
    health_score: float

# Database connection
async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

# Redis connection
async def get_redis_connection():
    """Get Redis connection"""
    return redis.from_url(REDIS_URL)

# Background monitoring tasks
@celery_app.task
def monitor_model_performance():
    """Background task to monitor model performance"""
    logger.info("Starting model performance monitoring")
    # Implementation for model performance monitoring
    return {"status": "completed", "timestamp": datetime.now().isoformat()}

@celery_app.task
def detect_data_drift():
    """Background task to detect data drift"""
    logger.info("Starting data drift detection")
    # Implementation for data drift detection
    return {"status": "completed", "timestamp": datetime.now().isoformat()}

@celery_app.task
def update_model_metrics():
    """Background task to update model metrics"""
    logger.info("Updating model metrics")
    # Implementation for updating model metrics
    return {"status": "completed", "timestamp": datetime.now().isoformat()}

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = await get_db_connection()
        await conn.close()
        
        # Check Redis connection
        redis_conn = await get_redis_connection()
        await redis_conn.ping()
        await redis_conn.close()
        
        return {"status": "healthy", "timestamp": datetime.now()}
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.get("/api/models/status")
async def get_models_status():
    """Get status of all monitored models"""
    try:
        conn = await get_db_connection()
        
        # Query model status from database
        query = """
        SELECT model_name, model_version, status, last_updated, 
               performance_metrics, health_score
        FROM model_monitoring
        WHERE is_active = true
        ORDER BY last_updated DESC
        """
        
        rows = await conn.fetch(query)
        await conn.close()
        
        models = []
        for row in rows:
            models.append(ModelStatus(
                model_name=row['model_name'],
                model_version=row['model_version'],
                status=row['status'],
                last_updated=row['last_updated'],
                performance_metrics=json.loads(row['performance_metrics']) if row['performance_metrics'] else {},
                health_score=row['health_score']
            ))
        
        return {"models": models, "total": len(models)}
    
    except Exception as e:
        logger.error("Failed to get models status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve models status")

@app.post("/api/models/{model_name}/metrics")
async def record_model_metrics(
    model_name: str,
    metrics: ModelMetrics,
    background_tasks: BackgroundTasks
):
    """Record model performance metrics"""
    try:
        conn = await get_db_connection()
        
        # Insert metrics into database
        query = """
        INSERT INTO model_metrics 
        (model_name, model_version, accuracy, precision, recall, f1_score, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        await conn.execute(
            query,
            metrics.model_name,
            metrics.model_version,
            metrics.accuracy,
            metrics.precision,
            metrics.recall,
            metrics.f1_score,
            metrics.timestamp
        )
        
        await conn.close()
        
        # Update Prometheus metrics
        model_accuracy_gauge.labels(
            model_name=metrics.model_name,
            model_version=metrics.model_version
        ).set(metrics.accuracy)
        
        # Schedule background analysis
        background_tasks.add_task(analyze_model_performance, model_name, metrics)
        
        logger.info("Model metrics recorded", model_name=model_name, metrics=metrics.dict())
        return {"status": "success", "message": "Metrics recorded"}
    
    except Exception as e:
        logger.error("Failed to record model metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record metrics")

@app.post("/api/predictions/record")
async def record_prediction(prediction: PredictionRecord):
    """Record a model prediction for monitoring"""
    try:
        conn = await get_db_connection()
        
        # Insert prediction record
        query = """
        INSERT INTO prediction_logs 
        (model_name, model_version, input_features, prediction, confidence, latency_ms, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        await conn.execute(
            query,
            prediction.model_name,
            prediction.model_version,
            json.dumps(prediction.input_features),
            json.dumps(prediction.prediction),
            prediction.confidence,
            prediction.latency_ms,
            prediction.timestamp
        )
        
        await conn.close()
        
        # Update Prometheus metrics
        model_prediction_counter.labels(
            model_name=prediction.model_name,
            model_version=prediction.model_version
        ).inc()
        
        prediction_latency_histogram.labels(
            model_name=prediction.model_name
        ).observe(prediction.latency_ms / 1000.0)  # Convert to seconds
        
        return {"status": "success", "message": "Prediction recorded"}
    
    except Exception as e:
        logger.error("Failed to record prediction", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record prediction")

@app.get("/api/models/{model_name}/drift")
async def get_data_drift(model_name: str, hours: int = 24):
    """Get data drift analysis for a model"""
    try:
        conn = await get_db_connection()
        
        # Query data drift data
        query = """
        SELECT feature_name, drift_score, threshold, alert_level, timestamp
        FROM data_drift_monitoring
        WHERE model_name = $1 AND timestamp >= $2
        ORDER BY timestamp DESC
        """
        
        since = datetime.now() - timedelta(hours=hours)
        rows = await conn.fetch(query, model_name, since)
        await conn.close()
        
        drift_data = []
        for row in rows:
            drift_data.append({
                "feature_name": row['feature_name'],
                "drift_score": row['drift_score'],
                "threshold": row['threshold'],
                "alert_level": row['alert_level'],
                "timestamp": row['timestamp']
            })
        
        return {"model_name": model_name, "drift_data": drift_data}
    
    except Exception as e:
        logger.error("Failed to get data drift", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve data drift")

@app.get("/api/models/{model_name}/performance")
async def get_model_performance(model_name: str, days: int = 7):
    """Get model performance over time"""
    try:
        conn = await get_db_connection()
        
        # Query performance metrics
        query = """
        SELECT model_version, accuracy, precision, recall, f1_score, timestamp
        FROM model_metrics
        WHERE model_name = $1 AND timestamp >= $2
        ORDER BY timestamp DESC
        """
        
        since = datetime.now() - timedelta(days=days)
        rows = await conn.fetch(query, model_name, since)
        await conn.close()
        
        performance_data = []
        for row in rows:
            performance_data.append({
                "model_version": row['model_version'],
                "accuracy": row['accuracy'],
                "precision": row['precision'],
                "recall": row['recall'],
                "f1_score": row['f1_score'],
                "timestamp": row['timestamp']
            })
        
        return {"model_name": model_name, "performance_data": performance_data}
    
    except Exception as e:
        logger.error("Failed to get model performance", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve performance data")

@app.post("/api/models/{model_name}/retrain")
async def trigger_model_retraining(
    model_name: str,
    background_tasks: BackgroundTasks
):
    """Trigger model retraining"""
    try:
        # Schedule retraining task
        background_tasks.add_task(retrain_model, model_name)
        
        logger.info("Model retraining triggered", model_name=model_name)
        return {"status": "success", "message": f"Retraining triggered for {model_name}"}
    
    except Exception as e:
        logger.error("Failed to trigger retraining", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

@app.get("/api/alerts")
async def get_alerts(limit: int = 100):
    """Get recent alerts"""
    try:
        conn = await get_db_connection()
        
        query = """
        SELECT alert_type, model_name, message, severity, timestamp
        FROM ml_alerts
        ORDER BY timestamp DESC
        LIMIT $1
        """
        
        rows = await conn.fetch(query, limit)
        await conn.close()
        
        alerts = []
        for row in rows:
            alerts.append({
                "alert_type": row['alert_type'],
                "model_name": row['model_name'],
                "message": row['message'],
                "severity": row['severity'],
                "timestamp": row['timestamp']
            })
        
        return {"alerts": alerts}
    
    except Exception as e:
        logger.error("Failed to get alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")

@app.get("/metrics")
async def get_prometheus_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

# Background task functions
async def analyze_model_performance(model_name: str, metrics: ModelMetrics):
    """Analyze model performance and generate alerts if needed"""
    try:
        # Check if performance has degraded
        if metrics.accuracy < 0.8:  # Threshold for accuracy
            await create_alert(
                alert_type="performance_degradation",
                model_name=model_name,
                message=f"Model accuracy dropped to {metrics.accuracy:.2f}",
                severity="high"
            )
        
        logger.info("Model performance analyzed", model_name=model_name)
    
    except Exception as e:
        logger.error("Failed to analyze model performance", error=str(e))

async def retrain_model(model_name: str):
    """Retrain a model"""
    try:
        logger.info("Starting model retraining", model_name=model_name)
        
        # MLflow experiment tracking
        with mlflow.start_run():
            mlflow.log_param("model_name", model_name)
            mlflow.log_param("retrain_trigger", "manual")
            mlflow.log_metric("retrain_timestamp", datetime.now().timestamp())
            
            # Simulate retraining process
            await asyncio.sleep(5)  # Placeholder for actual retraining
            
            logger.info("Model retraining completed", model_name=model_name)
            
            await create_alert(
                alert_type="retrain_completed",
                model_name=model_name,
                message=f"Model {model_name} retraining completed successfully",
                severity="info"
            )
    
    except Exception as e:
        logger.error("Model retraining failed", model_name=model_name, error=str(e))
        await create_alert(
            alert_type="retrain_failed",
            model_name=model_name,
            message=f"Model {model_name} retraining failed: {str(e)}",
            severity="high"
        )

async def create_alert(alert_type: str, model_name: str, message: str, severity: str):
    """Create an alert in the database"""
    try:
        conn = await get_db_connection()
        
        query = """
        INSERT INTO ml_alerts (alert_type, model_name, message, severity, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        """
        
        await conn.execute(query, alert_type, model_name, message, severity, datetime.now())
        await conn.close()
        
        logger.info("Alert created", alert_type=alert_type, model_name=model_name, severity=severity)
    
    except Exception as e:
        logger.error("Failed to create alert", error=str(e))

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("ML Monitoring Service starting up")
    
    # Start background monitoring tasks
    monitor_model_performance.delay()
    detect_data_drift.delay()
    update_model_metrics.delay()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("ML Monitoring Service shutting down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)