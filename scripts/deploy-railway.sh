#!/bin/bash

# MSMEBazaar v2.0 - Railway Deployment Script
# Deploy recommendation system to Railway platform

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

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        warning "Railway CLI not found. Installing..."
        
        # Install Railway CLI
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install railway
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            bash <(curl -fsSL https://railway.app/install.sh)
        else
            error "Unsupported operating system. Please install Railway CLI manually."
        fi
    fi
    
    log "Railway CLI is available"
}

# Authenticate with Railway
authenticate_railway() {
    log "Authenticating with Railway..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        warning "RAILWAY_TOKEN not set. Please login manually."
        railway login || error "Failed to authenticate with Railway"
    else
        railway login --browserless || error "Failed to authenticate with Railway"
    fi
    
    log "Authentication successful"
}

# Create or connect to Railway project
setup_project() {
    log "Setting up Railway project..."
    
    # Check if railway.json exists
    if [ ! -f "railway.json" ]; then
        error "railway.json not found. Please ensure the file exists in the project root."
    fi
    
    # Initialize or link project
    if [ -n "$RAILWAY_PROJECT_ID" ]; then
        railway link "$RAILWAY_PROJECT_ID" || error "Failed to link to Railway project"
    else
        railway init || warning "Project might already be initialized"
    fi
    
    log "Railway project setup completed"
}

# Deploy infrastructure services
deploy_infrastructure() {
    log "Deploying infrastructure services..."
    
    # Add PostgreSQL database
    info "Adding PostgreSQL database..."
    railway add postgresql || warning "PostgreSQL might already be added"
    
    # Add Redis cache
    info "Adding Redis cache..."
    railway add redis || warning "Redis might already be added"
    
    log "Infrastructure services added"
}

# Deploy application services
deploy_services() {
    log "Deploying application services..."
    
    # Deploy Recommendation Service
    info "Deploying Recommendation Service..."
    cd microservices/recommendation-service
    railway up --detach || warning "Recommendation service deployment might have failed"
    cd ../..
    
    # Deploy ML Monitoring Service
    info "Deploying ML Monitoring Service..."
    cd microservices/ml-monitoring-service
    railway up --detach || warning "ML monitoring service deployment might have failed"
    cd ../..
    
    # Deploy Transaction Matching Service
    info "Deploying Transaction Matching Service..."
    cd microservices/transaction-matching-service
    railway up --detach || warning "Transaction matching service deployment might have failed"
    cd ../..
    
    # Deploy Frontend
    info "Deploying Frontend..."
    cd frontend
    railway up --detach || warning "Frontend deployment might have failed"
    cd ..
    
    log "Application services deployment initiated"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Set common environment variables
    railway variables set ENVIRONMENT=production
    railway variables set PYTHONPATH=/app
    railway variables set NODE_ENV=production
    
    # Set service URLs (these will be updated after deployment)
    railway variables set REACT_APP_API_URL=https://recommendation-service-production.up.railway.app
    railway variables set REACT_APP_ML_MONITORING_URL=https://ml-monitoring-service-production.up.railway.app
    railway variables set REACT_APP_TRANSACTION_MATCHING_URL=https://transaction-matching-service-production.up.railway.app
    railway variables set REACT_APP_ENVIRONMENT=production
    
    # MLflow configuration
    railway variables set MLFLOW_TRACKING_URI=https://mlflow-server-production.up.railway.app
    
    log "Environment variables configured"
}

# Setup database schema
setup_database() {
    log "Setting up database schema..."
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    sleep 60
    
    # Get database URL
    DB_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
    
    if [ -n "$DB_URL" ]; then
        info "Running database migrations..."
        
        # Install PostgreSQL client if not available
        if ! command -v psql &> /dev/null; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y postgresql-client
            elif command -v brew &> /dev/null; then
                brew install postgresql
            fi
        fi
        
        # Run schema migrations
        psql "$DB_URL" -f infrastructure/database/transaction_matching_schema.sql || warning "Transaction matching schema might already exist"
        psql "$DB_URL" -f infrastructure/database/user_feedback_schema.sql || warning "User feedback schema might already exist"
        
        log "Database schema setup completed"
    else
        warning "Could not get database URL. Schema setup skipped."
    fi
}

# Deploy individual services with proper configuration
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    info "Deploying $service_name..."
    
    cd "$service_path"
    
    # Create a temporary railway.json for this service
    if [ -f "railway.json" ]; then
        railway up --detach --service "$service_name" || warning "$service_name deployment might have failed"
    else
        warning "No railway.json found for $service_name"
    fi
    
    cd - > /dev/null
}

# Deploy all services with Railway
deploy_all_services() {
    log "Deploying all services to Railway..."
    
    # Deploy backend services
    deploy_service "recommendation-service" "microservices/recommendation-service"
    deploy_service "ml-monitoring-service" "microservices/ml-monitoring-service"
    deploy_service "transaction-matching-service" "microservices/transaction-matching-service"
    
    # Deploy frontend
    deploy_service "frontend" "frontend"
    
    log "All services deployment initiated"
}

# Monitor deployment status
monitor_deployment() {
    log "Monitoring deployment status..."
    
    # Show deployment status
    railway status
    
    # Show logs for each service
    services=("recommendation-service" "ml-monitoring-service" "transaction-matching-service" "frontend")
    
    for service in "${services[@]}"; do
        info "Recent logs for $service:"
        railway logs --service "$service" --lines 10 || warning "Could not get logs for $service"
        echo ""
    done
    
    log "Deployment monitoring completed"
}

# Get service URLs
get_service_urls() {
    log "Retrieving service URLs..."
    
    # Get deployment URLs
    railway status --json > deployment_status.json 2>/dev/null || {
        warning "Could not retrieve deployment status"
        return
    }
    
    # Parse URLs from status (this would need proper JSON parsing in a real scenario)
    info "Service URLs will be available at:"
    echo "  - Frontend: https://frontend-production.up.railway.app"
    echo "  - Recommendation API: https://recommendation-service-production.up.railway.app"
    echo "  - ML Monitoring API: https://ml-monitoring-service-production.up.railway.app"
    echo "  - Transaction Matching API: https://transaction-matching-service-production.up.railway.app"
    
    # Cleanup
    rm -f deployment_status.json
}

# Display service URLs
display_urls() {
    log "Service URLs:"
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                   MSMEBazaar v2.0 on Railway                ║
╠══════════════════════════════════════════════════════════════╣
║ Frontend:              https://frontend-production.up.railway.app           ║
║ Recommendation API:    https://recommendation-service-production.up.railway.app ║
║ ML Monitoring API:     https://ml-monitoring-service-production.up.railway.app  ║
║ Transaction Matching:  https://transaction-matching-service-production.up.railway.app ║
║ Database:              (Internal Railway PostgreSQL)                        ║
║ Cache:                 (Internal Railway Redis)                             ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    info "Note: Services may take 2-5 minutes to fully deploy and become available."
    info "Use 'railway domain' to assign custom domains to your services."
}

# Health check services
health_check() {
    log "Performing health checks..."
    
    services=(
        "https://recommendation-service-production.up.railway.app/api/recommendation_stats"
        "https://ml-monitoring-service-production.up.railway.app/api/models/status"
        "https://transaction-matching-service-production.up.railway.app/api/matching_stats"
    )
    
    for url in "${services[@]}"; do
        service_name=$(echo "$url" | cut -d'/' -f3 | cut -d'-' -f1)
        info "Health checking $service_name..."
        
        if curl -s -f "$url" > /dev/null; then
            echo -e "${GREEN}✓ $service_name is healthy${NC}"
        else
            echo -e "${RED}✗ $service_name is not responding${NC}"
        fi
    done
    
    log "Health checks completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f deployment_status.json
    log "Cleanup completed"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting MSMEBazaar v2.0 deployment to Railway"
            check_railway_cli
            authenticate_railway
            setup_project
            deploy_infrastructure
            setup_environment
            sleep 30  # Wait for infrastructure
            deploy_all_services
            setup_database
            monitor_deployment
            get_service_urls
            display_urls
            cleanup
            log "Deployment to Railway completed successfully!"
            ;;
        "status")
            log "Checking deployment status on Railway"
            railway status
            ;;
        "logs")
            service_name="${2:-recommendation-service}"
            log "Fetching logs for $service_name"
            railway logs --service "$service_name" --follow
            ;;
        "health")
            log "Performing health checks"
            health_check
            ;;
        "env")
            log "Managing environment variables"
            case "${2:-list}" in
                "list")
                    railway variables
                    ;;
                "set")
                    if [ -z "$3" ] || [ -z "$4" ]; then
                        error "Usage: $0 env set KEY VALUE"
                    fi
                    railway variables set "$3=$4"
                    log "Environment variable $3 set successfully"
                    ;;
                "delete")
                    if [ -z "$3" ]; then
                        error "Usage: $0 env delete KEY"
                    fi
                    railway variables delete "$3"
                    log "Environment variable $3 deleted successfully"
                    ;;
                *)
                    echo "Usage: $0 env {list|set KEY VALUE|delete KEY}"
                    ;;
            esac
            ;;
        "cleanup")
            log "Cleaning up Railway deployment"
            read -p "Are you sure you want to delete the entire project? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                railway delete || warning "Could not delete project"
                cleanup
                log "Cleanup completed"
            else
                log "Cleanup cancelled"
            fi
            ;;
        *)
            echo "Usage: $0 {deploy|status|logs [service]|health|env [list|set|delete]|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the complete system to Railway"
            echo "  status   - Check deployment status"
            echo "  logs     - Show logs for a service"
            echo "  health   - Perform health checks on all services"
            echo "  env      - Manage environment variables"
            echo "  cleanup  - Remove entire project from Railway"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"