# 🚀 MsmeBazaar v2.0 - Complete Microservices Deployment Guide

## 📋 **Architecture Overview**

MsmeBazaar v2.0 is deployed as a distributed microservices architecture on Render with the following components:

### **🌐 Domain Mapping**
- **Primary**: `vyapaarmitra.in` → Main Application
- **App**: `app.vyapaarmitra.in` → Separate Frontend
- **API**: `api.vyapaarmitra.in` → Main API Gateway
- **Auth**: `auth.vyapaarmitra.in` → Authentication Service
- **Admin**: `admin-api.vyapaarmitra.in` → Admin Dashboard API

### **🔧 Service Architecture**

#### **Core Application Services**
1. **Main Application** (`msmebazaar-main`)
   - **Type**: Web Service (Node.js)
   - **Domain**: vyapaarmitra.in, api.vyapaarmitra.in
   - **Function**: Primary API Gateway + Backend Logic

2. **Frontend Application** (`msmebazaar-frontend`)
   - **Type**: Web Service (Node.js)
   - **Domain**: app.vyapaarmitra.in
   - **Function**: Separate React Application

#### **Python Microservices**
3. **Authentication Service** (`msmebazaar-auth`)
   - **Domain**: auth.vyapaarmitra.in
   - **Function**: User authentication, JWT management

4. **Recommendation Service** (`msmebazaar-recommendations`)
   - **Function**: AI-powered business recommendations

5. **ML Monitoring Service** (`msmebazaar-ml-monitoring`)
   - **Function**: ML model monitoring and performance tracking

6. **Transaction Matching Service** (`msmebazaar-transactions`)
   - **Function**: Business transaction matching and processing

7. **Gamification Service** (`msmebazaar-gamification`)
   - **Function**: User engagement and reward systems

8. **User Profile Service** (`msmebazaar-profiles`)
   - **Function**: User profile management

9. **Valuation Service** (`msmebazaar-valuation`)
   - **Function**: Business valuation calculations

10. **MSME Listing Service** (`msmebazaar-listings`)
    - **Function**: Business listing management

11. **Search & Matchmaking Service** (`msmebazaar-search`)
    - **Function**: Advanced search and business matching

12. **EaaS Service** (`msmebazaar-eaas`)
    - **Function**: Email automation and notifications

#### **Additional Services**
13. **ML API Service** (`msmebazaar-ml-api`)
    - **Function**: Machine learning API endpoints

14. **Payments API Service** (`msmebazaar-payments`)
    - **Function**: Payment processing and integration

15. **Admin Dashboard Backend** (`msmebazaar-admin-api`)
    - **Domain**: admin-api.vyapaarmitra.in
    - **Function**: Admin panel backend

16. **Scheduler Service** (`msmebazaar-scheduler`)
    - **Type**: Background Worker
    - **Function**: Scheduled tasks and background jobs

#### **Infrastructure Services**
17. **PostgreSQL Database** (`msmebazaar-postgres`)
18. **Redis Cache** (`msmebazaar-redis`)

---

## 🚀 **Deployment Steps**

### **Step 1: Prerequisites**
```bash
# Ensure you have:
✅ Render account with billing enabled
✅ GitHub repository access
✅ Domain DNS access (vyapaarmitra.in)
✅ All required API keys and secrets
```

### **Step 2: Deploy Infrastructure Services First**

#### **A. PostgreSQL Database**
1. Go to Render Dashboard → New → PostgreSQL
2. Configure:
   - **Name**: `msmebazaar-postgres`
   - **Database**: `msmebazaar_production`
   - **User**: `msmebazaar_user`
   - **Plan**: Starter ($7/month) or Standard ($20/month)
3. **Copy the Internal Database URL** for other services

#### **B. Redis Cache**
1. Go to Render Dashboard → New → Redis
2. Configure:
   - **Name**: `msmebazaar-redis`
   - **Plan**: Starter ($7/month)
3. **Copy the Redis URL** for other services

### **Step 3: Deploy Core Services**

#### **A. Main Application (Primary Service)**
1. **Create Web Service**:
   - **Name**: `msmebazaar-main`
   - **Environment**: Node
   - **Build Command**: `./render-build.sh`
   - **Start Command**: `npm start`

2. **Environment Variables**:
   ```bash
   DATABASE_URL=[from PostgreSQL service]
   REDIS_URL=[from Redis service]
   SECRET_KEY=your-super-secret-key-32-chars-min
   JWT_SECRET=your-jwt-secret-key
   NEXTAUTH_SECRET=your-nextauth-secret
   OPENAI_API_KEY=sk-your-openai-key
   PINECONE_API_KEY=your-pinecone-key
   RAZORPAY_KEY_ID=rzp_live_your-key
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   ```

3. **Custom Domains**:
   - Add `vyapaarmitra.in`
   - Add `www.vyapaarmitra.in`
   - Add `api.vyapaarmitra.in`

#### **B. Authentication Service**
1. **Create Web Service**:
   - **Name**: `msmebazaar-auth`
   - **Environment**: Python
   - **Root Directory**: `microservices/auth-service`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`

2. **Environment Variables**:
   ```bash
   DATABASE_URL=[same as main]
   REDIS_URL=[same as main]
   JWT_SECRET=[same as main]
   SECRET_KEY=[same as main]
   ```

3. **Custom Domain**: Add `auth.vyapaarmitra.in`

### **Step 4: Deploy Python Microservices**

For each Python microservice, follow this pattern:

```bash
# Service Configuration Template
Name: msmebazaar-[service-name]
Environment: Python
Root Directory: microservices/[service-directory]
Build Command: pip install -r requirements.txt || pip install fastapi uvicorn redis asyncpg
Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1

# Common Environment Variables
DATABASE_URL=[from PostgreSQL]
REDIS_URL=[from Redis]
ENVIRONMENT=production
LOG_LEVEL=INFO
```

#### **Deploy in this order**:
1. **Recommendation Service** → `msmebazaar-recommendations`
2. **ML Monitoring Service** → `msmebazaar-ml-monitoring`
3. **Transaction Matching Service** → `msmebazaar-transactions`
4. **Gamification Service** → `msmebazaar-gamification`
5. **User Profile Service** → `msmebazaar-profiles`
6. **Valuation Service** → `msmebazaar-valuation`
7. **MSME Listing Service** → `msmebazaar-listings`
8. **Search Service** → `msmebazaar-search`
9. **EaaS Service** → `msmebazaar-eaas`

### **Step 5: Deploy Additional Services**

#### **A. ML API Service**
```bash
Name: msmebazaar-ml-api
Root Directory: apps/ml-api
Environment: Python
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
```

#### **B. Payments API Service**
```bash
Name: msmebazaar-payments
Root Directory: apps/payments-api
Environment: Python
Additional Env Vars:
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- STRIPE_SECRET_KEY
```

#### **C. Frontend Application**
```bash
Name: msmebazaar-frontend
Root Directory: frontend
Environment: Node
Build Command: npm ci && npm run build
Start Command: npm start
Domain: app.vyapaarmitra.in
```

#### **D. Admin Dashboard Backend**
```bash
Name: msmebazaar-admin-api
Root Directory: admin-dashboard/backend
Environment: Node
Domain: admin-api.vyapaarmitra.in
```

#### **E. Scheduler Service**
```bash
Name: msmebazaar-scheduler
Type: Background Worker
Root Directory: scheduler
Environment: Node
```

### **Step 6: DNS Configuration**

Configure these DNS records in your domain registrar:

```bash
# Primary Domain
Type: A
Name: @
Value: [IP from Render main service]

# WWW Subdomain
Type: CNAME
Name: www
Value: vyapaarmitra.in

# App Subdomain
Type: CNAME
Name: app
Value: msmebazaar-frontend.onrender.com

# API Subdomain
Type: CNAME
Name: api
Value: msmebazaar-main.onrender.com

# Auth Subdomain
Type: CNAME
Name: auth
Value: msmebazaar-auth.onrender.com

# Admin API Subdomain
Type: CNAME
Name: admin-api
Value: msmebazaar-admin-api.onrender.com
```

---

## ✅ **Verification Checklist**

### **Infrastructure**
- [ ] PostgreSQL database accessible
- [ ] Redis cache operational
- [ ] All services can connect to database
- [ ] Inter-service communication working

### **Core Services**
- [ ] Main application: https://vyapaarmitra.in loads
- [ ] Health check: https://vyapaarmitra.in/health responds
- [ ] API endpoints: https://api.vyapaarmitra.in/api/* working
- [ ] Frontend app: https://app.vyapaarmitra.in loads
- [ ] Auth service: https://auth.vyapaarmitra.in/health responds

### **Microservices Health Checks**
- [ ] Recommendations: https://msmebazaar-recommendations.onrender.com/health
- [ ] ML Monitoring: https://msmebazaar-ml-monitoring.onrender.com/health
- [ ] Transactions: https://msmebazaar-transactions.onrender.com/health
- [ ] Gamification: https://msmebazaar-gamification.onrender.com/health
- [ ] User Profiles: https://msmebazaar-profiles.onrender.com/health
- [ ] Valuation: https://msmebazaar-valuation.onrender.com/health
- [ ] Listings: https://msmebazaar-listings.onrender.com/health
- [ ] Search: https://msmebazaar-search.onrender.com/health
- [ ] EaaS: https://msmebazaar-eaas.onrender.com/health

### **Additional Services**
- [ ] ML API: https://msmebazaar-ml-api.onrender.com/health
- [ ] Payments API: https://msmebazaar-payments.onrender.com/health
- [ ] Admin API: https://admin-api.vyapaarmitra.in/health

### **Domain & SSL**
- [ ] All custom domains resolve correctly
- [ ] SSL certificates are active (🔒 in browser)
- [ ] CORS headers configured properly
- [ ] No mixed content warnings

### **Functionality Tests**
- [ ] User registration/login works
- [ ] Business listing creation works
- [ ] Search and recommendations function
- [ ] Payment processing works
- [ ] Email notifications work
- [ ] Admin dashboard accessible
- [ ] Gamification features active

---

## 🔧 **Monitoring & Maintenance**

### **Service Monitoring URLs**
```bash
# Health Check Endpoints
Main App: https://vyapaarmitra.in/health
Auth Service: https://auth.vyapaarmitra.in/health
Frontend: https://app.vyapaarmitra.in/
Admin API: https://admin-api.vyapaarmitra.in/health

# Render Service Dashboards
https://dashboard.render.com/web/[service-id]
```

### **Log Monitoring**
- Check Render service logs for errors
- Monitor database connection issues
- Watch for inter-service communication failures
- Track API response times

### **Performance Optimization**
- Monitor service resource usage
- Scale services based on traffic
- Optimize database queries
- Implement caching strategies

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Service Won't Start**
```bash
# Check build logs for:
- Missing dependencies
- Environment variable issues
- Port binding problems
- Database connection failures
```

#### **Inter-Service Communication Fails**
```bash
# Verify:
- Service URLs are correct
- CORS headers configured
- Authentication tokens valid
- Network connectivity between services
```

#### **Database Connection Issues**
```bash
# Check:
- DATABASE_URL format is correct
- PostgreSQL service is running
- Connection pool settings
- Firewall/security group settings
```

#### **Domain Resolution Problems**
```bash
# Verify:
- DNS records are correct
- DNS propagation completed (24-48 hours)
- SSL certificates provisioned
- CNAME records point to correct services
```

---

## 💰 **Cost Estimation**

### **Render Service Costs (Monthly)**
```bash
Infrastructure:
- PostgreSQL (Starter): $7
- Redis (Starter): $7

Core Services:
- Main Application (Starter): $7
- Frontend (Starter): $7
- Auth Service (Starter): $7

Microservices (9 services × $7): $63
Additional Services (4 services × $7): $28
Background Worker (Scheduler): $7

Total Estimated Cost: ~$133/month
```

### **Cost Optimization Tips**
- Start with Starter plans for all services
- Scale up based on actual usage
- Consider combining lightweight services
- Use background workers efficiently
- Monitor resource usage regularly

---

## 🎯 **Next Steps After Deployment**

1. **Performance Monitoring**: Set up comprehensive monitoring
2. **Load Testing**: Test system under load
3. **Security Audit**: Review security configurations
4. **Backup Strategy**: Implement database backups
5. **CI/CD Pipeline**: Automate deployments
6. **Documentation**: Update API documentation
7. **User Testing**: Conduct thorough user acceptance testing

---

**🎉 Congratulations! Your MsmeBazaar v2.0 microservices architecture is now live at `vyapaarmitra.in`!**