#!/bin/bash

# MSMEBazaar v2.0 - Render Deployment Script
# Deploy recommendation system to Render platform

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if Render CLI is installed
check_render_cli() {
    if ! command -v render &> /dev/null; then
        warning "Render CLI not found. Installing..."
        
        # Install Render CLI
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install render
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -fsSL https://render.com/install.sh | bash
        else
            error "Unsupported operating system. Please install Render CLI manually."
        fi
    fi
    
    log "Render CLI is available"
}

# Authenticate with Render
authenticate_render() {
    log "Authenticating with Render..."
    
    if [ -z "$RENDER_API_KEY" ]; then
        error "RENDER_API_KEY environment variable is required"
    fi
    
    render auth login --api-key "$RENDER_API_KEY" || error "Failed to authenticate with Render"
    log "Authentication successful"
}

# Create environment variables file
create_env_file() {
    log "Creating environment variables..."
    
    cat > .env.render << EOF
# Database Configuration
POSTGRES_DB=msmebazaar
POSTGRES_USER=postgres

# Application Configuration
ENVIRONMENT=production
PYTHONPATH=/app

# MLflow Configuration
MLFLOW_TRACKING_URI=https://mlflow-server-msmebazaar.onrender.com

# Frontend Configuration
REACT_APP_API_URL=https://recommendation-service-msmebazaar.onrender.com
REACT_APP_ML_MONITORING_URL=https://ml-monitoring-service-msmebazaar.onrender.com
REACT_APP_TRANSACTION_MATCHING_URL=https://transaction-matching-service-msmebazaar.onrender.com
REACT_APP_ENVIRONMENT=production
EOF

    log "Environment variables file created"
}

# Deploy infrastructure services
deploy_infrastructure() {
    log "Deploying infrastructure services..."
    
    # Deploy PostgreSQL database
    info "Creating PostgreSQL database..."
    render services create \
        --type postgresql \
        --name msmebazaar-postgres \
        --plan standard \
        --region oregon \
        --database-name msmebazaar \
        --database-user postgres \
        --disk-size 20 || warning "PostgreSQL service might already exist"
    
    # Deploy Redis cache
    info "Creating Redis cache..."
    render services create \
        --type redis \
        --name msmebazaar-redis \
        --plan standard \
        --region oregon \
        --maxmemory-policy allkeys-lru || warning "Redis service might already exist"
    
    log "Infrastructure services deployment initiated"
}

# Deploy application services
deploy_services() {
    log "Deploying application services..."
    
    # Deploy Recommendation Service
    info "Deploying Recommendation Service..."
    render services create \
        --type web \
        --name recommendation-service \
        --env python \
        --build-command "cd microservices/recommendation-service && pip install -r requirements.txt" \
        --start-command "cd microservices/recommendation-service && uvicorn app:app --host 0.0.0.0 --port \$PORT --workers 4" \
        --plan standard \
        --region oregon \
        --auto-deploy \
        --health-check-path "/api/recommendation_stats" \
        --env-file .env.render || warning "Recommendation service might already exist"
    
    # Deploy ML Monitoring Service
    info "Deploying ML Monitoring Service..."
    render services create \
        --type web \
        --name ml-monitoring-service \
        --env python \
        --build-command "cd microservices/ml-monitoring-service && pip install -r requirements.txt" \
        --start-command "cd microservices/ml-monitoring-service && uvicorn app:app --host 0.0.0.0 --port \$PORT --workers 2" \
        --plan standard \
        --region oregon \
        --auto-deploy \
        --health-check-path "/api/models/status" \
        --env-file .env.render || warning "ML monitoring service might already exist"
    
    # Deploy Transaction Matching Service
    info "Deploying Transaction Matching Service..."
    render services create \
        --type web \
        --name transaction-matching-service \
        --env python \
        --build-command "cd microservices/transaction-matching-service && pip install -r requirements.txt" \
        --start-command "cd microservices/transaction-matching-service && uvicorn app:app --host 0.0.0.0 --port \$PORT --workers 2" \
        --plan standard \
        --region oregon \
        --auto-deploy \
        --health-check-path "/api/matching_stats" \
        --env-file .env.render || warning "Transaction matching service might already exist"
    
    # Deploy MLflow Server
    info "Deploying MLflow Server..."
    render services create \
        --type web \
        --name mlflow-server \
        --env python \
        --build-command "pip install mlflow psycopg2-binary boto3" \
        --start-command "mlflow server --host 0.0.0.0 --port \$PORT --backend-store-uri postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/mlflow --default-artifact-root s3://msmebazaar-mlflow-artifacts" \
        --plan starter \
        --region oregon \
        --auto-deploy \
        --env-file .env.render || warning "MLflow service might already exist"
    
    # Deploy Celery Worker
    info "Deploying Celery Worker..."
    render services create \
        --type worker \
        --name celery-worker \
        --env python \
        --build-command "cd microservices/ml-monitoring-service && pip install -r requirements.txt" \
        --start-command "cd microservices/ml-monitoring-service && celery -A app.celery worker --loglevel=info --concurrency=2" \
        --plan starter \
        --region oregon \
        --auto-deploy \
        --env-file .env.render || warning "Celery worker might already exist"
    
    # Deploy Frontend
    info "Deploying Frontend..."
    render services create \
        --type static \
        --name msmebazaar-frontend \
        --build-command "cd frontend && npm ci && npm run build" \
        --publish-path "./frontend/build" \
        --plan starter \
        --region oregon \
        --auto-deploy \
        --env-file .env.render || warning "Frontend service might already exist"
    
    log "Application services deployment initiated"
}

# Setup database schema
setup_database() {
    log "Setting up database schema..."
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    sleep 60
    
    # Get database connection details
    DB_HOST=$(render services env get msmebazaar-postgres POSTGRES_HOST 2>/dev/null || echo "localhost")
    DB_PASSWORD=$(render services env get msmebazaar-postgres POSTGRES_PASSWORD 2>/dev/null || echo "")
    
    if [ -n "$DB_PASSWORD" ] && [ "$DB_HOST" != "localhost" ]; then
        info "Running database migrations..."
        
        # Install PostgreSQL client
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y postgresql-client
        elif command -v brew &> /dev/null; then
            brew install postgresql
        fi
        
        # Run schema migrations
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d msmebazaar -f infrastructure/database/transaction_matching_schema.sql || warning "Transaction matching schema might already exist"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d msmebazaar -f infrastructure/database/user_feedback_schema.sql || warning "User feedback schema might already exist"
        
        log "Database schema setup completed"
    else
        warning "Could not connect to database. Schema setup skipped."
    fi
}

# Monitor deployment status
monitor_deployment() {
    log "Monitoring deployment status..."
    
    # List all services
    render services list
    
    # Check service status
    services=("recommendation-service" "ml-monitoring-service" "transaction-matching-service" "mlflow-server" "celery-worker" "msmebazaar-frontend")
    
    for service in "${services[@]}"; do
        info "Checking status of $service..."
        render services logs "$service" --tail 10 || warning "Could not get logs for $service"
    done
    
    log "Deployment monitoring completed"
}

# Display service URLs
display_urls() {
    log "Service URLs:"
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                   MSMEBazaar v2.0 on Render                 ║
╠══════════════════════════════════════════════════════════════╣
║ Frontend:              https://msmebazaar-frontend.onrender.com    ║
║ Recommendation API:    https://recommendation-service.onrender.com ║
║ ML Monitoring API:     https://ml-monitoring-service.onrender.com  ║
║ Transaction Matching:  https://transaction-matching-service.onrender.com ║
║ MLflow UI:            https://mlflow-server.onrender.com           ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    info "Note: Services may take 5-10 minutes to fully deploy and become available."
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f .env.render
    log "Cleanup completed"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting MSMEBazaar v2.0 deployment to Render"
            check_render_cli
            authenticate_render
            create_env_file
            deploy_infrastructure
            sleep 30  # Wait for infrastructure
            deploy_services
            setup_database
            monitor_deployment
            display_urls
            cleanup
            log "Deployment to Render completed successfully!"
            ;;
        "status")
            log "Checking deployment status on Render"
            render services list
            ;;
        "logs")
            service_name="${2:-recommendation-service}"
            log "Fetching logs for $service_name"
            render services logs "$service_name" --follow
            ;;
        "cleanup")
            log "Cleaning up Render deployment"
            services=("recommendation-service" "ml-monitoring-service" "transaction-matching-service" "mlflow-server" "celery-worker" "msmebazaar-frontend" "msmebazaar-postgres" "msmebazaar-redis")
            for service in "${services[@]}"; do
                render services delete "$service" --yes || warning "Could not delete $service"
            done
            cleanup
            log "Cleanup completed"
            ;;
        *)
            echo "Usage: $0 {deploy|status|logs [service]|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the complete system to Render"
            echo "  status   - Check deployment status"
            echo "  logs     - Show logs for a service"
            echo "  cleanup  - Remove all services from Render"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"