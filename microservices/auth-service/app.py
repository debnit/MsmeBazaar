"""
Auth Service - FastAPI + Redis + PostgreSQL
Handles OTP login, JWT, role-based access, token refresh
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import jwt
import redis
import bcrypt
import asyncpg
import asyncio
from datetime import datetime, timedelta
import uuid
import os
from twilio.rest import Client
import random
import string

app = FastAPI(title="Auth Service", description="Authentication and Authorization Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msme_auth")

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# Initialize clients
redis_client = redis.from_url(REDIS_URL)
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID else None
security = HTTPBearer()

# Database connection
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# Pydantic models
class UserRegistration(BaseModel):
    email: Optional[EmailStr] = None
    phone: str
    password: str
    role: str = "seller"
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    phone: str
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerification(BaseModel):
    phone: str
    otp: str

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    phone: str
    new_password: str
    otp: str

class UserRole(BaseModel):
    user_id: int
    role: str

class Permission(BaseModel):
    name: str
    description: str

class RolePermission(BaseModel):
    role: str
    permissions: List[str]

# Role-based permissions
ROLE_PERMISSIONS = {
    "admin": [
        "user_management", "listing_approval", "compliance_review",
        "system_config", "analytics_access", "audit_access"
    ],
    "seller": [
        "listing_create", "listing_update", "profile_update",
        "document_upload", "analytics_view"
    ],
    "buyer": [
        "listing_view", "interest_express", "profile_update",
        "document_upload", "analytics_view"
    ],
    "agent": [
        "listing_view", "client_management", "commission_view",
        "lead_management", "analytics_view"
    ],
    "nbfc": [
        "loan_processing", "risk_assessment", "compliance_view",
        "analytics_access", "product_management"
    ]
}

# Utility functions
def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_jwt_token(user_id: int, role: str, token_type: str = "access") -> str:
    """Generate JWT token"""
    expiration = datetime.utcnow() + timedelta(
        hours=JWT_EXPIRATION_HOURS if token_type == "access" else 24 * 7
    )
    
    payload = {
        "user_id": user_id,
        "role": role,
        "token_type": token_type,
        "exp": expiration,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    }
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def send_otp_sms(phone: str, otp: str):
    """Send OTP via SMS using Twilio"""
    if not twilio_client:
        print(f"OTP for {phone}: {otp}")  # Development mode
        return
    
    try:
        message = twilio_client.messages.create(
            body=f"Your MSMESquare OTP is: {otp}. Valid for 5 minutes.",
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
        print(f"OTP sent to {phone}: {message.sid}")
    except Exception as e:
        print(f"Failed to send OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_jwt_token(token)
    
    if payload.get("token_type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Check if token is blacklisted
    if redis_client.get(f"blacklist:{payload['jti']}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    
    return {
        "user_id": payload["user_id"],
        "role": payload["role"],
        "jti": payload["jti"]
    }

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(current_user: dict = Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(current_user["role"], [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return decorator

def require_role(role: str):
    """Decorator to require specific role"""
    def decorator(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return current_user
    return decorator

# API Endpoints

@app.post("/register")
async def register_user(user: UserRegistration):
    """Register a new user"""
    conn = await get_db_connection()
    
    try:
        # Check if user already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE phone = $1 OR email = $2",
            user.phone, user.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        # Hash password
        hashed_password = hash_password(user.password)
        
        # Insert user
        user_id = await conn.fetchval(
            """
            INSERT INTO users (email, phone, password_hash, role, first_name, last_name, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            user.email, user.phone, hashed_password, user.role,
            user.first_name, user.last_name, False, datetime.utcnow()
        )
        
        # Generate OTP for verification
        otp = generate_otp()
        redis_client.setex(f"otp:{user.phone}", 300, otp)  # 5 minutes expiry
        
        # Send OTP
        await send_otp_sms(user.phone, otp)
        
        return {
            "message": "User registered successfully. Please verify your phone number.",
            "user_id": user_id,
            "phone": user.phone
        }
        
    finally:
        await conn.close()

@app.post("/login")
async def login_user(user: UserLogin):
    """Login user with phone and password"""
    conn = await get_db_connection()
    
    try:
        # Get user from database
        user_record = await conn.fetchrow(
            "SELECT id, password_hash, role, is_verified FROM users WHERE phone = $1",
            user.phone
        )
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not verify_password(user.password, user_record["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not user_record["is_verified"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phone number not verified"
            )
        
        # Generate tokens
        access_token = generate_jwt_token(user_record["id"], user_record["role"], "access")
        refresh_token = generate_jwt_token(user_record["id"], user_record["role"], "refresh")
        
        # Store refresh token in Redis
        redis_client.setex(
            f"refresh:{user_record['id']}", 
            7 * 24 * 60 * 60,  # 7 days
            refresh_token
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user_record["id"],
            "role": user_record["role"]
        }
        
    finally:
        await conn.close()

@app.post("/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number"""
    # Check if user exists
    conn = await get_db_connection()
    
    try:
        user_exists = await conn.fetchrow(
            "SELECT id FROM users WHERE phone = $1",
            request.phone
        )
        
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate and store OTP
        otp = generate_otp()
        redis_client.setex(f"otp:{request.phone}", 300, otp)  # 5 minutes expiry
        
        # Send OTP
        await send_otp_sms(request.phone, otp)
        
        return {"message": "OTP sent successfully"}
        
    finally:
        await conn.close()

@app.post("/verify-otp")
async def verify_otp(request: OTPVerification):
    """Verify OTP and mark user as verified"""
    # Get stored OTP
    stored_otp = redis_client.get(f"otp:{request.phone}")
    
    if not stored_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found"
        )
    
    if stored_otp.decode() != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # Update user verification status
    conn = await get_db_connection()
    
    try:
        user_record = await conn.fetchrow(
            "UPDATE users SET is_verified = TRUE WHERE phone = $1 RETURNING id, role",
            request.phone
        )
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Delete OTP
        redis_client.delete(f"otp:{request.phone}")
        
        # Generate tokens
        access_token = generate_jwt_token(user_record["id"], user_record["role"], "access")
        refresh_token = generate_jwt_token(user_record["id"], user_record["role"], "refresh")
        
        # Store refresh token
        redis_client.setex(
            f"refresh:{user_record['id']}", 
            7 * 24 * 60 * 60,
            refresh_token
        )
        
        return {
            "message": "OTP verified successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user_record["id"],
            "role": user_record["role"]
        }
        
    finally:
        await conn.close()

@app.post("/refresh-token")
async def refresh_token(request: TokenRefresh):
    """Refresh access token using refresh token"""
    payload = decode_jwt_token(request.refresh_token)
    
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Check if refresh token exists in Redis
    stored_token = redis_client.get(f"refresh:{payload['user_id']}")
    
    if not stored_token or stored_token.decode() != request.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Generate new access token
    access_token = generate_jwt_token(payload["user_id"], payload["role"], "access")
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    """Logout user by blacklisting token"""
    # Add token to blacklist
    redis_client.setex(
        f"blacklist:{current_user['jti']}", 
        JWT_EXPIRATION_HOURS * 60 * 60,
        "true"
    )
    
    # Remove refresh token
    redis_client.delete(f"refresh:{current_user['user_id']}")
    
    return {"message": "Logged out successfully"}

@app.post("/reset-password")
async def reset_password(request: PasswordReset):
    """Reset password using OTP"""
    # Verify OTP
    stored_otp = redis_client.get(f"otp:{request.phone}")
    
    if not stored_otp or stored_otp.decode() != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Update password
    conn = await get_db_connection()
    
    try:
        hashed_password = hash_password(request.new_password)
        
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE phone = $2",
            hashed_password, request.phone
        )
        
        # Delete OTP
        redis_client.delete(f"otp:{request.phone}")
        
        return {"message": "Password reset successfully"}
        
    finally:
        await conn.close()

@app.get("/user-permissions")
async def get_user_permissions(current_user: dict = Depends(get_current_user)):
    """Get user permissions based on role"""
    permissions = ROLE_PERMISSIONS.get(current_user["role"], [])
    
    return {
        "user_id": current_user["user_id"],
        "role": current_user["role"],
        "permissions": permissions
    }

@app.post("/validate-token")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate JWT token and return user info"""
    return {
        "valid": True,
        "user_id": current_user["user_id"],
        "role": current_user["role"]
    }

@app.put("/user-role")
async def update_user_role(
    request: UserRole,
    current_user: dict = Depends(require_permission("user_management"))
):
    """Update user role (admin only)"""
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            "UPDATE users SET role = $1 WHERE id = $2",
            request.role, request.user_id
        )
        
        return {"message": "User role updated successfully"}
        
    finally:
        await conn.close()

@app.get("/roles")
async def get_roles():
    """Get all available roles and their permissions"""
    return {
        "roles": list(ROLE_PERMISSIONS.keys()),
        "permissions": ROLE_PERMISSIONS
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Check database connection
        conn = await get_db_connection()
        await conn.fetchval("SELECT 1")
        await conn.close()
        
        return {
            "status": "healthy",
            "service": "auth-service",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)