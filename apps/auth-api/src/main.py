"""
MSMEBazaar V2.0 Authentication API
Handles user registration, login, OTP verification, and token management.
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as redis
from datetime import datetime
import structlog
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from prometheus_client import Counter, Histogram, generate_latest
import uuid
from typing import Optional

# Import shared utilities
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../libs'))

from shared.config import get_settings
from shared.models import (
    TokenResponse, OTPResponse, ErrorResponse, UserProfile,
    BaseResponse, HealthCheckResponse, ServiceHealth
)
from shared.exceptions import (
    setup_exception_handlers, MSMEBazaarException,
    AuthenticationException, ValidationException, BusinessLogicException,
    RateLimitException, ExternalServiceException, ErrorCode,
    raise_user_not_found, raise_invalid_otp, raise_unauthorized,
    raise_rate_limit_exceeded, raise_external_service_error
)

# Local imports
from config import settings
from database import db, get_db_connection, get_redis_client
from models import (
    RegisterRequest, VerifyOTPRequest, LoginRequest, ResendOTPRequest,
    RefreshTokenRequest, UserCreate, OTPPurpose
)
from services.auth_service import AuthService

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

# Get shared settings
shared_settings = get_settings()

# Initialize Sentry for error tracking
if shared_settings.monitoring.sentry_dsn:
    sentry_sdk.init(
        dsn=shared_settings.monitoring.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=shared_settings.monitoring.sentry_environment
    )

# Prometheus metrics for monitoring
REQUEST_COUNT = Counter(
    'auth_api_requests_total', 
    'Total requests to auth API', 
    ['method', 'endpoint', 'status_code']
)
REQUEST_DURATION = Histogram(
    'auth_api_request_duration_seconds', 
    'Request duration in seconds',
    ['method', 'endpoint']
)
OTP_SENT = Counter(
    'auth_api_otp_sent_total', 
    'Total OTPs sent', 
    ['purpose', 'status']
)
OTP_VERIFIED = Counter(
    'auth_api_otp_verified_total', 
    'Total OTPs verified', 
    ['purpose', 'status']
)
ACTIVE_SESSIONS = Counter(
    'auth_api_active_sessions_total',
    'Total active user sessions'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler for startup and shutdown events.
    Manages database connections and other resources.
    """
    # Startup
    logger.info("🚀 Starting MSMEBazaar Auth API service")
    try:
        await db.connect()
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down MSMEBazaar Auth API service")
    try:
        await db.disconnect()
        logger.info("✅ Database connection closed")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Initialize FastAPI application with comprehensive configuration
app = FastAPI(
    title="MSMEBazaar Auth API",
    description="""
    ## Authentication Service for MSMEBazaar V2.0
    
    This service handles:
    - User registration with OTP verification
    - Login with phone number and OTP
    - JWT token management (access and refresh tokens)
    - Session management with Redis
    - Rate limiting and security measures
    
    ### Authentication Flow:
    1. **Registration**: POST `/api/register` → OTP sent to phone
    2. **Verification**: POST `/api/verify-otp` → JWT tokens returned
    3. **Login**: POST `/api/login` → OTP sent to registered phone
    4. **Token Refresh**: POST `/api/refresh-token` → New access token
    
    ### Security Features:
    - Rate limiting on OTP requests
    - JWT token expiration and refresh
    - Redis-based session management
    - Input validation and sanitization
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if shared_settings.application.enable_swagger else None,
    redoc_url="/redoc" if shared_settings.application.enable_redoc else None,
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User registration, login, and token management"
        },
        {
            "name": "Health",
            "description": "Service health and monitoring endpoints"
        }
    ]
)

# Setup exception handlers for standardized error responses
setup_exception_handlers(app)

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=shared_settings.application.cors_origins,
    allow_credentials=True,
    allow_methods=shared_settings.application.cors_methods,
    allow_headers=shared_settings.application.cors_headers,
)

# Add trusted host middleware for production security
if shared_settings.is_production():
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["msmebazaar.com", "*.msmebazaar.com"]
    )

# Middleware for request logging, metrics, and request ID tracking
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """
    Middleware to handle request logging, metrics collection, and request ID tracking.
    Adds request ID to all requests for distributed tracing.
    """
    start_time = datetime.utcnow()
    
    # Generate unique request ID for tracing
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Extract client IP and user agent for logging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Log incoming request
    logger.info(
        "Incoming request",
        request_id=request_id,
        method=request.method,
        url=str(request.url),
        client_ip=client_ip,
        user_agent=user_agent
    )
    
    try:
        # Process request
        response = await call_next(request)
        
        # Calculate request duration
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        # Log successful request completion
        logger.info(
            "Request completed",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration=duration
        )
        
        # Update Prometheus metrics
        REQUEST_COUNT.labels(
            method=request.method, 
            endpoint=request.url.path,
            status_code=response.status_code
        ).inc()
        
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        # Add request ID to response headers for client-side tracking
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as e:
        # Log request failure
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(
            "Request failed",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            error=str(e),
            duration=duration
        )
        
        # Update error metrics
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=500
        ).inc()
        
        # Re-raise the exception to be handled by exception handlers
        raise

# Health check endpoint with comprehensive service monitoring
@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check():
    """
    Comprehensive health check endpoint that monitors all service dependencies.
    
    Returns:
        HealthCheckResponse: Detailed health status of the service and its dependencies
    """
    start_time = datetime.utcnow()
    services = []
    overall_status = "healthy"
    
    # Check database connection
    try:
        db_start = datetime.utcnow()
        async with db.get_connection() as conn:
            await conn.fetchval("SELECT 1")
        db_duration = (datetime.utcnow() - db_start).total_seconds()
        
        services.append(ServiceHealth(
            service="postgresql",
            status="healthy",
            response_time=db_duration,
            details={"connection_pool": "active"}
        ))
        
        logger.info("Database health check passed", response_time=db_duration)
        
    except Exception as e:
        services.append(ServiceHealth(
            service="postgresql",
            status="unhealthy",
            response_time=0.0,
            details={"error": str(e)}
        ))
        overall_status = "unhealthy"
        logger.error("Database health check failed", error=str(e))
    
    # Check Redis connection
    try:
        redis_start = datetime.utcnow()
        redis_client = await db.get_redis()
        await redis_client.ping()
        redis_duration = (datetime.utcnow() - redis_start).total_seconds()
        
        services.append(ServiceHealth(
            service="redis",
            status="healthy",
            response_time=redis_duration,
            details={"connection": "active"}
        ))
        
        logger.info("Redis health check passed", response_time=redis_duration)
        
    except Exception as e:
        services.append(ServiceHealth(
            service="redis",
            status="unhealthy",
            response_time=0.0,
            details={"error": str(e)}
        ))
        overall_status = "unhealthy"
        logger.error("Redis health check failed", error=str(e))
    
    # Calculate total uptime (placeholder - should be tracked from service start)
    total_uptime = (datetime.utcnow() - start_time).total_seconds()
    
    return HealthCheckResponse(
        success=overall_status == "healthy",
        message=f"Auth API is {overall_status}",
        status=overall_status,
        services=services,
        uptime=total_uptime,
        version="2.0.0"
    )

# Metrics endpoint for Prometheus monitoring
@app.get("/metrics", tags=["Health"])
async def metrics():
    """
    Prometheus metrics endpoint for monitoring and alerting.
    
    Returns:
        PlainTextResponse: Prometheus-formatted metrics data
    """
    return PlainTextResponse(
        generate_latest(),
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )

# Authentication endpoints
@app.post("/api/register", response_model=OTPResponse)
async def register_user(
    request: RegisterRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Register a new user and send OTP for verification
    
    - **phone**: Phone number with country code (e.g., +919876543210)
    - **name**: User's full name (optional)
    - **email**: User's email address (optional)
    - **role**: User role (MSME, BUYER, ADMIN)
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Create user data
        user_data = UserCreate(
            phone=request.phone,
            email=request.email,
            name=request.name,
            role=request.role
        )
        
        # Register user
        result = await auth_service.register_user(user_data)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        # Update metrics
        OTP_SENT.labels(purpose=OTPPurpose.REGISTRATION.value).inc()
        
        logger.info(
            "User registration initiated",
            phone=request.phone,
            role=request.role.value
        )
        
        return result["otp_response"]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed", error=str(e), phone=request.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )

@app.post("/api/verify-otp", response_model=TokenResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Verify OTP and complete registration or login
    
    - **phone**: Phone number with country code
    - **otp**: 6-digit OTP code
    - **purpose**: Purpose of OTP (REGISTRATION, LOGIN, etc.)
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Verify OTP
        result = await auth_service.verify_otp(request.phone, request.otp, request.purpose)
        
        if not result["success"]:
            OTP_VERIFIED.labels(purpose=request.purpose.value, status="failed").inc()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        # Update metrics
        OTP_VERIFIED.labels(purpose=request.purpose.value, status="success").inc()
        
        logger.info(
            "OTP verified successfully",
            phone=request.phone,
            purpose=request.purpose.value
        )
        
        return TokenResponse(
            access_token=result["tokens"]["access_token"],
            refresh_token=result["tokens"]["refresh_token"],
            token_type=result["tokens"]["token_type"],
            expires_in=result["tokens"]["expires_in"],
            user=result["user"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OTP verification failed", error=str(e), phone=request.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed. Please try again."
        )

@app.post("/api/login", response_model=OTPResponse)
async def login_user(
    request: LoginRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Initiate login by sending OTP to registered phone number
    
    - **phone**: Registered phone number with country code
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Initiate login
        result = await auth_service.login_user(request.phone)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.message
            )
        
        # Update metrics
        OTP_SENT.labels(purpose=OTPPurpose.LOGIN.value).inc()
        
        logger.info("Login OTP sent", phone=request.phone)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e), phone=request.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )

@app.post("/api/resend-otp", response_model=OTPResponse)
async def resend_otp(
    request: ResendOTPRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Resend OTP for registration or login
    
    - **phone**: Phone number with country code
    - **purpose**: Purpose of OTP (REGISTRATION, LOGIN, etc.)
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Get user
        user = await db_conn.fetchrow(
            "SELECT id FROM users WHERE phone = $1",
            request.phone
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Resend OTP
        result = await auth_service.send_otp(user['id'], request.phone, request.purpose)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.message
            )
        
        # Update metrics
        OTP_SENT.labels(purpose=request.purpose.value).inc()
        
        logger.info("OTP resent", phone=request.phone, purpose=request.purpose.value)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OTP resend failed", error=str(e), phone=request.phone)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend OTP. Please try again."
        )

@app.post("/api/refresh-token", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Refresh token
        result = await auth_service.refresh_token(request.refresh_token)
        
        # Get user info
        from jose import jwt
        payload = jwt.decode(request.refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        
        user = await db_conn.fetchrow(
            "SELECT id, phone, email, name, role, is_verified, is_active, created_at, updated_at FROM users WHERE id = $1",
            user_id
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        from models import UserResponse, Role
        user_response = UserResponse(
            id=user['id'],
            phone=user['phone'],
            email=user['email'],
            name=user['name'],
            role=Role(user['role']),
            is_verified=user['is_verified'],
            is_active=user['is_active'],
            created_at=user['created_at'],
            updated_at=user['updated_at']
        )
        
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type=result["token_type"],
            expires_in=result["expires_in"],
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@app.post("/api/logout")
async def logout(
    request: RefreshTokenRequest,
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    redis_client: redis.Redis = Depends(get_redis_client)
):
    """
    Logout user by invalidating session
    
    - **refresh_token**: Valid refresh token
    """
    try:
        auth_service = AuthService(db_conn, redis_client)
        
        # Logout user
        success = await auth_service.logout(request.refresh_token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Logout failed"
            )
        
        logger.info("User logged out successfully")
        
        return {"message": "Logged out successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Logout failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed. Please try again."
        )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.__class__.__name__,
            message=exc.detail
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="InternalServerError",
            message="An unexpected error occurred"
        ).dict()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)