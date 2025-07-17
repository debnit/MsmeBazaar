from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as redis
from datetime import datetime
import structlog
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import PlainTextResponse

from config import settings
from database import db, get_db_connection, get_redis_client
from models import (
    RegisterRequest, VerifyOTPRequest, LoginRequest, ResendOTPRequest,
    RefreshTokenRequest, TokenResponse, OTPResponse, ErrorResponse,
    HealthResponse, UserCreate, OTPPurpose
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

# Initialize Sentry for error tracking
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=settings.app_name
    )

# Prometheus metrics
REQUEST_COUNT = Counter('auth_api_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('auth_api_request_duration_seconds', 'Request duration')
OTP_SENT = Counter('otp_sent_total', 'Total OTPs sent', ['purpose'])
OTP_VERIFIED = Counter('otp_verified_total', 'Total OTPs verified', ['purpose', 'status'])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Auth API service")
    await db.connect()
    yield
    # Shutdown
    logger.info("Shutting down Auth API service")
    await db.disconnect()

app = FastAPI(
    title="MSMEBazaar Auth API",
    description="Authentication service for MSMEBazaar V2.0",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure this properly in production
)

# Middleware for request logging and metrics
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = datetime.utcnow()
    
    # Process request
    response = await call_next(request)
    
    # Log request
    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        "Request processed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        duration=duration
    )
    
    # Update metrics
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    REQUEST_DURATION.observe(duration)
    
    return response

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        async with db.get_connection() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    try:
        # Check Redis connection
        redis_client = await db.get_redis()
        await redis_client.ping()
        redis_status = "healthy"
    except Exception:
        redis_status = "unhealthy"
    
    overall_status = "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy"
    
    return HealthResponse(
        status=overall_status,
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        database=db_status,
        redis=redis_status
    )

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return PlainTextResponse(generate_latest())

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