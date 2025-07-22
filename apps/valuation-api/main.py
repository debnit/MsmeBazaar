import os
import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean, Integer, ForeignKey, Enum, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
import jwt
import redis
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response
import boto3
from botocore.exceptions import ClientError
import enum
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import weasyprint
from jinja2 import Template
import razorpay
from celery import Celery
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msmebazaar")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis configuration
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True
)

# Celery configuration
celery_app = Celery(
    "valuation_tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"

# File storage configuration
S3_BUCKET = os.getenv("S3_BUCKET", "msmebazaar-documents")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Razorpay configuration
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Prometheus metrics
REQUEST_COUNT = Counter('valuation_api_requests_total', 'Total requests', ['method', 'endpoint'])
VALUATION_REQUESTS = Counter('valuation_requests_total', 'Total valuation requests', ['method'])
PDF_GENERATIONS = Counter('pdf_generations_total', 'Total PDF generations')
PAYMENT_ATTEMPTS = Counter('payment_attempts_total', 'Total payment attempts', ['status'])

# Enums
class ValuationMethod(str, enum.Enum):
    ML_MODEL = "ML_MODEL"
    RULE_BASED = "RULE_BASED"
    HYBRID = "HYBRID"
    MANUAL = "MANUAL"

class ValuationStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ReportType(str, enum.Enum):
    BASIC = "BASIC"
    DETAILED = "DETAILED"
    COMPREHENSIVE = "COMPREHENSIVE"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

# Database Models
class ValuationRequest(Base):
    __tablename__ = "valuation_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    msme_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    method = Column(Enum(ValuationMethod), nullable=False)
    status = Column(Enum(ValuationStatus), default=ValuationStatus.PENDING)
    
    # Valuation Results
    estimated_value = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    valuation_factors = Column(JSON)
    model_version = Column(String(50))
    
    # Processing Info
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reports = relationship("ValuationReport", back_populates="valuation")
    payments = relationship("ValuationPayment", back_populates="valuation")

class ValuationReport(Base):
    __tablename__ = "valuation_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    valuation_id = Column(UUID(as_uuid=True), ForeignKey("valuation_requests.id"), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(Integer)
    
    # Report Data
    report_data = Column(JSON)
    template_version = Column(String(50))
    
    # Status
    is_generated = Column(Boolean, default=False)
    generation_error = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    generated_at = Column(DateTime)
    
    # Relationships
    valuation = relationship("ValuationRequest", back_populates="reports")

class ValuationPayment(Base):
    __tablename__ = "valuation_payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    valuation_id = Column(UUID(as_uuid=True), ForeignKey("valuation_requests.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Payment Details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    payment_method = Column(String(50))
    
    # Razorpay Details
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(255))
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    failure_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    valuation = relationship("ValuationRequest", back_populates="payments")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class ValuationRequestCreate(BaseModel):
    msme_id: str
    method: ValuationMethod = ValuationMethod.ML_MODEL
    report_type: ReportType = ReportType.BASIC

class ValuationRequestResponse(BaseModel):
    id: str
    msme_id: str
    user_id: str
    method: ValuationMethod
    status: ValuationStatus
    estimated_value: float
    confidence_score: float
    valuation_factors: Optional[Dict[str, Any]]
    model_version: Optional[str]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PaymentCreateRequest(BaseModel):
    valuation_id: str
    amount: float
    currency: str = "INR"

class PaymentResponse(BaseModel):
    id: str
    valuation_id: str
    amount: float
    currency: str
    razorpay_order_id: str
    status: PaymentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: str
    valuation_id: str
    report_type: ReportType
    file_name: Optional[str]
    file_size: Optional[int]
    is_generated: bool
    created_at: datetime
    generated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ML Model Manager
class ValuationMLModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = [
            'annual_turnover', 'employee_count', 'years_in_business',
            'industry_encoded', 'state_encoded', 'msme_size_encoded'
        ]
        self.model_version = "1.0.0"
        self.load_or_train_model()
    
    def load_or_train_model(self):
        """Load existing model or train new one"""
        try:
            # Try to load existing model
            self.model = joblib.load('valuation_model.pkl')
            self.scaler = joblib.load('valuation_scaler.pkl')
            logger.info("Loaded existing ML model")
        except FileNotFoundError:
            # Train new model with sample data
            self.train_model()
            logger.info("Trained new ML model")
    
    def train_model(self):
        """Train the valuation model with sample data"""
        # Generate sample training data
        np.random.seed(42)
        n_samples = 1000
        
        # Features
        annual_turnover = np.random.lognormal(15, 1.5, n_samples)  # Log-normal distribution
        employee_count = np.random.poisson(25, n_samples)  # Poisson distribution
        years_in_business = np.random.gamma(2, 3, n_samples)  # Gamma distribution
        industry_encoded = np.random.randint(0, 10, n_samples)  # 10 industries
        state_encoded = np.random.randint(0, 29, n_samples)  # 29 states
        msme_size_encoded = np.random.randint(0, 3, n_samples)  # MICRO, SMALL, MEDIUM
        
        # Target variable (valuation) - complex relationship
        valuation = (
            annual_turnover * 2.5 +
            employee_count * 100000 +
            years_in_business * 50000 +
            industry_encoded * 200000 +
            state_encoded * 10000 +
            msme_size_encoded * 500000 +
            np.random.normal(0, 100000, n_samples)  # Noise
        )
        
        # Create DataFrame
        df = pd.DataFrame({
            'annual_turnover': annual_turnover,
            'employee_count': employee_count,
            'years_in_business': years_in_business,
            'industry_encoded': industry_encoded,
            'state_encoded': state_encoded,
            'msme_size_encoded': msme_size_encoded,
            'valuation': valuation
        })
        
        # Prepare features
        X = df[self.feature_columns]
        y = df['valuation']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Model trained - MAE: {mae:.2f}, R2: {r2:.3f}")
        
        # Save model
        joblib.dump(self.model, 'valuation_model.pkl')
        joblib.dump(self.scaler, 'valuation_scaler.pkl')
    
    def predict_valuation(self, msme_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict valuation for MSME"""
        try:
            # Extract features
            features = {
                'annual_turnover': msme_data.get('annual_turnover', 0),
                'employee_count': msme_data.get('employee_count', 0),
                'years_in_business': self._calculate_years_in_business(msme_data.get('incorporation_date')),
                'industry_encoded': self._encode_industry(msme_data.get('industry')),
                'state_encoded': self._encode_state(msme_data.get('state')),
                'msme_size_encoded': self._encode_msme_size(msme_data.get('msme_size'))
            }
            
            # Create feature array
            feature_array = np.array([[features[col] for col in self.feature_columns]])
            
            # Scale features
            feature_array_scaled = self.scaler.transform(feature_array)
            
            # Predict
            prediction = self.model.predict(feature_array_scaled)[0]
            
            # Calculate confidence score (simplified)
            confidence = min(0.95, max(0.3, 0.8 - abs(prediction - np.mean([1000000, 5000000])) / 10000000))
            
            return {
                'estimated_value': max(0, prediction),
                'confidence_score': confidence,
                'valuation_factors': features,
                'model_version': self.model_version
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {
                'estimated_value': 0,
                'confidence_score': 0,
                'valuation_factors': {},
                'model_version': self.model_version
            }
    
    def _calculate_years_in_business(self, incorporation_date):
        if incorporation_date:
            if isinstance(incorporation_date, str):
                incorporation_date = datetime.fromisoformat(incorporation_date.replace('Z', '+00:00'))
            return (datetime.now() - incorporation_date).days / 365.25
        return 0
    
    def _encode_industry(self, industry):
        # Simple hash-based encoding
        return hash(industry or 'unknown') % 10
    
    def _encode_state(self, state):
        # Simple hash-based encoding
        return hash(state or 'unknown') % 29
    
    def _encode_msme_size(self, msme_size):
        size_mapping = {'MICRO': 0, 'SMALL': 1, 'MEDIUM': 2}
        return size_mapping.get(msme_size, 0)

# Initialize ML model
ml_model = ValuationMLModel()

# FastAPI app
app = FastAPI(
    title="Valuation API",
    description="MSME valuation service with ML models and PDF generation",
    version="1.0.0"
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

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT token validation
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Helper functions
async def get_msme_data(msme_id: str) -> Dict[str, Any]:
    """Fetch MSME data from MSME API"""
    try:
        # In production, this would call the MSME API
        # For now, return mock data
        return {
            "id": msme_id,
            "company_name": "Sample MSME",
            "industry": "Manufacturing",
            "state": "Maharashtra",
            "msme_size": "SMALL",
            "annual_turnover": 2000000,
            "employee_count": 15,
            "incorporation_date": "2020-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Error fetching MSME data: {e}")
        return {}

async def generate_pdf_report(valuation_id: str, report_type: ReportType, db: Session):
    """Generate PDF report for valuation"""
    try:
        valuation = db.query(ValuationRequest).filter(ValuationRequest.id == valuation_id).first()
        if not valuation:
            raise Exception("Valuation not found")
        
        # Get MSME data
        msme_data = await get_msme_data(str(valuation.msme_id))
        
        # Prepare report data
        report_data = {
            "company_name": msme_data.get("company_name", "Unknown"),
            "valuation_id": str(valuation.id),
            "estimated_value": valuation.estimated_value,
            "confidence_score": valuation.confidence_score,
            "valuation_factors": valuation.valuation_factors or {},
            "method": valuation.method.value,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "report_type": report_type.value
        }
        
        # HTML template for PDF
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Valuation Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; color: #333; }
                .report-title { font-size: 18px; color: #666; margin-top: 10px; }
                .section { margin: 30px 0; }
                .section-title { font-size: 16px; font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                .value-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .value-amount { font-size: 28px; font-weight: bold; color: #28a745; }
                .confidence { font-size: 14px; color: #666; margin-top: 10px; }
                .factors-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .factors-table th, .factors-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .factors-table th { background-color: #f8f9fa; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">{{ company_name }}</div>
                <div class="report-title">{{ report_type }} Valuation Report</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                    Generated on {{ generated_at }}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Valuation Summary</div>
                <div class="value-box">
                    <div class="value-amount">₹{{ "{:,.0f}".format(estimated_value) }}</div>
                    <div class="confidence">Confidence Score: {{ "{:.1%}".format(confidence_score) }}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Valuation Methodology</div>
                <p>Method Used: <strong>{{ method }}</strong></p>
                <p>This valuation has been calculated using advanced machine learning algorithms 
                   that analyze multiple factors including financial performance, industry trends, 
                   and market conditions.</p>
            </div>
            
            <div class="section">
                <div class="section-title">Key Factors</div>
                <table class="factors-table">
                    <thead>
                        <tr>
                            <th>Factor</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for key, value in valuation_factors.items() %}
                        <tr>
                            <td>{{ key.replace('_', ' ').title() }}</td>
                            <td>{{ value }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
            <div class="footer">
                <p>This report is generated by MSMEBazaar Valuation Engine</p>
                <p>Report ID: {{ valuation_id }}</p>
            </div>
        </body>
        </html>
        """
        
        # Render HTML
        template = Template(html_template)
        html_content = template.render(**report_data)
        
        # Generate PDF
        pdf_filename = f"valuation_report_{valuation_id}_{report_type.value.lower()}.pdf"
        pdf_path = f"/tmp/{pdf_filename}"
        
        weasyprint.HTML(string=html_content).write_pdf(pdf_path)
        
        # Upload to S3
        s3_key = f"valuation-reports/{valuation_id}/{pdf_filename}"
        with open(pdf_path, 'rb') as pdf_file:
            s3_client.upload_fileobj(
                pdf_file,
                S3_BUCKET,
                s3_key,
                ExtraArgs={'ContentType': 'application/pdf'}
            )
        
        file_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        file_size = os.path.getsize(pdf_path)
        
        # Update report record
        report = ValuationReport(
            valuation_id=valuation_id,
            report_type=report_type,
            file_path=file_url,
            file_name=pdf_filename,
            file_size=file_size,
            report_data=report_data,
            is_generated=True,
            generated_at=datetime.utcnow()
        )
        
        db.add(report)
        db.commit()
        
        # Clean up local file
        os.remove(pdf_path)
        
        PDF_GENERATIONS.inc()
        return report
        
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        # Update report with error
        report = ValuationReport(
            valuation_id=valuation_id,
            report_type=report_type,
            is_generated=False,
            generation_error=str(e)
        )
        db.add(report)
        db.commit()
        return None

# Celery tasks
@celery_app.task
def process_valuation_task(valuation_id: str):
    """Background task to process valuation"""
    db = SessionLocal()
    try:
        valuation = db.query(ValuationRequest).filter(ValuationRequest.id == valuation_id).first()
        if not valuation:
            return {"error": "Valuation not found"}
        
        # Update status
        valuation.status = ValuationStatus.PROCESSING
        valuation.processing_started_at = datetime.utcnow()
        db.commit()
        
        # Get MSME data
        msme_data = asyncio.run(get_msme_data(str(valuation.msme_id)))
        
        # Perform valuation
        if valuation.method == ValuationMethod.ML_MODEL:
            result = ml_model.predict_valuation(msme_data)
        else:
            # Fallback to rule-based valuation
            result = {
                'estimated_value': msme_data.get('annual_turnover', 0) * 2.5,
                'confidence_score': 0.7,
                'valuation_factors': msme_data,
                'model_version': '1.0.0'
            }
        
        # Update valuation
        valuation.estimated_value = result['estimated_value']
        valuation.confidence_score = result['confidence_score']
        valuation.valuation_factors = result['valuation_factors']
        valuation.model_version = result['model_version']
        valuation.status = ValuationStatus.COMPLETED
        valuation.processing_completed_at = datetime.utcnow()
        
        db.commit()
        
        return {"success": True, "valuation_id": valuation_id}
        
    except Exception as e:
        logger.error(f"Valuation processing error: {e}")
        valuation.status = ValuationStatus.FAILED
        valuation.error_message = str(e)
        db.commit()
        return {"error": str(e)}
    finally:
        db.close()

# API Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

@app.post("/api/valuation/request", response_model=ValuationRequestResponse)
async def create_valuation_request(
    request_data: ValuationRequestCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/valuation/request").inc()
    
    # Create valuation request
    valuation = ValuationRequest(
        msme_id=request_data.msme_id,
        user_id=user_id,
        method=request_data.method
    )
    
    db.add(valuation)
    db.commit()
    db.refresh(valuation)
    
    # Start background processing
    background_tasks.add_task(process_valuation_task.delay, str(valuation.id))
    
    VALUATION_REQUESTS.labels(method=request_data.method.value).inc()
    
    return ValuationRequestResponse.from_orm(valuation)

@app.get("/api/valuation/{valuation_id}", response_model=ValuationRequestResponse)
async def get_valuation(
    valuation_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/valuation").inc()
    
    valuation = db.query(ValuationRequest).filter(
        ValuationRequest.id == valuation_id,
        ValuationRequest.user_id == user_id
    ).first()
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuation not found")
    
    return ValuationRequestResponse.from_orm(valuation)

@app.get("/api/valuation")
async def list_valuations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/valuation/list").inc()
    
    query = db.query(ValuationRequest).filter(ValuationRequest.user_id == user_id)
    total = query.count()
    valuations = query.offset(skip).limit(limit).all()
    
    return {
        "valuations": [ValuationRequestResponse.from_orm(v) for v in valuations],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.post("/api/valuation/{valuation_id}/payment", response_model=PaymentResponse)
async def create_payment(
    valuation_id: str,
    payment_data: PaymentCreateRequest,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/valuation/payment").inc()
    
    # Verify valuation exists
    valuation = db.query(ValuationRequest).filter(
        ValuationRequest.id == valuation_id,
        ValuationRequest.user_id == user_id
    ).first()
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuation not found")
    
    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(payment_data.amount * 100),  # Amount in paise
            "currency": payment_data.currency,
            "receipt": f"valuation_{valuation_id}",
            "payment_capture": 1
        })
        
        # Create payment record
        payment = ValuationPayment(
            valuation_id=valuation_id,
            user_id=user_id,
            amount=payment_data.amount,
            currency=payment_data.currency,
            razorpay_order_id=razorpay_order["id"]
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        PAYMENT_ATTEMPTS.labels(status="created").inc()
        
        return PaymentResponse.from_orm(payment)
        
    except Exception as e:
        logger.error(f"Payment creation error: {e}")
        PAYMENT_ATTEMPTS.labels(status="failed").inc()
        raise HTTPException(status_code=500, detail="Payment creation failed")

@app.post("/api/valuation/{valuation_id}/payment/verify")
async def verify_payment(
    valuation_id: str,
    payment_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/valuation/payment/verify").inc()
    
    payment = db.query(ValuationPayment).filter(
        ValuationPayment.id == payment_id,
        ValuationPayment.user_id == user_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payment.razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        # Update payment status
        payment.status = PaymentStatus.COMPLETED
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.completed_at = datetime.utcnow()
        
        db.commit()
        
        PAYMENT_ATTEMPTS.labels(status="completed").inc()
        
        return {"message": "Payment verified successfully"}
        
    except Exception as e:
        logger.error(f"Payment verification error: {e}")
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = str(e)
        db.commit()
        
        PAYMENT_ATTEMPTS.labels(status="failed").inc()
        raise HTTPException(status_code=400, detail="Payment verification failed")

@app.post("/api/valuation/{valuation_id}/report", response_model=ReportResponse)
async def generate_report(
    valuation_id: str,
    report_type: ReportType,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/valuation/report").inc()
    
    # Verify valuation exists and is completed
    valuation = db.query(ValuationRequest).filter(
        ValuationRequest.id == valuation_id,
        ValuationRequest.user_id == user_id
    ).first()
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuation not found")
    
    if valuation.status != ValuationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Valuation not completed")
    
    # Check if payment is required and completed
    if report_type in [ReportType.DETAILED, ReportType.COMPREHENSIVE]:
        payment = db.query(ValuationPayment).filter(
            ValuationPayment.valuation_id == valuation_id,
            ValuationPayment.status == PaymentStatus.COMPLETED
        ).first()
        
        if not payment:
            raise HTTPException(status_code=402, detail="Payment required for detailed reports")
    
    # Generate report in background
    background_tasks.add_task(generate_pdf_report, valuation_id, report_type, db)
    
    # Create report record
    report = ValuationReport(
        valuation_id=valuation_id,
        report_type=report_type
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return ReportResponse.from_orm(report)

@app.get("/api/valuation/{valuation_id}/reports")
async def list_reports(
    valuation_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/valuation/reports").inc()
    
    # Verify valuation exists
    valuation = db.query(ValuationRequest).filter(
        ValuationRequest.id == valuation_id,
        ValuationRequest.user_id == user_id
    ).first()
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuation not found")
    
    reports = db.query(ValuationReport).filter(
        ValuationReport.valuation_id == valuation_id
    ).all()
    
    return [ReportResponse.from_orm(report) for report in reports]

@app.get("/api/valuation/reports/{report_id}/download")
async def download_report(
    report_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/valuation/report/download").inc()
    
    report = db.query(ValuationReport).join(ValuationRequest).filter(
        ValuationReport.id == report_id,
        ValuationRequest.user_id == user_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not report.is_generated or not report.file_path:
        raise HTTPException(status_code=404, detail="Report not available")
    
    # Generate signed URL for S3 download
    try:
        s3_key = report.file_path.split(f"{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[1]
        signed_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=3600  # 1 hour
        )
        
        return {"download_url": signed_url}
        
    except Exception as e:
        logger.error(f"Download URL generation error: {e}")
        raise HTTPException(status_code=500, detail="Download URL generation failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)