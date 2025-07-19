# MSMEBazaar V2.0 🚀

A modern, scalable platform for onboarding MSMEs and connecting them with buyers, investors, and acquisition opportunities. Built with AI-powered matching and comprehensive valuation services.

## 🌟 Features

### Core Functionality
- **MSME Onboarding**: Complete profile creation with document management
- **AI-Powered Matching**: Semantic search using OpenAI embeddings and Weaviate
- **Valuation Engine**: ML-based business valuation with PDF report generation
- **Admin Dashboard**: Comprehensive management interface with analytics
- **Payment Integration**: Razorpay integration for valuation services

### Technical Highlights
- **Microservices Architecture**: Scalable, maintainable service design
- **Modern Tech Stack**: FastAPI, Next.js, PostgreSQL, Redis, Weaviate
- **AI Integration**: OpenAI embeddings for semantic matching
- **Real-time Processing**: Celery for background tasks
- **Comprehensive Monitoring**: Prometheus, Grafana, structured logging
- **Production Ready**: Docker containerization, CI/CD pipeline

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway (Nginx)                     │
├─────────────────────────────────────────────────────────────┤
│  Auth API │ MSME API │ Valuation API │ Match API │ Admin API │
├─────────────────────────────────────────────────────────────┤
│     PostgreSQL     │     Redis     │   Weaviate   │  MinIO   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/msmebazaar-v2.git
cd msmebazaar-v2
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the services**
```bash
cd devops
docker-compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin
- API Documentation: http://localhost:8001/docs (Auth API)

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js web application |
| Auth API | 8001 | Authentication & user management |
| MSME API | 8002 | MSME profile & document management |
| Valuation API | 8003 | Business valuation & PDF generation |
| Match API | 8004 | AI-powered matching service |
| Admin API | 8005 | Admin dashboard & analytics |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching & session storage |
| Weaviate | 8080 | Vector database for embeddings |
| MinIO | 9000 | S3-compatible object storage |

## 📊 API Documentation

### Authentication Flow
```
POST /api/register          # Register new user
POST /api/verify-otp        # Verify OTP
POST /api/login             # Login user
POST /api/refresh-token     # Refresh JWT token
```

### MSME Management
```
POST /api/msme/profile      # Create MSME profile
GET  /api/msme/profile      # Get MSME profile
PUT  /api/msme/profile      # Update MSME profile
POST /api/msme/documents/upload  # Upload documents
```

### Valuation Services
```
POST /api/valuation/request      # Request valuation
GET  /api/valuation/{id}         # Get valuation status
POST /api/valuation/{id}/payment # Create payment
POST /api/valuation/{id}/report  # Generate PDF report
```

### AI Matching
```
POST /api/match/request          # Create match request
GET  /api/match/request/{id}/results  # Get match results
POST /api/match/search           # Semantic search
```

## 🛠️ Development

### Local Development Setup

1. **Backend Services**
```bash
# Start each service in separate terminals
cd apps/auth-api && python -m uvicorn main:app --reload --port 8001
cd apps/msme-api && python -m uvicorn main:app --reload --port 8002
cd apps/valuation-api && python -m uvicorn main:app --reload --port 8003
cd apps/match-api && python -m uvicorn main:app --reload --port 8004
cd apps/admin-api && python -m uvicorn main:app --reload --port 8005
```

2. **Frontend**
```bash
cd apps/web
npm install
npm run dev
```

3. **Database Migration**
```bash
cd apps/auth-api
alembic upgrade head
```

### Testing

```bash
# Backend tests
cd apps/auth-api
pytest

# Frontend tests
cd apps/web
npm test

# Integration tests
cd tests
pytest integration/
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/msmebazaar

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# AWS/MinIO
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=msmebazaar-documents

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-weaviate-key
```

## 📈 Monitoring & Observability

### Metrics
- **Prometheus**: Metrics collection at http://localhost:9090
- **Grafana**: Dashboards at http://localhost:3001 (admin/admin)

### Logging
- Structured logging with trace IDs
- Centralized log aggregation
- Error tracking and alerting

### Health Checks
```bash
# Check service health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8005/health
```

## 🚢 Deployment

### Production Deployment

1. **Build and push images**
```bash
docker build -t msmebazaar/auth-api:latest apps/auth-api
docker push msmebazaar/auth-api:latest
# Repeat for all services
```

2. **Deploy to cloud**
```bash
# Using Railway
railway up

# Using Render
render deploy

# Using Kubernetes
kubectl apply -f k8s/
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing
- Security scanning
- Docker image building
- Deployment to staging/production

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- OTP verification for registration
- Rate limiting on sensitive endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Secure file upload handling

### Infrastructure Security
- Container security scanning
- Dependency vulnerability checks
- Environment variable encryption
- Network security policies

## 📱 Frontend Features

### User Interface
- **Modern Design**: Tailwind CSS with shadcn/ui components
- **Responsive**: Mobile-first responsive design
- **Animations**: Framer Motion for smooth transitions
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

### Admin Dashboard
- **Analytics**: Comprehensive business metrics
- **MSME Management**: Onboarding queue and approval workflow
- **Document Verification**: KYC document review system
- **Valuation Oversight**: Trigger and override valuations
- **System Health**: Monitor service status

## 🤖 AI Features

### Semantic Matching
- OpenAI embeddings for text understanding
- Weaviate vector database for similarity search
- Elasticsearch fallback for traditional search
- Multi-factor matching algorithm

### Valuation Engine
- XGBoost ML model for business valuation
- Feature engineering from financial data
- Confidence scoring and explanation
- Automated PDF report generation

## 📊 Business Intelligence

### Analytics Dashboard
- Registration trends and patterns
- Industry distribution analysis
- Verification level tracking
- Revenue and transaction metrics
- Geographic distribution

### Reporting
- Automated PDF generation
- Excel export functionality
- Custom date range filtering
- Multi-format data export

## 🔄 Background Processing

### Celery Tasks
- Valuation processing
- Email notifications
- Document processing
- Data synchronization
- Cleanup operations

### Queue Management
- Redis as message broker
- Task monitoring and retry logic
- Dead letter queue handling
- Distributed task execution

## 🧪 Testing Strategy

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for user flows
- Performance tests for scalability

### Quality Assurance
- Code quality checks with SonarQube
- Security scanning with Snyk
- Dependency vulnerability scanning
- Automated testing in CI/CD

## 📚 Documentation

### API Documentation
- OpenAPI/Swagger specifications
- Interactive API explorer
- Code examples and tutorials
- Postman collections

### Developer Guide
- Architecture documentation
- Database schema diagrams
- Deployment guides
- Troubleshooting guides

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript
- Write comprehensive tests
- Document your changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for embedding models
- Weaviate for vector search
- FastAPI for modern Python APIs
- Next.js for React framework
- All open-source contributors

## 📞 Support

For support and questions:
- 📧 Email: support@msmebazaar.com
- 💬 Discord: [Join our community](https://discord.gg/msmebazaar)
- 📖 Documentation: [docs.msmebazaar.com](https://docs.msmebazaar.com)

---

**MSMEBazaar V2.0** - Empowering MSMEs with AI-driven technology 🚀