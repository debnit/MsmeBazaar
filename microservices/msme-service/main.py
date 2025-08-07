from libs.db.session import get_db
import os
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean, Integer, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import logging
import jwt
from passlib.context import CryptContext
import redis
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response
import boto3
from botocore.exceptions import ClientError
import enum
from werkzeug.utils import secure_filename
import mimetypes
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json

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

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"

# File storage configuration
S3_BUCKET = os.getenv("S3_BUCKET", "msmebazaar-documents")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Prometheus metrics
REQUEST_COUNT = Counter('msme_api_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('msme_api_request_duration_seconds', 'Request duration')
DOCUMENT_UPLOADS = Counter('msme_api_document_uploads_total', 'Total document uploads')
PROFILE_UPDATES = Counter('msme_api_profile_updates_total', 'Total profile updates')

# Enums
class MSMESize(str, enum.Enum):
    MICRO = "MICRO"
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"

class VerificationLevel(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    BASIC = "BASIC"
    ENHANCED = "ENHANCED"
    PREMIUM = "PREMIUM"

class DocumentType(str, enum.Enum):
    GST_CERTIFICATE = "GST_CERTIFICATE"
    PAN_CARD = "PAN_CARD"
    INCORPORATION_CERTIFICATE = "INCORPORATION_CERTIFICATE"
    BALANCE_SHEET = "BALANCE_SHEET"
    PROFIT_LOSS_STATEMENT = "PROFIT_LOSS_STATEMENT"
    BANK_STATEMENT = "BANK_STATEMENT"
    AUDIT_REPORT = "AUDIT_REPORT"
    BUSINESS_PLAN = "BUSINESS_PLAN"
    OTHER = "OTHER"

class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# Database Models
class MSMEProfile(Base):
    __tablename__ = "msme_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    company_name = Column(String(255), nullable=False)
    business_type = Column(String(100), nullable=False)
    industry = Column(String(100), nullable=False)
    sub_industry = Column(String(100))
    msme_size = Column(Enum(MSMESize), nullable=False)
    incorporation_date = Column(DateTime)
    registration_number = Column(String(100))
    gst_number = Column(String(15))
    pan_number = Column(String(10))
    
    # Contact Information
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    website = Column(String(255))
    
    # Address
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255))
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(10), nullable=False)
    country = Column(String(100), default="India")
    
    # Business Details
    description = Column(Text)
    products_services = Column(Text)
    target_market = Column(Text)
    annual_turnover = Column(Integer)
    employee_count = Column(Integer)
    
    # Verification
    verification_level = Column(Enum(VerificationLevel), default=VerificationLevel.UNVERIFIED)
    verification_notes = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    approval_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("MSMEDocument", back_populates="msme")

class MSMEDocument(Base):
    __tablename__ = "msme_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    msme_id = Column(UUID(as_uuid=True), ForeignKey("msme_profiles.id"), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    verification_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    msme = relationship("MSMEProfile", back_populates="documents")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class MSMEProfileCreate(BaseModel):
    company_name: str
    business_type: str
    industry: str
    sub_industry: Optional[str] = None
    msme_size: MSMESize
    incorporation_date: Optional[datetime] = None
    registration_number: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    email: EmailStr
    phone: str
    website: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    description: Optional[str] = None
    products_services: Optional[str] = None
    target_market: Optional[str] = None
    annual_turnover: Optional[int] = None
    employee_count: Optional[int] = None
    
    @validator('gst_number')
    def validate_gst(cls, v):
        if v and len(v) != 15:
            raise ValueError('GST number must be 15 characters')
        return v
    
    @validator('pan_number')
    def validate_pan(cls, v):
        if v and len(v) != 10:
            raise ValueError('PAN number must be 10 characters')
        return v

class MSMEProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    msme_size: Optional[MSMESize] = None
    incorporation_date: Optional[datetime] = None
    registration_number: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    products_services: Optional[str] = None
    target_market: Optional[str] = None
    annual_turnover: Optional[int] = None
    employee_count: Optional[int] = None

class MSMEProfileResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    business_type: str
    industry: str
    sub_industry: Optional[str]
    msme_size: MSMESize
    incorporation_date: Optional[datetime]
    registration_number: Optional[str]
    gst_number: Optional[str]
    pan_number: Optional[str]
    email: str
    phone: str
    website: Optional[str]
    address_line1: str
    address_line2: Optional[str]
    city: str
    state: str
    postal_code: str
    country: str
    description: Optional[str]
    products_services: Optional[str]
    target_market: Optional[str]
    annual_turnover: Optional[int]
    employee_count: Optional[int]
    verification_level: VerificationLevel
    verification_notes: Optional[str]
    is_active: bool
    is_approved: bool
    approval_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    documents: List[dict] = []
    
    class Config:
        from_attributes = True

class DocumentUploadResponse(BaseModel):
    id: str
    document_type: DocumentType
    file_name: str
    file_size: int
    content_type: str
    status: DocumentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# FastAPI app
app = FastAPI(
    title="MSME API",
    description="MSME profile management and document handling service",
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

# File upload helpers
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           '.' + filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

async def upload_file_to_s3(file: UploadFile, key: str) -> str:
    try:
        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET,
            key,
            ExtraArgs={'ContentType': file.content_type}
        )
        return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}"
    except ClientError as e:
        logger.error(f"S3 upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

# API Routes

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

@app.post("/api/msme/profile", response_model=MSMEProfileResponse)
async def create_profile(
    profile_data: MSMEProfileCreate,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/msme/profile").inc()
    
    # Check if profile already exists
    existing_profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    # Create new profile
    profile = MSMEProfile(
        user_id=user_id,
        **profile_data.dict()
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    PROFILE_UPDATES.inc()
    
    return MSMEProfileResponse.from_orm(profile)

@app.get("/api/msme/profile", response_model=MSMEProfileResponse)
async def get_profile(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/msme/profile").inc()
    
    profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return MSMEProfileResponse.from_orm(profile)

@app.put("/api/msme/profile", response_model=MSMEProfileResponse)
async def update_profile(
    profile_data: MSMEProfileUpdate,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="PUT", endpoint="/api/msme/profile").inc()
    
    profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Update profile fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    PROFILE_UPDATES.inc()
    
    return MSMEProfileResponse.from_orm(profile)

@app.post("/api/msme/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    document_type: DocumentType,
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/msme/documents/upload").inc()
    
    # Get MSME profile
    profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Validate file
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    # Generate unique filename
    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{profile.id}/{document_type.value}/{uuid.uuid4()}.{file_extension}"
    
    # Upload to S3
    file_url = await upload_file_to_s3(file, unique_filename)
    
    # Save document record
    document = MSMEDocument(
        msme_id=profile.id,
        document_type=document_type,
        file_name=filename,
        file_path=file_url,
        file_size=file.size,
        content_type=file.content_type
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    DOCUMENT_UPLOADS.inc()
    
    return DocumentUploadResponse.from_orm(document)

@app.get("/api/msme/documents")
async def get_documents(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/msme/documents").inc()
    
    profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    documents = db.query(MSMEDocument).filter(MSMEDocument.msme_id == profile.id).all()
    
    return [DocumentUploadResponse.from_orm(doc) for doc in documents]

@app.delete("/api/msme/documents/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="DELETE", endpoint="/api/msme/documents").inc()
    
    profile = db.query(MSMEProfile).filter(MSMEProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    document = db.query(MSMEDocument).filter(
        MSMEDocument.id == document_id,
        MSMEDocument.msme_id == profile.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete from S3
    try:
        s3_key = document.file_path.split(f"{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/")[1]
        s3_client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
    except Exception as e:
        logger.error(f"S3 delete error: {e}")
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}

@app.get("/api/msme/profiles")
async def list_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    industry: Optional[str] = None,
    state: Optional[str] = None,
    msme_size: Optional[MSMESize] = None,
    verification_level: Optional[VerificationLevel] = None,
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/msme/profiles").inc()
    
    query = db.query(MSMEProfile).filter(MSMEProfile.is_active == True)
    
    if industry:
        query = query.filter(MSMEProfile.industry == industry)
    if state:
        query = query.filter(MSMEProfile.state == state)
    if msme_size:
        query = query.filter(MSMEProfile.msme_size == msme_size)
    if verification_level:
        query = query.filter(MSMEProfile.verification_level == verification_level)
    
    total = query.count()
    profiles = query.offset(skip).limit(limit).all()
    
    return {
        "profiles": [MSMEProfileResponse.from_orm(profile) for profile in profiles],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.get("/api/msme/stats")
async def get_stats(db: Session = Depends(get_db)):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/msme/stats").inc()
    
    total_profiles = db.query(MSMEProfile).count()
    active_profiles = db.query(MSMEProfile).filter(MSMEProfile.is_active == True).count()
    verified_profiles = db.query(MSMEProfile).filter(
        MSMEProfile.verification_level != VerificationLevel.UNVERIFIED
    ).count()
    
    # Industry distribution
    industry_stats = db.query(MSMEProfile.industry, db.func.count(MSMEProfile.id)).group_by(
        MSMEProfile.industry
    ).all()
    
    # State distribution
    state_stats = db.query(MSMEProfile.state, db.func.count(MSMEProfile.id)).group_by(
        MSMEProfile.state
    ).all()
    
    return {
        "total_profiles": total_profiles,
        "active_profiles": active_profiles,
        "verified_profiles": verified_profiles,
        "verification_rate": verified_profiles / total_profiles if total_profiles > 0 else 0,
        "industry_distribution": [{"industry": industry, "count": count} for industry, count in industry_stats],
        "state_distribution": [{"state": state, "count": count} for state, count in state_stats]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)