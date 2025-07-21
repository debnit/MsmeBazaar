# 🚂 Railway Deployment Setup Guide

Complete guide for deploying MSME Bazaar on Railway with proper service configuration.

## 🚨 **Current Issue: Wrong Service Configuration**

The error `Could not find root directory: ./infrastructure/docker/postgres` indicates Railway is trying to deploy a PostgreSQL service instead of the Node.js application.

## 🔧 **Quick Fix Steps**

### **Step 1: Check Railway Dashboard**
1. Go to [Railway Project](https://railway.com/project/5a34edea-703d-4253-9f73-b84d0ceaff24)
2. Look at the **Services** tab
3. You should see multiple services - some might be misconfigured

### **Step 2: Identify the Correct Service**
- ✅ **Main App Service**: Should build from root directory with Node.js
- ❌ **PostgreSQL Service**: Might be trying to use Docker from `./infrastructure/docker/postgres`

### **Step 3: Fix Service Configuration**
1. Click on the **main application service** (not PostgreSQL)
2. Go to **Settings** → **Source**
3. Ensure:
   ```yaml
   Root Directory: / (or leave empty)
   Build Command: npm run build (or use railway.toml)
   Start Command: npm start (or use railway.toml)
   ```

### **Step 4: Remove Problematic Services**
If there are services pointing to wrong directories:
1. Click on the problematic service
2. Go to **Settings** → **Danger Zone**
3. **Delete Service** (if it's not needed)

## 🚀 **Proper Railway Setup**

### **Option 1: Use Railway.toml (Recommended)**
Your `railway.toml` is already configured correctly:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"

[env]
NODE_ENV = "production"
```

### **Option 2: Manual Service Configuration**
1. **Create New Web Service**:
   ```yaml
   Name: msme-bazaar-app
   Source: GitHub → debnit/MsmeBazaar
   Branch: main
   Root Directory: / (empty)
   ```

2. **Build Settings**:
   ```yaml
   Build Command: npm run build
   Start Command: npm start
   ```

3. **Environment Variables**:
   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://...  # From Railway PostgreSQL
   JWT_SECRET=your-secret
   RAZORPAY_KEY_ID=rzp_live_...
   ```

## 🗄️ **Database Setup**

### **Create PostgreSQL Database**
1. In Railway Dashboard: **New** → **Database** → **PostgreSQL**
2. Name: `msme-postgres`
3. **Connect to your app service**:
   - Railway will automatically provide `DATABASE_URL`
   - Use the **private connection string** for better performance

## 🔍 **Troubleshooting Service Issues**

### **Issue 1: Multiple Conflicting Services**
```
Error: Could not find root directory: ./infrastructure/docker/postgres
```

**Solution:**
1. Go to Railway Dashboard → Services
2. Delete any services pointing to wrong directories
3. Keep only:
   - ✅ **Main App** (Node.js from root)
   - ✅ **PostgreSQL Database**
   - ✅ **Redis** (optional)

### **Issue 2: Wrong Build Configuration**
```
Error: No such file or directory
```

**Solution:**
1. Check **Settings** → **Source** → **Root Directory**
2. Should be empty or `/` for main app
3. **NOT** `./infrastructure/docker/postgres`

### **Issue 3: Build Command Errors**
```
npm ERR! Cannot find package 'vite'
```

**Solution:**
1. Use the correct build command: `npm run build`
2. Ensure `railway.toml` is properly configured
3. Check that build runs locally first

## 📋 **Service Architecture**

### **Recommended Railway Services:**
```
📦 MSME Bazaar Project
├── 🚀 msme-app (Node.js Web Service)
│   ├── Source: GitHub/main
│   ├── Build: npm run build
│   ├── Start: npm start
│   └── Health: /health
├── 🗄️ msme-postgres (PostgreSQL Database)
│   ├── Version: 15
│   └── Storage: 1GB+
└── 🗃️ msme-redis (Redis Cache - Optional)
    └── Memory: 256MB+
```

### **Environment Variables Flow:**
```
🗄️ PostgreSQL → DATABASE_URL → 🚀 Node.js App
🗃️ Redis     → REDIS_URL    → 🚀 Node.js App
🔐 Secrets   → JWT_SECRET   → 🚀 Node.js App
```

## 🚀 **Deployment Process**

### **Automatic Deployment (GitHub)**
1. Push to `main` branch
2. Railway detects changes
3. Runs build process
4. Deploys automatically

### **Manual Deployment**
1. Go to Railway Dashboard
2. Click **Deploy** on your service
3. Monitor logs for issues

## 🔧 **Service Configuration Files**

### **railway.toml** (Primary Configuration)
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
numReplicas = 1
startCommand = "npm start"
healthcheckPath = "/health"

[env]
NODE_ENV = "production"
```

### **railway.json** (Alternative)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## 🎯 **Quick Commands**

### **Check Service Status:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and check services
railway login
railway status
```

### **View Logs:**
```bash
# View real-time logs
railway logs --follow

# View specific service logs
railway logs --service msme-app
```

### **Set Environment Variables:**
```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="postgresql://..."
```

## 📊 **Monitoring & Health Checks**

### **Health Check Endpoints:**
- `GET /health` - Basic application health
- `GET /api/health` - API service health

### **Railway Metrics:**
- **CPU Usage**: Monitor in dashboard
- **Memory Usage**: Check for memory leaks
- **Response Time**: Track performance
- **Error Rate**: Monitor application errors

## 🔒 **Security Configuration**

### **Environment Variables:**
- ✅ Use Railway's encrypted variables
- ✅ Never commit secrets to git
- ✅ Rotate secrets regularly
- ✅ Use strong JWT secrets (32+ characters)

### **Database Security:**
- ✅ Use internal connection strings
- ✅ Enable SSL connections
- ✅ Regular backups (Railway handles this)

## 📈 **Scaling & Performance**

### **Horizontal Scaling:**
```toml
[deploy]
numReplicas = 2  # Scale to 2 instances
```

### **Resource Limits:**
- **Memory**: 512MB - 2GB based on usage
- **CPU**: Auto-scaling based on load
- **Storage**: Database grows automatically

---

## 🎯 **Immediate Action Plan**

1. **Fix Current Issue:**
   - Go to Railway Dashboard
   - Delete services pointing to `./infrastructure/docker/postgres`
   - Keep only the main Node.js app service

2. **Verify Configuration:**
   - Root Directory: empty or `/`
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Test Deployment:**
   - Push a small change to trigger build
   - Monitor logs for success
   - Check health endpoint

The deployment should work immediately after fixing the service configuration! 🚂✨