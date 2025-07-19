# Railway Deployment Guide for MSMEBazaar

## Prerequisites

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

## Deploy with Railway CLI

### Option 1: One-Click Deployment
```bash
# Clone and deploy entire project
railway up
```

### Option 2: Service-by-Service Deployment

#### 1. Create Railway Project
```bash
railway init msmebazaar-v3
cd msmebazaar-v3
```

#### 2. Add PostgreSQL Plugin
```bash
railway add postgresql
```

#### 3. Add Redis Plugin
```bash
railway add redis
```

#### 4. Deploy Backend APIs

**Auth API:**
```bash
railway service create auth-api
railway link
cd msmebazaar-v2/apps/auth-api
railway up
```

**MSME API:**
```bash
railway service create msme-api
railway link
cd msmebazaar-v2/apps/msme-api
railway up
```

**Valuation API:**
```bash
railway service create valuation-api
railway link
cd msmebazaar-v2/apps/valuation-api
railway up
```

#### 5. Deploy Frontend Apps

**Web Frontend:**
```bash
railway service create web
railway link
cd msmebazaar-v2/apps/web
railway up
```

**Admin Dashboard:**
```bash
railway service create admin-dashboard
railway link
cd admin-dashboard/backend
railway up
```

## Environment Variables Setup

Railway will automatically inject database and Redis connection strings. Set these additional variables:

### Auth API Environment Variables
```bash
railway variables set JWT_SECRET=your_jwt_secret_here
railway variables set JWT_ALGORITHM=HS256
railway variables set JWT_EXPIRATION_HOURS=24
railway variables set OTP_EXPIRATION_MINUTES=5
railway variables set TWILIO_ACCOUNT_SID=your_twilio_sid
railway variables set TWILIO_AUTH_TOKEN=your_twilio_token
railway variables set TWILIO_PHONE_NUMBER=your_twilio_phone
railway variables set SENDGRID_API_KEY=your_sendgrid_key
railway variables set SENDGRID_FROM_EMAIL=noreply@msmebazaar.com
railway variables set SENTRY_DSN=your_sentry_dsn
```

### MSME API Environment Variables
```bash
railway variables set JWT_SECRET=your_jwt_secret_here
railway variables set AWS_ACCESS_KEY_ID=your_aws_access_key
railway variables set AWS_SECRET_ACCESS_KEY=your_aws_secret_key
railway variables set AWS_BUCKET_NAME=msmebazaar-uploads
railway variables set AWS_REGION=us-east-1
railway variables set SENTRY_DSN=your_sentry_dsn
```

### Web Frontend Environment Variables
```bash
railway variables set NEXTAUTH_URL=https://your-web-app.railway.app
railway variables set NEXTAUTH_SECRET=your_nextauth_secret
railway variables set AUTH_API_URL=https://your-auth-api.railway.app
railway variables set MSME_API_URL=https://your-msme-api.railway.app
railway variables set VALUATION_API_URL=https://your-valuation-api.railway.app
```

### Admin Dashboard Environment Variables
```bash
railway variables set JWT_SECRET=your_jwt_secret_here
railway variables set ADMIN_SECRET_KEY=your_admin_secret
railway variables set NODE_ENV=production
```

## Health Check Endpoints

Each service includes health check endpoints:

- **Auth API**: `GET /healthz`
- **MSME API**: `GET /healthz` 
- **Valuation API**: `GET /healthz`
- **Web Frontend**: `GET /api/health`
- **Admin Dashboard**: `GET /api/health`

## Custom Domain Setup

1. **Purchase domain** (e.g., msmebazaar.com)

2. **Set up subdomains**:
   - `api.msmebazaar.com` → Auth API
   - `msme.msmebazaar.com` → MSME API  
   - `valuation.msmebazaar.com` → Valuation API
   - `app.msmebazaar.com` → Web Frontend
   - `admin.msmebazaar.com` → Admin Dashboard

3. **Configure in Railway**:
```bash
railway domain add api.msmebazaar.com
railway domain add msme.msmebazaar.com
railway domain add valuation.msmebazaar.com
railway domain add app.msmebazaar.com
railway domain add admin.msmebazaar.com
```

## Monitoring & Logs

```bash
# View logs for specific service
railway logs --service auth-api

# Monitor all services
railway status

# View metrics
railway metrics
```

## Scaling

```bash
# Scale specific service
railway scale --service auth-api --replicas 2

# Auto-scale based on CPU/Memory
railway autoscale enable --service auth-api
```

## Backup & Recovery

Railway automatically backs up PostgreSQL. To create manual backup:

```bash
railway backup create --service postgresql
```

## Troubleshooting

### Common Issues:

1. **Build failures**: Check build logs with `railway logs --build`
2. **Port conflicts**: Ensure apps listen on `$PORT` environment variable
3. **Database connections**: Use Railway-provided `DATABASE_URL` 
4. **CORS errors**: Configure allowed origins in FastAPI apps
5. **Memory limits**: Upgrade Railway plan or optimize app memory usage

### Debug Commands:
```bash
# Check service status
railway status

# View environment variables
railway variables

# Connect to database
railway connect postgresql

# Connect to Redis
railway connect redis
```

## Cost Optimization

1. **Use Hobby plan** for development/staging
2. **Pro plan** for production with higher resource needs
3. **Enable sleep mode** for non-critical services
4. **Use shared Redis** for multiple services
5. **Optimize Docker images** to reduce build times

## Security Best Practices

1. **Use Railway secrets** for sensitive environment variables
2. **Enable HTTPS** (automatic with Railway domains)
3. **Set up IP allowlists** for admin services
4. **Regular security updates** via automated deployments
5. **Monitor logs** for suspicious activity

## Production Checklist

- [ ] All environment variables configured
- [ ] Health checks passing
- [ ] Custom domains configured with SSL
- [ ] Database and Redis properly connected
- [ ] File uploads configured (S3/CloudFlare)
- [ ] Email service configured (SendGrid)
- [ ] SMS service configured (Twilio)
- [ ] Error monitoring configured (Sentry)
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Security audit completed