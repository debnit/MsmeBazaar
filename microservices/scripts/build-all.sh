#!/bin/bash
# Build script for all microservices

set -e

echo "🏗️  Building all microservices..."

# Function to build a service
build_service() {
    local service_name=$1
    local service_dir=$2
    
    echo "📦 Building $service_name..."
    
    # Create Dockerfile if it doesn't exist
    if [ ! -f "$service_dir/Dockerfile" ]; then
        cat > "$service_dir/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../shared ./shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "No build script found"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the service
CMD ["npm", "start"]
EOF
    fi
    
    # Create package.json if it doesn't exist
    if [ ! -f "$service_dir/package.json" ]; then
        cat > "$service_dir/package.json" << EOF
{
  "name": "$service_name",
  "version": "1.0.0",
  "description": "MSMEAtlas $service_name microservice",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "tsx watch index.ts",
    "build": "tsx build index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  }
}
EOF
    fi
    
    # Build Docker image
    docker build -t "msme-atlas/$service_name:latest" "$service_dir"
    
    echo "✅ $service_name built successfully"
}

# Build all services
services=("auth-service" "msme-service" "valuation-service" "api-gateway")

for service in "${services[@]}"; do
    build_service "$service" "$service"
done

echo "🎉 All microservices built successfully!"
echo "📋 Available images:"
docker images | grep "msme-atlas"

echo ""
echo "🚀 To start all services:"
echo "   docker-compose up -d"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🏥 To check health:"
echo "   curl http://localhost:3000/health/all"