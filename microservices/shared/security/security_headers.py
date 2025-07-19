"""
Security Headers Middleware for MSMEBazaar
Implements comprehensive security headers for all microservices
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import os


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses
    """
    
    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Basic security headers
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'no-referrer-when-downgrade'
        
        # Strict Transport Security (only in production with HTTPS)
        if self.environment == "production":
            response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
        
        # Content Security Policy - more permissive for development
        if self.environment == "development":
            csp = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' ws: wss: http: https:;"
            )
        else:
            csp = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https:;"
            )
        
        response.headers['Content-Security-Policy'] = csp
        
        # Additional security headers
        response.headers['Permissions-Policy'] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), gyroscope=(), magnetometer=()"
        )
        
        # Remove server information
        if 'server' in response.headers:
            del response.headers['server']
        
        return response


class CORSSecurityMiddleware(BaseHTTPMiddleware):
    """
    Secure CORS middleware with configurable origins
    """
    
    def __init__(self, app, allowed_origins: list = None, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
        
        if allowed_origins is None:
            if environment == "development":
                self.allowed_origins = [
                    "http://localhost:3000",
                    "http://localhost:3001", 
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:3001"
                ]
            else:
                self.allowed_origins = [
                    "https://msmebazaar.com",
                    "https://www.msmebazaar.com",
                    "https://app.msmebazaar.com"
                ]
        else:
            self.allowed_origins = allowed_origins
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = Response()
            if origin in self.allowed_origins or self.environment == "development":
                response.headers["Access-Control-Allow-Origin"] = origin or "*"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = (
                    "Authorization, Content-Type, X-Requested-With, "
                    "X-API-Key, X-Device-ID, X-Session-ID"
                )
                response.headers["Access-Control-Max-Age"] = "86400"
            return response
        
        response = await call_next(request)
        
        # Add CORS headers to actual requests
        if origin in self.allowed_origins or (self.environment == "development" and origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response