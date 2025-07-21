# 🚀 Render Deployment Setup Guide

This guide explains how to deploy your MSME Bazaar application to Render.com using GitHub Actions.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Connected to Render
3. **Node.js Application**: Ready for deployment

## 🔧 Render Service Setup

### Step 1: Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `debnit/MsmeBazaar`
4. Configure the service:

```yaml
Name: msme-bazaar-production
Environment: Node
Region: Oregon (US West)
Branch: main
Build Command: npm ci && npm run build
Start Command: npm start
```

### Step 2: Environment Variables

Add these environment variables in Render Dashboard:

```bash
# Database
DATABASE_URL=your_postgresql_url
REDIS_URL=your_redis_url

# Authentication
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret

# API Keys
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Node Environment
NODE_ENV=production
PORT=10000
```

### Step 3: Health Check Endpoint

Ensure your application has a health check endpoint:

```javascript
// In your server/index.ts or app.js
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    database: 'connected', // Add actual DB health check
    redis: 'connected'     // Add actual Redis health check
  });
});
```

## 🔑 GitHub Secrets Setup

Add these secrets to your GitHub repository:

### Repository Settings → Secrets and Variables → Actions

```bash
# Render API Credentials
RENDER_API_KEY=your_render_api_key
RENDER_SERVICE_ID=your_render_service_id
RENDER_SERVICE_URL=https://your-app-name.onrender.com

# Optional: For staging environment
RENDER_STAGING_SERVICE_ID=your_staging_service_id
RENDER_STAGING_SERVICE_URL=https://your-staging-app.onrender.com
```

### How to Get Render API Key:

1. Go to [Render Account Settings](https://dashboard.render.com/account)
2. Click **"API Keys"** tab
3. Create a new API key
4. Copy the key to GitHub secrets

### How to Get Service ID:

1. Go to your Render service dashboard
2. The Service ID is in the URL: `https://dashboard.render.com/web/srv-xxxxxxxxx`
3. Copy `srv-xxxxxxxxx` as your Service ID

## 🚀 Deployment Workflows

### Automatic Deployment (Main Branch)

Every push to `main` branch will trigger deployment:

```yaml
# .github/workflows/render-deploy.yml
name: Deploy to Render
on:
  push:
    branches: [ main ]
```

### Manual Deployment

You can also trigger deployment manually:

1. Go to GitHub → Actions tab
2. Select "Deploy to Render" workflow
3. Click "Run workflow"
4. Choose environment (production/staging)

## 🔍 Monitoring & Health Checks

### Deployment Status

Monitor deployment in:
- **GitHub Actions**: Check workflow status
- **Render Dashboard**: View service logs and metrics

### Health Check Endpoints

The workflow automatically tests these endpoints:
- `https://your-app.onrender.com/health`
- `https://your-app.onrender.com/api/health`
- `https://your-app.onrender.com/`

### Performance Monitoring

The workflow includes basic performance checks:
- Response time monitoring
- Endpoint availability testing
- Post-deployment verification

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Render dashboard
   # Ensure all dependencies are in package.json
   npm ci --production=false
   ```

2. **Environment Variables**
   ```bash
   # Verify all required env vars are set in Render
   # Check for typos in variable names
   ```

3. **Health Check Failures**
   ```bash
   # Ensure your app listens on correct port
   const PORT = process.env.PORT || 10000;
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

### Debug Commands

```bash
# Check service status
curl https://your-app.onrender.com/health

# View detailed logs
# Go to Render Dashboard → Your Service → Logs

# Test locally
npm run build
npm start
```

## 🎯 Best Practices

1. **Zero Downtime Deployments**: Render provides this automatically
2. **Environment Separation**: Use different services for staging/production
3. **Secrets Management**: Never commit secrets to code
4. **Health Checks**: Implement comprehensive health endpoints
5. **Monitoring**: Set up alerts in Render dashboard

## 📊 Deployment Summary

After successful deployment, you'll see:

```
🎉 Render Deployment Summary
- Status: ✅ Deployed
- Environment: production
- Service URL: https://your-app.onrender.com
- Commit: abc123def
- Branch: main
- Deployed At: 2024-01-20 10:30:00 UTC
```

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [GitHub Actions for Render](https://github.com/marketplace/actions/render-deploy)
- [Environment Variables on Render](https://render.com/docs/environment-variables)