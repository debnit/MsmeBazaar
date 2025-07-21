# 🎨 Render Deployment Setup Guide

Complete guide for setting up MSME Bazaar on Render with database and environment variables.

## 🚀 Quick Setup Steps

### 1. **Create Render Account & Connect Repository**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select `debnit/MsmeBazaar` repository
4. Choose **"main"** branch

### 2. **Configure Web Service**
```yaml
Name: msme-bazaar-production
Environment: Node
Region: Oregon (US West) or closest to your users
Branch: main
Build Command: ./render-build.sh
Start Command: npm start
```

### 3. **Provision PostgreSQL Database**
1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure database:
   ```yaml
   Name: msme-postgres
   Database: msme_production
   User: msme_user
   Region: Same as your web service
   Plan: Starter ($7/month) or Free ($0/month for 90 days)
   ```
3. **Important**: Copy the **Internal Database URL** (starts with `postgresql://`)

### 4. **Set Environment Variables**

In your web service **Environment** tab, add these variables:

#### 🔐 **Required Variables:**
```bash
# Database (from your PostgreSQL service)
DATABASE_URL=postgresql://msme_user:password@dpg-xxx-internal/msme_production

# Node Environment
NODE_ENV=production
PORT=3000

# Authentication (generate secure secrets)
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
NEXTAUTH_SECRET=your-nextauth-secret-key-32-chars-min
NEXTAUTH_URL=https://your-app-name.onrender.com
```

#### 💳 **Payment Gateway (Razorpay):**
```bash
# Production keys from Razorpay Dashboard
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret-key
```

#### 🗄️ **Redis Cache (Optional but Recommended):**
```bash
# From Render Redis service or external provider
REDIS_URL=redis://username:password@hostname:port
```

#### 📊 **Monitoring & Search (Optional):**
```bash
# Sentry for error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Typesense for search
TYPESENSE_HOST=your-typesense-host
TYPESENSE_API_KEY=your-typesense-api-key
```

## 🔧 **Detailed Setup Instructions**

### **Step 1: Database Setup**

#### Option A: Render PostgreSQL (Recommended)
1. Create PostgreSQL service in Render
2. Use the **Internal Database URL** for better performance
3. Format: `postgresql://user:password@hostname-internal:5432/database`

#### Option B: External Database (Neon, Supabase, etc.)
1. Create database in your preferred provider
2. Get connection string
3. Ensure it allows connections from Render IPs

### **Step 2: Environment Variables Setup**

#### Generate Secure Secrets:
```bash
# JWT Secret (256-bit minimum)
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32
```

#### Set in Render Dashboard:
1. Go to your web service
2. Click **"Environment"** tab
3. Add each variable with **"Add Environment Variable"**
4. **Important**: Click **"Save Changes"** after adding all variables

### **Step 3: Build Configuration**

Your `render-build.sh` should handle the build:
```bash
#!/bin/bash
set -e

echo "🚀 Starting Render build process..."
export NODE_ENV=production

echo "📦 Installing all dependencies for build..."
npm ci --no-audit --no-fund

echo "🏗️ Building client (frontend)..."
npm run build:client

echo "🏗️ Building server (backend)..."
npm run build:server

echo "📁 Checking build outputs..."
ls -la dist/
echo "Client build contents:"
ls -la dist/public/ || echo "No client build found"

echo "🧹 Cleaning up dev dependencies..."
npm prune --production

echo "🎉 Render build completed successfully!"
```

### **Step 4: Health Checks**

Render will automatically check these endpoints:
- `GET /health` - Basic health check
- `GET /api/health` - API health check

Make sure your server responds with `200 OK` for these routes.

## 🚨 **Troubleshooting Common Issues**

### **Issue 1: DATABASE_URL not set**
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

**Solutions:**
1. ✅ Provision PostgreSQL database in Render
2. ✅ Copy **Internal Database URL** (not External)
3. ✅ Set `DATABASE_URL` environment variable
4. ✅ Redeploy your service

### **Issue 2: Build Fails**
```
npm ERR! Cannot find package 'vite'
```

**Solutions:**
1. ✅ Use `npm ci` instead of `npm ci --only=production` during build
2. ✅ Run `npm prune --production` after build
3. ✅ Ensure `render-build.sh` is executable (`chmod +x`)

### **Issue 3: Port Issues**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. ✅ Use `process.env.PORT || 3000` in your server
2. ✅ Don't hardcode port numbers
3. ✅ Let Render assign the port automatically

### **Issue 4: Environment Variables Not Loading**
```
TypeError: Cannot read properties of undefined
```

**Solutions:**
1. ✅ Check spelling of environment variable names
2. ✅ Use `process.env.VARIABLE_NAME` not `import.meta.env`
3. ✅ Add fallback values: `process.env.PORT || 3000`

## 🔒 **Security Best Practices**

### **Environment Variables:**
- ✅ Use strong, unique secrets for JWT and NextAuth
- ✅ Never commit secrets to git
- ✅ Use Render's encrypted environment variables
- ✅ Rotate secrets regularly

### **Database Security:**
- ✅ Use Internal Database URL for better security
- ✅ Enable SSL connections (Render PostgreSQL has this by default)
- ✅ Use least-privilege database users
- ✅ Regular database backups (Render handles this)

## 📊 **Monitoring Setup**

### **Application Monitoring:**
1. **Render Metrics**: Built-in CPU, Memory, Response Time
2. **Sentry**: Error tracking and performance monitoring
3. **Custom Health Checks**: `/health`, `/api/health`, `/api/status`

### **Database Monitoring:**
1. **Render PostgreSQL Metrics**: Connection count, query performance
2. **Application-level**: Query logging, slow query detection

## 🚀 **Production Optimization**

### **Performance:**
```bash
# Environment variables for production optimization
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=1024
```

### **Scaling:**
- **Horizontal Scaling**: Multiple Render services behind load balancer
- **Database Scaling**: Read replicas, connection pooling
- **CDN**: Static assets served from Render's global CDN

## 📋 **Deployment Checklist**

Before going live:

- [ ] ✅ PostgreSQL database provisioned and connected
- [ ] ✅ All environment variables set correctly
- [ ] ✅ Health checks responding (`/health`)
- [ ] ✅ Build process completing successfully
- [ ] ✅ Database migrations run (`npm run db:push`)
- [ ] ✅ SSL certificate configured (automatic with Render)
- [ ] ✅ Custom domain configured (if needed)
- [ ] ✅ Monitoring and alerts set up
- [ ] ✅ Backup strategy confirmed

## 🔗 **Useful Links**

- [Render Dashboard](https://dashboard.render.com)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Build & Deploy](https://render.com/docs/deploy-node-express-app)
- [MSME Bazaar GitHub](https://github.com/debnit/MsmeBazaar)

---

## 🎯 **Quick Commands**

### **Check Deployment Status:**
```bash
# Health check
curl https://your-app.onrender.com/health

# API health check  
curl https://your-app.onrender.com/api/health
```

### **View Logs:**
1. Go to Render Dashboard
2. Select your web service
3. Click **"Logs"** tab
4. Monitor real-time logs

### **Manual Deploy:**
1. Go to your web service in Render
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Monitor deployment progress in logs