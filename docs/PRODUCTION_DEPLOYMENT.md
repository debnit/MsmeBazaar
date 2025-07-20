# 🚀 Production Deployment Guide

Complete guide for deploying MSME Bazaar to production across multiple platforms.

## 🏗️ Build Configuration

### Production Build Process

```bash
# 1. Build client (frontend) with Vite
npm run build:client

# 2. Build server (backend) with esbuild
npm run build:server

# 3. Or build both together
npm run build
```

### Build Outputs
- **Client**: `dist/public/` - Static frontend assets
- **Server**: `dist/index.js` - Bundled Node.js server

## 🌐 Platform Deployments

### 1. 🎨 Render Deployment

#### Setup Steps
1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Service Configuration**
   ```yaml
   Name: msme-bazaar-production
   Environment: Node
   Branch: main
   Build Command: ./render-build.sh
   Start Command: npm start
   ```

3. **Environment Variables**
   ```bash
   # Database
   DATABASE_URL=postgresql://user:pass@host:5432/msme_prod
   
   # Authentication
   JWT_SECRET=your-super-secure-jwt-secret-256-bits
   NEXTAUTH_SECRET=your-nextauth-secret-key
   NEXTAUTH_URL=https://your-app.onrender.com
   
   # Payment Gateway
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   
   # Redis Cache
   REDIS_URL=redis://user:pass@host:6379
   
   # Monitoring
   SENTRY_DSN=https://your-sentry-dsn
   
   # Search
   TYPESENSE_HOST=your-typesense-host
   TYPESENSE_API_KEY=your-typesense-api-key
   
   # Node Environment
   NODE_ENV=production
   PORT=3000
   ```

4. **Auto-Deploy Setup**
   - Enable "Auto-Deploy" from main branch
   - Configure health checks: `/health`

#### Render Build Script
The `render-build.sh` script handles:
- Installing dependencies
- Building client and server separately
- Pruning dev dependencies
- Optimizing for production

### 2. 🚂 Railway Deployment

#### Setup Steps
1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   railway init
   railway link [project-id]
   ```

3. **Configure Service**
   ```bash
   # Deploy to production
   railway up --environment production
   ```

4. **Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=postgresql://...
   railway variables set JWT_SECRET=your-jwt-secret
   railway variables set RAZORPAY_KEY_ID=rzp_live_...
   railway variables set REDIS_URL=redis://...
   ```

5. **Custom Domain**
   ```bash
   railway domain add your-domain.com
   ```

### 3. ☸️ Kubernetes (AWS EKS) Deployment

#### Prerequisites
```bash
# Install required tools
aws configure
kubectl version
helm version
```

#### Cluster Setup
```bash
# Create EKS cluster
aws eks create-cluster \
  --name msme-production-cluster \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-xxx,securityGroupIds=sg-xxx

# Update kubeconfig
aws eks update-kubeconfig --name msme-production-cluster
```

#### Kubernetes Manifests

Create `k8s/production/` directory with:

**Namespace**
```yaml
# k8s/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: msme-platform
```

**ConfigMap**
```yaml
# k8s/production/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: msme-config
  namespace: msme-platform
data:
  NODE_ENV: "production"
  PORT: "3000"
  REDIS_HOST: "redis-service"
  POSTGRES_HOST: "postgres-service"
```

**Secrets**
```yaml
# k8s/production/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: msme-secrets
  namespace: msme-platform
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  jwt-secret: <base64-encoded-jwt-secret>
  razorpay-key-id: <base64-encoded-razorpay-key>
  razorpay-secret: <base64-encoded-razorpay-secret>
```

**Application Deployment**
```yaml
# k8s/production/app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msme-app
  namespace: msme-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: msme-app
  template:
    metadata:
      labels:
        app: msme-app
    spec:
      containers:
      - name: msme-app
        image: ghcr.io/debnit/msmebazaar:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: msme-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: msme-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Service**
```yaml
# k8s/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: msme-app-service
  namespace: msme-platform
spec:
  selector:
    app: msme-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Ingress**
```yaml
# k8s/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: msme-ingress
  namespace: msme-platform
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  rules:
  - host: msme-bazaar.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: msme-app-service
            port:
              number: 80
```

**Horizontal Pod Autoscaler**
```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: msme-app-hpa
  namespace: msme-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: msme-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f k8s/production/

# Check deployment status
kubectl get pods -n msme-platform
kubectl get services -n msme-platform
kubectl get ingress -n msme-platform
```

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Install cert-manager for automatic SSL
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: alb
EOF
```

### Environment Security
```bash
# Encrypt secrets at rest
kubectl create secret generic msme-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="your-secret" \
  --dry-run=client -o yaml | kubectl apply -f -

# Enable RBAC
kubectl create clusterrolebinding msme-admin \
  --clusterrole=cluster-admin \
  --user=your-admin-user
```

## 📊 Monitoring & Logging

### Health Checks
All deployments include health check endpoints:
- `GET /health` - Basic health check
- `GET /api/health` - API health check
- `GET /api/status` - Detailed system status

### Monitoring Stack
```bash
# Install Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```

### Log Aggregation
```bash
# Install ELK stack
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install filebeat elastic/filebeat -n logging
```

## 🚀 CI/CD Pipeline

### GitHub Actions Secrets
Configure these secrets in your GitHub repository:

**Render Deployment**
```
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_ID=srv-xxxxx
```

**Railway Deployment**
```
RAILWAY_TOKEN=your-railway-token
RAILWAY_SERVICE_NAME=msme-production
```

**Kubernetes Deployment**
```
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
EKS_CLUSTER_NAME=msme-production-cluster
KUBECONFIG_DATA=base64-encoded-kubeconfig
```

### Deployment Triggers
- **Production**: Deploys on push to `main` branch
- **Staging**: Deploys on push to `develop` branch
- **Manual**: Can be triggered via GitHub Actions UI

## 🔧 Database Setup

### Production Database
```sql
-- Create production database
CREATE DATABASE msme_production;
CREATE USER msme_user WITH ENCRYPTED PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE msme_production TO msme_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Migration Strategy
```bash
# Run migrations in production
NODE_ENV=production npm run db:push

# Or using Kubernetes job
kubectl apply -f k8s/production/migration-job.yaml
```

## 🚨 Troubleshooting

### Common Issues

1. **Vite Import Error**
   ```
   Error: Cannot find package 'vite'
   ```
   **Solution**: Ensure Vite is only used in development, not in production builds.

2. **Database Connection**
   ```
   Error: Connection refused
   ```
   **Solution**: Check DATABASE_URL and network connectivity.

3. **Memory Issues**
   ```
   Error: JavaScript heap out of memory
   ```
   **Solution**: Increase memory limits in deployment configuration.

### Debug Commands
```bash
# Check application logs
kubectl logs -f deployment/msme-app -n msme-platform

# Check resource usage
kubectl top pods -n msme-platform

# Debug networking
kubectl exec -it pod-name -n msme-platform -- curl localhost:3000/health
```

## 📈 Performance Optimization

### Production Optimizations
- **Gzip Compression**: Enabled via middleware
- **Static Asset Caching**: 1 year cache headers
- **Database Connection Pooling**: Configured for production load
- **Redis Caching**: Session and API response caching
- **CDN Integration**: For static assets

### Scaling Strategies
- **Horizontal Scaling**: Auto-scaling based on CPU/Memory
- **Database Scaling**: Read replicas and connection pooling
- **Cache Scaling**: Redis cluster for high availability
- **Load Balancing**: Application Load Balancer with health checks

## 🔐 Backup & Recovery

### Database Backups
```bash
# Automated daily backups
kubectl create cronjob db-backup \
  --image=postgres:15 \
  --schedule="0 2 * * *" \
  -- pg_dump $DATABASE_URL > /backup/msme-$(date +%Y%m%d).sql
```

### Disaster Recovery
- **RTO**: Recovery Time Objective < 30 minutes
- **RPO**: Recovery Point Objective < 1 hour
- **Multi-AZ**: Database and application deployed across multiple availability zones

---

## 🎯 Quick Deployment Commands

### Deploy to Render
```bash
git push origin main  # Triggers auto-deployment
```

### Deploy to Railway
```bash
railway up --environment production
```

### Deploy to Kubernetes
```bash
kubectl apply -f k8s/production/
kubectl rollout status deployment/msme-app -n msme-platform
```

### Check Deployment Status
```bash
# All platforms health check
curl -f https://your-app.onrender.com/health
curl -f https://your-app.up.railway.app/health
curl -f https://msme-bazaar.com/health
```