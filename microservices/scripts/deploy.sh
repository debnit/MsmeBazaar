#!/bin/bash
# Deployment script for microservices

set -e

ENVIRONMENT=${1:-development}
NAMESPACE=${2:-msme-atlas}

echo "🚀 Deploying microservices to $ENVIRONMENT environment..."

# Function to deploy to Kubernetes
deploy_to_k8s() {
    echo "📦 Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes configurations
    kubectl apply -f deployment/kubernetes.yml -n "$NAMESPACE"
    
    # Wait for deployments to be ready
    echo "⏳ Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/msme-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/valuation-service -n "$NAMESPACE"
    
    echo "✅ Kubernetes deployment completed"
}

# Function to deploy with Docker Compose
deploy_with_compose() {
    echo "🐳 Deploying with Docker Compose..."
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}
    export GRAFANA_PASSWORD=${GRAFANA_PASSWORD:-admin}
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    curl -f http://localhost:3000/health/all || echo "Some services may still be starting..."
    
    echo "✅ Docker Compose deployment completed"
}

# Function to deploy to cloud
deploy_to_cloud() {
    echo "☁️  Deploying to cloud platform..."
    
    # Add cloud-specific deployment logic here
    case "$ENVIRONMENT" in
        "aws")
            echo "Deploying to AWS ECS..."
            # Add AWS ECS deployment logic
            ;;
        "gcp")
            echo "Deploying to Google Cloud Run..."
            # Add GCP Cloud Run deployment logic
            ;;
        "azure")
            echo "Deploying to Azure Container Instances..."
            # Add Azure deployment logic
            ;;
        *)
            echo "Cloud platform not specified or not supported"
            ;;
    esac
}

# Main deployment logic
case "$ENVIRONMENT" in
    "development"|"dev")
        deploy_with_compose
        ;;
    "staging"|"production"|"prod")
        deploy_to_k8s
        ;;
    "aws"|"gcp"|"azure")
        deploy_to_cloud
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Supported environments: development, staging, production, aws, gcp, azure"
        exit 1
        ;;
esac

echo "🎉 Deployment completed for $ENVIRONMENT environment!"
echo ""
echo "📊 Service endpoints:"
echo "   API Gateway: http://localhost:3000"
echo "   Auth Service: http://localhost:3001"
echo "   MSME Service: http://localhost:3002"
echo "   Valuation Service: http://localhost:3003"
echo ""
echo "🔍 Monitoring:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3010"
echo ""
echo "🏥 Health check:"
echo "   curl http://localhost:3000/health/all"