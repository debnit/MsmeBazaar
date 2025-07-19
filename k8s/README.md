# Kubernetes Deployment Guide for MSMEBazaar V3

## Prerequisites

1. **Kubernetes Cluster**:
   - GKE, EKS, AKS, or local Minikube
   - Kubernetes v1.21+
   - kubectl configured and connected

2. **Required Add-ons**:
   - NGINX Ingress Controller
   - cert-manager (for TLS certificates)
   - Metrics Server (for HPA)

3. **Container Registry**:
   - Docker images built and pushed to registry
   - Update image names in deployment files

## Quick Start

### 1. Deploy NGINX Ingress Controller
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

### 2. Deploy cert-manager
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
```

### 3. Deploy MSMEBazaar
```bash
# Deploy using Kustomize
kubectl apply -k k8s/

# OR deploy individual files
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/auth-api-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

## Detailed Deployment Steps

### Step 1: Setup Namespace and Secrets

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (update with real values)
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=your-super-secret-jwt-key \
  --from-literal=NEXTAUTH_SECRET=your-nextauth-secret \
  --from-literal=ADMIN_SECRET_KEY=your-admin-secret \
  --from-literal=TWILIO_ACCOUNT_SID=your-twilio-sid \
  --from-literal=TWILIO_AUTH_TOKEN=your-twilio-token \
  --from-literal=TWILIO_PHONE_NUMBER=your-twilio-phone \
  --from-literal=SENDGRID_API_KEY=your-sendgrid-key \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  --from-literal=SENTRY_DSN=your-sentry-dsn \
  -n msmebazaar

# Create database secret
kubectl create secret generic postgres-secret \
  --from-literal=DATABASE_URL=postgresql://username:password@postgres-service:5432/msmebazaar \
  -n msmebazaar

# Create Redis secret
kubectl create secret generic redis-secret \
  --from-literal=REDIS_URL=redis://redis-service:6379 \
  -n msmebazaar
```

### Step 2: Build and Push Docker Images

```bash
# Auth API
cd msmebazaar-v2/apps/auth-api
docker build -t your-registry/msmebazaar/auth-api:latest .
docker push your-registry/msmebazaar/auth-api:latest

# MSME API
cd ../msme-api
docker build -t your-registry/msmebazaar/msme-api:latest .
docker push your-registry/msmebazaar/msme-api:latest

# Valuation API
cd ../valuation-api
docker build -t your-registry/msmebazaar/valuation-api:latest .
docker push your-registry/msmebazaar/valuation-api:latest

# Web Frontend
cd ../web
docker build -t your-registry/msmebazaar/web:latest .
docker push your-registry/msmebazaar/web:latest

# Admin Dashboard
cd ../../admin-dashboard
docker build -t your-registry/msmebazaar/admin-dashboard:latest .
docker push your-registry/msmebazaar/admin-dashboard:latest
```

### Step 3: Update Image References

Update the image names in deployment files to match your registry:

```bash
# Update kustomization.yaml
sed -i 's|msmebazaar/|your-registry/msmebazaar/|g' k8s/kustomization.yaml
```

### Step 4: Deploy Database and Cache

```bash
# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n msmebazaar --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n msmebazaar --timeout=300s
```

### Step 5: Deploy Applications

```bash
# Deploy backend APIs
kubectl apply -f k8s/auth-api-deployment.yaml
kubectl apply -f k8s/msme-api-deployment.yaml
kubectl apply -f k8s/valuation-api-deployment.yaml

# Deploy frontend applications
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/admin-dashboard-deployment.yaml

# Wait for deployments to be ready
kubectl wait --for=condition=available deployment --all -n msmebazaar --timeout=600s
```

### Step 6: Configure Ingress and TLS

```bash
# Create cluster issuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@msmebazaar.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### Step 7: Configure Auto-scaling

```bash
# Deploy HPA (requires metrics-server)
kubectl apply -f k8s/hpa.yaml

# Verify HPA status
kubectl get hpa -n msmebazaar
```

## Environment-Specific Deployments

### Development/Staging

```bash
# Deploy with staging configuration
kubectl apply -k k8s/staging/
```

### Production

```bash
# Deploy with production configuration
kubectl apply -k k8s/production/
```

## Monitoring and Operations

### Health Checks

```bash
# Check all pods status
kubectl get pods -n msmebazaar

# Check service endpoints
kubectl get endpoints -n msmebazaar

# View application logs
kubectl logs -l app=auth-api -n msmebazaar -f

# Check ingress status
kubectl get ingress -n msmebazaar
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment auth-api --replicas=5 -n msmebazaar

# Check HPA status
kubectl get hpa -n msmebazaar

# View HPA events
kubectl describe hpa auth-api-hpa -n msmebazaar
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it deployment/postgres -n msmebazaar -- psql -U postgres -d msmebazaar

# Run database migrations
kubectl create job migrate-db --from=cronjob/db-migrate -n msmebazaar

# Backup database
kubectl exec deployment/postgres -n msmebazaar -- pg_dump -U postgres msmebazaar > backup.sql
```

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check resource limits and node capacity
   ```bash
   kubectl describe pod <pod-name> -n msmebazaar
   kubectl get events -n msmebazaar --sort-by='.lastTimestamp'
   ```

2. **Service not accessible**: Verify service and endpoint configuration
   ```bash
   kubectl get svc -n msmebazaar
   kubectl get endpoints -n msmebazaar
   ```

3. **TLS certificate issues**: Check cert-manager logs
   ```bash
   kubectl logs -n cert-manager deployment/cert-manager
   kubectl describe certificate -n msmebazaar
   ```

4. **Database connection issues**: Verify secrets and network policies
   ```bash
   kubectl get secrets -n msmebazaar
   kubectl exec -it <app-pod> -n msmebazaar -- env | grep DATABASE
   ```

### Debug Commands

```bash
# Port forward for local access
kubectl port-forward svc/auth-api-service 8000:80 -n msmebazaar

# Execute commands in pods
kubectl exec -it deployment/auth-api -n msmebazaar -- bash

# View resource usage
kubectl top pods -n msmebazaar
kubectl top nodes

# Check cluster info
kubectl cluster-info
kubectl get nodes -o wide
```

## Security Best Practices

1. **RBAC**: Use Role-Based Access Control
2. **Network Policies**: Restrict pod-to-pod communication
3. **Pod Security**: Enable Pod Security Standards
4. **Secrets Management**: Use external secret management (Vault, etc.)
5. **Image Security**: Scan images for vulnerabilities
6. **Resource Limits**: Set appropriate resource quotas

## Backup and Disaster Recovery

### Database Backup

```bash
# Create backup job
kubectl create job backup-db --from=cronjob/backup-postgres -n msmebazaar

# Restore from backup
kubectl apply -f k8s/restore-job.yaml
```

### Full Cluster Backup

```bash
# Backup all resources
kubectl get all,secrets,configmaps,ingress,pv,pvc -n msmebazaar -o yaml > msmebazaar-backup.yaml

# Restore
kubectl apply -f msmebazaar-backup.yaml
```

## Performance Optimization

1. **Resource Tuning**: Adjust CPU/memory limits based on metrics
2. **HPA Configuration**: Fine-tune auto-scaling parameters  
3. **Database Optimization**: Configure connection pooling, indexing
4. **Caching**: Implement Redis caching strategies
5. **CDN**: Use CDN for static assets

## Cost Optimization

1. **Right-sizing**: Monitor and adjust resource allocations
2. **Node Auto-scaling**: Configure cluster auto-scaling
3. **Spot Instances**: Use spot/preemptible instances for non-critical workloads
4. **Resource Quotas**: Set namespace resource limits
5. **Pod Disruption Budgets**: Ensure availability during node maintenance

## Cleanup

```bash
# Delete all resources
kubectl delete -k k8s/

# OR delete namespace (removes everything)
kubectl delete namespace msmebazaar
```