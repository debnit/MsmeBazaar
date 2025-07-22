# 🏢 MSMEBazaar Admin Dashboard SaaS

> **Production-ready multi-tenant admin dashboard for MSME management, deals, workflow automation, and analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)

## 🎯 **Project Overview**

MSMEBazaar Admin Dashboard is a comprehensive SaaS solution designed to replace Notion CRM and Excel-based operations with a modern, scalable, and feature-rich platform. Built with multi-tenancy in mind, it supports white-label deployments across different states and clusters.

### 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 14    │    │    FastAPI      │    │   PostgreSQL    │
│   Frontend       │────│   Backend       │────│   Database      │
│   (Port 3000)    │    │   (Port 8000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │              ┌─────────────────┐
         │                       └──────────────│     Redis       │
         │                                      │  Cache & Queue  │
         │                                      │   (Port 6379)   │
         └──────────────────────────────────────└─────────────────┘
```

## 🚀 **Key Features**

### 🔐 **Multi-Tenant RBAC Authentication**
- **JWT-based authentication** with refresh tokens
- **Role-based access control**: SuperAdmin, Admin, TeamLead, Analyst, FieldAgent, Franchise
- **Multi-tenant architecture** with organization isolation
- **Custom domain support** for white-label deployments

### 💰 **Stripe Billing Integration**
- **Subscription management**: Free, Starter, Pro, Enterprise plans
- **Usage tracking** and limit enforcement
- **Automated billing** with Stripe webhooks
- **Billing portal** for self-service management

### 📊 **MSME Management**
- **Comprehensive MSME database** with verification workflows
- **Advanced filtering** by city, category, KYC status, valuation
- **Document management** with S3 integration
- **Bulk operations** and data export

### 🤝 **Deal & Workflow Automation**
- **Kanban board** for deal pipeline management
- **Automated matching** based on interests and criteria
- **Workflow engine** with Celery background tasks
- **Assignment and notification** system

### 📈 **Analytics & Reporting**
- **Real-time dashboards** with interactive charts
- **Performance metrics** and KPI tracking
- **Custom reports** with PDF export
- **Data visualization** with Recharts

### 🔔 **Communication Hub**
- **WhatsApp integration** via Twilio
- **Email notifications** with SendGrid
- **In-app notifications** with real-time updates
- **SMS alerts** for critical events

## 📁 **Project Structure**

```
admin-dashboard/
├── apps/
│   ├── web/                    # Next.js 14 Frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # Reusable components
│   │   │   ├── stores/        # Zustand state management
│   │   │   ├── lib/           # Utilities and configs
│   │   │   └── styles/        # Global styles
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                    # FastAPI Backend
│       ├── main.py            # Application entry point
│       ├── core/              # Core functionality
│       │   ├── auth.py        # Authentication & RBAC
│       │   ├── billing.py     # Stripe integration
│       │   ├── config.py      # Settings & configuration
│       │   ├── database.py    # Database connection
│       │   └── tenant.py      # Multi-tenant logic
│       ├── routes/            # API endpoints
│       ├── middleware/        # Custom middleware
│       ├── services/          # Business logic
│       └── requirements.txt
│
├── libs/
│   ├── schema/                # Prisma Schema & Database
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   └── seed.ts        # Sample data
│   │   └── package.json
│   │
│   ├── ui/                    # Shared UI Components
│   │   ├── components/        # shadcn/ui components
│   │   └── styles/           # Component styles
│   │
│   └── workflows/             # Workflow Automation
│       ├── engines/           # Celery tasks
│       ├── templates/         # Workflow templates
│       └── triggers/          # Event triggers
│
├── docker/                    # Docker configurations
│   ├── nginx/                # Nginx configs
│   ├── postgres/             # PostgreSQL setup
│   └── prometheus/           # Monitoring configs
│
├── docs/                      # Documentation
├── .github/                   # GitHub Actions
├── docker-compose.yml         # Local development
├── render.yaml               # Render deployment
├── .env.example              # Environment template
└── README.md                 # This file
```

## 🛠️ **Tech Stack**

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **Framer Motion** - Animation library
- **Zustand** - Lightweight state management
- **React Query** - Data fetching and caching
- **Recharts** - Data visualization

### **Backend**
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Python SQL toolkit and ORM
- **Alembic** - Database migration tool
- **Celery** - Distributed task queue
- **Redis** - In-memory data structure store
- **Pydantic** - Data validation using Python type annotations

### **Database & Storage**
- **PostgreSQL** - Relational database
- **Redis** - Caching and message broker
- **AWS S3** - File storage
- **Prisma** - Database toolkit (optional)

### **Infrastructure**
- **Docker** - Containerization
- **Render** - Cloud deployment platform
- **GitHub Actions** - CI/CD pipeline
- **Prometheus** - Monitoring and alerting
- **Grafana** - Metrics visualization

### **External Services**
- **Stripe** - Payment processing
- **Twilio** - SMS and WhatsApp
- **SendGrid** - Email delivery
- **OpenAI** - AI-powered features
- **Sentry** - Error tracking

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm 9+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### **1. Clone the Repository**
```bash
git clone https://github.com/msmebazaar/admin-dashboard.git
cd admin-dashboard
```

### **2. Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### **3. Database Setup**
```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Install schema dependencies
cd libs/schema
npm install

# Run database migrations
npm run migrate

# Seed sample data
npm run seed
```

### **4. Backend Setup**
```bash
# Navigate to backend
cd apps/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **5. Frontend Setup**
```bash
# Navigate to frontend
cd apps/web

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

### **6. Background Tasks (Optional)**
```bash
# Start Celery worker (in new terminal)
cd apps/api
celery -A core.celery worker --loglevel=info

# Start Celery beat scheduler (in new terminal)
celery -A core.celery beat --loglevel=info
```

## 🐳 **Docker Development**

### **Full Stack with Docker Compose**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### **Available Profiles**
```bash
# Development (includes pgAdmin, Redis Commander)
docker-compose --profile development up -d

# Production (includes Nginx)
docker-compose --profile production up -d

# Monitoring (includes Prometheus, Grafana)
docker-compose --profile monitoring up -d

# Logging (includes Elasticsearch, Kibana)
docker-compose --profile logging up -d
```

## 🌐 **Deployment**

### **Render Deployment**

1. **Fork the repository** to your GitHub account

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Configure Environment Variables**:
   ```bash
   # Required secrets (set in Render dashboard)
   SECRET_KEY=your-secret-key
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   OPENAI_API_KEY=sk-...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   SENDGRID_API_KEY=SG....
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

4. **Deploy**:
   - Push to main branch
   - Render will automatically deploy all services
   - Access your app at the provided URLs

### **Custom Domain Setup**
1. Add your domain in Render dashboard
2. Update DNS records to point to Render
3. SSL certificates are automatically provisioned

## 🔧 **Configuration**

### **Environment Variables**
Key configuration options (see `.env.example` for complete list):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://user:pass@host:port/db

# Authentication
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...

# External APIs
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
SENDGRID_API_KEY=SG....

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
S3_BUCKET_NAME=your-bucket
```

### **Feature Flags**
Enable/disable features using environment variables:

```bash
NEXT_PUBLIC_ENABLE_BILLING=true
NEXT_PUBLIC_ENABLE_WORKFLOWS=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## 👥 **User Roles & Permissions**

| Role | Description | Permissions |
|------|-------------|-------------|
| **SuperAdmin** | Platform administrator | All permissions across all organizations |
| **Admin** | Organization administrator | Full access within organization |
| **TeamLead** | Team manager | Manage team members and deals |
| **Analyst** | Data analyst | View analytics and create reports |
| **FieldAgent** | Field operations | MSME data entry and basic operations |
| **Franchise** | Regional partner | Limited regional access |

## 📊 **API Documentation**

### **Authentication**
```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Refresh token
POST /api/v1/auth/refresh
{
  "refresh_token": "eyJ..."
}
```

### **MSME Management**
```bash
# List MSMEs
GET /api/v1/msmes?page=1&size=25&status=active

# Create MSME
POST /api/v1/msmes
{
  "name": "Company Name",
  "email": "contact@company.com",
  "category": "SMALL",
  "type": "MANUFACTURING"
}

# Update MSME
PUT /api/v1/msmes/{id}

# Delete MSME
DELETE /api/v1/msmes/{id}
```

### **Deal Management**
```bash
# List deals
GET /api/v1/deals?status=PENDING

# Create deal
POST /api/v1/deals
{
  "title": "Deal Title",
  "type": "ACQUISITION",
  "buyerMsmeId": "msme-id",
  "dealValue": 1000000
}

# Update deal status
PATCH /api/v1/deals/{id}/status
{
  "status": "NEGOTIATION",
  "notes": "Updated status"
}
```

Full API documentation available at `/docs` when running the backend.

## 🧪 **Testing**

### **Backend Tests**
```bash
cd apps/api
pytest tests/ -v
```

### **Frontend Tests**
```bash
cd apps/web
npm run test
```

### **E2E Tests**
```bash
npm run test:e2e
```

## 📈 **Monitoring**

### **Health Checks**
- Frontend: `http://localhost:3000/api/health`
- Backend: `http://localhost:8000/health`
- Database: Built-in health checks in Docker Compose

### **Metrics & Logging**
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001`
- **Logs**: Structured logging with correlation IDs

## 🔒 **Security**

### **Authentication & Authorization**
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Rate limiting and request validation

### **Data Protection**
- Encrypted data at rest and in transit
- PII data handling compliance
- Audit logging for all actions
- Secure file upload with virus scanning

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow TypeScript/Python best practices
- Write tests for new features
- Update documentation
- Use conventional commits
- Ensure CI/CD passes

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### **Documentation**
- [API Documentation](https://admin-api.msmebazaar.com/docs)
- [User Guide](./docs/user-guide.md)
- [Deployment Guide](./docs/deployment.md)

### **Community**
- [GitHub Issues](https://github.com/msmebazaar/admin-dashboard/issues)
- [Discussions](https://github.com/msmebazaar/admin-dashboard/discussions)
- [Discord Community](https://discord.gg/msmebazaar)

### **Commercial Support**
For enterprise support and custom development:
- Email: enterprise@msmebazaar.com
- Website: [msmebazaar.com](https://msmebazaar.com)

## 🙏 **Acknowledgments**

- **shadcn/ui** for the beautiful component library
- **Vercel** for Next.js and deployment inspiration
- **FastAPI** community for the excellent framework
- **Render** for simplified deployment
- All contributors and the open-source community

---

<div align="center">

**Built with ❤️ by the MSMEBazaar Team**

[Website](https://msmebazaar.com) • [Documentation](./docs) • [API](https://admin-api.msmebazaar.com/docs) • [Support](mailto:support@msmebazaar.com)

</div>