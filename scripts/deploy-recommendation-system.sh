#!/bin/bash

# MSMEBazaar v2.0 - Recommendation System Deployment Script
# This script deploys the complete recommendation engine with all dependencies

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

# Configuration
PROJECT_ROOT="/workspace"
SERVICES_DIR="$PROJECT_ROOT/microservices"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
DOCKER_COMPOSE_FILE="$INFRASTRUCTURE_DIR/docker-compose.ml-infrastructure.yml"

# Environment variables
export NODE_ENV=${NODE_ENV:-production}
export POSTGRES_HOST=${POSTGRES_HOST:-localhost}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}
export POSTGRES_DB=${POSTGRES_DB:-msmebazaar}
export POSTGRES_USER=${POSTGRES_USER:-postgres}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export MLFLOW_TRACKING_URI=${MLFLOW_TRACKING_URI:-http://localhost:5000}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3 first."
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
    fi
    
    # Check required directories
    if [ ! -d "$PROJECT_ROOT" ]; then
        error "Project root directory $PROJECT_ROOT not found."
    fi
    
    log "Prerequisites check completed successfully."
}

# Setup Python virtual environment for ML services
setup_python_environment() {
    log "Setting up Python environment for ML services..."
    
    cd "$SERVICES_DIR"
    
    # Create virtual environment for recommendation service
    if [ ! -d "recommendation-service/venv" ]; then
        info "Creating virtual environment for recommendation service..."
        cd recommendation-service
        python3 -m venv venv
        source venv/bin/activate
        
        # Upgrade pip
        pip install --upgrade pip
        
        # Install requirements
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
        else
            # Install basic ML dependencies
            pip install fastapi uvicorn redis asyncpg scikit-learn pandas numpy scipy implicit
            pip install pydantic prometheus-client joblib geopy python-multipart
            pip install psycopg2-binary sqlalchemy alembic celery flower
        fi
        
        deactivate
        cd ..
    fi
    
    # Create virtual environment for ML monitoring service
    if [ ! -d "ml-monitoring-service/venv" ]; then
        info "Creating virtual environment for ML monitoring service..."
        cd ml-monitoring-service
        python3 -m venv venv
        source venv/bin/activate
        
        pip install --upgrade pip
        
        # Install MLflow and monitoring dependencies
        pip install mlflow fastapi uvicorn redis asyncpg scikit-learn pandas numpy
        pip install prometheus-client celery flower tensorboard
        pip install psycopg2-binary sqlalchemy alembic
        
        deactivate
        cd ..
    fi
    
    # Create virtual environment for transaction matching service
    if [ ! -d "transaction-matching-service/venv" ]; then
        info "Creating virtual environment for transaction matching service..."
        cd transaction-matching-service
        python3 -m venv venv
        source venv/bin/activate
        
        pip install --upgrade pip
        pip install fastapi uvicorn redis asyncpg scikit-learn pandas numpy scipy
        pip install pydantic prometheus-client geopy joblib
        pip install psycopg2-binary sqlalchemy
        
        deactivate
        cd ..
    fi
    
    log "Python environments setup completed."
}

# Create Dockerfiles for services
create_dockerfiles() {
    log "Creating Dockerfiles for ML services..."
    
    # Dockerfile for recommendation service
    cat > "$SERVICES_DIR/recommendation-service/Dockerfile" << 'EOF'
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8004/api/recommendation_stats || exit 1

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8004", "--workers", "4"]
EOF

    # Dockerfile for ML monitoring service
    cat > "$SERVICES_DIR/ml-monitoring-service/Dockerfile" << 'EOF'
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create models directory
RUN mkdir -p /app/models

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8005/api/models/status || exit 1

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "2"]
EOF

    # Dockerfile for transaction matching service
    cat > "$SERVICES_DIR/transaction-matching-service/Dockerfile" << 'EOF'
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8008

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8008/api/matching_stats || exit 1

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8008", "--workers", "2"]
EOF

    log "Dockerfiles created successfully."
}

# Create requirements.txt files
create_requirements_files() {
    log "Creating requirements.txt files..."
    
    # Requirements for recommendation service
    cat > "$SERVICES_DIR/recommendation-service/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
redis==5.0.1
asyncpg==0.29.0
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.24.4
scipy==1.11.4
implicit==0.7.2
pydantic==2.5.0
prometheus-client==0.19.0
joblib==1.3.2
geopy==2.4.1
python-multipart==0.0.6
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
celery==5.3.4
flower==2.0.1
EOF

    # Requirements for ML monitoring service
    cat > "$SERVICES_DIR/ml-monitoring-service/requirements.txt" << 'EOF'
mlflow==2.8.1
fastapi==0.104.1
uvicorn[standard]==0.24.0
redis==5.0.1
asyncpg==0.29.0
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.24.4
prometheus-client==0.19.0
celery==5.3.4
flower==2.0.1
tensorboard==2.15.1
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
alembic==1.13.0
pydantic==2.5.0
boto3==1.34.0
EOF

    # Requirements for transaction matching service
    cat > "$SERVICES_DIR/transaction-matching-service/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
redis==5.0.1
asyncpg==0.29.0
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.24.4
scipy==1.11.4
pydantic==2.5.0
prometheus-client==0.19.0
geopy==2.4.1
joblib==1.3.2
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
EOF

    log "Requirements files created successfully."
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Wait for PostgreSQL to be ready
    info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c '\q' 2>/dev/null; then
            break
        fi
        if [ $i -eq 30 ]; then
            error "PostgreSQL is not responding after 30 attempts"
        fi
        sleep 2
    done
    
    # Create database if it doesn't exist
    info "Creating database if not exists..."
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c "CREATE DATABASE $POSTGRES_DB;" 2>/dev/null || true
    
    # Run database migrations
    info "Running database migrations..."
    
    # Apply transaction matching schema
    if [ -f "$INFRASTRUCTURE_DIR/database/transaction_matching_schema.sql" ]; then
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f "$INFRASTRUCTURE_DIR/database/transaction_matching_schema.sql"
    fi
    
    # Apply user feedback schema
    if [ -f "$INFRASTRUCTURE_DIR/database/user_feedback_schema.sql" ]; then
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f "$INFRASTRUCTURE_DIR/database/user_feedback_schema.sql"
    fi
    
    log "Database setup completed."
}

# Build and start services
start_services() {
    log "Building and starting services..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Build images
    info "Building Docker images..."
    docker-compose -f docker-compose.ml-infrastructure.yml build
    
    # Start core infrastructure services first
    info "Starting core infrastructure services..."
    docker-compose -f docker-compose.ml-infrastructure.yml up -d postgres-main redis-main
    
    # Wait for core services
    sleep 10
    
    # Start MLflow and monitoring services
    info "Starting MLflow and monitoring services..."
    docker-compose -f docker-compose.ml-infrastructure.yml up -d postgres-mlflow mlflow-server prometheus grafana
    
    # Wait for MLflow
    sleep 15
    
    # Start ML services
    info "Starting ML services..."
    docker-compose -f docker-compose.ml-infrastructure.yml up -d ml-monitoring celery-ml-worker celery-beat
    
    # Start Airflow
    info "Starting Airflow services..."
    docker-compose -f docker-compose.ml-infrastructure.yml up -d postgres-airflow airflow-webserver airflow-scheduler
    
    # Start remaining services
    info "Starting remaining services..."
    docker-compose -f docker-compose.ml-infrastructure.yml up -d
    
    log "All services started successfully."
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Health check URLs
    declare -A services=(
        ["Recommendation Service"]="http://localhost:8004/api/recommendation_stats"
        ["ML Monitoring Service"]="http://localhost:8005/api/models/status"
        ["Transaction Matching Service"]="http://localhost:8008/api/matching_stats"
        ["MLflow"]="http://localhost:5000"
        ["Prometheus"]="http://localhost:9090/-/ready"
        ["Grafana"]="http://localhost:3000/api/health"
        ["Airflow"]="http://localhost:8080/health"
    )
    
    info "Checking service health..."
    
    for service in "${!services[@]}"; do
        url="${services[$service]}"
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
        else
            echo -e "${RED}✗ $service is not responding${NC}"
        fi
    done
    
    # Check Docker containers
    info "Checking Docker containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    log "Deployment verification completed."
}

# Display service URLs
display_service_urls() {
    log "Service URLs:"
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                     MSMEBazaar v2.0 Services                ║
╠══════════════════════════════════════════════════════════════╣
║ Recommendation Service: http://localhost:8004/docs          ║
║ ML Monitoring Service:  http://localhost:8005/docs          ║
║ Transaction Matching:   http://localhost:8008/docs          ║
║ MLflow UI:             http://localhost:5000                ║
║ Airflow UI:            http://localhost:8080                ║
║ Grafana Dashboard:     http://localhost:3000                ║
║ Prometheus:            http://localhost:9090                ║
║ Flower (Celery):       http://localhost:5555                ║
║ TensorBoard:           http://localhost:6006                ║
║ Jupyter Lab:           http://localhost:8888                ║
║ Kibana:                http://localhost:5601                ║
║ MinIO Console:         http://localhost:9001                ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    info "Default credentials:"
    echo "  - Airflow: admin/admin"
    echo "  - Grafana: admin/admin123"
    echo "  - Jupyter: token=msmebazaar123"
    echo "  - MinIO: minio123/minio123456"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    cd "$INFRASTRUCTURE_DIR"
    docker-compose -f docker-compose.ml-infrastructure.yml down -v
    docker system prune -f
    log "Cleanup completed."
}

# Main execution
main() {
    log "Starting MSMEBazaar v2.0 Recommendation System Deployment"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            setup_python_environment
            create_dockerfiles
            create_requirements_files
            start_services
            setup_database
            verify_deployment
            display_service_urls
            ;;
        "cleanup")
            cleanup
            ;;
        "restart")
            log "Restarting services..."
            cd "$INFRASTRUCTURE_DIR"
            docker-compose -f docker-compose.ml-infrastructure.yml restart
            verify_deployment
            ;;
        "status")
            verify_deployment
            ;;
        "logs")
            cd "$INFRASTRUCTURE_DIR"
            docker-compose -f docker-compose.ml-infrastructure.yml logs -f "${2:-ml-monitoring}"
            ;;
        *)
            echo "Usage: $0 {deploy|cleanup|restart|status|logs [service_name]}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the complete recommendation system"
            echo "  cleanup  - Stop and remove all services"
            echo "  restart  - Restart all services"
            echo "  status   - Check service health"
            echo "  logs     - Show logs for a specific service"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"