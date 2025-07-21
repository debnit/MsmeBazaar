"""
JWT Token Handler for MSMEBazaar
Enhanced JWT implementation with security features and token management
"""

import os
import time
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
from jose import jwt, JWTError
import redis.asyncio as redis
import structlog
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import asyncio

logger = structlog.get_logger()


class JWTHandler:
    """
    Enhanced JWT handler with security features
    """
    
    def __init__(
        self,
        secret_key: Optional[str] = None,
        algorithm: str = "HS256",
        redis_url: str = "redis://localhost:6379"
    ):
        self.secret_key = secret_key or os.getenv("SECRET_KEY") or self._generate_secret_key()
        self.algorithm = algorithm
        self.redis_client = redis.from_url(redis_url)
        
        # Token settings
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        self.issuer = os.getenv("JWT_ISSUER", "msmebazaar.com")
        
    def _generate_secret_key(self) -> str:
        """Generate a secure secret key"""
        return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            await self.redis_client.ping()
            logger.info("JWT handler Redis connection established")
        except Exception as e:
            logger.error("Failed to connect to Redis for JWT handler", error=str(e))
            raise
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create an access token with enhanced security claims
        """
        to_encode = data.copy()
        
        # Set expiration
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        # Add security claims
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.issuer,
            "token_type": "access",
            "jti": secrets.token_urlsafe(16)  # JWT ID for token tracking
        })
        
        # Add user context if available
        if "user_id" in data:
            to_encode["sub"] = str(data["user_id"])  # Subject claim
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(
        self,
        user_id: str,
        device_id: Optional[str] = None
    ) -> str:
        """
        Create a refresh token for token renewal
        """
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.issuer,
            "token_type": "refresh",
            "jti": secrets.token_urlsafe(16),
            "device_id": device_id or "unknown"
        }
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token with comprehensive validation
        """
        try:
            # Decode and verify token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "require_exp": True,
                    "require_iat": True,
                    "require_iss": True
                },
                issuer=self.issuer
            )
            
            # Validate token type
            token_type = payload.get("token_type")
            if not token_type:
                logger.warning("Token missing type claim")
                return None
            
            # Check if token is in blacklist (for logout/revocation)
            jti = payload.get("jti")
            if jti and asyncio.run(self._is_token_blacklisted(jti)):
                logger.warning("Token is blacklisted", jti=jti)
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid token", error=str(e))
            return None
        except Exception as e:
            logger.error("Token verification error", error=str(e))
            return None
    
    async def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        try:
            return bool(await self.redis_client.get(f"blacklist:{jti}"))
        except Exception as e:
            logger.error("Error checking token blacklist", error=str(e))
            return False
    
    async def blacklist_token(self, jti: str, ttl_seconds: Optional[int] = None):
        """Add token to blacklist"""
        try:
            ttl = ttl_seconds or (self.refresh_token_expire_days * 24 * 60 * 60)
            await self.redis_client.setex(f"blacklist:{jti}", ttl, "1")
            logger.info("Token blacklisted", jti=jti)
        except Exception as e:
            logger.error("Error blacklisting token", jti=jti, error=str(e))
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Create new access token using refresh token
        """
        payload = self.verify_token(refresh_token)
        
        if not payload:
            return None
        
        if payload.get("token_type") != "refresh":
            logger.warning("Invalid token type for refresh")
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Missing subject in refresh token")
            return None
        
        # Create new access token
        new_access_token = self.create_access_token({"user_id": user_id})
        
        # Optionally create new refresh token (token rotation)
        device_id = payload.get("device_id")
        new_refresh_token = self.create_refresh_token(user_id, device_id)
        
        # Blacklist old refresh token
        old_jti = payload.get("jti")
        if old_jti:
            await self.blacklist_token(old_jti)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    async def revoke_all_user_tokens(self, user_id: str):
        """
        Revoke all tokens for a specific user (useful for security incidents)
        """
        try:
            # Add user to global revocation list
            revocation_key = f"user_revoked:{user_id}"
            revocation_time = int(time.time())
            
            # Set revocation timestamp with TTL
            ttl = self.refresh_token_expire_days * 24 * 60 * 60
            await self.redis_client.setex(revocation_key, ttl, str(revocation_time))
            
            logger.info("All tokens revoked for user", user_id=user_id)
            
        except Exception as e:
            logger.error("Error revoking user tokens", user_id=user_id, error=str(e))
    
    async def is_user_revoked(self, user_id: str, token_issued_at: int) -> bool:
        """
        Check if user tokens have been globally revoked after token issuance
        """
        try:
            revocation_time = await self.redis_client.get(f"user_revoked:{user_id}")
            if revocation_time:
                return int(revocation_time) > token_issued_at
            return False
        except Exception as e:
            logger.error("Error checking user revocation", user_id=user_id, error=str(e))
            return False
    
    def create_password_reset_token(self, user_id: str) -> str:
        """
        Create a short-lived token for password reset
        """
        expire = datetime.utcnow() + timedelta(minutes=30)  # 30 minutes
        
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.issuer,
            "token_type": "password_reset",
            "jti": secrets.token_urlsafe(16)
        }
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_email_verification_token(self, email: str, user_id: str) -> str:
        """
        Create a token for email verification
        """
        expire = datetime.utcnow() + timedelta(hours=24)  # 24 hours
        
        to_encode = {
            "email": email,
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.issuer,
            "token_type": "email_verification",
            "jti": secrets.token_urlsafe(16)
        }
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def generate_api_token(
        self,
        user_id: str,
        scopes: List[str],
        name: str,
        expires_days: Optional[int] = None
    ) -> str:
        """
        Generate long-lived API token with specific scopes
        """
        if expires_days:
            expire = datetime.utcnow() + timedelta(days=expires_days)
        else:
            expire = datetime.utcnow() + timedelta(days=365)  # 1 year default
        
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.issuer,
            "token_type": "api_token",
            "scopes": scopes,
            "name": name,
            "jti": secrets.token_urlsafe(16)
        }
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)


# Global JWT handler instance
jwt_handler = JWTHandler()


def get_current_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract user information from JWT token
    """
    payload = jwt_handler.verify_token(token)
    if not payload:
        return None
    
    # Check for user revocation
    user_id = payload.get("sub")
    token_issued_at = payload.get("iat", 0)
    
    if user_id and asyncio.run(jwt_handler.is_user_revoked(user_id, token_issued_at)):
        logger.warning("User tokens have been revoked", user_id=user_id)
        return None
    
    return payload


def create_token_pair(user_data: Dict[str, Any], device_id: Optional[str] = None) -> Dict[str, str]:
    """
    Create access and refresh token pair
    """
    access_token = jwt_handler.create_access_token(user_data)
    refresh_token = jwt_handler.create_refresh_token(
        user_data.get("user_id", user_data.get("sub")),
        device_id
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": jwt_handler.access_token_expire_minutes * 60  # seconds
    }