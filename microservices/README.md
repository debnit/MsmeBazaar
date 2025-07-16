# MSMEAtlas Microservices Architecture

## Overview

This directory contains the microservices architecture implementation for MSMEAtlas, providing improved scalability, maintainability, and performance through service decomposition.

## Architecture Components

### Services
- **API Gateway** (Port 3000): Central entry point with routing, rate limiting, and load balancing
- **Auth Service** (Port 3001): User authentication and authorization
- **MSME Service** (Port 3002): Business listings and MSME data management
- **Valuation Service** (Port 3003): ML-powered business valuation
- **Matchmaking Service** (Port 3004): Buyer-seller matching algorithms
- **Notification Service** (Port 3005): Real-time notifications and alerts

### Infrastructure
- **Nginx**: Load balancing and reverse proxy
- **Redis**: Caching and session management
- **PostgreSQL**: Primary database
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## Performance Benefits

### Scalability
- **Independent scaling**: Each service can be scaled based on demand
- **Resource optimization**: Allocate resources per service requirements
- **Load distribution**: Distribute traffic across multiple instances

### Performance
- **Parallel processing**: Services can process requests simultaneously
- **Reduced latency**: Optimized service-to-service communication
- **Memory efficiency**: Each service has dedicated memory management (128MB limit)

### Reliability
- **Fault isolation**: Service failures don't affect other services
- **Circuit breakers**: Prevent cascading failures
- **Health monitoring**: Individual service health checks

## Quick Start

### Development Environment
```bash
# Build all services
./scripts/build-all.sh

# Start with Docker Compose
docker-compose up -d

# Check health
curl http://localhost:3000/health/all
```

### Production Deployment
```bash
# Deploy to Kubernetes
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging
```

### Cloud Deployment
```bash
# Deploy to AWS
./scripts/deploy.sh aws

# Deploy to GCP
./scripts/deploy.sh gcp

# Deploy to Azure
./scripts/deploy.sh azure
```

## Service Communication

### API Gateway Routes
- `/api/auth/*` → Auth Service
- `/api/msme/*` → MSME Service
- `/api/valuation/*` → Valuation Service
- `/api/matchmaking/*` → Matchmaking Service
- `/api/notification/*` → Notification Service

### Health Monitoring
- Gateway health: `GET /health`
- All services health: `GET /health/all`
- Individual service health: `GET /direct/{service}/health`

## Memory Management

Each microservice implements intelligent memory management:
- **Memory limit**: 128MB per service
- **Page size**: 512KB
- **Eviction strategy**: LRU with priority weighting
- **Garbage collection**: Automatic cleanup every 5 minutes

## Load Balancing

### Nginx Configuration
- **Round-robin**: Default load balancing
- **Rate limiting**: 10 requests/second per IP
- **Circuit breaker**: 5-second timeout
- **Health checks**: Automatic failover

### Horizontal Scaling
```bash
# Scale API Gateway
docker-compose up -d --scale gateway=3

# Scale Auth Service
docker-compose up -d --scale auth-service=2
```

## Monitoring

### Prometheus Metrics
- Service response times
- Request rates
- Error rates
- Memory usage
- CPU utilization

### Grafana Dashboards
- Service performance overview
- Resource utilization
- Error tracking
- SLA monitoring

## Security

### API Gateway Security
- **Helmet.js**: Security headers
- **Rate limiting**: DDoS protection
- **CORS**: Cross-origin resource sharing
- **JWT validation**: Token-based authentication

### Service-to-Service Communication
- **Internal networking**: Docker/Kubernetes networks
- **Service mesh**: Future implementation with Istio
- **TLS encryption**: End-to-end encryption

## Development Guidelines

### Adding New Services
1. Create service directory under `microservices/`
2. Implement service using provided memory management
3. Add health check endpoint
4. Update Docker Compose configuration
5. Add Kubernetes deployment manifest
6. Update API Gateway routing

### Service Best Practices
- **Stateless design**: Services should be stateless
- **Database per service**: Each service owns its data
- **Async communication**: Use message queues for decoupling
- **Graceful shutdown**: Handle SIGTERM signals properly

## Troubleshooting

### Common Issues
- **Port conflicts**: Ensure ports are available
- **Service discovery**: Check service URLs in environment variables
- **Memory limits**: Monitor service memory usage
- **Database connections**: Verify database connectivity

### Debug Commands
```bash
# View logs
docker-compose logs -f gateway
docker-compose logs -f auth-service

# Check service health
curl http://localhost:3000/health/all

# Monitor resources
docker stats

# Restart service
docker-compose restart auth-service
```

## Performance Metrics

### Expected Improvements
- **Response time**: 40-60% reduction vs monolith
- **Throughput**: 200-300% increase with horizontal scaling
- **Memory usage**: 50-70% reduction per service
- **Fault tolerance**: 99.9% availability with proper failover

### Benchmarking
```bash
# Load test API Gateway
ab -n 1000 -c 10 http://localhost:3000/health

# Memory usage monitoring
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Migration Strategy

### From Monolith to Microservices
1. **Strangler Fig Pattern**: Gradually migrate endpoints
2. **Database decomposition**: Split shared database
3. **Service extraction**: Extract bounded contexts
4. **API versioning**: Maintain backward compatibility

### Rollback Plan
- Keep monolith running in parallel
- Feature flags for service routing
- Database synchronization
- Gradual traffic migration

## Future Enhancements

### Planned Features
- **Service mesh**: Istio implementation
- **Event sourcing**: CQRS pattern
- **Machine learning**: Dedicated ML services
- **Real-time processing**: Event streaming with Kafka
- **Multi-region deployment**: Global load balancing

### Technology Roadmap
- **Q1**: Service mesh implementation
- **Q2**: Event-driven architecture
- **Q3**: ML pipeline services
- **Q4**: Global deployment