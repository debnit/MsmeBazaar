# 🔐 MSMEBazaar V2 Secrets Setup Guide for Render

This guide helps you set up all the required environment variables and secrets for deploying MSMEBazaar V2 on Render.

## 📋 Quick Setup Checklist

### ✅ Phase 1: Essential Secrets (Required for deployment)
- [ ] **Twilio** - SMS/WhatsApp communication
- [ ] **OpenAI** - AI-powered features
- [ ] **Email SMTP** - User notifications

### ✅ Phase 2: Business Features (Required for full functionality)
- [ ] **Razorpay** - Payment processing
- [ ] **File Storage** - AWS S3 or MinIO

### ✅ Phase 3: Advanced Features (Optional)
- [ ] **Weaviate** - Vector database for AI
- [ ] **Elasticsearch** - Advanced search
- [ ] **Sentry** - Error monitoring

---

## 🔑 Critical Secrets Configuration

### 1. Twilio (SMS/WhatsApp) 📱
**Purpose**: User authentication, notifications, WhatsApp bot

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_from_twilio_console
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**How to get these:**
1. Sign up at [Twilio Console](https://console.twilio.com/)
2. Go to Account → Account Info for SID and Auth Token
3. Go to Phone Numbers to get/buy a phone number
4. Enable WhatsApp sandbox for testing

### 2. OpenAI (AI Features) 🤖
**Purpose**: AI-powered business valuations, document processing

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get this:**
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Go to API Keys section
3. Create a new secret key
4. **Important**: Add billing information to avoid rate limits

### 3. Email SMTP (Notifications) 📧
**Purpose**: User registration, password resets, notifications

```bash
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_business_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@msmebazaar.com
```

**Gmail App Password Setup:**
1. Enable 2-factor authentication on your Gmail
2. Go to Google Account → Security → App passwords
3. Generate an app password for "Mail"
4. Use this password (not your regular Gmail password)

---

## 💰 Payment Integration

### Razorpay (Payment Gateway) 💳
**Purpose**: Processing subscription payments, transaction fees

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
```

**How to get these:**
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate Test/Live keys based on your environment
4. **Note**: Start with test keys, switch to live for production

---

## ☁️ File Storage Configuration

### Option A: AWS S3 (Recommended) 🚀
**Purpose**: Storing user documents, business files, images

```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=msmebazaar-prod-documents
```

**Setup Steps:**
1. Create AWS account and go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user with programmatic access
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Create S3 bucket in `ap-south-1` region
5. Save the Access Key ID and Secret Access Key

### Option B: MinIO (Self-hosted Alternative) 🏠
**Purpose**: Self-hosted S3-compatible storage

```bash
MINIO_ENDPOINT=your-minio-server.com:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=msmebazaar-documents
```

**Setup Steps:**
1. Deploy MinIO on your server or use MinIO Cloud
2. Create a bucket named `msmebazaar-documents`
3. Set appropriate access policies
4. Get endpoint URL and credentials

---

## 🔍 Advanced Features (Optional)

### Weaviate (Vector Database) 🧠
**Purpose**: AI-powered document search, similarity matching

```bash
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your_weaviate_api_key
```

**Setup Steps:**
1. Sign up at [Weaviate Cloud](https://console.weaviate.cloud/)
2. Create a new cluster
3. Get the cluster URL and API key
4. **Alternative**: Self-host using Docker

### Elasticsearch (Search Engine) 🔍
**Purpose**: Advanced search capabilities, analytics

```bash
ELASTICSEARCH_URL=https://your-cluster.es.amazonaws.com
```

**Setup Options:**
1. **AWS Elasticsearch**: Use Amazon Elasticsearch Service
2. **Elastic Cloud**: Use official Elastic Cloud service
3. **Self-hosted**: Deploy on your own infrastructure

### Sentry (Error Monitoring) 🚨
**Purpose**: Real-time error tracking, performance monitoring

```bash
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
```

**Setup Steps:**
1. Sign up at [Sentry.io](https://sentry.io/)
2. Create a new project for "Python" (for APIs)
3. Get the DSN from project settings
4. **Tip**: Use same DSN for all services

---

## 🚀 Render Dashboard Setup

### Adding Secrets to Render:
1. Go to your service in Render Dashboard
2. Click on "Environment" tab
3. Add each secret as an environment variable
4. **Important**: Mark sensitive values as "Secret"

### Environment Variable Types:
- **🔓 Public**: Non-sensitive config (API_VERSION, LOG_LEVEL, etc.)
- **🔒 Secret**: Sensitive data (API keys, passwords, tokens)

### Service-Specific Setup:

#### For Auth API Service:
```bash
# Required secrets
TWILIO_ACCOUNT_SID=secret
TWILIO_AUTH_TOKEN=secret
TWILIO_PHONE_NUMBER=secret
TWILIO_WHATSAPP_NUMBER=secret
OPENAI_API_KEY=secret
SMTP_HOST=secret
SMTP_USER=secret
SMTP_PASSWORD=secret
SMTP_FROM_EMAIL=secret
AWS_ACCESS_KEY_ID=secret
AWS_SECRET_ACCESS_KEY=secret
S3_BUCKET_NAME=secret
RAZORPAY_KEY_ID=secret
RAZORPAY_KEY_SECRET=secret
```

#### For MSME API Service:
```bash
# Required secrets (same as Auth API plus)
WEAVIATE_URL=secret
WEAVIATE_API_KEY=secret
ELASTICSEARCH_URL=secret
SENTRY_DSN=secret
```

---

## 🧪 Testing Your Setup

### Verify Secrets Work:
1. **Twilio**: Send a test SMS from Twilio console
2. **OpenAI**: Make a test API call with your key
3. **Email**: Send a test email using SMTP settings
4. **Razorpay**: Create a test payment
5. **S3**: Upload a test file to your bucket

### Common Issues:
- **OpenAI quota exceeded**: Add billing information
- **Gmail app password**: Ensure 2FA is enabled
- **AWS permissions**: Check IAM policy includes S3 access
- **Twilio sandbox**: Verify phone numbers for testing

---

## 📚 Environment Variables Reference

### Auto-Generated by Render:
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JSON Web Token signing key (per service)

### Database Configuration (Auto-configured):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

### Production Settings (Pre-configured):
- `NODE_ENV=production`
- `FLASK_ENV=production`
- `LOG_LEVEL=WARNING`
- `DEBUG=false`

---

## 🔒 Security Best Practices

1. **Never commit secrets to code** - Always use environment variables
2. **Use different keys for test/production** - Separate environments
3. **Rotate keys regularly** - Update API keys periodically
4. **Monitor usage** - Set up billing alerts for paid services
5. **Least privilege access** - Give minimal required permissions

---

## 🆘 Troubleshooting

### Deployment Fails:
1. Check Render build logs for missing environment variables
2. Verify all required secrets are set as "Secret" type
3. Ensure no typos in environment variable names

### Service Not Working:
1. Check service logs in Render dashboard
2. Verify API keys are valid and not expired
3. Check service-specific quotas and limits

### Need Help?
1. Check the main `RENDER_DEPLOYMENT_GUIDE.md`
2. Review Render documentation
3. Check service provider documentation (Twilio, OpenAI, etc.)

---

**🎉 You're all set!** Once all secrets are configured, your MSMEBazaar V2 deployment should work seamlessly on Render.