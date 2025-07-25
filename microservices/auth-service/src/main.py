"""
MSMEBazaar Authentication Service
Secure authentication and authorization service with comprehensive security features
"""

import os
import time
import secrets
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
import asyncpg

# Import shared security components
import sys
sys.path.append('/workspace/microservices/shared')

from security.security_headers import SecurityHeadersMiddleware, CORSSecurityMiddleware
from security.rate_limiter import RateLimitMiddleware, rate_limiter, auth_rate_limit, otp_rate_limit
from middlewares.auth_guard import (
    require_auth, require_admin, optional_auth, get_current_user,
    get_current_user_id, security
)
from utils.jwt_handler import jwt_handler, create_token_pair
from utils.logger import (
    configure_logging, get_logger, get_security_logger, get_performance_logger
)

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/msmebazaar")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))

# Configure logging
configure_logging(
    service_name="auth-service",
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    enable_json=ENVIRONMENT == "production",
    enable_audit=True
)

logger = get_logger("auth-service")
security_logger = get_security_logger()
performance_logger = get_performance_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Auth service starting up")
    
    # Initialize components
    await rate_limiter.initialize()
    await jwt_handler.initialize()
    
    logger.info("Auth service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Auth service shutting down")


# Initialize FastAPI app
app = FastAPI(
    title="MSMEBazaar Auth Service",
    description="Secure authentication and authorization service for MSMEBazaar platform",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Add security middleware
app.add_middleware(SecurityHeadersMiddleware, environment=ENVIRONMENT)
app.add_middleware(CORSSecurityMiddleware, environment=ENVIRONMENT)
app.add_middleware(RateLimitMiddleware)

# Performance monitoring middleware
@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    """Monitor request performance"""
    start_time = time.time()
    
    # Add correlation ID for request tracing
    correlation_id = request.headers.get("X-Correlation-ID") or secrets.token_urlsafe(8)
    request.state.correlation_id = correlation_id
    
    try:
        response = await call_next(request)
        
        # Calculate response time
        duration_ms = (time.time() - start_time) * 1000
        
        # Log performance metrics
        performance_logger.log_request_timing(
            endpoint=str(request.url.path),
            method=request.method,
            duration_ms=duration_ms,
            status_code=response.status_code,
            correlation_id=correlation_id
        )
        
        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        
        return response
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error(
            "Request failed",
            endpoint=str(request.url.path),
            method=request.method,
            duration_ms=duration_ms,
            error=str(e),
            correlation_id=correlation_id
        )
        
        raise


# Pydantic models
class UserRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r'^[+]?[1-9]\d{1,14}$')
    user_type: str = Field(..., regex="^(msme_owner|buyer|investor)$")
    company_name: Optional[str] = None
    gst_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_id: Optional[str] = None

class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r'^[+]?[1-9]\d{1,14}$')

class OTPVerification(BaseModel):
    phone: str = Field(..., pattern=r'^[+]?[1-9]\d{1,14}$')
    otp: str = Field(..., pattern=r'^\d{6}$')

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordUpdate(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class TokenRefresh(BaseModel):
    refresh_token: str


# Database connection
async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)


# Helper functions
def get_client_ip(request: Request) -> str:
    """Extract client IP address"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.verify(plain_password, hashed_password)


async def hash_password(password: str) -> str:
    """Hash password"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }


@app.post("/api/auth/register")
async def register_user(
    user_data: UserRegistration,
    request: Request,
    _: None = Depends(auth_rate_limit)
):
    """Register a new user"""
    client_ip = get_client_ip(request)
    
    try:
        conn = await get_db_connection()
        
        # Check if user already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1 OR phone = $2",
            user_data.email, user_data.phone
        )
        
        if existing_user:
            security_logger.log_auth_failure(
                attempted_user=user_data.email,
                method="registration",
                ip_address=client_ip,
                reason="user_already_exists"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or phone already exists"
            )
        
        # Hash password
        hashed_password = await hash_password(user_data.password)
        
        # Insert user
        user_id = await conn.fetchval(
            """
            INSERT INTO users (email, password_hash, full_name, phone, user_type, 
                              company_name, gst_number, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
            RETURNING id
            """,
            user_data.email, hashed_password, user_data.full_name,
            user_data.phone, user_data.user_type, user_data.company_name,
            user_data.gst_number, datetime.utcnow()
        )
        
        await conn.close()
        
        # Create verification token
        verification_token = jwt_handler.create_email_verification_token(
            user_data.email, str(user_id)
        )
        
        # Log successful registration
        security_logger.log_auth_success(
            user_id=str(user_id),
            method="registration",
            ip_address=client_ip,
            email=user_data.email
        )
        
        logger.info(
            "User registered successfully",
            user_id=user_id,
            email=user_data.email,
            user_type=user_data.user_type
        )
        
        return {
            "message": "User registered successfully",
            "user_id": user_id,
            "verification_token": verification_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed", error=str(e), email=user_data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@app.post("/api/auth/login")
async def login_user(
    login_data: UserLogin,
    request: Request,
    _: None = Depends(auth_rate_limit)
):
    """Authenticate user and return tokens"""
    client_ip = get_client_ip(request)
    
    try:
        conn = await get_db_connection()
        
        # Get user by email
        user = await conn.fetchrow(
            """
            SELECT id, email, password_hash, full_name, user_type, 
                   is_verified, is_active, failed_login_attempts, locked_until
            FROM users WHERE email = $1
            """,
            login_data.email
        )
        
        if not user:
            security_logger.log_auth_failure(
                attempted_user=login_data.email,
                method="login",
                ip_address=client_ip,
                reason="user_not_found"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check account status
        if not user['is_active']:
            security_logger.log_auth_failure(
                attempted_user=login_data.email,
                method="login",
                ip_address=client_ip,
                reason="account_disabled"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        # Check if account is locked
        if user['locked_until'] and user['locked_until'] > datetime.utcnow():
            security_logger.log_auth_failure(
                attempted_user=login_data.email,
                method="login",
                ip_address=client_ip,
                reason="account_locked"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is temporarily locked"
            )
        
        # Verify password
        if not await verify_password(login_data.password, user['password_hash']):
            # Increment failed login attempts
            failed_attempts = user['failed_login_attempts'] + 1
            locked_until = None
            
            if failed_attempts >= 5:
                from datetime import timedelta
                locked_until = datetime.utcnow() + timedelta(minutes=30)
            
            await conn.execute(
                "UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3",
                failed_attempts, locked_until, user['id']
            )
            
            security_logger.log_auth_failure(
                attempted_user=login_data.email,
                method="login",
                ip_address=client_ip,
                reason="invalid_password",
                failed_attempts=failed_attempts
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Reset failed login attempts on successful login
        await conn.execute(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = $1 WHERE id = $2",
            datetime.utcnow(), user['id']
        )
        
        await conn.close()
        
        # Create tokens
        user_data = {
            "user_id": str(user['id']),
            "email": user['email'],
            "full_name": user['full_name'],
            "user_type": user['user_type'],
            "roles": [user['user_type']],  # Basic role assignment
            "permissions": []  # Would be populated based on user type
        }
        
        tokens = create_token_pair(user_data, login_data.device_id)
        
        # Log successful authentication
        security_logger.log_auth_success(
            user_id=str(user['id']),
            method="login",
            ip_address=client_ip,
            device_id=login_data.device_id
        )
        
        logger.info(
            "User logged in successfully",
            user_id=user['id'],
            email=user['email']
        )
        
        return {
            "message": "Login successful",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "user_type": user['user_type'],
                "is_verified": user['is_verified']
            },
            **tokens
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e), email=login_data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@app.post("/api/auth/refresh")
async def refresh_tokens(
    token_data: TokenRefresh,
    request: Request
):
    """Refresh access token using refresh token"""
    try:
        new_tokens = await jwt_handler.refresh_access_token(token_data.refresh_token)
        
        if not new_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        return {
            "message": "Tokens refreshed successfully",
            **new_tokens
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@app.post("/api/auth/logout")
async def logout_user(
    request: Request,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Logout user and invalidate tokens"""
    try:
        # Get token JTI for blacklisting
        jti = user.get("jti")
        if jti:
            await jwt_handler.blacklist_token(jti)
        
        # Log logout
        security_logger.log_auth_success(
            user_id=user.get("sub"),
            method="logout",
            ip_address=get_client_ip(request)
        )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error("Logout failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@app.post("/api/auth/otp/send")
async def send_otp(
    otp_request: OTPRequest,
    request: Request,
    _: None = Depends(otp_rate_limit)
):
    """Send OTP to phone number"""
    try:
        # Generate 6-digit OTP
        otp = f"{secrets.randbelow(1000000):06d}"
        
        # Store OTP in Redis with 5-minute expiry
        redis_client = await rate_limiter.redis_client
        await redis_client.setex(f"otp:{otp_request.phone}", 300, otp)
        
        # TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        # For now, we'll just log it (remove in production)
        if ENVIRONMENT == "development":
            logger.info("OTP generated", phone=otp_request.phone, otp=otp)
        
        logger.info("OTP sent successfully", phone=otp_request.phone)
        
        return {"message": "OTP sent successfully"}
        
    except Exception as e:
        logger.error("OTP sending failed", error=str(e), phone=otp_request.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )


@app.post("/api/auth/otp/verify")
async def verify_otp(
    otp_data: OTPVerification,
    request: Request,
    _: None = Depends(auth_rate_limit)
):
    """Verify OTP"""
    try:
        # Get OTP from Redis
        redis_client = await rate_limiter.redis_client
        stored_otp = await redis_client.get(f"otp:{otp_data.phone}")
        
        if not stored_otp or stored_otp != otp_data.otp:
            security_logger.log_auth_failure(
                attempted_user=otp_data.phone,
                method="otp_verification",
                ip_address=get_client_ip(request),
                reason="invalid_otp"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OTP"
            )
        
        # Delete OTP after successful verification
        await redis_client.delete(f"otp:{otp_data.phone}")
        
        logger.info("OTP verified successfully", phone=otp_data.phone)
        
        return {"message": "OTP verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OTP verification failed", error=str(e), phone=otp_data.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed"
        )


@app.get("/api/auth/profile")
async def get_user_profile(
    request: Request,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get current user profile"""
    try:
        conn = await get_db_connection()
        
        user_profile = await conn.fetchrow(
            """
            SELECT id, email, full_name, phone, user_type, company_name, 
                   gst_number, is_verified, created_at, last_login
            FROM users WHERE id = $1
            """,
            int(user["sub"])
        )
        
        await conn.close()
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Log data access
        security_logger.log_data_access(
            user_id=user["sub"],
            resource="user_profile",
            action="read"
        )
        
        return {
            "user": dict(user_profile)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get user profile", error=str(e), user_id=user.get("sub"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@app.get("/api/auth/admin/users")
async def list_users(
    request: Request,
    user: Dict[str, Any] = Depends(require_admin),
    page: int = 1,
    limit: int = 20
):
    """List users (admin only)"""
    try:
        conn = await get_db_connection()
        
        offset = (page - 1) * limit
        
        users = await conn.fetch(
            """
            SELECT id, email, full_name, phone, user_type, company_name,
                   is_verified, is_active, created_at, last_login
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset
        )
        
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        
        await conn.close()
        
        # Log admin action
        security_logger.log_admin_action(
            admin_user_id=user["sub"],
            action="list_users",
            target="users_table"
        )
        
        return {
            "users": [dict(user) for user in users],
            "total": total_users,
            "page": page,
            "limit": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list users", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


@app.get("/metrics")
async def get_prometheus_metrics():
    """Prometheus metrics endpoint"""
    from prometheus_client import generate_latest
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(
        "Unhandled exception",
        error=str(exc),
        path=request.url.path,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=ENVIRONMENT == "development",
        log_config=None  # We handle logging ourselves
    )