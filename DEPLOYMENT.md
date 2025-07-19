# MSMEBazaar v2.0 - Deployment Guide

This guide covers deploying the MSMEBazaar recommendation system across multiple platforms: Kubernetes, Render, and Railway.

## 🚀 Quick Start

Choose your preferred deployment platform:

### GitHub Actions (Kubernetes) - Recommended for Production
```bash
# Push to main branch triggers production deployment
git push origin main

# Or trigger manual deployment
gh workflow run deploy-recommendation-system.yml -f environment=production
```

### Render Platform
```bash
# Set your Render API key
export RENDER_API_KEY="your_render_api_key"

# Deploy to Render
./scripts/deploy-render.sh deploy
```

### Railway Platform
```bash
# Set your Railway token (optional)
export RAILWAY_TOKEN="your_railway_token"

# Deploy to Railway
./scripts/deploy-railway.sh deploy
```

## 📋 Prerequisites

### General Requirements
- **Node.js** 18+ (for frontend)
- **Python** 3.9+ (for ML services)
- **PostgreSQL** 15+ (database)
- **Redis** 7+ (caching)
- **Docker** (for containerized deployments)

### Platform-Specific Requirements

#### Kubernetes
- `kubectl` CLI tool
- Access to a Kubernetes cluster (GKE, EKS, AKS, etc.)
- `helm` (optional, for package management)

#### Render
- Render account
- Render CLI (`npm install -g @render/cli`)
- API key from Render dashboard

#### Railway
- Railway account
- Railway CLI (`npm install -g @railway/cli`)
- Railway token (optional for browserless login)

## 🔧 Configuration

### Environment Variables

Create the following secrets in your deployment platform:

#### Database Configuration
```env
POSTGRES_HOST=your_postgres_host
POSTGRES_PORT=5432
POSTGRES_DB=msmebazaar
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
```

#### Cache Configuration
```env
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

#### ML Configuration
```env
MLFLOW_TRACKING_URI=https://your-mlflow-server.com
```

#### Application Configuration
```env
ENVIRONMENT=production
SECRET_KEY=your_secret_key
```

### Service URLs
Update these based on your deployment:

```env
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_ML_MONITORING_URL=https://your-ml-monitoring.com
REACT_APP_TRANSACTION_MATCHING_URL=https://your-matching-service.com
```

## 🏗️ Platform-Specific Deployment

### 1. Kubernetes Deployment

#### GitHub Actions (Automated)

1. **Setup Secrets** in your GitHub repository:
   ```
   KUBE_CONFIG_STAGING        # Base64 encoded kubeconfig for staging
   KUBE_CONFIG_PRODUCTION     # Base64 encoded kubeconfig for production
   POSTGRES_PASSWORD          # Database password
   REDIS_PASSWORD            # Redis password
   SLACK_WEBHOOK            # Slack notifications (optional)
   ```

2. **Deploy via Push**:
   ```bash
   # Deploy to staging
   git push origin develop
   
   # Deploy to production
   git push origin main
   ```

3. **Manual Deployment**:
   ```bash
   # Trigger workflow manually
   gh workflow run deploy-recommendation-system.yml \
     -f environment=production \
     -f force_rebuild=true
   ```

#### Manual Kubernetes Deployment

1. **Apply Manifests**:
   ```bash
   # Deploy to staging
   kubectl apply -f k8s/staging/
   
   # Deploy to production
   kubectl apply -f k8s/production/
   ```

2. **Monitor Deployment**:
   ```bash
   kubectl get pods -n msmebazaar-prod
   kubectl logs -f deployment/recommendation-service -n msmebazaar-prod
   ```

### 2. Render Deployment

#### Using Render CLI

1. **Install and Setup**:
   ```bash
   npm install -g @render/cli
   export RENDER_API_KEY="your_api_key"
   ```

2. **Deploy**:
   ```bash
   ./scripts/deploy-render.sh deploy
   ```

3. **Monitor**:
   ```bash
   ./scripts/deploy-render.sh status
   ./scripts/deploy-render.sh logs recommendation-service
   ```

#### Using render.yaml

1. **Connect Repository** to Render dashboard
2. **Configure Environment Variables** in Render UI
3. **Deploy** automatically on git push

### 3. Railway Deployment

#### Using Railway CLI

1. **Install and Setup**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy**:
   ```bash
   ./scripts/deploy-railway.sh deploy
   ```

3. **Monitor**:
   ```bash
   ./scripts/deploy-railway.sh status
   ./scripts/deploy-railway.sh health
   ```

#### Individual Service Deployment

Deploy services separately:

```bash
# Deploy recommendation service
cd microservices/recommendation-service
railway up

# Deploy ML monitoring service
cd microservices/ml-monitoring-service
railway up

# Deploy transaction matching service
cd microservices/transaction-matching-service
railway up

# Deploy frontend
cd frontend
railway up
```

## 🗄️ Database Setup

### Automatic Schema Migration

All deployment scripts include automatic database schema setup. The following tables will be created:

- `user_feedback` - User interaction tracking
- `user_preferences` - User recommendation preferences
- `recommendation_history` - Past recommendations
- `model_training_data` - ML model training data
- `recommendation_metrics` - Performance analytics

### Manual Database Setup

If automatic setup fails:

```bash
# Connect to your database
psql postgres://username:password@host:port/database

# Run schema files
\i infrastructure/database/transaction_matching_schema.sql
\i infrastructure/database/user_feedback_schema.sql
```

## 📊 Monitoring and Observability

### Health Checks

All services expose health check endpoints:

- **Recommendation Service**: `/api/recommendation_stats`
- **ML Monitoring Service**: `/api/models/status`
- **Transaction Matching**: `/api/matching_stats`

### Metrics

Prometheus metrics are available at `/metrics` on each service:

- Request latency and throughput
- ML model performance
- User feedback rates
- Cache hit rates

### Logging

Structured JSON logs are available through platform log aggregation:

```bash
# Kubernetes
kubectl logs -f deployment/recommendation-service -n msmebazaar-prod

# Render
render logs recommendation-service --follow

# Railway
railway logs --service recommendation-service --follow
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/deploy-recommendation-system.yml` provides:

1. **Automated Testing**: Python tests, linting, security scans
2. **Multi-Platform Builds**: Docker images for AMD64 and ARM64
3. **Environment-Specific Deployments**: Staging and production
4. **Health Checks**: Post-deployment verification
5. **Notifications**: Slack integration for deployment status

### Deployment Stages

1. **Test** 🧪
   - Unit tests
   - Integration tests
   - Security scans
   - Code quality checks

2. **Build** 🏗️
   - Docker image creation
   - Multi-platform builds
   - Image registry push

3. **Deploy** 🚀
   - Environment-specific deployment
   - Database migrations
   - Health checks

4. **Verify** ✅
   - Service health validation
   - Smoke tests
   - Performance checks

## 🛠️ Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check logs
kubectl logs deployment/recommendation-service -n msmebazaar-prod

# Check resource limits
kubectl describe pod <pod-name> -n msmebazaar-prod
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/recommendation-service -n msmebazaar-prod -- \
  python -c "import asyncpg; print('Database accessible')"
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
kubectl exec -it deployment/recommendation-service -n msmebazaar-prod -- \
  python -c "import redis; r=redis.Redis(host='redis-main'); print(r.ping())"
```

### Performance Issues

#### High Memory Usage
- Increase memory limits in Kubernetes manifests
- Optimize ML model sizes
- Implement model caching strategies

#### Slow Response Times
- Check database query performance
- Optimize Redis caching
- Scale service replicas

### Deployment Failures

#### GitHub Actions Failures
```bash
# View workflow logs
gh run list --workflow=deploy-recommendation-system.yml
gh run view <run-id>
```

#### Kubernetes Deployment Issues
```bash
# Check deployment status
kubectl rollout status deployment/recommendation-service -n msmebazaar-prod

# Rollback if needed
kubectl rollout undo deployment/recommendation-service -n msmebazaar-prod
```

## 📈 Scaling

### Kubernetes Autoscaling

Horizontal Pod Autoscaler (HPA) is configured for:

- **Recommendation Service**: 2-20 replicas (CPU: 70%, Memory: 80%)
- **Transaction Matching**: 2-16 replicas (CPU: 70%, Memory: 80%)
- **ML Monitoring**: 1-6 replicas (CPU: 70%, Memory: 80%)

### Manual Scaling

```bash
# Scale recommendation service
kubectl scale deployment/recommendation-service --replicas=10 -n msmebazaar-prod

# Scale transaction matching
kubectl scale deployment/transaction-matching-service --replicas=8 -n msmebazaar-prod
```

### Platform-Specific Scaling

#### Render
- Configure auto-scaling in service settings
- Monitor resource usage in dashboard

#### Railway
- Adjust service resources via CLI:
  ```bash
  railway service --memory 2048 --cpu 1000
  ```

## 🔒 Security

### Environment Variables
- Never commit secrets to repository
- Use platform secret management
- Rotate credentials regularly

### Network Security
- All services use HTTPS
- Database connections are encrypted
- Redis connections use authentication

### Access Control
- Kubernetes RBAC is configured
- Service accounts have minimal permissions
- Network policies restrict inter-service communication

## 🚀 Production Readiness

### Checklist

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificates configured
- [ ] Monitoring and alerting setup
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Performance testing completed
- [ ] Security review passed

### Backup Strategy

#### Database Backups
- Automated daily backups
- Point-in-time recovery enabled
- Cross-region backup replication

#### Model Artifacts
- MLflow artifacts stored in S3
- Model versioning enabled
- Automated model backup to cold storage

## 📞 Support

### Getting Help

1. **Documentation**: Check this deployment guide
2. **Issues**: Create GitHub issues for bugs
3. **Discussions**: Use GitHub discussions for questions
4. **Logs**: Check service logs for error details

### Useful Commands

```bash
# Quick health check
curl -f https://your-api-domain.com/api/recommendation_stats

# Check all services
./scripts/deploy-railway.sh health

# View recent deployments
gh run list --workflow=deploy-recommendation-system.yml --limit=5
```

---

## 🎯 Next Steps

After successful deployment:

1. **Configure Monitoring**: Set up Grafana dashboards
2. **Setup Alerts**: Configure Prometheus alerts
3. **Performance Tuning**: Optimize based on real traffic
4. **User Training**: Train users on new features
5. **Feedback Collection**: Implement user feedback loops

For additional support or questions, please refer to the main project documentation or create an issue in the repository.