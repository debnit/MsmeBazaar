# MSMEBazaar Security Implementation

## 🔒 Complete Security Architecture

This document outlines the comprehensive security implementation for MSMEBazaar v2.0, featuring enterprise-grade security controls, authentication, authorization, and monitoring.

## 📋 Table of Contents

1. [Security Components](#security-components)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting](#rate-limiting)
4. [Security Headers](#security-headers)
5. [Logging & Monitoring](#logging--monitoring)
6. [Integration Guide](#integration-guide)
7. [Testing](#testing)
8. [Deployment](#deployment)

## 🛡️ Security Components

### Core Security Files

```
microservices/shared/
├── security/
│   ├── security_headers.py      # Security headers middleware
│   ├── rate_limiter.py          # Advanced rate limiting
│   └── __init__.py
├── middlewares/
│   └── auth_guard.py            # Authentication & authorization
├── utils/
│   ├── jwt_handler.py           # JWT token management
│   └── logger.py                # Security logging
└── __init__.py
```

### Features Implemented ✅

- **Multi-layer Authentication**: JWT with refresh tokens, OTP, email verification
- **Role-based Authorization**: Granular permissions and resource ownership
- **Advanced Rate Limiting**: Sliding window, token bucket, fixed window algorithms
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more
- **Comprehensive Logging**: Security events, audit trails, performance monitoring
- **Input Validation**: Pydantic models with security-focused validation
- **Token Management**: Blacklisting, rotation, and revocation

## 🔐 Authentication & Authorization

### JWT Token System

```python
# Enhanced JWT with security claims
{
  "sub": "user_id",           # Subject (user ID)
  "email": "user@example.com",
  "roles": ["msme_owner"],
  "permissions": ["user.read", "msme.write"],
  "token_type": "access",     # access, refresh, api_token
  "jti": "unique_token_id",   # For blacklisting
  "iss": "msmebazaar.com",    # Issuer
  "iat": 1640995200,          # Issued at
  "exp": 1640998800           # Expires at
}
```

### Usage Examples

```python
from middlewares.auth_guard import require_auth, require_admin, require_msme_owner

# Basic authentication
@app.get("/api/profile")
async def get_profile(user = Depends(require_auth)):
    return {"user_id": user["sub"]}

# Role-based access
@app.get("/api/admin/users")
async def list_users(user = Depends(require_admin)):
    return {"users": []}

# Resource ownership
@app.get("/api/msme/{msme_id}")
async def get_msme(msme_id: str, user = Depends(require_resource_owner("msme_id"))):
    return {"msme": {}}
```

### Token Types

1. **Access Token** (15 min): For API access
2. **Refresh Token** (7 days): For token renewal
3. **Email Verification Token** (24 hours): For email verification
4. **Password Reset Token** (30 min): For password reset
5. **API Token** (1 year): For long-lived API access

## ⚡ Rate Limiting

### Multiple Algorithms

```python
# Sliding Window (recommended for most cases)
@app.post("/api/auth/login")
async def login(request: Request, _: None = Depends(auth_rate_limit)):
    # 5 requests per 5 minutes
    pass

# Token Bucket (for burst traffic)
@app.post("/api/valuation")
async def valuation(request: Request, _: None = Depends(valuation_rate_limit)):
    # 10 requests per 5 minutes with burst capacity
    pass

# Fixed Window (for strict limits)
@app.post("/api/otp/send")
async def send_otp(request: Request, _: None = Depends(otp_rate_limit)):
    # 3 requests per 5 minutes, no burst
    pass
```

### Rate Limiting Hierarchy

1. **User ID** (if authenticated)
2. **API Key** (if provided)
3. **IP Address** (fallback)

### Predefined Limits

- **Authentication**: 5 requests/5 minutes
- **OTP**: 3 requests/5 minutes
- **API calls**: 100 requests/minute
- **Valuation**: 10 requests/5 minutes

## 🔒 Security Headers

### Production Headers

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'
Referrer-Policy: no-referrer-when-downgrade
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Development vs Production

```python
# Automatic environment detection
app.add_middleware(SecurityHeadersMiddleware, environment=ENVIRONMENT)

# Development: More permissive CSP for hot reload
# Production: Strict CSP and HSTS headers
```

## 📊 Logging & Monitoring

### Security Event Types

```python
from utils.logger import get_security_logger

security_logger = get_security_logger()

# Authentication events
security_logger.log_auth_success(user_id, method, ip_address)
security_logger.log_auth_failure(attempted_user, method, ip_address, reason)

# Authorization events
security_logger.log_permission_denied(user_id, resource, action, ip_address)

# Rate limiting
security_logger.log_rate_limit_exceeded(identifier, endpoint, limit)

# Data access
security_logger.log_data_access(user_id, resource, action)

# Admin actions
security_logger.log_admin_action(admin_user_id, action, target)
```

### Structured Logging

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "auth-service",
  "environment": "production",
  "level": "WARNING",
  "event_type": "auth_failure",
  "user_id": "user_123",
  "ip_address": "192.168.1.1",
  "failure_reason": "invalid_password",
  "correlation_id": "req_abc123",
  "security_event": true,
  "requires_audit": true
}
```

### Performance Monitoring

```python
# Automatic performance tracking
performance_logger.log_request_timing(endpoint, method, duration_ms, status_code)
performance_logger.log_database_query(query_type, duration_ms, affected_rows)
performance_logger.log_external_api_call(service, endpoint, duration_ms, status_code)
```

## 🔧 Integration Guide

### 1. Add to Existing Service

```python
# main.py
import sys
sys.path.append('/workspace/microservices/shared')

from security.security_headers import SecurityHeadersMiddleware
from security.rate_limiter import RateLimitMiddleware, api_rate_limit
from middlewares.auth_guard import require_auth
from utils.logger import configure_logging, get_logger

# Configure logging
configure_logging(
    service_name="your-service",
    log_level="INFO",
    enable_json=ENVIRONMENT == "production"
)

# Add middleware
app.add_middleware(SecurityHeadersMiddleware, environment=ENVIRONMENT)
app.add_middleware(RateLimitMiddleware)

# Protect endpoints
@app.get("/api/protected")
async def protected_endpoint(
    user = Depends(require_auth),
    _: None = Depends(api_rate_limit)
):
    return {"message": "Protected data"}
```

### 2. Database Schema

```sql
-- Users table (required for auth service)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    gst_number VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    resource VARCHAR(100),
    action VARCHAR(50),
    ip_address INET,
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### 3. Environment Variables

```env
# Security
SECRET_KEY=your-super-secret-key-change-this
JWT_ISSUER=msmebazaar.com
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/msmebazaar

# Redis
REDIS_URL=redis://localhost:6379

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
SERVICE_NAME=your-service
SERVICE_VERSION=1.0.0
```

## 🧪 Testing

### Run Security Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-mock

# Run all security tests
cd microservices/auth-service
python -m pytest tests/test_security.py -v

# Run specific test categories
python -m pytest tests/test_security.py::TestSecurityHeaders -v
python -m pytest tests/test_security.py::TestRateLimiting -v
python -m pytest tests/test_security.py::TestJWTSecurity -v
```

### Test Coverage

- ✅ Security headers in all environments
- ✅ Rate limiting algorithms and limits
- ✅ JWT token creation, verification, and expiry
- ✅ Token blacklisting and rotation
- ✅ Authentication endpoint validation
- ✅ Authorization guard functionality
- ✅ Input sanitization and validation
- ✅ Security logging and audit trails
- ✅ Performance monitoring
- ✅ Integration testing

### Security Test Examples

```python
def test_rate_limiting():
    """Test that rate limiting works correctly"""
    client = TestClient(app)
    
    # Make multiple requests rapidly
    for i in range(10):
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
    
    # Should eventually hit rate limit
    assert response.status_code == 429

def test_jwt_security():
    """Test JWT token security"""
    # Test token with tampered payload
    token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.tampered.signature"
    
    response = client.get("/api/profile", headers={
        "Authorization": f"Bearer {token}"
    })
    
    assert response.status_code == 401
```

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Use hardened base image
FROM python:3.11-slim

# Create non-root user
RUN adduser --disabled-password --gecos '' msmeuser
USER msmeuser

# Set security environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Kubernetes Security

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: auth-service
        image: msmebazaar/auth-service:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        env:
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: secret-key
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
```

### Production Checklist

- [ ] **Environment Variables**: All secrets in environment/vault
- [ ] **HTTPS**: TLS 1.2+ with valid certificates
- [ ] **Database**: Connection pooling and encrypted connections
- [ ] **Redis**: Password protection and encryption in transit
- [ ] **Monitoring**: Prometheus metrics and alerting setup
- [ ] **Logging**: Centralized log aggregation (ELK/Fluentd)
- [ ] **Backup**: Regular database and Redis backups
- [ ] **Network**: Firewall rules and network segmentation
- [ ] **Updates**: Regular security updates and dependency scanning

## 🔍 Security Monitoring

### Metrics to Monitor

```python
# Prometheus metrics automatically exported
auth_attempts_total{status="success|failure"}
rate_limit_violations_total{endpoint="/api/auth/login"}
token_validations_total{result="valid|invalid|expired"}
suspicious_activity_total{type="brute_force|injection"}
```

### Alerting Rules

```yaml
groups:
- name: security_alerts
  rules:
  - alert: HighFailedLogins
    expr: rate(auth_attempts_total{status="failure"}[5m]) > 10
    labels:
      severity: warning
    annotations:
      summary: "High rate of failed login attempts"
  
  - alert: RateLimitViolations
    expr: rate(rate_limit_violations_total[5m]) > 5
    labels:
      severity: warning
    annotations:
      summary: "High rate of rate limit violations"
```

## 📞 Support & Maintenance

### Security Updates

- **Dependencies**: Automated security scanning with Dependabot
- **CVE Monitoring**: Regular vulnerability assessments
- **Penetration Testing**: Quarterly security audits
- **Code Review**: Security-focused code review process

### Incident Response

1. **Detection**: Automated alerting and monitoring
2. **Analysis**: Security log analysis and forensics
3. **Containment**: Automated token revocation and IP blocking
4. **Recovery**: Service restoration and security patches
5. **Lessons Learned**: Post-incident security improvements

### Contact

For security issues or questions:
- **Security Team**: security@msmebazaar.com
- **Emergency**: security-emergency@msmebazaar.com
- **Bug Bounty**: [Security disclosure program]

---

## 🎯 Next Steps

1. **Deploy the auth service** with security components
2. **Integrate security** into other microservices
3. **Set up monitoring** and alerting
4. **Conduct security testing** and penetration testing
5. **Train the team** on security best practices

This implementation provides enterprise-grade security for MSMEBazaar while maintaining developer productivity and system performance. The modular design allows for easy integration across all microservices.