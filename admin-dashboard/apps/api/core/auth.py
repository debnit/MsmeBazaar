from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import redis
from enum import Enum

from core.config import settings
from core.database import get_db
from core.models import User, Organization
from core.tenant import get_tenant_from_request

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Security
security = HTTPBearer()

# Redis for token blacklisting
redis_client = redis.Redis.from_url(settings.REDIS_URL)

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TEAM_LEAD = "TEAM_LEAD"
    ANALYST = "ANALYST"
    FIELD_AGENT = "FIELD_AGENT"
    FRANCHISE = "FRANCHISE"

class Permission(str, Enum):
    # Organization permissions
    ORG_READ = "org:read"
    ORG_WRITE = "org:write"
    ORG_DELETE = "org:delete"
    
    # User permissions
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    USER_INVITE = "user:invite"
    
    # MSME permissions
    MSME_READ = "msme:read"
    MSME_WRITE = "msme:write"
    MSME_DELETE = "msme:delete"
    MSME_VERIFY = "msme:verify"
    
    # Deal permissions
    DEAL_READ = "deal:read"
    DEAL_WRITE = "deal:write"
    DEAL_DELETE = "deal:delete"
    DEAL_ASSIGN = "deal:assign"
    
    # Valuation permissions
    VALUATION_READ = "valuation:read"
    VALUATION_WRITE = "valuation:write"
    VALUATION_APPROVE = "valuation:approve"
    
    # Workflow permissions
    WORKFLOW_READ = "workflow:read"
    WORKFLOW_WRITE = "workflow:write"
    WORKFLOW_EXECUTE = "workflow:execute"
    
    # Analytics permissions
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"
    
    # Billing permissions
    BILLING_READ = "billing:read"
    BILLING_WRITE = "billing:write"

# Role-based permission mapping
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: [p.value for p in Permission],  # All permissions
    
    UserRole.ADMIN: [
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.USER_READ, Permission.USER_WRITE, Permission.USER_INVITE,
        Permission.MSME_READ, Permission.MSME_WRITE, Permission.MSME_VERIFY,
        Permission.DEAL_READ, Permission.DEAL_WRITE, Permission.DEAL_ASSIGN,
        Permission.VALUATION_READ, Permission.VALUATION_WRITE, Permission.VALUATION_APPROVE,
        Permission.WORKFLOW_READ, Permission.WORKFLOW_WRITE, Permission.WORKFLOW_EXECUTE,
        Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
        Permission.BILLING_READ, Permission.BILLING_WRITE,
    ],
    
    UserRole.TEAM_LEAD: [
        Permission.USER_READ,
        Permission.MSME_READ, Permission.MSME_WRITE,
        Permission.DEAL_READ, Permission.DEAL_WRITE, Permission.DEAL_ASSIGN,
        Permission.VALUATION_READ,
        Permission.WORKFLOW_READ, Permission.WORKFLOW_EXECUTE,
        Permission.ANALYTICS_READ,
    ],
    
    UserRole.ANALYST: [
        Permission.MSME_READ,
        Permission.DEAL_READ,
        Permission.VALUATION_READ, Permission.VALUATION_WRITE,
        Permission.ANALYTICS_READ,
    ],
    
    UserRole.FIELD_AGENT: [
        Permission.MSME_READ, Permission.MSME_WRITE,
        Permission.DEAL_READ,
    ],
    
    UserRole.FRANCHISE: [
        Permission.MSME_READ,
        Permission.DEAL_READ,
        Permission.ANALYTICS_READ,
    ],
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        # Check if token is blacklisted
        if redis_client.get(f"blacklist:{token}"):
            return None
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Verify token type
        if payload.get("type") != token_type:
            return None
            
        return payload
    except JWTError:
        return None

def blacklist_token(token: str):
    """Add token to blacklist"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload.get("exp")
        if exp:
            ttl = exp - int(datetime.utcnow().timestamp())
            if ttl > 0:
                redis_client.setex(f"blacklist:{token}", ttl, "1")
    except JWTError:
        pass

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        if payload is None:
            raise credentials_exception
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    # Update last login
    user.lastLoginAt = datetime.utcnow()
    db.commit()
    
    return user

async def get_current_organization(
    current_user: User = Depends(get_current_user),
    tenant = Depends(get_tenant_from_request),
    db: Session = Depends(get_db)
) -> Organization:
    """Get current organization based on user and tenant context"""
    
    # Super admin can access any organization
    if current_user.role == UserRole.SUPER_ADMIN:
        if tenant and tenant.get("id"):
            org = db.query(Organization).filter(Organization.id == tenant["id"]).first()
            if org:
                return org
    
    # Regular users must belong to an organization
    if not current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to any organization"
        )
    
    org = db.query(Organization).filter(Organization.id == current_user.organizationId).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return org

def check_permission(required_permission: Permission):
    """Decorator to check if user has required permission"""
    def permission_checker(current_user: User = Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(UserRole(current_user.role), [])
        
        # Add custom permissions from user profile
        if current_user.permissions:
            user_permissions.extend(current_user.permissions)
        
        if required_permission.value not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {required_permission.value}"
            )
        
        return current_user
    
    return permission_checker

def check_role(required_roles: list[UserRole]):
    """Decorator to check if user has required role"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if UserRole(current_user.role) not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in required_roles]}"
            )
        
        return current_user
    
    return role_checker

def check_organization_access(current_user: User, organization_id: str) -> bool:
    """Check if user has access to specific organization"""
    # Super admin has access to all organizations
    if current_user.role == UserRole.SUPER_ADMIN:
        return True
    
    # Regular users can only access their own organization
    return current_user.organizationId == organization_id

def check_regional_access(current_user: User, region: str) -> bool:
    """Check if user has access to specific region"""
    # Super admin and admin have access to all regions
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        return True
    
    # Check user's allowed regions
    if not current_user.regions:
        return False
    
    return region in current_user.regions

# Authentication helper functions
async def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    """Authenticate user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    
    if not verify_password(password, user.password):
        return None
    
    return user

def create_user_tokens(user: User) -> Dict[str, str]:
    """Create access and refresh tokens for user"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "org_id": user.organizationId
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Organization subscription helpers
def check_organization_limits(organization: Organization, resource_type: str, count: int = 1) -> bool:
    """Check if organization has reached its limits"""
    limits = {
        "users": organization.maxUsers,
        "msmes": organization.maxMsmes,
        "deals": organization.maxDeals
    }
    
    limit = limits.get(resource_type)
    if limit is None:
        return True
    
    # Get current count from database
    # This would be implemented with actual queries
    current_count = 0  # Placeholder
    
    return (current_count + count) <= limit

def check_subscription_status(organization: Organization) -> bool:
    """Check if organization's subscription is active"""
    return organization.subscriptionStatus in ["trialing", "active"]