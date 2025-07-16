# MSMESquare Microservices Architecture

## Overview

MSMESquare is built on a comprehensive microservices architecture featuring 10 independent services designed for enterprise-grade scalability and performance. Each service is containerized and can be deployed independently.

## Architecture Components

### 1. API Gateway (Nginx)
- **Purpose**: Central entry point for all API requests
- **Features**: Load balancing, rate limiting, SSL termination, health checks
- **Port**: 80 (HTTP), 443 (HTTPS)
- **Dependencies**: All microservices

### 2. Auth Service (FastAPI + Redis + PostgreSQL)
- **Purpose**: User authentication, authorization, and session management
- **Features**: JWT tokens, mobile OTP, role-based access control
- **Port**: 8001
- **Dependencies**: PostgreSQL, Redis
- **Key Features**:
  - Multi-role authentication (seller, buyer, agent, nbfc, admin)
  - Mobile OTP verification via Twilio
  - JWT token management with refresh tokens
  - Role-based permissions and access control

### 3. User Profile Service (FastAPI + PostgreSQL + S3)
- **Purpose**: User profile management and document storage
- **Features**: Profile CRUD, document uploads, KYC verification
- **Port**: 8002
- **Dependencies**: PostgreSQL, AWS S3, Auth Service
- **Key Features**:
  - Comprehensive profile management for all user types
  - Document upload and verification
  - KYC status tracking
  - Profile completion scoring

### 4. MSME Listing Service (FastAPI + PostgreSQL + S3)
- **Purpose**: MSME business listing management
- **Features**: Listing CRUD, asset management, financial data storage
- **Port**: 8003
- **Dependencies**: PostgreSQL, AWS S3, Auth Service
- **Key Features**:
  - Comprehensive business listing management
  - Asset inventory tracking
  - Financial data validation
  - Image and document management
  - Listing approval workflow

### 5. Search & Matchmaking Service (ElasticSearch + Python ML)
- **Purpose**: Advanced search and ML-based buyer-seller matching
- **Features**: Full-text search, semantic matching, recommendation engine
- **Port**: 8004
- **Dependencies**: ElasticSearch, PostgreSQL, Auth Service
- **Key Features**:
  - Advanced search with filters
  - ML-based matchmaking algorithm
  - Buyer preference management
  - Similarity scoring and ranking

### 6. Valuation Engine (Python ML + XGBoost/CatBoost)
- **Purpose**: AI-powered business valuation
- **Features**: Multiple ML models, heuristic fallbacks, valuation reports
- **Port**: 8005
- **Dependencies**: PostgreSQL, Auth Service
- **Key Features**:
  - Multiple ML models (XGBoost, CatBoost, LightGBM)
  - Heuristic valuation methods
  - Industry-specific multipliers
  - Confidence scoring and risk assessment

### 7. EaaS Service (FastAPI + PDFKit + DocuSign)
- **Purpose**: Everything-as-a-Service for document generation
- **Features**: PDF generation, e-signature integration, template management
- **Port**: 8006
- **Dependencies**: PostgreSQL, DocuSign API, Auth Service
- **Key Features**:
  - Legal document generation
  - E-signature workflows
  - Template management
  - Compliance documentation

### 8. Agent Service (FastAPI + PostgreSQL)
- **Purpose**: Agent management and commission tracking
- **Features**: Agent dashboard, commission calculations, performance metrics
- **Port**: 8007
- **Dependencies**: PostgreSQL, Auth Service
- **Key Features**:
  - Agent performance tracking
  - Commission calculations
  - Lead management
  - Performance analytics

### 9. Escrow & Payments Service (FastAPI + RazorpayX/Setu)
- **Purpose**: Secure payment processing and escrow management
- **Features**: Payment gateway integration, escrow management, transaction tracking
- **Port**: 8008
- **Dependencies**: PostgreSQL, Razorpay/Setu APIs, Auth Service
- **Key Features**:
  - Secure payment processing
  - Escrow account management
  - Transaction tracking
  - Automated payouts

### 10. Notification Service (Celery + Redis + Twilio)
- **Purpose**: Multi-channel notification system
- **Features**: Email, SMS, push notifications, bulk messaging
- **Port**: 8009
- **Dependencies**: PostgreSQL, Redis, Twilio, SendGrid
- **Key Features**:
  - Multi-channel notifications
  - Bulk messaging campaigns
  - Template management
  - Delivery tracking

### 11. Audit & Compliance Service (Python + PostgreSQL + OpenTelemetry)
- **Purpose**: Compliance monitoring and audit trails
- **Features**: Audit logs, compliance checking, regulatory reporting
- **Port**: 8010
- **Dependencies**: PostgreSQL, Jaeger, Auth Service
- **Key Features**:
  - Comprehensive audit trails
  - Compliance monitoring
  - Regulatory reporting
  - Distributed tracing

## Infrastructure Components

### Databases
- **PostgreSQL**: Primary database for all services
- **Redis**: Caching and session storage
- **ElasticSearch**: Search and analytics engine

### Monitoring & Observability
- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Visualization and dashboards
- **Jaeger**: Distributed tracing
- **Health Checks**: Automated health monitoring

### Message Queue
- **Celery**: Distributed task queue
- **Redis**: Message broker
- **Background Tasks**: Async processing

## Deployment Guide

### Prerequisites
- Docker and Docker Compose
- Environment variables configured
- External service API keys (Twilio, AWS, etc.)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd microservices

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://msme_user:msme_password@postgres:5432/msme_platform

# JWT
JWT_SECRET=your-secret-key

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=msme-platform

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Payments
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# DocuSign
DOCUSIGN_INTEGRATION_KEY=your-docusign-integration-key
DOCUSIGN_USER_ID=your-docusign-user-id
DOCUSIGN_ACCOUNT_ID=your-docusign-account-id

# Notifications
MSG91_API_KEY=your-msg91-api-key
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Individual Service Deployment
Each service can be deployed independently:

```bash
# Build and run specific service
docker-compose up -d auth-service
docker-compose up -d msme-listing-service
# etc.
```

### Scaling Services
Services can be scaled independently:

```bash
# Scale search service for high load
docker-compose up -d --scale search-matchmaking-service=3

# Scale valuation engine for ML processing
docker-compose up -d --scale valuation-engine=2
```

## API Documentation

### Service Endpoints

#### Auth Service (8001)
- `POST /register` - User registration
- `POST /login` - User authentication
- `POST /send-otp` - Send mobile OTP
- `POST /verify-otp` - Verify OTP
- `POST /refresh-token` - Refresh JWT token

#### MSME Listing Service (8003)
- `GET /listings` - Get all listings
- `POST /listings` - Create new listing
- `GET /listings/{id}` - Get specific listing
- `PUT /listings/{id}` - Update listing
- `DELETE /listings/{id}` - Delete listing

#### Search & Matchmaking Service (8004)
- `POST /search` - Search listings
- `POST /matchmaking` - Find matches for buyer
- `POST /buyer-preferences` - Save buyer preferences
- `GET /matches/{buyer_id}` - Get saved matches

#### Valuation Engine (8005)
- `POST /valuations` - Create valuation
- `GET /valuations/{id}` - Get valuation
- `POST /train-model` - Train ML models
- `GET /model-performance` - Get model metrics

### Health Checks
All services expose health check endpoints:
- `GET /health` - Service health status
- `GET /health/[service]` - Individual service health (via nginx)

## Performance Optimizations

### Resource Allocation
- **Auth Service**: 128MB memory limit
- **User Profile Service**: 128MB memory limit
- **MSME Listing Service**: 256MB memory limit
- **Search & Matchmaking**: 512MB memory limit
- **Valuation Engine**: 512MB memory limit
- **Other Services**: 128MB memory limit

### Caching Strategy
- **Redis**: Session storage, temporary data
- **Application-level**: Query result caching
- **Database**: Connection pooling

### Load Balancing
- **Nginx**: Round-robin load balancing
- **Circuit Breakers**: Automatic failover
- **Health Checks**: Continuous monitoring

## Security Features

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management

### Data Protection
- SSL/TLS encryption
- Database encryption at rest
- Secure file storage (S3)
- API rate limiting

### Compliance
- Audit trails for all transactions
- GDPR compliance features
- RBI guidelines adherence
- SOC 2 Type II compliance

## Monitoring & Observability

### Metrics
- **Prometheus**: System and custom metrics
- **Grafana**: Real-time dashboards
- **Performance**: Response times, throughput
- **Business**: User registrations, transactions

### Logging
- **Centralized**: All services log to central location
- **Structured**: JSON format for easy parsing
- **Levels**: Debug, info, warn, error
- **Retention**: 30-day log retention

### Tracing
- **Jaeger**: Distributed tracing
- **OpenTelemetry**: Trace correlation
- **Performance**: Request flow tracking

## Development Guidelines

### Code Standards
- **Python**: PEP 8 compliance
- **FastAPI**: Async/await patterns
- **Type Hints**: Full type annotation
- **Documentation**: Comprehensive docstrings

### Testing
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Service-to-service
- **Load Tests**: Performance validation
- **Security Tests**: Vulnerability scanning

### CI/CD Pipeline
- **GitHub Actions**: Automated testing
- **Docker**: Containerized deployment
- **Staging**: Pre-production testing
- **Production**: Blue-green deployment

## Troubleshooting

### Common Issues

#### Service Won't Start
1. Check environment variables
2. Verify database connectivity
3. Review service logs
4. Check port conflicts

#### High Memory Usage
1. Monitor service metrics
2. Check for memory leaks
3. Optimize database queries
4. Scale horizontally

#### Database Connection Issues
1. Verify DATABASE_URL
2. Check network connectivity
3. Review connection pooling
4. Monitor connection limits

### Debugging Commands
```bash
# View service logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec [service-name] /bin/bash

# Check resource usage
docker stats

# Monitor network traffic
docker-compose exec nginx nginx -t
```

## Future Enhancements

### Planned Features
- **Auto-scaling**: Kubernetes integration
- **Multi-region**: Global deployment
- **ML Pipeline**: Automated model training
- **API Gateway**: Advanced routing and transformation

### Technology Roadmap
- **GraphQL**: Unified API layer
- **gRPC**: Inter-service communication
- **Event Sourcing**: Audit and replay capabilities
- **CQRS**: Command Query Responsibility Segregation

## Support & Maintenance

### Production Support
- **24/7 Monitoring**: Automated alerting
- **Incident Response**: Escalation procedures
- **Backup & Recovery**: Automated backups
- **Performance Tuning**: Continuous optimization

### Maintenance Windows
- **Weekly**: Security updates
- **Monthly**: Feature releases
- **Quarterly**: Major version updates
- **Annual**: Infrastructure upgrades

For technical support, please contact the development team or create an issue in the repository.