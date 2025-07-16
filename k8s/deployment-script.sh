#!/bin/bash

# MSMESquare Kubernetes Deployment Script
# Complete deployment automation for production environment

set -e

echo "🚀 Starting MSMESquare deployment..."

# Configuration
NAMESPACE="msme-square"
MONITORING_NAMESPACE="msme-square-monitoring"
STAGING_NAMESPACE="msme-square-staging"
DOCKER_REGISTRY="registry.example.com"
VERSION="${1:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    log "Prerequisites check passed ✓"
}

# Create namespaces
create_namespaces() {
    log "Creating namespaces..."
    
    kubectl apply -f k8s/namespace.yaml
    
    # Wait for namespaces to be ready
    kubectl wait --for=condition=Active namespace/$NAMESPACE --timeout=60s
    kubectl wait --for=condition=Active namespace/$MONITORING_NAMESPACE --timeout=60s
    kubectl wait --for=condition=Active namespace/$STAGING_NAMESPACE --timeout=60s
    
    log "Namespaces created ✓"
}

# Deploy secrets
deploy_secrets() {
    log "Deploying secrets..."
    
    # Check if secrets file exists
    if [ ! -f "k8s/secrets.yaml" ]; then
        error "Secrets file not found. Please create k8s/secrets.yaml with your secrets."
    fi
    
    # Apply secrets
    kubectl apply -f k8s/secrets.yaml
    
    log "Secrets deployed ✓"
}

# Deploy ConfigMaps
deploy_configmaps() {
    log "Deploying ConfigMaps..."
    
    kubectl apply -f k8s/configmap.yaml
    
    log "ConfigMaps deployed ✓"
}

# Deploy persistent volumes
deploy_storage() {
    log "Deploying storage..."
    
    # Create storage class if not exists
    kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF
    
    log "Storage deployed ✓"
}

# Deploy databases
deploy_databases() {
    log "Deploying databases..."
    
    # Deploy PostgreSQL
    kubectl apply -f k8s/postgres-deployment.yaml
    
    # Deploy Redis
    kubectl apply -f k8s/redis-deployment.yaml
    
    # Wait for databases to be ready
    kubectl wait --for=condition=Ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    log "Databases deployed ✓"
}

# Build and push Docker images
build_images() {
    log "Building Docker images..."
    
    # Build backend image
    docker build -t $DOCKER_REGISTRY/msme-square/backend:$VERSION -f Dockerfile .
    docker push $DOCKER_REGISTRY/msme-square/backend:$VERSION
    
    # Build ML service image
    docker build -t $DOCKER_REGISTRY/msme-square/ml-service:$VERSION -f Dockerfile.ml ./ml-service
    docker push $DOCKER_REGISTRY/msme-square/ml-service:$VERSION
    
    log "Images built and pushed ✓"
}

# Deploy ML service
deploy_ml_service() {
    log "Deploying ML service..."
    
    # Update image tag in deployment
    sed -i "s|image: msme-square/ml-service:latest|image: $DOCKER_REGISTRY/msme-square/ml-service:$VERSION|g" k8s/ml-service-deployment.yaml
    
    kubectl apply -f k8s/ml-service-deployment.yaml
    
    # Wait for ML service to be ready
    kubectl wait --for=condition=Ready pod -l app=ml-service -n $NAMESPACE --timeout=300s
    
    log "ML service deployed ✓"
}

# Deploy backend service
deploy_backend() {
    log "Deploying backend service..."
    
    # Update image tag in deployment
    sed -i "s|image: msme-square/backend:latest|image: $DOCKER_REGISTRY/msme-square/backend:$VERSION|g" k8s/backend-deployment.yaml
    
    kubectl apply -f k8s/backend-deployment.yaml
    
    # Wait for backend to be ready
    kubectl wait --for=condition=Ready pod -l app=backend -n $NAMESPACE --timeout=300s
    
    log "Backend service deployed ✓"
}

# Deploy load balancer
deploy_load_balancer() {
    log "Deploying load balancer..."
    
    kubectl apply -f k8s/nginx-deployment.yaml
    
    # Wait for nginx to be ready
    kubectl wait --for=condition=Ready pod -l app=nginx -n $NAMESPACE --timeout=300s
    
    log "Load balancer deployed ✓"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus
    kubectl apply -f k8s/monitoring/prometheus.yaml
    
    # Deploy Grafana
    kubectl apply -f k8s/monitoring/grafana.yaml
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=Ready pod -l app=prometheus -n $MONITORING_NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=grafana -n $MONITORING_NAMESPACE --timeout=300s
    
    log "Monitoring stack deployed ✓"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Get backend pod
    BACKEND_POD=$(kubectl get pods -l app=backend -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    
    # Run migrations
    kubectl exec -n $NAMESPACE $BACKEND_POD -- npm run db:push
    
    log "Database migrations completed ✓"
}

# Health check
health_check() {
    log "Running health checks..."
    
    # Check all pods are ready
    kubectl get pods -n $NAMESPACE
    kubectl get pods -n $MONITORING_NAMESPACE
    
    # Check services
    kubectl get services -n $NAMESPACE
    
    # Get load balancer IP
    LOAD_BALANCER_IP=$(kubectl get service nginx-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -n "$LOAD_BALANCER_IP" ]; then
        log "Load balancer IP: $LOAD_BALANCER_IP"
        
        # Test health endpoint
        if curl -f http://$LOAD_BALANCER_IP/health; then
            log "Health check passed ✓"
        else
            warn "Health check failed"
        fi
    else
        warn "Load balancer IP not available yet"
    fi
}

# Setup monitoring alerts
setup_alerts() {
    log "Setting up monitoring alerts..."
    
    # Apply AlertManager configuration
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: $MONITORING_NAMESPACE
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'smtp.gmail.com:587'
      smtp_from: 'alerts@msmesquare.com'
    
    route:
      group_by: ['alertname']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
    
    receivers:
    - name: 'web.hook'
      email_configs:
      - to: 'devops@msmesquare.com'
        subject: 'MSMESquare Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
EOF
    
    log "Monitoring alerts configured ✓"
}

# Backup configuration
setup_backup() {
    log "Setting up backup configuration..."
    
    # Create backup CronJob
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: $NAMESPACE
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump \$DATABASE_URL > /backup/msmesquare-\$(date +%Y%m%d-%H%M%S).sql
              aws s3 cp /backup/msmesquare-\$(date +%Y%m%d-%H%M%S).sql s3://msmesquare-backups/
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: msme-square-secrets
                  key: DATABASE_URL
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            emptyDir: {}
EOF
    
    log "Backup configuration deployed ✓"
}

# Deploy staging environment
deploy_staging() {
    log "Deploying staging environment..."
    
    # Copy production configs for staging
    for file in k8s/*.yaml; do
        if [ "$file" != "k8s/namespace.yaml" ]; then
            sed "s/$NAMESPACE/$STAGING_NAMESPACE/g" "$file" > "${file%.yaml}-staging.yaml"
            kubectl apply -f "${file%.yaml}-staging.yaml"
        fi
    done
    
    log "Staging environment deployed ✓"
}

# Feature flags deployment
deploy_feature_flags() {
    log "Deploying feature flags..."
    
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: $NAMESPACE
data:
  flags.json: |
    {
      "ai_copilot_enabled": true,
      "bnpl_financing": true,
      "recommendation_engine": true,
      "whatsapp_onboarding": true,
      "advanced_analytics": true,
      "white_labeling": true,
      "esg_reporting": true
    }
EOF
    
    log "Feature flags deployed ✓"
}

# Main deployment function
main() {
    log "Starting MSMESquare deployment to Kubernetes..."
    
    check_prerequisites
    create_namespaces
    deploy_secrets
    deploy_configmaps
    deploy_storage
    deploy_databases
    
    if [ "$2" != "--skip-build" ]; then
        build_images
    fi
    
    deploy_ml_service
    deploy_backend
    deploy_load_balancer
    deploy_monitoring
    
    sleep 30  # Wait for services to stabilize
    
    run_migrations
    health_check
    setup_alerts
    setup_backup
    deploy_feature_flags
    
    if [ "$3" == "--with-staging" ]; then
        deploy_staging
    fi
    
    log "✅ MSMESquare deployment completed successfully!"
    log "🌐 Access your application:"
    log "   - Main App: http://$(kubectl get service nginx-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
    log "   - Grafana: http://$(kubectl get service grafana -n $MONITORING_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3000"
    log "   - API Docs: http://$(kubectl get service nginx-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/api-docs"
    log "📊 Monitor your deployment:"
    log "   kubectl get pods -n $NAMESPACE"
    log "   kubectl logs -f deployment/backend -n $NAMESPACE"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    kubectl rollout undo deployment/backend -n $NAMESPACE
    kubectl rollout undo deployment/ml-service -n $NAMESPACE
    
    log "Rollback completed ✓"
}

# Cleanup function
cleanup() {
    log "Cleaning up resources..."
    
    kubectl delete namespace $NAMESPACE
    kubectl delete namespace $MONITORING_NAMESPACE
    kubectl delete namespace $STAGING_NAMESPACE
    
    log "Cleanup completed ✓"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main "$@"
        ;;
    "rollback")
        rollback
        ;;
    "cleanup")
        cleanup
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|cleanup|health} [version] [--skip-build] [--with-staging]"
        echo "Examples:"
        echo "  $0 deploy v1.2.3"
        echo "  $0 deploy latest --skip-build"
        echo "  $0 deploy v1.2.3 --skip-build --with-staging"
        echo "  $0 rollback"
        echo "  $0 cleanup"
        echo "  $0 health"
        exit 1
        ;;
esac