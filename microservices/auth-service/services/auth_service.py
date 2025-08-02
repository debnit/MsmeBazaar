import asyncpg
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import hashlib
from jose import JWTError, jwt
from twilio.rest import Client
import structlog

from config import settings
from models import (
    UserCreate, UserResponse, OTPCreate, SessionCreate, 
    OTPPurpose, Role, TokenResponse, OTPResponse
)

logger = structlog.get_logger()

class AuthService:
    def __init__(self, db_conn: asyncpg.Connection, redis_client: redis.Redis):
        self.db = db_conn
        self.redis = redis_client
        self.twilio_client = None
        
        if settings.twilio_account_sid and settings.twilio_auth_token:
            self.twilio_client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token
            )
    
    async def register_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Register a new user and send OTP"""
        try:
            # Check if user already exists
            existing_user = await self.db.fetchrow(
                "SELECT id, phone, is_verified FROM users WHERE phone = $1",
                user_data.phone
            )
            
            if existing_user:
                if existing_user['is_verified']:
                    return {
                        "success": False,
                        "error": "USER_EXISTS",
                        "message": "User already registered and verified"
                    }
                else:
                    # User exists but not verified, resend OTP
                    user_id = existing_user['id']
            else:
                # Create new user
                user_id = await self.db.fetchval(
                    """
                    INSERT INTO users (phone, email, name, role, is_verified, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                    """,
                    user_data.phone,
                    user_data.email,
                    user_data.name,
                    user_data.role.value,
                    False,
                    True
                )
            
            # Generate and send OTP
            otp_response = await self.send_otp(user_id, user_data.phone, OTPPurpose.REGISTRATION)
            
            return {
                "success": True,
                "user_id": user_id,
                "otp_response": otp_response
            }
            
        except Exception as e:
            logger.error("Registration failed", error=str(e), phone=user_data.phone)
            raise
    
    async def verify_otp(self, phone: str, otp: str, purpose: OTPPurpose) -> Dict[str, Any]:
        """Verify OTP and complete registration/login"""
        try:
            # Get user
            user = await self.db.fetchrow(
                "SELECT id, phone, email, name, role, is_verified, is_active FROM users WHERE phone = $1",
                phone
            )
            
            if not user:
                return {
                    "success": False,
                    "error": "USER_NOT_FOUND",
                    "message": "User not found"
                }
            
            # Verify OTP
            otp_record = await self.db.fetchrow(
                """
                SELECT id, code, expires_at, is_used 
                FROM otp_codes 
                WHERE user_id = $1 AND purpose = $2 AND is_used = FALSE
                ORDER BY created_at DESC
                LIMIT 1
                """,
                user['id'],
                purpose.value
            )
            
            if not otp_record:
                return {
                    "success": False,
                    "error": "OTP_NOT_FOUND",
                    "message": "No valid OTP found"
                }
            
            if otp_record['expires_at'] < datetime.utcnow():
                return {
                    "success": False,
                    "error": "OTP_EXPIRED",
                    "message": "OTP has expired"
                }
            
            if otp_record['code'] != otp:
                return {
                    "success": False,
                    "error": "INVALID_OTP",
                    "message": "Invalid OTP"
                }
            
            # Mark OTP as used
            await self.db.execute(
                "UPDATE otp_codes SET is_used = TRUE WHERE id = $1",
                otp_record['id']
            )
            
            # Update user verification status
            if purpose == OTPPurpose.REGISTRATION:
                await self.db.execute(
                    "UPDATE users SET is_verified = TRUE WHERE id = $1",
                    user['id']
                )
                user = dict(user)
                user['is_verified'] = True
            
            # Generate tokens
            tokens = await self.generate_tokens(user['id'])
            
            # Create user response
            user_response = UserResponse(
                id=user['id'],
                phone=user['phone'],
                email=user['email'],
                name=user['name'],
                role=Role(user['role']),
                is_verified=user['is_verified'],
                is_active=user['is_active'],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            return {
                "success": True,
                "tokens": tokens,
                "user": user_response
            }
            
        except Exception as e:
            logger.error("OTP verification failed", error=str(e), phone=phone)
            raise
    
    async def login_user(self, phone: str) -> OTPResponse:
        """Initiate login by sending OTP"""
        try:
            # Check if user exists and is verified
            user = await self.db.fetchrow(
                "SELECT id, phone, is_verified, is_active FROM users WHERE phone = $1",
                phone
            )
            
            if not user:
                return OTPResponse(
                    success=False,
                    message="User not found. Please register first.",
                    expires_in=0
                )
            
            if not user['is_verified']:
                return OTPResponse(
                    success=False,
                    message="User not verified. Please complete registration.",
                    expires_in=0
                )
            
            if not user['is_active']:
                return OTPResponse(
                    success=False,
                    message="User account is inactive. Please contact support.",
                    expires_in=0
                )
            
            # Send OTP
            otp_response = await self.send_otp(user['id'], phone, OTPPurpose.LOGIN)
            return otp_response
            
        except Exception as e:
            logger.error("Login initiation failed", error=str(e), phone=phone)
            raise
    
    async def send_otp(self, user_id: str, phone: str, purpose: OTPPurpose) -> OTPResponse:
        """Generate and send OTP"""
        try:
            # Check rate limiting
            rate_limit_key = f"otp_rate_limit:{phone}:{purpose.value}"
            rate_limit = await self.redis.get(rate_limit_key)
            
            if rate_limit:
                return OTPResponse(
                    success=False,
                    message="Please wait before requesting another OTP",
                    expires_in=0,
                    can_resend_in=60
                )
            
            # Generate OTP
            otp = str(secrets.randbelow(900000) + 100000)  # 6-digit OTP
            expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes)
            
            # Store OTP in database
            await self.db.execute(
                """
                INSERT INTO otp_codes (user_id, code, purpose, expires_at)
                VALUES ($1, $2, $3, $4)
                """,
                user_id,
                otp,
                purpose.value,
                expires_at
            )
            
            # Send OTP via SMS
            if self.twilio_client:
                message_body = f"Your MSMEBazaar OTP is: {otp}. Valid for {settings.otp_expire_minutes} minutes."
                
                try:
                    self.twilio_client.messages.create(
                        body=message_body,
                        from_=settings.twilio_phone_number,
                        to=phone
                    )
                    logger.info("OTP sent successfully", phone=phone, purpose=purpose.value)
                except Exception as e:
                    logger.error("Failed to send OTP", error=str(e), phone=phone)
                    # In development, we might want to continue without SMS
                    if not settings.debug:
                        raise
            else:
                logger.warning("Twilio not configured, OTP not sent", phone=phone)
                if settings.debug:
                    logger.info("Development OTP", phone=phone, otp=otp)
            
            # Set rate limiting
            await self.redis.setex(rate_limit_key, 60, "1")
            
            return OTPResponse(
                success=True,
                message="OTP sent successfully",
                expires_in=settings.otp_expire_minutes * 60,
                can_resend_in=60
            )
            
        except Exception as e:
            logger.error("Failed to send OTP", error=str(e), phone=phone)
            raise
    
    async def generate_tokens(self, user_id: str) -> Dict[str, Any]:
        """Generate access and refresh tokens"""
        try:
            # Generate access token
            access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
            access_token = self.create_access_token(
                data={"sub": user_id},
                expires_delta=access_token_expires
            )
            
            # Generate refresh token
            refresh_token_expires = timedelta(days=settings.jwt_refresh_token_expire_days)
            refresh_token = self.create_refresh_token(
                data={"sub": user_id},
                expires_delta=refresh_token_expires
            )
            
            # Store session
            session_expires = datetime.utcnow() + refresh_token_expires
            await self.db.execute(
                """
                INSERT INTO sessions (user_id, token, expires_at)
                VALUES ($1, $2, $3)
                """,
                user_id,
                refresh_token,
                session_expires
            )
            
            # Store in Redis for quick access
            await self.redis.setex(
                f"session:{refresh_token}",
                int(refresh_token_expires.total_seconds()),
                user_id
            )
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.jwt_access_token_expire_minutes * 60
            }
            
        except Exception as e:
            logger.error("Token generation failed", error=str(e), user_id=user_id)
            raise
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT refresh token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            # Verify refresh token
            payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "refresh":
                raise JWTError("Invalid token type")
            
            # Check if session exists
            session = await self.db.fetchrow(
                "SELECT user_id, expires_at FROM sessions WHERE token = $1",
                refresh_token
            )
            
            if not session or session['expires_at'] < datetime.utcnow():
                raise JWTError("Session expired")
            
            # Generate new access token
            access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
            access_token = self.create_access_token(
                data={"sub": user_id},
                expires_delta=access_token_expires
            )
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.jwt_access_token_expire_minutes * 60
            }
            
        except JWTError as e:
            logger.error("Token refresh failed", error=str(e))
            raise
    
    async def logout(self, refresh_token: str) -> bool:
        """Logout user by invalidating session"""
        try:
            # Remove session from database
            await self.db.execute(
                "DELETE FROM sessions WHERE token = $1",
                refresh_token
            )
            
            # Remove from Redis
            await self.redis.delete(f"session:{refresh_token}")
            
            return True
            
        except Exception as e:
            logger.error("Logout failed", error=str(e))
            return False