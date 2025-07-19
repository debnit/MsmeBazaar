# MSMEBazaar V3 - Production-Ready Fullstack Platform

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new/template/MSMEBazaar-v3)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/msmebazaar-v3)
[![Build Status](https://github.com/yourusername/msmebazaar-v3/workflows/CI/badge.svg)](https://github.com/yourusername/msmebazaar-v3/actions)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=msmebazaar-v3&metric=security_rating)](https://sonarcloud.io/dashboard?id=msmebazaar-v3)
[![Coverage](https://codecov.io/gh/yourusername/msmebazaar-v3/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/msmebazaar-v3)

> **Enterprise-grade MSME (Micro, Small, and Medium Enterprises) marketplace platform built with Next.js 14, FastAPI, PostgreSQL, and Redis. Production-ready for Railway, Render, and Kubernetes deployments.**

## 🚀 Quick Deploy

### One-Click Deployments

| Platform | Description | Deploy Button |
|----------|-------------|---------------|
| **Railway** | Backend APIs (Recommended) | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/MSMEBazaar-v3) |
| **Render** | Full-stack deployment | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy) |
| **Vercel** | Frontend only | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/msmebazaar-v3) |

### Self-Hosted Options

```bash
# Docker Compose (Local/VPS)
git clone https://github.com/yourusername/msmebazaar-v3.git
cd msmebazaar-v3
cp .env.example .env
# Edit .env with your configuration
docker-compose -f docker-compose.production.yml up -d

# Kubernetes (GKE/EKS/AKS)
kubectl apply -k k8s/
```

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend APIs  │    │   Databases     │
│                 │    │                 │    │                 │
│ • Next.js 14    │◄──►│ • Auth API      │◄──►│ • PostgreSQL    │
│ • Admin Panel   │    │ • MSME API      │    │ • Redis Cache   │
│ • TailwindCSS   │    │ • Valuation API │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   Services      │
                       │                 │
                       │ • NGINX Proxy   │
                       │ • Background    │
                       │ • Monitoring    │
                       └─────────────────┘
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14 + TypeScript | React-based web application |
| **Admin Panel** | Node.js + Express | Business administration interface |
| **Auth API** | FastAPI + Python | User authentication & authorization |
| **MSME API** | FastAPI + Python | Business listings & marketplace |
| **Valuation API** | FastAPI + Python | ML-powered business valuation |
| **Database** | PostgreSQL 15 | Primary data storage |
| **Cache** | Redis 7 | Session storage & caching |
| **Proxy** | NGINX | Load balancing & SSL termination |
| **Monitoring** | Sentry + Prometheus | Error tracking & metrics |

## 📦 Services Overview

### Frontend Applications
- **Web App** (`apps/web`) - Main user-facing application
- **Admin Dashboard** (`admin-dashboard`) - Business administration panel

### Backend APIs
- **Auth API** (`msmebazaar-v2/apps/auth-api`) - Authentication, registration, OTP verification
- **MSME API** (`msmebazaar-v2/apps/msme-api`) - Business listings, marketplace operations
- **Valuation API** (`msmebazaar-v2/apps/valuation-api`) - ML-powered business valuation

### Infrastructure
- **PostgreSQL** - Primary database with optimized indexes and partitioning
- **Redis** - Session storage, caching, and background job queues
- **NGINX** - Reverse proxy with SSL termination and rate limiting

## 🚀 Deployment Options

### Option 1: Railway (Recommended for APIs)

Railway provides excellent support for backend services with automatic scaling and database plugins.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

**Benefits:**
- 🚀 Automatic deployments from Git
- 📊 Built-in PostgreSQL and Redis
- 🔧 Zero-config deployments
- 📈 Automatic scaling

[→ View Railway Deployment Guide](./railway-deploy.md)

### Option 2: Render (Full-Stack)

Render offers comprehensive hosting for both frontend and backend services.

```bash
# Deploy using render.yaml
git push origin main  # Automatic deployment
```

**Benefits:**
- 🌐 Static site hosting + services
- 🔒 Free SSL certificates
- 🔄 Preview deployments
- 💾 Managed databases

[→ View Render Configuration](./render.yaml)

### Option 3: Kubernetes (Enterprise)

For enterprise deployments requiring full control and scalability.

```bash
# Deploy to any Kubernetes cluster
kubectl apply -k k8s/
```

**Features:**
- ⚖️ Horizontal Pod Autoscaling
- 🔄 Rolling updates and rollbacks
- 🛡️ Security policies and RBAC
- 📊 Built-in monitoring and logging

[→ View Kubernetes Guide](./k8s/README.md)

### Option 4: Docker Compose (Self-Hosted)

Perfect for VPS deployment or local development.

```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d
```

**Features:**
- 🐳 Multi-service orchestration
- 🔧 Environment-specific configurations
- 📊 Resource limits and health checks
- 🔒 Security hardening

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core Configuration
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/msmebazaar
REDIS_URL=redis://:password@host:6379

# Authentication
JWT_SECRET=your_super_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# External Services
TWILIO_ACCOUNT_SID=your_twilio_sid
SENDGRID_API_KEY=your_sendgrid_key
AWS_ACCESS_KEY_ID=your_aws_key
```

[→ View Complete Environment Guide](./.env.example)

### Domain Configuration

For production deployments, configure these subdomains:

| Subdomain | Service | Purpose |
|-----------|---------|---------|
| `app.msmebazaar.com` | Web Frontend | Main application |
| `admin.msmebazaar.com` | Admin Dashboard | Business administration |
| `api.msmebazaar.com` | Auth API | Authentication endpoints |
| `msme.msmebazaar.com` | MSME API | Business listings API |
| `valuation.msmebazaar.com` | Valuation API | ML valuation service |

## 🔒 Security Features

### Built-in Security
- 🛡️ JWT-based authentication with refresh tokens
- 🔐 Bcrypt password hashing (12 rounds)
- 🚦 Rate limiting (100 req/15min per IP)
- 🌐 CORS protection with allowed origins
- 📱 OTP verification for sensitive operations
- 🔒 HTTPS enforcement with security headers

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Data Protection
- 🗄️ Database connection pooling with PgBouncer
- 🔄 Automated backups with 30-day retention
- 🕵️ Audit logging for sensitive operations
- 🚫 SQL injection prevention with parameterized queries

## 📊 Monitoring & Observability

### Error Tracking
- **Sentry** - Real-time error monitoring and alerting
- **Structured Logging** - JSON logs with correlation IDs
- **Health Checks** - Automated endpoint monitoring

### Performance Metrics
- **Application Metrics** - Request rates, response times, error rates
- **Database Metrics** - Connection pool, query performance
- **Infrastructure Metrics** - CPU, memory, disk usage

### Monitoring Endpoints
```
GET /healthz          # Service health check
GET /metrics          # Prometheus metrics
GET /api/health       # Application health
```

## 🧪 Testing

### Test Coverage
- ✅ Unit Tests (Jest/Vitest) - 85%+ coverage
- ✅ Integration Tests (Supertest) - API endpoints
- ✅ E2E Tests (Cypress) - Critical user journeys
- ✅ Load Tests (k6) - Performance validation

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Load testing
npm run test:load

# Security audit
npm audit --audit-level moderate
```

## 🚧 Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Local Setup
```bash
# Clone repository
git clone https://github.com/yourusername/msmebazaar-v3.git
cd msmebazaar-v3

# Install dependencies
npm install
cd msmebazaar-v2/apps/auth-api && pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with local configuration

# Start services
docker-compose up -d postgres redis
npm run dev
```

### Development Commands
```bash
npm run dev              # Start all services in development
npm run build            # Build all applications
npm run lint             # Lint all code
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm run security:audit   # Security vulnerability scan
```

## 📈 Performance Optimizations

### Frontend Performance
- ⚡ Next.js 14 with App Router
- 🖼️ Image optimization with next/image
- 📦 Code splitting and lazy loading
- 🗜️ Gzip compression and asset minification
- 🧠 Redis caching for API responses

### Backend Performance
- 🚀 FastAPI with async/await
- 🔗 Database connection pooling
- 📊 Query optimization with indexes
- 💾 Redis caching and session storage
- ⚖️ Load balancing with NGINX

### Database Optimizations
- 📑 Indexed queries for fast lookups
- 🗂️ Table partitioning for large datasets
- 🔄 Read replicas for scaling reads
- 🧹 Automated cleanup jobs
- 📊 Query performance monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    - Lint (ESLint, Black, mypy)
    - Unit tests with coverage
    - Security scanning (Bandit, Semgrep)
    
  build:
    - Docker image builds
    - Container security scanning
    - Performance benchmarks
    
  deploy:
    - Deploy to staging
    - Run E2E tests
    - Deploy to production
```

### Quality Gates
- ✅ 85%+ test coverage required
- ✅ Zero critical security vulnerabilities
- ✅ Performance benchmarks pass
- ✅ All linting rules pass

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: Available at `/docs` on each API service
- **ReDoc**: Available at `/redoc` for alternative documentation view
- **OpenAPI 3.0**: Machine-readable API specifications

### API Endpoints Overview
```
Auth API (api.msmebazaar.com)
├── POST /auth/register        # User registration
├── POST /auth/login          # User login
├── POST /auth/verify-otp     # OTP verification
└── POST /auth/refresh        # Refresh access token

MSME API (msme.msmebazaar.com)
├── GET /businesses           # List businesses
├── POST /businesses          # Create business listing
├── GET /businesses/{id}      # Get business details
└── PUT /businesses/{id}      # Update business

Valuation API (valuation.msmebazaar.com)
├── POST /valuations          # Request business valuation
├── GET /valuations/{id}      # Get valuation results
└── GET /models/info          # Get model information
```

## 🆘 Support & Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear all caches
npm run clean
docker system prune -f

# Rebuild from scratch
npm install
npm run build
```

**Database Connection Issues**
```bash
# Check database connectivity
docker exec -it postgres psql -U postgres -d msmebazaar -c "SELECT 1;"

# Reset database
npm run db:reset
npm run db:migrate
```

**SSL Certificate Issues**
```bash
# Generate self-signed certificates for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/msmebazaar.key \
  -out nginx/ssl/msmebazaar.crt
```

### Getting Help
- 📖 [Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/yourusername/msmebazaar-v3/issues)
- 💬 [Discussions](https://github.com/yourusername/msmebazaar-v3/discussions)
- 📧 [Email Support](mailto:support@msmebazaar.com)

## 🗺️ Roadmap

### Q1 2024
- [ ] Mobile app (React Native)
- [ ] Advanced search with Elasticsearch
- [ ] AI-powered business matching
- [ ] Multi-language support

### Q2 2024
- [ ] Blockchain integration for transparency
- [ ] Advanced analytics dashboard
- [ ] API marketplace for third-party integrations
- [ ] White-label solutions

### Q3 2024
- [ ] International expansion
- [ ] Advanced ML models for credit scoring
- [ ] Real-time chat and video calls
- [ ] Supply chain management features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript for frontend code
- Python type hints for backend code
- 100% test coverage for new features
- Security review for sensitive changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [PostgreSQL](https://postgresql.org/) - Database
- [Redis](https://redis.io/) - Caching and sessions
- [Railway](https://railway.app/) - Deployment platform
- [Render](https://render.com/) - Cloud hosting

---

**Made with ❤️ for MSMEs worldwide**

*Star ⭐ this repo if you find it helpful!*