"""
Rate Limiting for MSMEBazaar Microservices
Redis-based token bucket and sliding window rate limiting
"""

import time
import asyncio
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
import redis.asyncio as redis
import structlog
import hashlib
import json
from datetime import datetime, timedelta

logger = structlog.get_logger()


class RateLimiter:
    """
    Advanced rate limiter with multiple algorithms and Redis backend
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url)
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            await self.redis_client.ping()
            logger.info("Rate limiter Redis connection established")
        except Exception as e:
            logger.error("Failed to connect to Redis for rate limiting", error=str(e))
            raise
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60,
        algorithm: str = "sliding_window"
    ) -> Dict[str, Any]:
        """
        Check if request is within rate limit
        
        Args:
            key: Unique identifier for the rate limit (IP, user_id, etc.)
            limit: Maximum number of requests allowed
            window_seconds: Time window in seconds
            algorithm: Rate limiting algorithm ('sliding_window', 'token_bucket', 'fixed_window')
        
        Returns:
            Dict with rate limit status and metadata
        """
        
        if algorithm == "sliding_window":
            return await self._sliding_window_check(key, limit, window_seconds)
        elif algorithm == "token_bucket":
            return await self._token_bucket_check(key, limit, window_seconds)
        else:  # fixed_window
            return await self._fixed_window_check(key, limit, window_seconds)
    
    async def _sliding_window_check(self, key: str, limit: int, window: int) -> Dict[str, Any]:
        """Sliding window rate limiting implementation"""
        now = time.time()
        pipeline = self.redis_client.pipeline()
        
        # Remove expired entries
        pipeline.zremrangebyscore(f"rate_limit:{key}", 0, now - window)
        
        # Count current requests in window
        pipeline.zcard(f"rate_limit:{key}")
        
        # Add current request
        pipeline.zadd(f"rate_limit:{key}", {str(now): now})
        
        # Set expiration
        pipeline.expire(f"rate_limit:{key}", window + 1)
        
        results = await pipeline.execute()
        current_count = results[1] + 1  # +1 for the current request
        
        remaining = max(0, limit - current_count)
        reset_time = now + window
        
        return {
            "allowed": current_count <= limit,
            "limit": limit,
            "remaining": remaining,
            "reset_time": reset_time,
            "retry_after": window if current_count > limit else None
        }
    
    async def _token_bucket_check(self, key: str, limit: int, refill_period: int) -> Dict[str, Any]:
        """Token bucket rate limiting implementation"""
        now = time.time()
        bucket_key = f"token_bucket:{key}"
        
        # Get current bucket state
        bucket_data = await self.redis_client.hgetall(bucket_key)
        
        if bucket_data:
            tokens = float(bucket_data.get('tokens', limit))
            last_refill = float(bucket_data.get('last_refill', now))
        else:
            tokens = float(limit)
            last_refill = now
        
        # Calculate tokens to add based on time elapsed
        time_elapsed = now - last_refill
        tokens_to_add = (time_elapsed / refill_period) * limit
        tokens = min(limit, tokens + tokens_to_add)
        
        allowed = tokens >= 1.0
        
        if allowed:
            tokens -= 1.0
        
        # Update bucket state
        await self.redis_client.hset(bucket_key, mapping={
            'tokens': str(tokens),
            'last_refill': str(now)
        })
        await self.redis_client.expire(bucket_key, refill_period * 2)
        
        return {
            "allowed": allowed,
            "limit": limit,
            "remaining": int(tokens),
            "reset_time": now + refill_period,
            "retry_after": refill_period if not allowed else None
        }
    
    async def _fixed_window_check(self, key: str, limit: int, window: int) -> Dict[str, Any]:
        """Fixed window rate limiting implementation"""
        now = int(time.time())
        window_start = now // window * window
        window_key = f"fixed_window:{key}:{window_start}"
        
        current_count = await self.redis_client.incr(window_key)
        
        if current_count == 1:
            await self.redis_client.expire(window_key, window)
        
        remaining = max(0, limit - current_count)
        reset_time = window_start + window
        
        return {
            "allowed": current_count <= limit,
            "limit": limit,
            "remaining": remaining,
            "reset_time": reset_time,
            "retry_after": reset_time - now if current_count > limit else None
        }


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_identifier(request: Request) -> str:
    """
    Generate a unique identifier for rate limiting
    Priority: User ID > API Key > IP Address
    """
    
    # Check if user is authenticated
    if hasattr(request.state, 'user') and request.state.user:
        user_id = request.state.user.get('user_id')
        if user_id:
            return f"user:{user_id}"
    
    # Check for API key
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return f"api_key:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
    
    # Fall back to IP address
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    return f"ip:{client_ip}"


async def apply_rate_limit(
    request: Request,
    limit: int = 60,
    window: int = 60,
    algorithm: str = "sliding_window",
    identifier_override: Optional[str] = None
):
    """
    Dependency function to apply rate limiting to endpoints
    
    Usage:
        @app.get("/api/endpoint")
        async def my_endpoint(
            rate_limit: None = Depends(lambda r: apply_rate_limit(r, limit=100, window=60))
        ):
            return {"message": "success"}
    """
    
    try:
        identifier = identifier_override or get_client_identifier(request)
        
        result = await rate_limiter.check_rate_limit(
            key=identifier,
            limit=limit,
            window_seconds=window,
            algorithm=algorithm
        )
        
        # Add rate limit headers to response
        request.state.rate_limit_headers = {
            "X-RateLimit-Limit": str(result["limit"]),
            "X-RateLimit-Remaining": str(result["remaining"]),
            "X-RateLimit-Reset": str(int(result["reset_time"]))
        }
        
        if not result["allowed"]:
            headers = request.state.rate_limit_headers
            if result["retry_after"]:
                headers["Retry-After"] = str(int(result["retry_after"]))
            
            logger.warning(
                "Rate limit exceeded",
                identifier=identifier,
                limit=limit,
                window=window,
                endpoint=str(request.url)
            )
            
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": result["retry_after"]
                },
                headers=headers
            )
        
        logger.debug(
            "Rate limit check passed",
            identifier=identifier,
            remaining=result["remaining"],
            endpoint=str(request.url)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Rate limiting error", error=str(e))
        # Allow request to proceed if rate limiting fails
        pass


# Convenience functions for common rate limiting scenarios

async def auth_rate_limit(request: Request):
    """Rate limiting for authentication endpoints (stricter)"""
    return await apply_rate_limit(request, limit=5, window=300, algorithm="sliding_window")  # 5 per 5 minutes


async def api_rate_limit(request: Request):
    """Standard API rate limiting"""
    return await apply_rate_limit(request, limit=100, window=60, algorithm="sliding_window")  # 100 per minute


async def otp_rate_limit(request: Request):
    """Rate limiting for OTP requests (very strict)"""
    return await apply_rate_limit(request, limit=3, window=300, algorithm="fixed_window")  # 3 per 5 minutes


async def valuation_rate_limit(request: Request):
    """Rate limiting for resource-intensive valuation requests"""
    return await apply_rate_limit(request, limit=10, window=300, algorithm="token_bucket")  # 10 per 5 minutes


class RateLimitMiddleware:
    """
    Middleware to add rate limit headers to all responses
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    headers = dict(message.get("headers", []))
                    
                    # Add rate limit headers if available
                    if hasattr(request.state, 'rate_limit_headers'):
                        for key, value in request.state.rate_limit_headers.items():
                            headers[key.lower().encode()] = value.encode()
                    
                    message["headers"] = list(headers.items())
                
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)