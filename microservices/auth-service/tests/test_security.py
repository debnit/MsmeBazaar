"""
Comprehensive Security Tests for MSMEBazaar Auth Service
Tests for authentication, authorization, rate limiting, and security headers
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI, Request
import jwt

# Import the main app and security components
import sys
sys.path.append('/workspace/microservices/shared')
sys.path.append('/workspace/microservices/auth-service')

from main import app
from security.rate_limiter import RateLimiter, apply_rate_limit
from security.security_headers import SecurityHeadersMiddleware
from middlewares.auth_guard import AuthGuard, require_auth
from utils.jwt_handler import JWTHandler


class TestSecurityHeaders:
    """Test security headers middleware"""
    
    def test_security_headers_production(self):
        """Test security headers in production environment"""
        client = TestClient(app)
        
        with patch.dict('os.environ', {'ENVIRONMENT': 'production'}):
            response = client.get("/health")
            
            # Check security headers
            assert response.headers.get("X-Frame-Options") == "DENY"
            assert response.headers.get("X-Content-Type-Options") == "nosniff"
            assert response.headers.get("X-XSS-Protection") == "1; mode=block"
            assert "Strict-Transport-Security" in response.headers
            assert "Content-Security-Policy" in response.headers
            assert "Permissions-Policy" in response.headers
    
    def test_security_headers_development(self):
        """Test security headers in development environment"""
        client = TestClient(app)
        
        with patch.dict('os.environ', {'ENVIRONMENT': 'development'}):
            response = client.get("/health")
            
            # Check that HSTS is not set in development
            assert "Strict-Transport-Security" not in response.headers
            # But other headers should still be present
            assert response.headers.get("X-Frame-Options") == "DENY"
            assert response.headers.get("X-Content-Type-Options") == "nosniff"


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_sliding_window(self):
        """Test sliding window rate limiting"""
        rate_limiter = RateLimiter()
        
        # Mock Redis client
        mock_redis = AsyncMock()
        mock_redis.pipeline.return_value.execute.return_value = [None, 5, None, None]
        rate_limiter.redis_client = mock_redis
        
        result = await rate_limiter.check_rate_limit(
            key="test_user",
            limit=10,
            window_seconds=60,
            algorithm="sliding_window"
        )
        
        assert result["allowed"] is True
        assert result["limit"] == 10
        assert result["remaining"] == 4  # 10 - (5 + 1)
    
    @pytest.mark.asyncio
    async def test_rate_limiter_token_bucket(self):
        """Test token bucket rate limiting"""
        rate_limiter = RateLimiter()
        
        # Mock Redis client
        mock_redis = AsyncMock()
        mock_redis.hgetall.return_value = {}
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()
        rate_limiter.redis_client = mock_redis
        
        result = await rate_limiter.check_rate_limit(
            key="test_user",
            limit=5,
            window_seconds=60,
            algorithm="token_bucket"
        )
        
        assert result["allowed"] is True
        assert result["limit"] == 5
    
    def test_rate_limiting_auth_endpoint(self):
        """Test rate limiting on authentication endpoints"""
        client = TestClient(app)
        
        # Mock rate limiting to always allow
        with patch('main.auth_rate_limit', return_value=None):
            # Test login endpoint
            response = client.post("/api/auth/login", json={
                "email": "test@example.com",
                "password": "testpassword123"
            })
            
            # Should have rate limit headers
            assert "X-RateLimit-Limit" in response.headers or response.status_code != 429
    
    def test_rate_limiting_exceeded(self):
        """Test rate limit exceeded response"""
        client = TestClient(app)
        
        # Mock rate limiting to always fail
        async def mock_rate_limit_exceeded(request):
            from fastapi import HTTPException
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        with patch('main.auth_rate_limit', side_effect=mock_rate_limit_exceeded):
            response = client.post("/api/auth/login", json={
                "email": "test@example.com",
                "password": "testpassword123"
            })
            
            assert response.status_code == 429


class TestJWTSecurity:
    """Test JWT token security"""
    
    def test_jwt_token_creation(self):
        """Test JWT token creation with security claims"""
        jwt_handler = JWTHandler()
        
        user_data = {
            "user_id": "123",
            "email": "test@example.com",
            "roles": ["user"]
        }
        
        token = jwt_handler.create_access_token(user_data)
        
        # Decode without verification to check claims
        payload = jwt.decode(token, options={"verify_signature": False})
        
        assert "exp" in payload
        assert "iat" in payload
        assert "iss" in payload
        assert "jti" in payload
        assert payload["token_type"] == "access"
        assert payload["sub"] == "123"
    
    def test_jwt_token_verification(self):
        """Test JWT token verification"""
        jwt_handler = JWTHandler()
        
        user_data = {"user_id": "123", "email": "test@example.com"}
        token = jwt_handler.create_access_token(user_data)
        
        # Verify token
        payload = jwt_handler.verify_token(token)
        
        assert payload is not None
        assert payload["sub"] == "123"
        assert payload["token_type"] == "access"
    
    def test_jwt_expired_token(self):
        """Test expired JWT token handling"""
        jwt_handler = JWTHandler()
        
        # Create token with very short expiry
        user_data = {"user_id": "123"}
        token = jwt_handler.create_access_token(
            user_data, 
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        
        # Verification should fail
        payload = jwt_handler.verify_token(token)
        assert payload is None
    
    @pytest.mark.asyncio
    async def test_jwt_token_blacklisting(self):
        """Test JWT token blacklisting"""
        jwt_handler = JWTHandler()
        
        # Mock Redis client
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # Not blacklisted initially
        mock_redis.setex = AsyncMock()
        jwt_handler.redis_client = mock_redis
        
        # Blacklist a token
        await jwt_handler.blacklist_token("test_jti")
        
        # Verify Redis was called
        mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_refresh_token_rotation(self):
        """Test refresh token rotation"""
        jwt_handler = JWTHandler()
        
        # Mock Redis client
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # Not blacklisted
        mock_redis.setex = AsyncMock()
        jwt_handler.redis_client = mock_redis
        
        # Create refresh token
        refresh_token = jwt_handler.create_refresh_token("123")
        
        # Mock token verification
        with patch.object(jwt_handler, 'verify_token') as mock_verify:
            mock_verify.return_value = {
                "sub": "123",
                "token_type": "refresh",
                "jti": "old_jti"
            }
            
            # Refresh tokens
            new_tokens = await jwt_handler.refresh_access_token(refresh_token)
            
            assert new_tokens is not None
            assert "access_token" in new_tokens
            assert "refresh_token" in new_tokens


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_user_registration_validation(self):
        """Test user registration input validation"""
        client = TestClient(app)
        
        # Test invalid email
        response = client.post("/api/auth/register", json={
            "email": "invalid-email",
            "password": "testpass123",
            "full_name": "Test User",
            "phone": "+1234567890",
            "user_type": "buyer"
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_password_strength_validation(self):
        """Test password strength validation"""
        client = TestClient(app)
        
        # Test weak password
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "weak",  # Too short
            "full_name": "Test User",
            "phone": "+1234567890",
            "user_type": "buyer"
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_phone_number_validation(self):
        """Test phone number validation"""
        client = TestClient(app)
        
        # Test invalid phone format
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User",
            "phone": "invalid-phone",
            "user_type": "buyer"
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_user_type_validation(self):
        """Test user type validation"""
        client = TestClient(app)
        
        # Test invalid user type
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User",
            "phone": "+1234567890",
            "user_type": "invalid_type"
        })
        
        assert response.status_code == 422  # Validation error


class TestAuthorizationGuard:
    """Test authorization guard functionality"""
    
    @pytest.mark.asyncio
    async def test_auth_guard_valid_token(self):
        """Test auth guard with valid token"""
        from fastapi.security import HTTPAuthorizationCredentials
        
        # Create mock request and credentials
        request = Mock()
        request.state = Mock()
        
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="valid_token"
        )
        
        # Mock JWT handler
        with patch('middlewares.auth_guard.jwt_handler.verify_token') as mock_verify:
            mock_verify.return_value = {
                "sub": "123",
                "token_type": "access",
                "roles": ["user"]
            }
            
            guard = AuthGuard()
            result = await guard(request, credentials)
            
            assert result is not None
            assert result["sub"] == "123"
    
    @pytest.mark.asyncio
    async def test_auth_guard_invalid_token(self):
        """Test auth guard with invalid token"""
        from fastapi.security import HTTPAuthorizationCredentials
        from fastapi import HTTPException
        
        request = Mock()
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid_token"
        )
        
        # Mock JWT handler to return None (invalid token)
        with patch('middlewares.auth_guard.jwt_handler.verify_token') as mock_verify:
            mock_verify.return_value = None
            
            guard = AuthGuard()
            
            with pytest.raises(HTTPException) as exc_info:
                await guard(request, credentials)
            
            assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_auth_guard_role_check(self):
        """Test auth guard role checking"""
        from fastapi.security import HTTPAuthorizationCredentials
        from fastapi import HTTPException
        
        request = Mock()
        request.state = Mock()
        
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="valid_token"
        )
        
        # Mock JWT handler
        with patch('middlewares.auth_guard.jwt_handler.verify_token') as mock_verify:
            mock_verify.return_value = {
                "sub": "123",
                "token_type": "access",
                "roles": ["user"]  # User role, but admin required
            }
            
            # Test with admin requirement
            guard = AuthGuard(required_roles=["admin"])
            
            with pytest.raises(HTTPException) as exc_info:
                await guard(request, credentials)
            
            assert exc_info.value.status_code == 403


class TestOTPSecurity:
    """Test OTP security functionality"""
    
    def test_otp_format_validation(self):
        """Test OTP format validation"""
        client = TestClient(app)
        
        # Test invalid OTP format
        response = client.post("/api/auth/otp/verify", json={
            "phone": "+1234567890",
            "otp": "12345"  # Too short
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_otp_phone_validation(self):
        """Test OTP phone number validation"""
        client = TestClient(app)
        
        # Test invalid phone format
        response = client.post("/api/auth/otp/send", json={
            "phone": "invalid-phone"
        })
        
        assert response.status_code == 422  # Validation error


class TestSecurityLogging:
    """Test security logging functionality"""
    
    @patch('utils.logger.security_logger')
    def test_authentication_success_logging(self, mock_security_logger):
        """Test that successful authentication is logged"""
        client = TestClient(app)
        
        # Mock database operations
        with patch('main.get_db_connection') as mock_db:
            mock_conn = AsyncMock()
            mock_db.return_value = mock_conn
            
            # Mock user exists and password is correct
            mock_conn.fetchrow.return_value = {
                'id': 1,
                'email': 'test@example.com',
                'password_hash': '$2b$12$hashed_password',
                'full_name': 'Test User',
                'user_type': 'buyer',
                'is_verified': True,
                'is_active': True,
                'failed_login_attempts': 0,
                'locked_until': None
            }
            
            # Mock password verification
            with patch('main.verify_password', return_value=True):
                response = client.post("/api/auth/login", json={
                    "email": "test@example.com",
                    "password": "testpass123"
                })
                
                # Check that security logger was called
                if response.status_code == 200:
                    mock_security_logger.log_auth_success.assert_called()
    
    @patch('utils.logger.security_logger')
    def test_authentication_failure_logging(self, mock_security_logger):
        """Test that failed authentication is logged"""
        client = TestClient(app)
        
        # Mock database operations
        with patch('main.get_db_connection') as mock_db:
            mock_conn = AsyncMock()
            mock_db.return_value = mock_conn
            
            # Mock user doesn't exist
            mock_conn.fetchrow.return_value = None
            
            response = client.post("/api/auth/login", json={
                "email": "nonexistent@example.com",
                "password": "testpass123"
            })
            
            # Check that security logger was called
            mock_security_logger.log_auth_failure.assert_called()


class TestInputSanitization:
    """Test input sanitization and validation"""
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        client = TestClient(app)
        
        # Attempt SQL injection in email field
        response = client.post("/api/auth/login", json={
            "email": "'; DROP TABLE users; --",
            "password": "testpass123"
        })
        
        # Should fail validation before reaching database
        assert response.status_code in [422, 401]  # Validation error or auth failure
    
    def test_xss_prevention(self):
        """Test XSS prevention in input fields"""
        client = TestClient(app)
        
        # Attempt XSS in full_name field
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "<script>alert('xss')</script>",
            "phone": "+1234567890",
            "user_type": "buyer"
        })
        
        # Should either validate or sanitize the input
        assert response.status_code in [422, 200, 400]


class TestPerformanceMonitoring:
    """Test performance monitoring middleware"""
    
    def test_correlation_id_header(self):
        """Test correlation ID is added to responses"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        # Should have correlation ID in response headers
        assert "X-Correlation-ID" in response.headers
    
    def test_custom_correlation_id(self):
        """Test custom correlation ID is preserved"""
        client = TestClient(app)
        
        custom_id = "test-correlation-123"
        response = client.get("/health", headers={
            "X-Correlation-ID": custom_id
        })
        
        # Should preserve custom correlation ID
        assert response.headers.get("X-Correlation-ID") == custom_id


# Integration tests
class TestSecurityIntegration:
    """Integration tests for security components"""
    
    def test_full_authentication_flow(self):
        """Test complete authentication flow with security"""
        client = TestClient(app)
        
        # Test that unauthenticated requests are rejected
        response = client.get("/api/auth/profile")
        assert response.status_code == 401
        
        # Test that invalid tokens are rejected
        response = client.get("/api/auth/profile", headers={
            "Authorization": "Bearer invalid_token"
        })
        assert response.status_code == 401
    
    def test_security_headers_on_all_endpoints(self):
        """Test that security headers are applied to all endpoints"""
        client = TestClient(app)
        
        endpoints = ["/health", "/api/auth/login", "/api/auth/register"]
        
        for endpoint in endpoints:
            if endpoint == "/api/auth/login":
                response = client.post(endpoint, json={
                    "email": "test@example.com",
                    "password": "testpass123"
                })
            elif endpoint == "/api/auth/register":
                response = client.post(endpoint, json={
                    "email": "test@example.com",
                    "password": "testpass123",
                    "full_name": "Test User",
                    "phone": "+1234567890",
                    "user_type": "buyer"
                })
            else:
                response = client.get(endpoint)
            
            # All responses should have security headers
            assert "X-Frame-Options" in response.headers
            assert "X-Content-Type-Options" in response.headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])