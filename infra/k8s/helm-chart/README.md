# VyapaarMitra Kubernetes Helm Chart

This Helm chart deploys the complete VyapaarMitra MSME platform on any Kubernetes cluster including GKE, EKS, AKS, and DigitalOcean Kubernetes.

## 🚀 Quick Start

### Prerequisites

- Kubernetes 1.21+
- Helm 3.8+
- kubectl configured for your cluster
- NGINX Ingress Controller
- cert-manager (for TLS certificates)

### Installation

1. **Add required Helm repositories:**
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

2. **Install dependencies:**
```bash
# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install cert-manager
helm install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

3. **Create namespace:**
```bash
kubectl create namespace vyapaarmitra
```

4. **Configure secrets:**
```bash
# Create secrets file
cat > secrets.yaml << EOF
secrets:
  enabled: true
  data:
    DATABASE_URL: "postgresql://user:password@host:5432/vyapaarmitra"
    REDIS_URL: "redis://host:6379"
    JWT_SECRET: "your-jwt-secret-here"
    NEXTAUTH_SECRET: "your-nextauth-secret"
    ADMIN_SECRET_KEY: "your-admin-secret"
    TWILIO_ACCOUNT_SID: "your-twilio-sid"
    TWILIO_AUTH_TOKEN: "your-twilio-token"
    SENDGRID_API_KEY: "your-sendgrid-key"
    AWS_ACCESS_KEY_ID: "your-aws-key"
    AWS_SECRET_ACCESS_KEY: "your-aws-secret"
    SENTRY_DSN: "your-sentry-dsn"
EOF
```

5. **Install VyapaarMitra:**
```bash
helm install vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --values secrets.yaml \
  --set ingress.hosts[0].host=vyapaarmitra.in \
  --set ingress.hosts[1].host=admin.vyapaarmitra.in \
  --set ingress.hosts[2].host=api.vyapaarmitra.in
```

## 🔧 Configuration

### Values File Structure

Create a custom `values.yaml` file to override defaults:

```yaml
# Custom configuration
image:
  registry: ghcr.io
  repository: your-org/vyapaarmitra
  tag: "latest"

# Scaling configuration
web:
  replicaCount: 3
  resources:
    limits:
      cpu: 1000m
      memory: 2Gi

authApi:
  replicaCount: 2
  resources:
    limits:
      cpu: 500m
      memory: 1Gi

# Autoscaling
autoscaling:
  enabled: true
  web:
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Database (if using external)
postgresql:
  enabled: false  # Use external database

# Ingress configuration
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: vyapaarmitra.in
      paths:
        - path: /
          pathType: Prefix
          service: web
  tls:
    - secretName: vyapaarmitra-tls
      hosts:
        - vyapaarmitra.in
        - admin.vyapaarmitra.in
        - api.vyapaarmitra.in
```

## 🌐 Cloud Provider Specific Deployments

### Google Kubernetes Engine (GKE)

```bash
# Create GKE cluster
gcloud container clusters create vyapaarmitra-cluster \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --machine-type=e2-standard-4

# Get credentials
gcloud container clusters get-credentials vyapaarmitra-cluster

# Install with GKE-specific values
helm install vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --create-namespace \
  --values values-gke.yaml
```

### Amazon EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name vyapaarmitra-cluster \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --node-type t3.large \
  --managed

# Install AWS Load Balancer Controller
helm install aws-load-balancer-controller \
  eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=vyapaarmitra-cluster

# Install with EKS-specific values
helm install vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --create-namespace \
  --values values-eks.yaml
```

### DigitalOcean Kubernetes

```bash
# Create DO cluster (via CLI or web console)
doctl kubernetes cluster create vyapaarmitra-cluster \
  --count 3 \
  --size s-2vcpu-2gb \
  --auto-upgrade

# Get credentials
doctl kubernetes cluster kubeconfig save vyapaarmitra-cluster

# Install with DO-specific values
helm install vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --create-namespace \
  --values values-do.yaml
```

### Local Development (minikube)

```bash
# Start minikube
minikube start --memory=8192 --cpus=4

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server

# Install with local values
helm install vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --create-namespace \
  --values values-local.yaml \
  --set ingress.hosts[0].host=vyapaarmitra.local
```

## 🔐 Security Configuration

### TLS/SSL Setup

1. **Install cert-manager ClusterIssuer:**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@vyapaarmitra.in
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

2. **Apply ClusterIssuer:**
```bash
kubectl apply -f cluster-issuer.yaml
```

### Network Policies

Enable network policies for enhanced security:

```bash
helm upgrade vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --set networkPolicy.enabled=true
```

## 📊 Monitoring Setup

### Prometheus Integration

The chart includes Prometheus annotations for automatic metric scraping:

```yaml
# Enable ServiceMonitor
serviceMonitor:
  enabled: true
  namespace: monitoring
```

### Install Prometheus Stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

## 🔄 Scaling and Autoscaling

### Manual Scaling

```bash
# Scale web service
kubectl scale deployment vyapaarmitra-web --replicas=5 -n vyapaarmitra

# Scale API services
kubectl scale deployment vyapaarmitra-auth-api --replicas=3 -n vyapaarmitra
```

### Horizontal Pod Autoscaler

HPA is automatically configured when `autoscaling.enabled=true`:

```bash
# Check HPA status
kubectl get hpa -n vyapaarmitra

# View HPA details
kubectl describe hpa vyapaarmitra-web -n vyapaarmitra
```

## 🔧 Maintenance Operations

### Upgrading the Application

```bash
# Update image tags
helm upgrade vyapaarmitra ./infra/k8s/helm-chart \
  --namespace vyapaarmitra \
  --set image.tag=v2.0.0 \
  --reuse-values
```

### Database Migrations

```bash
# Run database migrations
kubectl create job migrate-db --from=deployment/vyapaarmitra-auth-api -n vyapaarmitra
kubectl patch job migrate-db -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-api","command":["python","manage.py","migrate"]}]}}}}' -n vyapaarmitra
```

### Backup Operations

```bash
# Create database backup
kubectl create job backup-db --from=deployment/vyapaarmitra-auth-api -n vyapaarmitra
kubectl patch job backup-db -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-api","command":["python","/app/jobs/cron/backup_db.py"]}]}}}}' -n vyapaarmitra
```

## 🐛 Troubleshooting

### Common Issues

1. **Pod stuck in Pending state:**
```bash
kubectl describe pod <pod-name> -n vyapaarmitra
kubectl get events -n vyapaarmitra --sort-by=.metadata.creationTimestamp
```

2. **Ingress not working:**
```bash
kubectl get ingress -n vyapaarmitra
kubectl describe ingress vyapaarmitra -n vyapaarmitra
```

3. **Database connection issues:**
```bash
kubectl logs deployment/vyapaarmitra-auth-api -n vyapaarmitra
kubectl exec -it deployment/vyapaarmitra-auth-api -n vyapaarmitra -- env | grep DATABASE
```

### Health Checks

```bash
# Check all pods
kubectl get pods -n vyapaarmitra

# Check service endpoints
kubectl get endpoints -n vyapaarmitra

# Test health endpoints
kubectl port-forward svc/vyapaarmitra-web 8080:80 -n vyapaarmitra
curl http://localhost:8080/api/health
```

## 📈 Performance Tuning

### Resource Optimization

```yaml
# Optimized resource configuration
web:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi

authApi:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi
```

### Database Optimization

```yaml
postgresql:
  primary:
    resources:
      requests:
        memory: 256Mi
        cpu: 250m
      limits:
        memory: 1Gi
        cpu: 500m
    persistence:
      size: 20Gi
      storageClass: "ssd"
```

## 🗑️ Cleanup

### Uninstall Application

```bash
# Uninstall the Helm release
helm uninstall vyapaarmitra -n vyapaarmitra

# Delete namespace
kubectl delete namespace vyapaarmitra

# Clean up PVCs (if needed)
kubectl delete pvc --all -n vyapaarmitra
```

### Complete Cleanup

```bash
# Remove all resources
helm uninstall vyapaarmitra -n vyapaarmitra
kubectl delete namespace vyapaarmitra
kubectl delete clusterissuer letsencrypt-prod
kubectl delete pv --all
```

## 📞 Support

For issues and questions:
- GitHub Issues: [VyapaarMitra Issues](https://github.com/your-org/vyapaarmitra/issues)
- Email: tech@vyapaarmitra.in
- Slack: #vyapaarmitra-k8s

## 📄 License

This Helm chart is licensed under the MIT License.