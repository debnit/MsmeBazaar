# MSMEBazaar V2.0

A modular platform to onboard MSMEs and match them with buyers, investors, and acquisition opportunities.

## 🚀 Features

- **MSME Onboarding**: Streamlined registration with document uploads and validation
- **AI-Powered Matching**: Vector embeddings + keyword search for precise buyer-seller matching
- **Valuation Engine**: XGBoost ML model with rule-based fallback
- **Payment Integration**: Razorpay integration for ₹199-₹499 checkout flows
- **Admin Panel**: MSME listing moderation and valuation override
- **PDF Reports**: Automated valuation report generation

## 🏗️ Architecture

### Frontend (Next.js Monorepo)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation

### Backend (FastAPI Microservices)
- **Auth Service**: OTP login, session management, RBAC
- **MSME Service**: CRUD operations, document uploads
- **Valuation Service**: ML model + PDF generation
- **Match Service**: Vector search + keyword matching
- **Admin Service**: Moderation and overrides
- **Payment Service**: Razorpay webhooks and checkout

### Infrastructure
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis for sessions and caching
- **Storage**: MinIO/S3 for document storage
- **Search**: Weaviate/Pinecone for vector search
- **Monitoring**: OpenTelemetry + Prometheus + Grafana

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose

### Local Development

1. **Clone and setup**
   ```bash
   git clone <repo-url>
   cd msmebazaar-v2
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Admin Panel: http://localhost:3000/admin

### VSCode Dev Container

For a consistent development environment:
```bash
# Open in VSCode
code .
# Use "Reopen in Container" command
```

## 📁 Project Structure

```
msmebazaar-v2/
├── apps/
│   ├── web/                # Next.js frontend
│   ├── auth-api/          # FastAPI Auth service
│   ├── msme-api/          # MSME CRUD service
│   ├── valuation-api/     # ML + PDF service
│   ├── match-api/         # Search & matching
│   └── admin-api/         # Admin panel APIs
├── libs/
│   ├── ui/                # Shared UI components
│   ├── utils/             # Shared utilities
│   └── db/                # Database schemas
├── devops/
│   ├── docker-compose.yml
│   ├── .devcontainer/
│   └── github/workflows/
└── docs/                  # API documentation
```

## 🧪 Testing

```bash
# Backend tests
cd apps/auth-api && pytest

# Frontend tests
cd apps/web && npm test

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Railway/Render
```bash
npm run deploy
```

### Manual Docker
```bash
docker-compose -f docker-compose.production.yml up -d
```

## 📊 Monitoring

- **Metrics**: http://localhost:9090 (Prometheus)
- **Dashboards**: http://localhost:3001 (Grafana)
- **Logs**: Centralized logging with trace IDs

## 🔐 Security

- OTP-based authentication
- RBAC for admin functions
- Rate limiting on all APIs
- Input validation with Zod/Pydantic
- Secure environment variable management

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.