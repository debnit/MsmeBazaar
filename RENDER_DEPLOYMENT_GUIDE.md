# MsmeBazaar v2.0 - Render Deployment Guide

## 🚀 Production Deployment to Render.com

This guide covers deploying MsmeBazaar v2.0 to Render with custom domain `vyapaarmitra.in`.

### 📋 Prerequisites

1. **GitHub Repository**: https://github.com/debnit/MsmeBazaar
2. **Render Account**: Sign up at https://render.com
3. **Domain Access**: Access to DNS settings for `vyapaarmitra.in`
4. **Environment Variables**: All required API keys and secrets

### 🔧 Step 1: Create Render Service

1. **Connect GitHub Repository**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub account
   - Select repository: `debnit/MsmeBazaar`
   - Select branch: `main` (or your deployment branch)

2. **Configure Service**:
   ```yaml
   Name: msmebazaar-v2
   Environment: Node
   Region: Oregon (US West)
   Branch: main
   Build Command: ./render-build.sh
   Start Command: npm start
   ```

### 🔐 Step 2: Set Environment Variables

Add these environment variables in Render Dashboard → Environment:

#### **🔒 Security & Authentication**
```bash
SECRET_KEY=your-super-secret-key-minimum-32-characters-here
JWT_SECRET=your-jwt-secret-key-for-token-signing-here
NEXTAUTH_SECRET=your-nextauth-secret-for-authentication
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data-here
```

#### **🗄️ Database Configuration**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```
*Note: DATABASE_URL will be auto-generated when you add PostgreSQL service*

#### **🤖 AI Services**
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-west1-gcp-free
PINECONE_INDEX_NAME=msmebazaar-vectors
```

#### **💳 Payment Integration**
```bash
RAZORPAY_KEY_ID=rzp_live_your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
```

#### **📧 Email Configuration**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@vyapaarmitra.in
```

#### **☁️ Cloud Storage (AWS S3)**
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=msmebazaar-uploads
```

#### **📊 Monitoring & Analytics**
```bash
SENTRY_DSN=your-sentry-dsn-for-error-tracking
GA_TRACKING_ID=G-XXXXXXXXXX
```

#### **🌍 Application Settings**
```bash
NODE_ENV=production
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=false
CORS_ORIGINS=https://vyapaarmitra.in,https://www.vyapaarmitra.in
CORS_ALLOW_CREDENTIALS=true
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,hi
DEFAULT_TIMEZONE=Asia/Kolkata
```

### 🗄️ Step 3: Add PostgreSQL Database

1. **Create PostgreSQL Service**:
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `msmebazaar-postgres`
   - Database Name: `msmebazaar_production`
   - User: `msmebazaar_user`
   - Plan: Starter ($7/month)

2. **Get Database URL**:
   - After creation, copy the "Internal Database URL"
   - Add it as `DATABASE_URL` environment variable in your web service

### 🔄 Step 4: Add Redis Cache (Optional)

1. **Create Redis Service**:
   - Go to Render Dashboard → New → Redis
   - Name: `msmebazaar-redis`
   - Plan: Starter ($7/month)

### 🌐 Step 5: Custom Domain Setup

#### **Add Domain in Render**:
1. Go to your web service → Settings → Custom Domains
2. Click "Add Custom Domain"
3. Enter: `vyapaarmitra.in`
4. Add another: `www.vyapaarmitra.in`

#### **Configure DNS Records**:
Add these records in your domain registrar's DNS settings:

```bash
# For root domain
Type: A
Name: @
Value: 216.24.57.1  # Render's IP (check current IP in dashboard)

# For www subdomain
Type: CNAME
Name: www
Value: vyapaarmitra.in

# Alternative CNAME approach (if A record doesn't work)
Type: CNAME
Name: @
Value: msmebazaar-v2.onrender.com

Type: CNAME
Name: www
Value: msmebazaar-v2.onrender.com
```

### 🚀 Step 6: Deploy

1. **Trigger Deployment**:
   - Push changes to your `main` branch
   - Or manually trigger deploy in Render Dashboard

2. **Monitor Build Process**:
   - Check build logs in Render Dashboard
   - Ensure `render-build.sh` executes successfully
   - Verify both client and server build complete

3. **Verify Health Check**:
   - Once deployed, check: `https://msmebazaar-v2.onrender.com/health`
   - Should return: `{"status": "ok", "timestamp": "...", "uptime": ..., "version": "1.0.0"}`

### ✅ Step 7: Post-Deployment Verification

#### **Test Application**:
1. **Domain Access**:
   - [ ] https://vyapaarmitra.in loads successfully
   - [ ] https://www.vyapaarmitra.in redirects properly
   - [ ] SSL certificate is active (🔒 in browser)

2. **Frontend Functionality**:
   - [ ] Landing page loads
   - [ ] Authentication works (login/register)
   - [ ] Dashboard pages load
   - [ ] All routes function properly
   - [ ] No console errors in browser

3. **Backend API**:
   - [ ] `/health` endpoint responds
   - [ ] `/api/*` endpoints work
   - [ ] Database connections active
   - [ ] File uploads work (if implemented)

4. **Features**:
   - [ ] User registration/login
   - [ ] MSME listing creation
   - [ ] Search functionality
   - [ ] Payment integration (if enabled)
   - [ ] AI features (if enabled)

### 🔧 Troubleshooting

#### **Common Issues**:

1. **Build Failures**:
   ```bash
   # Check build logs for:
   - Missing dependencies
   - TypeScript errors
   - Environment variable issues
   ```

2. **Database Connection**:
   ```bash
   # Verify DATABASE_URL format:
   postgresql://username:password@host:port/database
   ```

3. **Domain Issues**:
   ```bash
   # DNS propagation can take 24-48 hours
   # Use tools like: dig vyapaarmitra.in
   # Check DNS propagation: whatsmydns.net
   ```

4. **SSL Certificate**:
   ```bash
   # Render auto-provisions SSL
   # May take 10-15 minutes after DNS verification
   ```

### 📱 Step 8: Mobile Optimization

Ensure mobile responsiveness:
- [ ] Responsive design works on mobile
- [ ] Touch interactions function properly
- [ ] Page load times are acceptable

### 🔄 Step 9: Continuous Deployment

Set up automatic deployments:
1. **GitHub Integration**: Enabled by default
2. **Auto-Deploy**: Enabled for `main` branch
3. **Build Notifications**: Configure in Render settings

### 📊 Step 10: Monitoring Setup

1. **Application Monitoring**:
   - Set up Sentry for error tracking
   - Configure Google Analytics
   - Monitor performance metrics

2. **Infrastructure Monitoring**:
   - Use Render's built-in metrics
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure alerts for downtime

### 🎉 Success Checklist

- [ ] ✅ Application builds successfully
- [ ] ✅ Database connected and migrations run
- [ ] ✅ Environment variables configured
- [ ] ✅ Custom domain `vyapaarmitra.in` working
- [ ] ✅ SSL certificate active
- [ ] ✅ All features functional
- [ ] ✅ No console errors
- [ ] ✅ Mobile responsive
- [ ] ✅ Performance optimized
- [ ] ✅ Monitoring configured

### 🔗 Important URLs

- **Production Site**: https://vyapaarmitra.in
- **Render Service**: https://msmebazaar-v2.onrender.com
- **Health Check**: https://vyapaarmitra.in/health
- **API Base**: https://vyapaarmitra.in/api

---

## 🆘 Support

If you encounter issues during deployment:

1. Check Render build logs
2. Verify all environment variables
3. Test locally with production build
4. Check DNS propagation status
5. Contact Render support if needed

**Happy Deploying! 🚀**