# MSMEBazaar Deployment Guide

## Quick Start Deployment

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/msme_db
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=production
SERVICE_NAME=msmebazaar-api
APP_VERSION=1.0.0
LOG_LEVEL=INFO

# CORS (adjust for your domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies
cd ..
npm install

# Fix remaining security vulnerabilities
npm audit fix --force
```

### 3. Database Setup

```bash
# Create database
createdb msme_db

# Run migrations (if available)
npm run db:push
```

### 4. Redis Setup

```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
```

### 5. Start Services

#### Development Mode
```bash
# Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (new terminal)
npm run dev
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### 6. Verify Deployment

Check these endpoints:
- Health Check: `http://localhost:8000/health`
- Metrics: `http://localhost:8000/metrics`  
- Admin Health: `http://localhost:8000/api/admin/health`
- API Docs: `http://localhost:8000/docs` (dev only)

## Docker Deployment

### Build and Run
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Monitoring Setup

### 1. Sentry Configuration
1. Create account at https://sentry.io
2. Create new project
3. Copy DSN to environment variables
4. Verify errors are being tracked

### 2. Prometheus + Grafana (Optional)
```bash
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./microservices/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Security Checklist

- [ ] JWT_SECRET changed from default
- [ ] Database credentials secured
- [ ] CORS origins configured for production
- [ ] SSL/HTTPS certificates installed
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] Input validation tested

## Performance Optimization

### Redis Configuration
```bash
# Increase memory limit
echo "maxmemory 1gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
sudo systemctl restart redis-server
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_msme_listings_status ON msme_listings(status);
CREATE INDEX IF NOT EXISTS idx_msme_listings_created_at ON msme_listings(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
- Check DATABASE_URL format
- Verify database exists
- Test connection manually: `psql $DATABASE_URL`

#### 2. Redis Connection Failed
- Check if Redis is running: `sudo systemctl status redis-server`
- Test connection: `redis-cli ping`
- Check REDIS_URL format

#### 3. Authentication Issues
- Verify JWT_SECRET is set
- Check token expiration settings
- Test with sample JWT token

#### 4. CORS Errors
- Update ALLOWED_ORIGINS in environment
- Check browser network tab for OPTIONS requests
- Verify frontend URL matches allowed origins

### Logs Location
- Backend: `/app/logs/` (in Docker) or `./logs/`
- Frontend: Browser console and server logs
- System: `docker-compose logs -f service-name`

### Performance Monitoring
- Prometheus metrics: `http://localhost:9090`
- Application health: `/health` endpoint
- Cache stats: Redis CLI `INFO`

## Production Deployment

### Additional Requirements
1. Load balancer (Nginx/HAProxy)
2. Process manager (PM2/systemd)
3. SSL certificates (Let's Encrypt)
4. Backup strategy
5. Log aggregation (ELK/Loki)
6. Alerting (PagerDuty/Slack)

### Scaling Considerations
- Database read replicas
- Redis clustering
- Container orchestration (Kubernetes)
- CDN for static assets
- Horizontal pod autoscaling

For production deployment, consider using the provided Kubernetes manifests in the `k8s/` directory.