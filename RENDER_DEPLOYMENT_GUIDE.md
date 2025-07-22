# MSMEBazaar V2 Render Deployment Guide

## 🎯 Overview
This guide covers the deployment of MSMEBazaar V2 on Render using the refactored monorepo structure. All app folders have been moved to the root directory and the render.yaml has been updated accordingly.

## 📁 Monorepo Structure
```
/
├── apps/
│   ├── web/                 # Next.js frontend (msmebazaar-web)
│   ├── auth-api/           # FastAPI authentication service
│   └── msme-api/           # FastAPI MSME business logic service
├── render.yaml             # Main Render configuration
└── ...other files
```

## 🚀 Services Configured

### 1. **msmebazaar-web** (Next.js Frontend)
- **Type**: Web service with Docker
- **Dockerfile**: `./apps/web/Dockerfile`
- **Domain**: vyapaarmitra.in (custom domain)
- **Port**: 3000
- **Health Check**: `/api/health`

### 2. **msmebazaar-auth-api** (FastAPI Authentication)
- **Type**: Web service with Docker
- **Dockerfile**: `./apps/auth-api/Dockerfile`
- **Port**: 8000 (standardized)
- **Health Check**: `/health`

### 3. **msmebazaar-msme-api** (FastAPI Business Logic)
- **Type**: Web service with Docker
- **Dockerfile**: `./apps/msme-api/Dockerfile`
- **Port**: 8000 (standardized)
- **Health Check**: `/health`

### 4. **msmebazaar-postgres** (PostgreSQL Database)
- **Type**: PostgreSQL service
- **Plan**: Standard
- **Storage**: 20GB persistent disk

### 5. **msmebazaar-redis** (Redis Cache)
- **Type**: Redis service
- **Plan**: Standard
- **Policy**: allkeys-lru

## 🔧 Key Changes Made

### ✅ Fixed Issues:
1. **Removed msmebazaar-v2/ references** - All paths now work from monorepo root
2. **Standardized Docker ports** - All APIs use port 8000 internally
3. **Added health checks** - All services have proper health check endpoints
4. **Custom domain configured** - vyapaarmitra.in set for web service
5. **Environment variables** - Comprehensive env var setup from .env.example

### 📝 Files Created/Modified:
- ✅ `apps/web/Dockerfile` - Created production-ready Next.js Dockerfile
- ✅ `apps/web/app/api/health/route.ts` - Added health check endpoint
- ✅ `apps/web/next.config.js` - Removed standalone output (simplified)
- ✅ `apps/msme-api/Dockerfile` - Updated port from 8002 to 8000
- ✅ `render.yaml` - Complete refactor for monorepo structure

## 🔐 Environment Variables Setup

### Auto-Generated (Render will create):
- `POSTGRES_PASSWORD`
- `JWT_SECRET` (for both APIs)

### Required Secrets (Add via Render Dashboard):

#### 🔑 Critical Secrets (Required for basic functionality):
```bash
# Twilio (SMS/WhatsApp Communication)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI (AI Features)
OPENAI_API_KEY=your_openai_api_key

# Email (SMTP for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@msmebazaar.com
```

#### 💰 Payment Integration:
```bash
# Razorpay (Payment Processing)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

#### ☁️ File Storage (Choose AWS S3 OR MinIO):
```bash
# Option 1: AWS S3 (Recommended for production)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=msmebazaar-prod-documents

# Option 2: MinIO (Alternative to S3)
MINIO_ENDPOINT=your_minio_endpoint
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET_NAME=msmebazaar-documents
```

#### 🔍 Vector Database & Search (Optional):
```bash
# Weaviate (Vector Database)
WEAVIATE_URL=your_weaviate_url
WEAVIATE_API_KEY=your_weaviate_api_key

# Elasticsearch (Search Engine)
ELASTICSEARCH_URL=your_elasticsearch_url
```

#### 📊 Monitoring & Error Tracking (Optional):
```bash
# Sentry (Error Tracking)
SENTRY_DSN=your_sentry_dsn
```

## 🚀 Deployment Steps

### 1. Pre-deployment Checklist
- [ ] Ensure all Dockerfiles are present and working
- [ ] Verify health check endpoints exist
- [ ] Check that no msmebazaar-v2/ paths remain in code
- [ ] Test Docker builds locally (optional)

### 2. Deploy to Render
1. **Connect Repository**: Link your GitHub repo to Render
2. **Import Blueprint**: Use the `render.yaml` file
3. **Add Secrets**: Configure environment variables via dashboard
4. **Deploy**: Render will automatically build and deploy all services

### 3. Post-deployment Configuration
1. **Custom Domain**: Point vyapaarmitra.in DNS to Render
2. **SSL Certificate**: Render will auto-provision SSL
3. **Health Checks**: Verify all services are healthy
4. **Database**: Run any necessary migrations

## 🔍 Health Check Endpoints

| Service | Health Check URL | Expected Response |
|---------|-----------------|-------------------|
| Web | `https://vyapaarmitra.in/api/health` | `{"status": "healthy"}` |
| Auth API | `https://msmebazaar-auth-api.onrender.com/health` | `200 OK` |
| MSME API | `https://msmebazaar-msme-api.onrender.com/health` | `200 OK` |

## 🌐 Service URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://vyapaarmitra.in |
| **Auth API** | https://msmebazaar-auth-api.onrender.com |
| **MSME API** | https://msmebazaar-msme-api.onrender.com |
| **Database** | Internal (via connection string) |
| **Redis** | Internal (via connection string) |

## 🐛 Troubleshooting

### Common Issues:
1. **Build Failures**: Check Dockerfile syntax and dependencies
2. **Health Check Failures**: Ensure endpoints return 200 status
3. **Environment Variables**: Verify all required secrets are set
4. **Database Connection**: Check PostgreSQL connection strings
5. **CORS Issues**: Verify CORS_ORIGINS includes all necessary domains

### Debugging Commands:
```bash
# Check service logs
render logs <service-name>

# Check build logs
render builds <service-name>

# Test health endpoints locally
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/health
```

## ✅ Success Criteria

Your deployment is successful when:
- [ ] All 5 services show "Healthy" status in Render dashboard
- [ ] vyapaarmitra.in loads the Next.js frontend
- [ ] API endpoints respond correctly
- [ ] Database connections are established
- [ ] No msmebazaar-v2/ path errors in logs

## 📞 Support

If you encounter issues:
1. Check the Render dashboard for service status
2. Review service logs for error messages
3. Verify environment variables are set correctly
4. Ensure custom domain DNS is properly configured

---

**🎉 Ready for deployment!** Your MSMEBazaar V2 is now configured for seamless deployment on Render from the monorepo root.