# WhatsApp Bot Setup Guide

This guide will help you set up and deploy the MSMEBazaar WhatsApp bot for onboarding MSMEs.

## Prerequisites

### 1. System Requirements
- Python 3.11+
- Docker & Docker Compose
- Redis server
- Active internet connection
- Domain/subdomain for webhook (production)

### 2. Twilio Account Setup
- Active Twilio account with WhatsApp API access
- WhatsApp Business API approval (for production)
- Twilio sandbox access (for development)

### 3. MSMEBazaar Services
- Auth API service running and accessible
- Redis server for session management
- Web application for user redirection

## Step 1: Twilio Configuration

### 1.1 Create Twilio Account
1. Sign up at [twilio.com](https://twilio.com)
2. Verify your phone number
3. Navigate to Console Dashboard

### 1.2 Get Account Credentials
```bash
# From Twilio Console > Settings > General
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

### 1.3 WhatsApp Sandbox Setup (Development)
1. Go to **Console > Develop > Messaging > Try it out > Send a WhatsApp message**
2. Follow the instructions to join the sandbox
3. Note the sandbox number: `whatsapp:+14155238886`
4. Test by sending "join [sandbox-name]" to the sandbox number

### 1.4 WhatsApp Business API (Production)
1. Apply for WhatsApp Business API access
2. Complete business verification process
3. Get your approved WhatsApp Business number
4. Configure message templates if needed

## Step 2: Environment Configuration

### 2.1 Copy Environment Template
```bash
cd msmebazaar-v2/apps/whatsapp-bot
cp .env.example .env
```

### 2.2 Configure Environment Variables
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Service URLs
AUTH_API_URL=http://localhost:8001
WEB_APP_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=false
LOG_LEVEL=INFO
```

### 2.3 Production Environment
```env
# Production URLs
AUTH_API_URL=https://api.msmebazaar.com
WEB_APP_URL=https://app.msmebazaar.com
REDIS_URL=redis://your-redis-server:6379

# Security
FLASK_ENV=production
FLASK_DEBUG=false
LOG_LEVEL=WARNING
```

## Step 3: Local Development Setup

### 3.1 Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 3.2 Start Redis Server
```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or using local Redis
redis-server
```

### 3.3 Start Auth API
```bash
# Make sure auth API is running on port 8001
cd ../auth-api
python main.py
```

### 3.4 Run WhatsApp Bot
```bash
# Development mode
python main.py

# Production mode with Gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 2 main:app
```

### 3.5 Test Local Setup
```bash
# Health check
curl http://localhost:5000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00",
  "services": {
    "redis": "healthy",
    "auth_service": "healthy"
  }
}
```

## Step 4: Webhook Configuration

### 4.1 Development Webhook (ngrok)
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 5000

# Use the HTTPS URL for webhook
# Example: https://abc123.ngrok.io/webhook
```

### 4.2 Production Webhook
```bash
# Your production webhook URL
https://your-domain.com/webhook

# SSL certificate required
# Use Let's Encrypt or your SSL provider
```

### 4.3 Configure Twilio Webhook
1. Go to **Console > Develop > Messaging > Settings > WhatsApp sandbox settings**
2. Set **Webhook URL**: `https://your-domain.com/webhook`
3. Set **HTTP Method**: `POST`
4. Save configuration

### 4.4 Test Webhook
```bash
# Send test message to your WhatsApp sandbox
# Check bot logs for incoming messages
docker logs -f whatsapp-bot
```

## Step 5: Docker Deployment

### 5.1 Build Docker Image
```bash
# Build image
docker build -t whatsapp-bot .

# Or use deployment script
./deploy.sh
```

### 5.2 Run with Docker Compose
```bash
# From project root
cd ../../devops
docker-compose up -d whatsapp-bot
```

### 5.3 Verify Deployment
```bash
# Check container status
docker ps | grep whatsapp-bot

# Check logs
docker logs -f whatsapp-bot

# Health check
curl http://localhost:5000/health
```

## Step 6: Production Deployment

### 6.1 Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### 6.2 SSL Certificate
```bash
# Using Let's Encrypt
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure reverse proxy (nginx/apache)
```

### 6.3 Deploy to Production
```bash
# Clone repository
git clone https://github.com/your-org/msmebazaar-v2.git
cd msmebazaar-v2/apps/whatsapp-bot

# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy
./deploy.sh
```

### 6.4 Process Management
```bash
# Using systemd service
sudo tee /etc/systemd/system/whatsapp-bot.service > /dev/null <<EOF
[Unit]
Description=MSMEBazaar WhatsApp Bot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start whatsapp-bot
ExecStop=/usr/bin/docker stop whatsapp-bot
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable whatsapp-bot
sudo systemctl start whatsapp-bot
```

## Step 7: Monitoring & Maintenance

### 7.1 Health Monitoring
```bash
# Health check endpoint
curl https://your-domain.com/health

# Statistics endpoint
curl https://your-domain.com/stats

# Set up monitoring alerts
# Use tools like Prometheus, Grafana, or Uptime Robot
```

### 7.2 Log Management
```bash
# View logs
docker logs -f whatsapp-bot

# Log rotation
docker run --log-driver=json-file --log-opt max-size=10m --log-opt max-file=3 whatsapp-bot

# Centralized logging
# Use ELK stack or similar
```

### 7.3 Backup & Recovery
```bash
# Backup Redis data
docker exec redis redis-cli BGSAVE

# Backup configuration
tar -czf whatsapp-bot-backup.tar.gz .env docker-compose.yml

# Recovery procedure
# 1. Restore configuration files
# 2. Restore Redis data
# 3. Restart services
```

## Step 8: Testing & Validation

### 8.1 Unit Tests
```bash
# Run all tests
python -m pytest test_bot.py -v

# Run specific test
python -m pytest test_bot.py::TestWhatsAppBot::test_phone_validation -v

# Coverage report
python -m pytest --cov=main test_bot.py
```

### 8.2 Integration Tests
```bash
# Test webhook endpoint
curl -X POST http://localhost:5000/webhook \
  -d "From=whatsapp:+919876543210" \
  -d "Body=Hello"

# Test health endpoint
curl http://localhost:5000/health

# Test stats endpoint
curl http://localhost:5000/stats
```

### 8.3 End-to-End Testing
1. Send "Hi" to WhatsApp sandbox number
2. Follow the onboarding flow
3. Verify data is stored in Redis
4. Check auth API receives OTP request
5. Verify user redirection to web app

## Step 9: Troubleshooting

### 9.1 Common Issues

#### Webhook Not Receiving Messages
```bash
# Check Twilio webhook configuration
# Verify HTTPS endpoint is accessible
# Check firewall settings
# Verify SSL certificate

# Debug webhook
ngrok http 5000
# Use ngrok URL in Twilio console
```

#### Redis Connection Failed
```bash
# Check Redis server status
redis-cli ping

# Check connection string
echo $REDIS_URL

# Verify network connectivity
telnet redis-host 6379
```

#### Auth API Integration Failed
```bash
# Check auth API health
curl http://localhost:8001/health

# Verify network connectivity
ping auth-api-host

# Check environment variables
echo $AUTH_API_URL
```

### 9.2 Debug Mode
```bash
# Enable debug logging
export FLASK_DEBUG=true
export LOG_LEVEL=DEBUG

# Run with debug
python main.py
```

### 9.3 Performance Issues
```bash
# Check container resources
docker stats whatsapp-bot

# Monitor Redis memory usage
redis-cli info memory

# Scale horizontally
docker-compose up --scale whatsapp-bot=3
```

## Step 10: Security Considerations

### 10.1 Environment Security
```bash
# Secure environment variables
chmod 600 .env

# Use secrets management
# Docker secrets, Kubernetes secrets, or HashiCorp Vault
```

### 10.2 Network Security
```bash
# Firewall configuration
sudo ufw allow 5000/tcp
sudo ufw allow 443/tcp
sudo ufw deny 6379/tcp  # Redis should not be public

# Use VPN or private networks for internal communication
```

### 10.3 Data Protection
```bash
# Encrypt Redis data at rest
# Use Redis AUTH
# Regular security updates
# Monitor for vulnerabilities
```

## Step 11: Scaling & Performance

### 11.1 Horizontal Scaling
```bash
# Load balancer configuration
# Multiple bot instances
# Shared Redis cluster
# Session affinity considerations
```

### 11.2 Performance Optimization
```bash
# Redis connection pooling
# Async message processing
# Caching strategies
# Database optimization
```

## Support & Resources

### Documentation
- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Redis Documentation](https://redis.io/documentation)

### Community
- MSMEBazaar Discord/Slack
- GitHub Issues
- Stack Overflow

### Professional Support
- Email: support@msmebazaar.com
- Phone: +91-XXXXXXXXXX
- Business Hours: Mon-Fri 9AM-6PM IST

---

**Note**: This setup guide assumes you have basic knowledge of Docker, Linux, and web development. For production deployments, consider hiring a DevOps engineer or using managed services.