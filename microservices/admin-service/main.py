from libs.db.session import get_db
import os
import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean, Integer, ForeignKey, Enum, Float, JSON, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
import jwt
import redis
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response
import enum
import requests
from datetime import date
import asyncio
from concurrent.futures import ThreadPoolExecutor

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

# External API URLs
MSME_API_URL = os.getenv("MSME_API_URL", "http://msme-api:8002")
VALUATION_API_URL = os.getenv("VALUATION_API_URL", "http://valuation-api:8003")
MATCH_API_URL = os.getenv("MATCH_API_URL", "http://match-api:8004")

# Prometheus metrics
REQUEST_COUNT = Counter('admin_api_requests_total', 'Total requests', ['method', 'endpoint'])
ADMIN_ACTIONS = Counter('admin_actions_total', 'Total admin actions', ['action', 'status'])

# Enums
class AdminRole(str, enum.Enum):
    ADMIN = "ADMIN"
    REVIEWER = "REVIEWER"
    SUPPORT = "SUPPORT"

class ActionType(str, enum.Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    SUSPEND = "SUSPEND"
    ACTIVATE = "ACTIVATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ValuationStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ValuationMethod(str, enum.Enum):
    ML_MODEL = "ML_MODEL"
    RULE_BASED = "RULE_BASED"
    HYBRID = "HYBRID"
    MANUAL = "MANUAL"

# Database Models
class AdminAction(Base):
    __tablename__ = "admin_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    target_type = Column(String(50), nullable=False)  # MSME, DOCUMENT, VALUATION, etc.
    target_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Action details
    notes = Column(Text)
    action_metadata = Column("metadata",JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class DashboardStats(BaseModel):
    total_msmes: int
    active_msmes: int
    pending_approvals: int
    pending_documents: int
    pending_valuations: int
    total_valuations: int
    total_matches: int
    monthly_registrations: int
    monthly_revenue: float

class MSMEOnboardingItem(BaseModel):
    id: str
    user_id: str
    company_name: str
    industry: str
    state: str
    verification_level: str
    is_approved: bool
    created_at: datetime
    user: Dict[str, Any]

class KYCVerificationItem(BaseModel):
    id: str
    msme_id: str
    document_type: str
    file_name: str
    file_url: str
    status: str
    created_at: datetime
    msme: Dict[str, Any]

class ValuationRequest(BaseModel):
    id: str
    msme_id: str
    method: str
    status: str
    estimated_value: float
    confidence: float
    created_at: datetime
    updated_at: datetime
    msme: Dict[str, Any]
    reports: List[Dict[str, Any]]

class ChartData(BaseModel):
    registrations: List[Dict[str, Any]]
    industries: List[Dict[str, Any]]
    verification_levels: List[Dict[str, Any]]
    monthly_revenue: List[Dict[str, Any]]

class AdminActionRequest(BaseModel):
    action_type: ActionType
    target_type: str
    target_id: str
    notes: Optional[str] = None
    action_metadata: Optional[Dict[str, Any]] = None

class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus
    notes: Optional[str] = None

class ValuationTrigger(BaseModel):
    msme_id: str
    method: ValuationMethod

class ValuationOverride(BaseModel):
    valuation_id: str
    new_value: float
    notes: str

# FastAPI app
app = FastAPI(
    title="Admin API",
    description="Admin dashboard and management service",
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

# JWT token validation with role check
async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        
        if user_id is None or role not in [AdminRole.ADMIN, AdminRole.REVIEWER, AdminRole.SUPPORT]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return {"user_id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Role-based access control
def require_role(required_roles: List[AdminRole]):
    def role_checker(admin_user: dict = Depends(verify_admin_token)):
        if admin_user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return admin_user
    return role_checker

# Helper functions
async def make_api_request(url: str, method: str = "GET", data: Dict = None, headers: Dict = None):
    """Make API request to other services"""
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        return None

async def log_admin_action(
    admin_user_id: str,
    action_type: ActionType,
    target_type: str,
    target_id: str,
    notes: str = None,
    action_metadata: Dict = None,
    db: Session = None
):
    """Log admin action"""
    if db is None:
        db = SessionLocal()
        close_db = True
    else:
        close_db = False
    
    try:
        action = AdminAction(
            admin_user_id=admin_user_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            notes=notes,
            action_metadata=action_metadata
        )
        db.add(action)
        db.commit()
        
        ADMIN_ACTIONS.labels(action=action_type.value, status="success").inc()
        
    except Exception as e:
        logger.error(f"Failed to log admin action: {e}")
        ADMIN_ACTIONS.labels(action=action_type.value, status="failed").inc()
    finally:
        if close_db:
            db.close()

# API Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")

@app.get("/api/admin/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/dashboard/stats").inc()
    
    try:
        # Get MSME stats
        msme_stats = await make_api_request(f"{MSME_API_URL}/api/msme/stats")
        
        # Get valuation stats (mock for now)
        valuation_stats = {
            "total_valuations": 150,
            "pending_valuations": 25,
            "monthly_revenue": 125000.0
        }
        
        # Get match stats (mock for now)
        match_stats = {
            "total_matches": 500
        }
        
        # Calculate monthly registrations (mock)
        monthly_registrations = 45
        
        return DashboardStats(
            total_msmes=msme_stats.get("total_profiles", 0) if msme_stats else 0,
            active_msmes=msme_stats.get("active_profiles", 0) if msme_stats else 0,
            pending_approvals=msme_stats.get("total_profiles", 0) - msme_stats.get("verified_profiles", 0) if msme_stats else 0,
            pending_documents=15,  # Mock
            pending_valuations=valuation_stats.get("pending_valuations", 0),
            total_valuations=valuation_stats.get("total_valuations", 0),
            total_matches=match_stats.get("total_matches", 0),
            monthly_registrations=monthly_registrations,
            monthly_revenue=valuation_stats.get("monthly_revenue", 0.0)
        )
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        # Return default stats on error
        return DashboardStats(
            total_msmes=0,
            active_msmes=0,
            pending_approvals=0,
            pending_documents=0,
            pending_valuations=0,
            total_valuations=0,
            total_matches=0,
            monthly_registrations=0,
            monthly_revenue=0.0
        )

@app.get("/api/admin/msme/onboarding")
async def get_msme_onboarding_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/msme/onboarding").inc()
    
    try:
        # Build query parameters
        params = {"skip": skip, "limit": limit}
        if status:
            params["verification_level"] = status
        if industry:
            params["industry"] = industry
        
        # Get MSME profiles
        url = f"{MSME_API_URL}/api/msme/profiles"
        response = await make_api_request(url, method="GET")
        
        if response:
            # Transform data for frontend
            items = []
            for profile in response.get("profiles", []):
                items.append(MSMEOnboardingItem(
                    id=profile["id"],
                    user_id=profile["user_id"],
                    company_name=profile["company_name"],
                    industry=profile["industry"],
                    state=profile["state"],
                    verification_level=profile["verification_level"],
                    is_approved=profile["is_approved"],
                    created_at=datetime.fromisoformat(profile["created_at"].replace("Z", "+00:00")),
                    user={"name": "User Name", "email": profile["email"], "phone": profile["phone"]}
                ))
            
            return {
                "items": items,
                "total": response.get("total", 0),
                "skip": skip,
                "limit": limit
            }
        else:
            return {"items": [], "total": 0, "skip": skip, "limit": limit}
            
    except Exception as e:
        logger.error(f"MSME onboarding queue error: {e}")
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

@app.post("/api/admin/msme/{msme_id}/approve")
async def approve_msme(
    msme_id: str,
    notes: str = Body(...),
    admin_user: dict = Depends(require_role([AdminRole.ADMIN, AdminRole.REVIEWER]))
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/msme/approve").inc()
    
    try:
        # Update MSME approval status (would call MSME API)
        # For now, just log the action
        await log_admin_action(
            admin_user["user_id"],
            ActionType.APPROVE,
            "MSME",
            msme_id,
            notes
        )
        
        return {"message": "MSME approved successfully"}
        
    except Exception as e:
        logger.error(f"MSME approval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve MSME")

@app.post("/api/admin/msme/{msme_id}/reject")
async def reject_msme(
    msme_id: str,
    notes: str = Body(...),
    admin_user: dict = Depends(require_role([AdminRole.ADMIN, AdminRole.REVIEWER]))
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/msme/reject").inc()
    
    try:
        # Update MSME rejection status (would call MSME API)
        await log_admin_action(
            admin_user["user_id"],
            ActionType.REJECT,
            "MSME",
            msme_id,
            notes
        )
        
        return {"message": "MSME rejected successfully"}
        
    except Exception as e:
        logger.error(f"MSME rejection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject MSME")

@app.get("/api/admin/kyc/verification")
async def get_kyc_verification_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/kyc/verification").inc()
    
    try:
        # Mock KYC verification data
        mock_items = []
        for i in range(min(limit, 10)):
            mock_items.append(KYCVerificationItem(
                id=str(uuid.uuid4()),
                msme_id=str(uuid.uuid4()),
                document_type="GST_CERTIFICATE",
                file_name=f"gst_certificate_{i}.pdf",
                file_url=f"https://example.com/documents/gst_{i}.pdf",
                status="PENDING",
                created_at=datetime.utcnow() - timedelta(days=i),
                msme={
                    "company_name": f"Company {i}",
                    "user": {"name": f"User {i}", "email": f"user{i}@example.com"}
                }
            ))
        
        return {
            "items": mock_items,
            "total": 50,  # Mock total
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"KYC verification queue error: {e}")
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

@app.post("/api/admin/documents/{document_id}/status")
async def update_document_status(
    document_id: str,
    status_update: DocumentStatusUpdate,
    admin_user: dict = Depends(require_role([AdminRole.ADMIN, AdminRole.REVIEWER]))
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/documents/status").inc()
    
    try:
        # Update document status (would call MSME API)
        await log_admin_action(
            admin_user["user_id"],
            ActionType.UPDATE,
            "DOCUMENT",
            document_id,
            status_update.notes,
            {"status": status_update.status.value}
        )
        
        return {"message": "Document status updated successfully"}
        
    except Exception as e:
        logger.error(f"Document status update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update document status")

@app.get("/api/admin/valuations")
async def get_valuation_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/valuations").inc()
    
    try:
        # Mock valuation data
        mock_items = []
        for i in range(min(limit, 10)):
            mock_items.append(ValuationRequest(
                id=str(uuid.uuid4()),
                msme_id=str(uuid.uuid4()),
                method="ML_MODEL",
                status="COMPLETED",
                estimated_value=float(1000000 + i * 100000),
                confidence=0.85,
                created_at=datetime.utcnow() - timedelta(days=i),
                updated_at=datetime.utcnow() - timedelta(hours=i),
                msme={
                    "company_name": f"Company {i}",
                    "user": {"name": f"User {i}"}
                },
                reports=[
                    {
                        "id": str(uuid.uuid4()),
                        "report_type": "BASIC",
                        "generated_at": datetime.utcnow().isoformat(),
                        "report_url": f"https://example.com/reports/report_{i}.pdf"
                    }
                ]
            ))
        
        return {
            "items": mock_items,
            "total": 100,  # Mock total
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Valuation requests error: {e}")
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

@app.post("/api/admin/valuations/trigger")
async def trigger_valuation(
    trigger_data: ValuationTrigger,
    admin_user: dict = Depends(require_role([AdminRole.ADMIN]))
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/valuations/trigger").inc()
    
    try:
        # Trigger valuation (would call Valuation API)
        await log_admin_action(
            admin_user["user_id"],
            ActionType.UPDATE,
            "VALUATION",
            trigger_data.msme_id,
            f"Triggered valuation with method: {trigger_data.method.value}"
        )
        
        return {"message": "Valuation triggered successfully"}
        
    except Exception as e:
        logger.error(f"Valuation trigger error: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger valuation")

@app.post("/api/admin/valuations/override")
async def override_valuation(
    override_data: ValuationOverride,
    admin_user: dict = Depends(require_role([AdminRole.ADMIN]))
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/valuations/override").inc()
    
    try:
        # Override valuation (would call Valuation API)
        await log_admin_action(
            admin_user["user_id"],
            ActionType.UPDATE,
            "VALUATION",
            override_data.valuation_id,
            override_data.notes,
            {"new_value": override_data.new_value}
        )
        
        return {"message": "Valuation overridden successfully"}
        
    except Exception as e:
        logger.error(f"Valuation override error: {e}")
        raise HTTPException(status_code=500, detail="Failed to override valuation")

@app.get("/api/admin/analytics/charts", response_model=ChartData)
async def get_analytics_charts(
    date_range: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/analytics/charts").inc()
    
    try:
        # Mock chart data
        chart_data = ChartData(
            registrations=[
                {"date": "2024-01-01", "count": 10},
                {"date": "2024-01-02", "count": 15},
                {"date": "2024-01-03", "count": 12},
                {"date": "2024-01-04", "count": 20},
                {"date": "2024-01-05", "count": 18},
            ],
            industries=[
                {"name": "Manufacturing", "count": 45, "percentage": 30.0},
                {"name": "Services", "count": 35, "percentage": 23.3},
                {"name": "Technology", "count": 25, "percentage": 16.7},
                {"name": "Healthcare", "count": 20, "percentage": 13.3},
                {"name": "Education", "count": 15, "percentage": 10.0},
                {"name": "Others", "count": 10, "percentage": 6.7},
            ],
            verification_levels=[
                {"level": "UNVERIFIED", "count": 50, "percentage": 33.3},
                {"level": "BASIC", "count": 60, "percentage": 40.0},
                {"level": "ENHANCED", "count": 30, "percentage": 20.0},
                {"level": "PREMIUM", "count": 10, "percentage": 6.7},
            ],
            monthly_revenue=[
                {"month": "Jan", "revenue": 85000, "transactions": 42},
                {"month": "Feb", "revenue": 92000, "transactions": 48},
                {"month": "Mar", "revenue": 78000, "transactions": 39},
                {"month": "Apr", "revenue": 105000, "transactions": 55},
                {"month": "May", "revenue": 125000, "transactions": 62},
            ]
        )
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Analytics charts error: {e}")
        # Return empty data on error
        return ChartData(
            registrations=[],
            industries=[],
            verification_levels=[],
            monthly_revenue=[]
        )

@app.get("/api/admin/actions")
async def get_admin_actions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    action_type: Optional[ActionType] = Query(None),
    target_type: Optional[str] = Query(None),
    admin_user: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/actions").inc()
    
    try:
        query = db.query(AdminAction)
        
        if action_type:
            query = query.filter(AdminAction.action_type == action_type)
        
        if target_type:
            query = query.filter(AdminAction.target_type == target_type)
        
        # Order by creation date
        query = query.order_by(AdminAction.created_at.desc())
        
        total = query.count()
        actions = query.offset(skip).limit(limit).all()
        
        return {
            "actions": [
                {
                    "id": str(action.id),
                    "admin_user_id": str(action.admin_user_id),
                    "action_type": action.action_type.value,
                    "target_type": action.target_type,
                    "target_id": str(action.target_id),
                    "notes": action.notes,
                    "action_metadata": action.action_metadata,
                    "created_at": action.created_at.isoformat()
                }
                for action in actions
            ],
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Admin actions error: {e}")
        return {"actions": [], "total": 0, "skip": skip, "limit": limit}

@app.post("/api/admin/actions")
async def create_admin_action(
    action_data: AdminActionRequest,
    admin_user: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    REQUEST_COUNT.labels(method="POST", endpoint="/api/admin/actions").inc()
    
    try:
        await log_admin_action(
            admin_user["user_id"],
            action_data.action_type,
            action_data.target_type,
            action_data.target_id,
            action_data.notes,
            action_data.metadata,
            db
        )
        
        return {"message": "Admin action logged successfully"}
        
    except Exception as e:
        logger.error(f"Admin action creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create admin action")

@app.get("/api/admin/export")
async def export_data(
    data_type: str = Query(..., regex="^(msmes|valuations|analytics)$"),
    format: str = Query("csv", regex="^(csv|excel|pdf)$"),
    admin_user: dict = Depends(require_role([AdminRole.ADMIN]))
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/export").inc()
    
    try:
        # Mock export functionality
        await log_admin_action(
            admin_user["user_id"],
            ActionType.UPDATE,
            "EXPORT",
            data_type,
            f"Exported {data_type} data in {format} format"
        )
        
        return {
            "message": f"Export initiated for {data_type} data",
            "format": format,
            "download_url": f"https://example.com/exports/{data_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        }
        
    except Exception as e:
        logger.error(f"Data export error: {e}")
        raise HTTPException(status_code=500, detail="Failed to export data")

@app.get("/api/admin/system/health")
async def get_system_health(
    admin_user: dict = Depends(verify_admin_token)
):
    REQUEST_COUNT.labels(method="GET", endpoint="/api/admin/system/health").inc()
    
    try:
        # Check health of all services
        services = [
            {"name": "MSME API", "url": f"{MSME_API_URL}/health"},
            {"name": "Valuation API", "url": f"{VALUATION_API_URL}/health"},
            {"name": "Match API", "url": f"{MATCH_API_URL}/health"},
        ]
        
        health_status = []
        for service in services:
            try:
                response = requests.get(service["url"], timeout=5)
                status = "healthy" if response.status_code == 200 else "unhealthy"
            except:
                status = "unhealthy"
            
            health_status.append({
                "service": service["name"],
                "status": status,
                "last_checked": datetime.utcnow().isoformat()
            })
        
        return {
            "services": health_status,
            "overall_status": "healthy" if all(s["status"] == "healthy" for s in health_status) else "degraded"
        }
        
    except Exception as e:
        logger.error(f"System health check error: {e}")
        return {
            "services": [],
            "overall_status": "unknown"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)