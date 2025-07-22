from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
import os
from typing import Optional

# Core imports
from core.config import settings
from core.database import engine, get_db
from core.auth import get_current_user, get_current_organization
from core.tenant import get_tenant_from_request
from core.monitoring import setup_monitoring

# Route imports
from routes import (
    auth,
    organizations,
    users,
    msmes,
    deals,
    valuations,
    workflows,
    notifications,
    billing,
    analytics,
    admin
)

# Middleware imports
from middleware.tenant import TenantMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import LoggingMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    # Startup
    print("🚀 Starting MSMEBazaar Admin Dashboard API...")
    
    # Initialize monitoring
    setup_monitoring(app)
    
    # Create database tables
    # Note: In production, use Alembic migrations instead
    from sqlalchemy import create_engine
    from core.models import Base
    
    print("📊 Initializing database...")
    # Base.metadata.create_all(bind=engine)  # Uncomment for dev
    
    print("✅ API startup complete!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down API...")

# Create FastAPI app
app = FastAPI(
    title="MSMEBazaar Admin Dashboard API",
    description="Multi-tenant SaaS API for MSME management, deals, and workflow automation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    # Custom domain support
    servers=[
        {"url": "https://api.msmebazaar.com", "description": "Production API"},
        {"url": "https://api-staging.msmebazaar.com", "description": "Staging API"},
        {"url": "http://localhost:8000", "description": "Development API"}
    ]
)

# Security
security = HTTPBearer()

# CORS Middleware - Allow all origins for multi-tenant custom domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure based on your domains
)

# Custom Middleware
app.add_middleware(TenantMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)

# Health Check
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "msmebazaar-admin-api",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "MSMEBazaar Admin Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Multi-tenant route resolution
@app.get("/tenant-info")
async def get_tenant_info(
    request: Request,
    tenant = Depends(get_tenant_from_request)
):
    """Get current tenant information based on domain/subdomain"""
    return {
        "tenant": tenant,
        "host": request.headers.get("host"),
        "custom_domain": tenant.get("domain") if tenant else None
    }

# Include routers with API versioning
API_V1_PREFIX = "/api/v1"

# Public routes (no auth required)
app.include_router(
    auth.router,
    prefix=f"{API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    organizations.public_router,
    prefix=f"{API_V1_PREFIX}/organizations",
    tags=["Organizations (Public)"]
)

# Protected routes (require auth)
app.include_router(
    organizations.router,
    prefix=f"{API_V1_PREFIX}/organizations",
    tags=["Organizations"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    users.router,
    prefix=f"{API_V1_PREFIX}/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    msmes.router,
    prefix=f"{API_V1_PREFIX}/msmes",
    tags=["MSMEs"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    deals.router,
    prefix=f"{API_V1_PREFIX}/deals",
    tags=["Deals"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    valuations.router,
    prefix=f"{API_V1_PREFIX}/valuations",
    tags=["Valuations"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    workflows.router,
    prefix=f"{API_V1_PREFIX}/workflows",
    tags=["Workflows"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    notifications.router,
    prefix=f"{API_V1_PREFIX}/notifications",
    tags=["Notifications"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    billing.router,
    prefix=f"{API_V1_PREFIX}/billing",
    tags=["Billing & Subscriptions"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    analytics.router,
    prefix=f"{API_V1_PREFIX}/analytics",
    tags=["Analytics"],
    dependencies=[Depends(get_current_user)]
)

# Admin routes (super admin only)
app.include_router(
    admin.router,
    prefix=f"{API_V1_PREFIX}/admin",
    tags=["Super Admin"],
    dependencies=[Depends(get_current_user)]
)

# Stripe webhooks (public but secured with webhook secret)
@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for billing events"""
    from core.billing import handle_stripe_webhook
    return await handle_stripe_webhook(request)

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return {
        "error": True,
        "message": exc.detail,
        "status_code": exc.status_code,
        "path": request.url.path
    }

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return {
        "error": True,
        "message": "Internal server error",
        "status_code": 500,
        "path": request.url.path
    }

# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )