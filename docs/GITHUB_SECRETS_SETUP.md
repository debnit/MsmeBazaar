# GitHub Secrets Setup Guide for VyapaarMitra CI/CD

This guide helps you configure the GitHub repository secrets required for the VyapaarMitra CI/CD pipeline.

## 🔐 Required Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 🌐 **Kubernetes/Cloud Platform Secrets**

#### **For Google Kubernetes Engine (GKE)**
```bash
# Required for GKE deployment
GKE_CREDENTIALS_JSON     # Service account JSON key (base64 encoded)
GKE_PROJECT_ID          # Google Cloud project ID
GKE_CLUSTER_NAME        # GKE cluster name
GKE_CLUSTER_ZONE        # GKE cluster zone (e.g., us-central1-a)
```

**How to get GKE credentials:**
```bash
# Create service account
gcloud iam service-accounts create vyapaarmitra-ci \
  --display-name "VyapaarMitra CI/CD"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vyapaarmitra-ci@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vyapaarmitra-ci@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create vyapaarmitra-key.json \
  --iam-account=vyapaarmitra-ci@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Base64 encode for GitHub secret
base64 -i vyapaarmitra-key.json -o vyapaarmitra-key-base64.txt
```

#### **For Amazon EKS**
```bash
AWS_ACCESS_KEY_ID       # AWS access key
AWS_SECRET_ACCESS_KEY   # AWS secret key
AWS_REGION             # AWS region (e.g., us-east-1)
EKS_CLUSTER_NAME       # EKS cluster name
```

#### **For Generic Kubernetes**
```bash
KUBECONFIG_DATA        # Base64 encoded kubeconfig file
KUBERNETES_NAMESPACE   # Target namespace (default: vyapaarmitra)
```

### 🚂 **Railway Platform Secrets**
```bash
RAILWAY_TOKEN          # Railway API token
```

**How to get Railway token:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and get token
railway login
railway whoami --json | jq -r .token
```

### 📡 **Notification Secrets**

#### **Slack Integration**
```bash
SLACK_WEBHOOK_URL      # Slack incoming webhook URL
```

**Setup Slack webhook:**
1. Go to [Slack API](https://api.slack.com/apps)
2. Create new app → From scratch
3. Add Incoming Webhooks feature
4. Create webhook for #deployments channel
5. Copy webhook URL

#### **Discord Integration**
```bash
DISCORD_WEBHOOK_URL    # Discord webhook URL
```

**Setup Discord webhook:**
1. Go to Discord server → Channel settings → Integrations
2. Create webhook
3. Copy webhook URL

### 📧 **Email Notifications**
```bash
SENDGRID_API_KEY      # SendGrid API key for email notifications
```

### 🗄️ **Database and External Services**

#### **Production Database**
```bash
DATABASE_URL          # Production PostgreSQL connection string
POSTGRES_PASSWORD     # PostgreSQL password
REDIS_URL            # Production Redis connection string
REDIS_PASSWORD       # Redis password
```

#### **Authentication & Security**
```bash
JWT_SECRET           # JWT signing secret (generate with: openssl rand -hex 32)
NEXTAUTH_SECRET      # NextAuth.js secret (generate with: openssl rand -hex 32)
ADMIN_SECRET_KEY     # Admin panel secret key
SESSION_SECRET       # Session encryption secret
```

#### **External Service APIs**
```bash
# SMS/Communication
TWILIO_ACCOUNT_SID   # Twilio account SID
TWILIO_AUTH_TOKEN    # Twilio auth token

# Email
SENDGRID_API_KEY     # SendGrid API key

# Cloud Storage
AWS_ACCESS_KEY_ID    # AWS S3 access key
AWS_SECRET_ACCESS_KEY # AWS S3 secret key
AWS_BUCKET_NAME      # S3 bucket name (e.g., vyapaarmitra-prod)

# Monitoring
SENTRY_DSN          # Sentry error tracking DSN
NEW_RELIC_LICENSE_KEY # New Relic license key (optional)

# Payments
RAZORPAY_KEY_ID     # Razorpay key ID
RAZORPAY_KEY_SECRET # Razorpay key secret

# Google Services
GOOGLE_CLIENT_ID     # Google OAuth client ID
GOOGLE_CLIENT_SECRET # Google OAuth client secret
GOOGLE_ANALYTICS_ID  # Google Analytics ID
GOOGLE_CREDENTIALS_JSON # Google service account JSON (for Sheets sync)
GOOGLE_SPREADSHEET_ID   # Google Sheets ID for analytics
GOOGLE_DRIVE_FOLDER_ID  # Google Drive folder ID
```

### 🔧 **Additional Configuration**
```bash
# Backup settings
AWS_BACKUP_BUCKET    # S3 bucket for backups
BACKUP_RETENTION_DAYS # Backup retention period (default: 30)

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN   # Telegram bot token
TELEGRAM_CHAT_ID     # Telegram chat ID for notifications

# Performance monitoring
HEALTH_CHECK_TIMEOUT # Health check timeout in seconds (default: 300)
```

## 🚀 **Environment-Specific Secrets**

### **Production Environment**
Create the following environment in GitHub: `production`

```bash
# Add these to the production environment
DATABASE_URL_PROD    # Production database URL
REDIS_URL_PROD      # Production Redis URL
API_BASE_URL        # https://api.vyapaarmitra.in
WEB_URL            # https://vyapaarmitra.in
```

### **Staging Environment**
Create the following environment in GitHub: `staging`

```bash
# Add these to the staging environment
DATABASE_URL_STAGING # Staging database URL
REDIS_URL_STAGING   # Staging Redis URL
API_BASE_URL        # https://api-staging.vyapaarmitra.in
WEB_URL            # https://staging.vyapaarmitra.in
```

## 📝 **Secret Generation Commands**

Use these commands to generate secure secrets:

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate NextAuth secret
openssl rand -base64 32

# Generate admin secret
openssl rand -hex 24

# Generate session secret
openssl rand -base64 48

# Generate database password
openssl rand -base64 16

# Generate Redis password
openssl rand -hex 16
```

## 🔍 **Secret Validation**

You can validate your secrets setup using this checklist:

### **Required for Basic Deployment**
- [ ] `DATABASE_URL` - Database connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `NEXTAUTH_SECRET` - NextAuth.js secret

### **Required for Kubernetes Deployment**
- [ ] `GKE_CREDENTIALS_JSON` or `KUBECONFIG_DATA`
- [ ] `GKE_PROJECT_ID` and `GKE_CLUSTER_NAME` (for GKE)

### **Required for Railway Deployment**
- [ ] `RAILWAY_TOKEN`

### **Optional but Recommended**
- [ ] `SLACK_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL`
- [ ] `SENTRY_DSN`
- [ ] `SENDGRID_API_KEY`
- [ ] `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

## 🧪 **Testing Secret Configuration**

Add this step to your workflow to validate secrets:

```yaml
- name: Validate Secrets
  run: |
    echo "Checking required secrets..."
    [[ -n "${{ secrets.DATABASE_URL }}" ]] || { echo "DATABASE_URL missing"; exit 1; }
    [[ -n "${{ secrets.JWT_SECRET }}" ]] || { echo "JWT_SECRET missing"; exit 1; }
    [[ -n "${{ secrets.NEXTAUTH_SECRET }}" ]] || { echo "NEXTAUTH_SECRET missing"; exit 1; }
    echo "✅ All required secrets are configured"
```

## 🔒 **Security Best Practices**

1. **Rotate secrets regularly** (every 90 days)
2. **Use separate secrets for staging and production**
3. **Never commit secrets to code**
4. **Use environment-specific secrets when possible**
5. **Audit secret access regularly**
6. **Use least-privilege access for service accounts**

## 🆘 **Troubleshooting**

### **Common Issues**

**Secret not found error:**
```bash
Error: Secret "DATABASE_URL" not found
```
**Solution:** Ensure the secret is added to the correct repository and environment.

**Invalid base64 encoding:**
```bash
Error: illegal base64 data at input byte
```
**Solution:** Re-encode your secret using `base64 -w 0` on Linux or `base64` on macOS.

**Kubernetes authentication failed:**
```bash
Error: Unauthorized
```
**Solution:** Verify your kubeconfig or service account has the correct permissions.

### **Secret Testing Script**

Save this as `scripts/test-secrets.sh`:

```bash
#!/bin/bash
# Test if all required secrets are available

required_secrets=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
)

optional_secrets=(
    "SLACK_WEBHOOK_URL"
    "DISCORD_WEBHOOK_URL"
    "SENTRY_DSN"
    "AWS_ACCESS_KEY_ID"
)

echo "Testing required secrets..."
for secret in "${required_secrets[@]}"; do
    if [[ -n "${!secret}" ]]; then
        echo "✅ $secret is configured"
    else
        echo "❌ $secret is missing"
        exit 1
    fi
done

echo "Testing optional secrets..."
for secret in "${optional_secrets[@]}"; do
    if [[ -n "${!secret}" ]]; then
        echo "✅ $secret is configured"
    else
        echo "⚠️  $secret is not configured (optional)"
    fi
done

echo "🎉 Secret validation completed!"
```

## 📞 **Support**

If you need help with secret configuration:
- Check GitHub [documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- Review the [VyapaarMitra deployment guide](./VYAPAARMITRA_DEPLOYMENT_GUIDE.md)
- Contact the team at tech@vyapaarmitra.in