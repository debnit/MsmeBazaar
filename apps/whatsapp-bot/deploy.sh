#!/bin/bash

# MSMEBazaar WhatsApp Bot Deployment Script

set -e

echo "🚀 Starting WhatsApp Bot deployment..."

# Configuration
PROJECT_NAME="msmebazaar-whatsapp-bot"
DOCKER_IMAGE="$PROJECT_NAME:latest"
CONTAINER_NAME="whatsapp-bot"
PORT=5000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found. Please create one from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
check_env_vars() {
    local required_vars=(
        "TWILIO_ACCOUNT_SID"
        "TWILIO_AUTH_TOKEN"
        "TWILIO_WHATSAPP_NUMBER"
        "AUTH_API_URL"
        "WEB_APP_URL"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Environment variable $var is not set"
            exit 1
        fi
    done
    
    log_info "All required environment variables are set"
}

# Stop existing container
stop_container() {
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        log_info "Stopping existing container..."
        docker stop $CONTAINER_NAME
    fi
    
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        log_info "Removing existing container..."
        docker rm $CONTAINER_NAME
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    docker build -t $DOCKER_IMAGE .
    
    if [ $? -eq 0 ]; then
        log_info "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Create test container
    docker run --rm \
        -e REDIS_URL="redis://localhost:6379" \
        -e AUTH_API_URL="http://localhost:8001" \
        --name "${CONTAINER_NAME}-test" \
        $DOCKER_IMAGE \
        python -m pytest test_bot.py -v
    
    if [ $? -eq 0 ]; then
        log_info "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Deploy container
deploy_container() {
    log_info "Deploying WhatsApp bot container..."
    
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p $PORT:5000 \
        --env-file .env \
        --network msmebazaar_default \
        $DOCKER_IMAGE
    
    if [ $? -eq 0 ]; then
        log_info "Container deployed successfully"
    else
        log_error "Failed to deploy container"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for container to start
    sleep 10
    
    # Check if container is running
    if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        log_error "Container is not running"
        docker logs $CONTAINER_NAME
        exit 1
    fi
    
    # Check health endpoint
    for i in {1..10}; do
        if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        log_warn "Health check attempt $i failed, retrying..."
        sleep 5
    done
    
    log_error "Health check failed after 10 attempts"
    docker logs $CONTAINER_NAME
    exit 1
}

# Show deployment info
show_info() {
    log_info "Deployment completed successfully!"
    echo ""
    echo "📱 WhatsApp Bot Information:"
    echo "  - Container: $CONTAINER_NAME"
    echo "  - Port: $PORT"
    echo "  - Health Check: http://localhost:$PORT/health"
    echo "  - Stats: http://localhost:$PORT/stats"
    echo ""
    echo "🔧 Management Commands:"
    echo "  - View logs: docker logs -f $CONTAINER_NAME"
    echo "  - Stop: docker stop $CONTAINER_NAME"
    echo "  - Restart: docker restart $CONTAINER_NAME"
    echo ""
    echo "📋 Twilio Webhook Configuration:"
    echo "  - Webhook URL: https://your-domain.com/webhook"
    echo "  - Method: POST"
    echo ""
}

# Cleanup on exit
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Deployment failed. Cleaning up..."
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Main deployment flow
main() {
    log_info "Starting WhatsApp Bot deployment process..."
    
    # Check environment
    check_env_vars
    
    # Stop existing container
    stop_container
    
    # Build new image
    build_image
    
    # Run tests (optional, uncomment if needed)
    # run_tests
    
    # Deploy container
    deploy_container
    
    # Health check
    health_check
    
    # Show deployment info
    show_info
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "Stopping WhatsApp bot..."
        docker stop $CONTAINER_NAME
        ;;
    "start")
        log_info "Starting WhatsApp bot..."
        docker start $CONTAINER_NAME
        ;;
    "restart")
        log_info "Restarting WhatsApp bot..."
        docker restart $CONTAINER_NAME
        ;;
    "logs")
        docker logs -f $CONTAINER_NAME
        ;;
    "health")
        curl -f http://localhost:$PORT/health | python -m json.tool
        ;;
    "stats")
        curl -f http://localhost:$PORT/stats | python -m json.tool
        ;;
    "test")
        run_tests
        ;;
    "clean")
        log_info "Cleaning up..."
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
        docker rmi $DOCKER_IMAGE 2>/dev/null || true
        ;;
    *)
        echo "Usage: $0 {deploy|stop|start|restart|logs|health|stats|test|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the WhatsApp bot (default)"
        echo "  stop    - Stop the container"
        echo "  start   - Start the container"
        echo "  restart - Restart the container"
        echo "  logs    - View container logs"
        echo "  health  - Check health status"
        echo "  stats   - View bot statistics"
        echo "  test    - Run tests"
        echo "  clean   - Clean up containers and images"
        exit 1
        ;;
esac