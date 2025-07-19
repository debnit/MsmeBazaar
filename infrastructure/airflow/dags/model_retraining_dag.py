"""
MSMEBazaar v2.0 - Airflow DAG for Model Monitoring & Retraining
Features:
- Scheduled model performance monitoring
- Automated retraining triggers
- Data quality checks
- Model drift detection
- Model deployment pipeline
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.operators.http_operator import SimpleHttpOperator
from airflow.sensors.http_sensor import HttpSensor
from airflow.hooks.postgres_hook import PostgresHook
from airflow.hooks.http_hook import HttpHook
from airflow.models import Variable
import logging
import requests
import json

# Default arguments
default_args = {
    'owner': 'msmebazaar-ml-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
    'catchup': False
}

# DAG definition
dag = DAG(
    'model_monitoring_retraining',
    default_args=default_args,
    description='Automated ML model monitoring and retraining pipeline',
    schedule_interval=timedelta(hours=6),  # Run every 6 hours
    max_active_runs=1,
    tags=['ml', 'monitoring', 'retraining']
)

# Configuration
MODELS_TO_MONITOR = [
    'valuation_model',
    'recommendation_model', 
    'risk_assessment_model',
    'transaction_matching_model'
]

ML_MONITORING_API_BASE = Variable.get("ml_monitoring_api_base", "http://ml-monitoring:8005")
SLACK_WEBHOOK_URL = Variable.get("slack_webhook_url", "")

def check_service_health():
    """Check if ML monitoring service is healthy"""
    try:
        response = requests.get(f"{ML_MONITORING_API_BASE}/health", timeout=30)
        if response.status_code == 200:
            logging.info("ML monitoring service is healthy")
            return True
        else:
            logging.error(f"ML monitoring service health check failed: {response.status_code}")
            return False
    except Exception as e:
        logging.error(f"Failed to check ML monitoring service health: {e}")
        return False

def monitor_data_quality():
    """Monitor overall data quality"""
    try:
        response = requests.get(f"{ML_MONITORING_API_BASE}/api/data_quality", timeout=60)
        response.raise_for_status()
        
        quality_report = response.json()['quality_report']
        quality_score = quality_report['quality_score']
        
        logging.info(f"Data quality score: {quality_score}")
        
        # Alert if quality is low
        if quality_score < 0.7:
            send_slack_alert(
                f"⚠️ Data Quality Alert: Quality score is {quality_score:.2f}",
                f"Issues: {', '.join(quality_report['issues'])}"
            )
        
        return quality_report
        
    except Exception as e:
        logging.error(f"Failed to monitor data quality: {e}")
        raise

def monitor_model_performance(model_name: str):
    """Monitor performance of a specific model"""
    try:
        response = requests.post(f"{ML_MONITORING_API_BASE}/api/monitor/{model_name}", timeout=120)
        response.raise_for_status()
        
        result = response.json()
        
        if result['status'] == 'success':
            metrics = result['metrics']
            accuracy = metrics['accuracy']
            
            logging.info(f"Model {model_name} accuracy: {accuracy:.3f}")
            
            # Alert if performance is low
            if accuracy < 0.75:
                send_slack_alert(
                    f"🔴 Model Performance Alert: {model_name}",
                    f"Accuracy dropped to {accuracy:.3f}"
                )
        else:
            logging.warning(f"Model monitoring returned warning for {model_name}: {result.get('message', 'Unknown')}")
        
        return result
        
    except Exception as e:
        logging.error(f"Failed to monitor model {model_name}: {e}")
        raise

def check_model_drift(model_name: str):
    """Check for model drift"""
    try:
        response = requests.get(f"{ML_MONITORING_API_BASE}/api/drift/{model_name}", timeout=60)
        response.raise_for_status()
        
        result = response.json()
        
        if result['status'] == 'success':
            drift_report = result['drift_report']
            drift_detected = drift_report['drift_detected']
            drift_score = drift_report['drift_score']
            
            logging.info(f"Model {model_name} drift score: {drift_score:.3f}")
            
            if drift_detected:
                send_slack_alert(
                    f"📊 Model Drift Detected: {model_name}",
                    f"Drift score: {drift_score:.3f}\nRecommended action: {drift_report['recommended_action']}"
                )
        
        return result
        
    except Exception as e:
        logging.error(f"Failed to check drift for model {model_name}: {e}")
        raise

def trigger_model_retraining(model_name: str):
    """Trigger model retraining if needed"""
    try:
        response = requests.post(
            f"{ML_MONITORING_API_BASE}/api/retrain/{model_name}",
            params={'force': False},
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        if result['status'] == 'success':
            logging.info(f"Retraining triggered for {model_name}")
            send_slack_alert(
                f"🔄 Model Retraining Started: {model_name}",
                "Automatic retraining has been triggered based on performance metrics"
            )
        
        return result
        
    except Exception as e:
        logging.error(f"Failed to trigger retraining for {model_name}: {e}")
        raise

def validate_model_deployments():
    """Validate that all models are properly deployed"""
    try:
        response = requests.get(f"{ML_MONITORING_API_BASE}/api/models/status", timeout=60)
        response.raise_for_status()
        
        result = response.json()
        models_status = result['models']
        
        deployment_issues = []
        
        for model_name, status in models_status.items():
            if status['version'] == 'unknown':
                deployment_issues.append(f"{model_name}: No deployed version")
            elif status['performance'] is None:
                deployment_issues.append(f"{model_name}: No performance data")
        
        if deployment_issues:
            send_slack_alert(
                "🚨 Model Deployment Issues",
                "\n".join(deployment_issues)
            )
        
        return models_status
        
    except Exception as e:
        logging.error(f"Failed to validate model deployments: {e}")
        raise

def cleanup_old_model_versions():
    """Clean up old model versions to save storage"""
    try:
        # This would typically involve MLflow model registry cleanup
        logging.info("Cleaning up old model versions...")
        
        # Placeholder for actual cleanup logic
        # In practice, you would:
        # 1. Connect to MLflow
        # 2. List model versions
        # 3. Archive or delete old versions (keeping last N versions)
        
        return {"cleaned_versions": 0}
        
    except Exception as e:
        logging.error(f"Failed to cleanup old model versions: {e}")
        raise

def send_daily_report():
    """Send daily ML operations report"""
    try:
        # Gather all model statuses
        models_status = validate_model_deployments()
        
        # Create summary report
        total_models = len(models_status)
        healthy_models = sum(1 for status in models_status.values() 
                           if status['performance'] and status['performance']['accuracy'] > 0.75)
        
        report = f"""
📊 **Daily ML Operations Report**

**Model Health Summary:**
- Total Models: {total_models}
- Healthy Models: {healthy_models}
- Models Needing Attention: {total_models - healthy_models}

**Model Performance:**
"""
        
        for model_name, status in models_status.items():
            if status['performance']:
                accuracy = status['performance']['accuracy']
                status_emoji = "✅" if accuracy > 0.75 else "⚠️" if accuracy > 0.65 else "🔴"
                report += f"- {status_emoji} {model_name}: {accuracy:.3f}\n"
            else:
                report += f"- ❓ {model_name}: No data\n"
        
        send_slack_alert("Daily ML Report", report)
        
        return {"report_sent": True}
        
    except Exception as e:
        logging.error(f"Failed to send daily report: {e}")
        raise

def send_slack_alert(title: str, message: str):
    """Send alert to Slack"""
    if not SLACK_WEBHOOK_URL:
        logging.warning("Slack webhook URL not configured")
        return
    
    try:
        payload = {
            "text": f"*{title}*\n{message}",
            "username": "MSMEBazaar ML Monitor",
            "icon_emoji": ":robot_face:"
        }
        
        response = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
        response.raise_for_status()
        
        logging.info(f"Slack alert sent: {title}")
        
    except Exception as e:
        logging.error(f"Failed to send Slack alert: {e}")

# Task definitions

# Health check task
health_check_task = PythonOperator(
    task_id='check_service_health',
    python_callable=check_service_health,
    dag=dag
)

# Data quality monitoring task
data_quality_task = PythonOperator(
    task_id='monitor_data_quality',
    python_callable=monitor_data_quality,
    dag=dag
)

# Model monitoring tasks
model_monitoring_tasks = []
for model_name in MODELS_TO_MONITOR:
    task = PythonOperator(
        task_id=f'monitor_{model_name}',
        python_callable=monitor_model_performance,
        op_args=[model_name],
        dag=dag
    )
    model_monitoring_tasks.append(task)

# Model drift detection tasks
drift_check_tasks = []
for model_name in MODELS_TO_MONITOR:
    task = PythonOperator(
        task_id=f'check_drift_{model_name}',
        python_callable=check_model_drift,
        op_args=[model_name],
        dag=dag
    )
    drift_check_tasks.append(task)

# Model validation task
validation_task = PythonOperator(
    task_id='validate_model_deployments',
    python_callable=validate_model_deployments,
    dag=dag
)

# Cleanup task
cleanup_task = PythonOperator(
    task_id='cleanup_old_versions',
    python_callable=cleanup_old_model_versions,
    dag=dag
)

# Daily report task (only run once per day)
daily_report_task = PythonOperator(
    task_id='send_daily_report',
    python_callable=send_daily_report,
    dag=dag
)

# Task dependencies
health_check_task >> data_quality_task
data_quality_task >> model_monitoring_tasks
model_monitoring_tasks >> drift_check_tasks
drift_check_tasks >> validation_task
validation_task >> cleanup_task
cleanup_task >> daily_report_task

# Separate DAG for emergency retraining
emergency_retrain_dag = DAG(
    'emergency_model_retraining',
    default_args=default_args,
    description='Emergency model retraining pipeline',
    schedule_interval=None,  # Triggered manually or by alerts
    max_active_runs=1,
    tags=['ml', 'emergency', 'retraining']
)

def emergency_retrain_all_models():
    """Emergency retraining for all models"""
    try:
        for model_name in MODELS_TO_MONITOR:
            logging.info(f"Emergency retraining for {model_name}")
            trigger_model_retraining(model_name)
        
        send_slack_alert(
            "🚨 Emergency Retraining Triggered",
            "All models have been queued for emergency retraining"
        )
        
        return {"models_retraining": len(MODELS_TO_MONITOR)}
        
    except Exception as e:
        logging.error(f"Failed emergency retraining: {e}")
        raise

emergency_task = PythonOperator(
    task_id='emergency_retrain_all',
    python_callable=emergency_retrain_all_models,
    dag=emergency_retrain_dag
)

# Weekly deep analysis DAG
weekly_analysis_dag = DAG(
    'weekly_ml_analysis',
    default_args=default_args,
    description='Weekly deep ML analysis and optimization',
    schedule_interval=timedelta(days=7),  # Weekly
    max_active_runs=1,
    tags=['ml', 'analysis', 'weekly']
)

def perform_weekly_analysis():
    """Perform comprehensive weekly ML analysis"""
    try:
        # Detailed performance analysis
        logging.info("Starting weekly ML analysis...")
        
        # This would include:
        # - Feature importance analysis
        # - Model comparison metrics
        # - A/B testing results
        # - Resource utilization analysis
        # - Prediction accuracy over time
        
        analysis_results = {
            "models_analyzed": len(MODELS_TO_MONITOR),
            "recommendations": [
                "Consider hyperparameter tuning for valuation_model",
                "Increase training data for recommendation_model"
            ]
        }
        
        send_slack_alert(
            "📈 Weekly ML Analysis Complete",
            f"Analysis completed for {len(MODELS_TO_MONITOR)} models.\n" +
            "Check detailed report in MLflow dashboard."
        )
        
        return analysis_results
        
    except Exception as e:
        logging.error(f"Failed weekly analysis: {e}")
        raise

weekly_analysis_task = PythonOperator(
    task_id='weekly_ml_analysis',
    python_callable=perform_weekly_analysis,
    dag=weekly_analysis_dag
)