# 🚀 MSMEBazaar Render Deployment Guide

## 📋 **Overview**
This guide covers deploying the MSMEBazaar monorepo to Render.com with 1 frontend and 5 backend microservices.

## 📁 **Project Structure**
```
msmebazaar/
├── frontend/                 # Vite + React (Port: $PORT)
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── auth-api/            # FastAPI OTP Auth (Port: $PORT)
│   ├── msme-api/            # MSME Onboarding (Port: $PORT)
│   ├── admin-api/           # Admin Dashboard (Port: $PORT)
│   ├── payments-api/        # Payment Gateway (Port: $PORT)
│   └── whatsapp-bot/        # WhatsApp Bot (Port: $PORT)
├── render.yaml              # Deployment configuration
└── .env.example             # Environment variables template
```

## 🔧 **Services Configuration**

### **Frontend Service**
- **Name**: `msmebazaar-frontend`
- **Type**: Node.js Web Service
- **Build**: `npm install && npm run build`
- **Start**: `npm run preview -- --port $PORT --host 0.0.0.0`
- **URL**: `https://msmebazaar-frontend.onrender.com`

### **Backend Services**
All backend services follow this pattern:
- **Type**: Python Web Service
- **Build**: `pip install -r requirements.txt`
- **Start**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check**: `/health`

#### Service URLs:
1. **Auth API**: `https://msmebazaar-auth-api.onrender.com`
2. **MSME API**: `https://msmebazaar-msme-api.onrender.com`
3. **Admin API**: `https://msmebazaar-admin-api.onrender.com`
4. **Payments API**: `https://msmebazaar-payments-api.onrender.com`
5. **WhatsApp Bot**: `https://msmebazaar-whatsapp-bot.onrender.com`

## 🚀 **Deployment Steps**

### **1. Repository Setup**
```bash
# Ensure your repo has the correct structure
git add render.yaml
git commit -m "Add Render deployment configuration"
git push origin main
```

### **2. Render Dashboard Setup**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository containing `render.yaml`
5. Click **"Apply"**

### **3. Environment Variables Setup**
After deployment, configure these secrets in Render Dashboard:

#### **Auth API Secrets:**
```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://host:port/0
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### **MSME API Secrets:**
```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://host:port/0
OPENAI_API_KEY=sk-your-openai-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=your-bucket-name
```

#### **Payments API Secrets:**
```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://host:port/0
RAZORPAY_KEY_ID=rzp_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_PUBLISHABLE_KEY=pk_your_stripe_key
STRIPE_SECRET_KEY=sk_your_stripe_secret
```

#### **WhatsApp Bot Secrets:**
```bash
REDIS_URL=redis://host:port/0
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 🔍 **Validation Checklist**

### **Pre-Deployment**
- [ ] All `main.py` files exist in backend services
- [ ] All `requirements.txt` files exist in backend services
- [ ] Frontend has `index.html` and `vite.config.ts`
- [ ] `render.yaml` is in repository root
- [ ] All services have health check endpoints

### **Post-Deployment**
- [ ] All 6 services deploy successfully
- [ ] Frontend loads at service URL
- [ ] All backend APIs respond to `/health`
- [ ] Environment variables are configured
- [ ] Inter-service communication works

## 🛠️ **Development Workflow**

### **Local Development**
```bash
# Start all services locally
./dev-start.sh

# Or manually:
# Frontend (Port 3000)
cd frontend && npm run dev

# Auth API (Port 8001)
cd backend/auth-api && uvicorn main:app --reload --port 8001

# MSME API (Port 8002)
cd backend/msme-api && uvicorn main:app --reload --port 8002
```

### **Environment Variables**
Create `.env` files in each service directory:

```bash
# backend/auth-api/.env
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://localhost:5432/msmebazaar
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-dev-secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Build Failures**
- Check `requirements.txt` has all dependencies
- Ensure Python version compatibility (3.11)
- Verify `main.py` imports work correctly

#### **Service Communication**
- Update API URLs in frontend environment variables
- Check CORS settings in backend services
- Verify JWT token passing between services

#### **Database Connection**
- Ensure DATABASE_URL is correctly formatted
- Check database permissions and network access
- Verify connection pooling settings

### **Health Check Endpoints**
Each backend service should implement:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "service-name"}
```

### **CORS Configuration**
Add to each FastAPI service:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://msmebazaar-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📊 **Monitoring & Logs**

### **Render Dashboard**
- Monitor service health and uptime
- View deployment logs and build output
- Track resource usage and performance
- Set up alerts for service failures

### **Application Logs**
- Use structured logging in Python services
- Implement proper error handling
- Set up log aggregation for debugging

## 🚀 **Production Optimizations**

### **Performance**
- Enable HTTP/2 and compression
- Implement proper caching strategies
- Use connection pooling for databases
- Optimize Docker images if using containers

### **Security**
- Use environment variables for secrets
- Implement proper CORS policies
- Add rate limiting to APIs
- Use HTTPS for all communications

### **Scaling**
- Monitor resource usage
- Implement horizontal scaling as needed
- Use Redis for session management
- Consider CDN for static assets

---

## 🎉 **Success!**
Your MSMEBazaar application should now be successfully deployed on Render with:
- ✅ 1 Frontend (Vite + React)
- ✅ 5 Backend Services (FastAPI)
- ✅ Auto-deployment on git push
- ✅ Environment variable management
- ✅ Health monitoring and logging

**Frontend URL**: `https://msmebazaar-frontend.onrender.com`

**API Base URL**: `https://msmebazaar-auth-api.onrender.com`