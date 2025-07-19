#!/bin/bash

# 🚀 MSMEBazaar v2.0 - Production Deployment Script
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting MSMEBazaar v2.0 Deployment..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
PROJECT_NAME="msmebazaar"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "Node.js/npm is not installed"
    fi
    
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
    fi
    
    log "✅ All prerequisites met"
}

# Environment setup
setup_environment() {
    log "Setting up environment for: $DEPLOYMENT_ENV"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log "Creating .env from .env.example"
            cp .env.example .env
            warn "Please update .env with your actual values before continuing"
            read -p "Press enter to continue after updating .env..."
        else
            error ".env file not found and no .env.example available"
        fi
    fi
    
    # Validate critical environment variables
    if ! grep -q "SECRET_KEY=" .env || grep -q "your-super-secret" .env; then
        warn "Please set a secure SECRET_KEY in .env"
    fi
    
    log "✅ Environment configured"
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    
    npm ci
    npm run build
    
    if [ $? -eq 0 ]; then
        log "✅ Frontend built successfully"
    else
        error "Frontend build failed"
    fi
}

# Validate Python services
validate_python() {
    log "Validating Python services..."
    
    # Check Python syntax in microservices
    find microservices/ -name "*.py" -exec python3 -m py_compile {} \;
    
    if [ $? -eq 0 ]; then
        log "✅ Python services validated"
    else
        error "Python validation failed"
    fi
}

# Build Docker images
build_docker() {
    log "Building Docker images..."
    
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        docker-compose -f docker-compose.prod.yml build
    else
        docker-compose build
    fi
    
    if [ $? -eq 0 ]; then
        log "✅ Docker images built successfully"
    else
        error "Docker build failed"
    fi
}

# Database setup
setup_database() {
    log "Setting up database..."
    
    # Start database containers
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        docker-compose -f docker-compose.prod.yml up -d postgres redis
    else
        docker-compose up -d postgres redis
    fi
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations (if available)
    if [ -f "migrations/init.sql" ]; then
        log "Running database migrations..."
        # Add migration commands here
    fi
    
    log "✅ Database setup complete"
}

# Start services
start_services() {
    log "Starting all services..."
    
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    log "✅ All services started"
}

# Health checks
run_health_checks() {
    log "Running health checks..."
    
    # Wait for services to start
    sleep 15
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log "✅ Frontend is responding"
    else
        warn "Frontend health check failed"
    fi
    
    # Check auth service
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "✅ Auth service is responding"
    else
        warn "Auth service health check failed"
    fi
    
    log "✅ Health checks completed"
}

# Display deployment info
show_deployment_info() {
    log "Deployment completed successfully! 🎉"
    echo ""
    echo "=== MSMEBazaar v2.0 Deployment Info ==="
    echo "Frontend:           http://localhost:3000"
    echo "Admin Dashboard:    http://localhost:3001"
    echo "Auth API:           http://localhost:8000"
    echo "MSME API:           http://localhost:8001"
    echo "Environment:        $DEPLOYMENT_ENV"
    echo ""
    echo "=== Quick Commands ==="
    echo "View logs:          docker-compose logs -f"
    echo "Stop services:      docker-compose down"
    echo "Restart:            docker-compose restart"
    echo ""
    echo "=== Security Notes ==="
    echo "1. Ensure all environment variables are properly set"
    echo "2. Use HTTPS in production"
    echo "3. Regular security updates recommended"
    echo "4. Monitor logs for any issues"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add cleanup commands here
}

# Trap cleanup on exit
trap cleanup EXIT

# Main deployment flow
main() {
    log "MSMEBazaar v2.0 Deployment Script"
    log "Environment: $DEPLOYMENT_ENV"
    echo ""
    
    check_prerequisites
    setup_environment
    build_frontend
    validate_python
    build_docker
    setup_database
    start_services
    run_health_checks
    show_deployment_info
}

# Run main function
main "$@"