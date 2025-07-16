# MSMESquare Deployment Guide

This guide covers deployment options for the MSMESquare platform including local development with Docker, and production deployment to Render or Railway.

## Local Development with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- MSG91 API key for SMS services
- Git repository access

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd msme-square

# Set up environment variables
cp .env.example .env
# Edit .env with your MSG91_AUTH_KEY and other secrets

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Services Included
- **PostgreSQL Database**: Port 5432
- **Redis Cache**: Port 6379
- **Backend API**: Port 5000
- **Frontend Client**: Port 3000
- **ML Scheduler**: Background service
- **Nginx Load Balancer**: Port 80/443

### Environment Variables
Create a `.env` file with the following variables:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/msme_square
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret-here
MSG91_AUTH_KEY=your-msg91-api-key
NODE_ENV=development
PORT=5000
```

## Production Deployment

### Option 1: Render Deployment

#### Prerequisites
- Render account
- GitHub repository
- Environment variables configured

#### Setup Steps
1. **Create Render Services**:
   ```bash
   # PostgreSQL Database
   - Create new PostgreSQL database
   - Note the connection string

   # Redis Cache
   - Create new Redis instance
   - Note the connection string

   # Web Service
   - Connect GitHub repository
   - Build command: npm run build
   - Start command: npm start
   ```

2. **Configure Environment Variables**:
   ```env
   DATABASE_URL=<render-postgresql-url>
   REDIS_URL=<render-redis-url>
   JWT_SECRET=<secure-random-string>
   MSG91_AUTH_KEY=<your-msg91-key>
   NODE_ENV=production
   ```

3. **Deploy via GitHub Actions**:
   - Set up secrets in GitHub repository:
     - `RENDER_SERVICE_ID`
     - `RENDER_API_KEY`
   - Push to main branch triggers deployment

### Option 2: Railway Deployment

#### Prerequisites
- Railway account
- GitHub repository
- Railway CLI (optional)

#### Setup Steps
1. **Create Railway Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and create project
   railway login
   railway init
   ```

2. **Add Services**:
   ```bash
   # Add PostgreSQL
   railway add postgresql

   # Add Redis
   railway add redis

   # Deploy application
   railway up
   ```

3. **Configure Environment Variables**:
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=<secure-random-string>
   MSG91_AUTH_KEY=<your-msg91-key>
   NODE_ENV=production
   ```

4. **Deploy via GitHub Actions**:
   - Set up secret in GitHub repository:
     - `RAILWAY_TOKEN`
   - Manual deployment trigger via workflow_dispatch

## CI/CD Pipeline

### GitHub Actions Workflow
The CI/CD pipeline includes:
1. **Testing**: Run tests against PostgreSQL test database
2. **Building**: Create optimized production build
3. **Docker**: Build and push container images
4. **Deployment**: Deploy to Render or Railway

### Secrets Configuration
Configure these secrets in your GitHub repository:
- `RENDER_SERVICE_ID`: Render service identifier
- `RENDER_API_KEY`: Render API key
- `RAILWAY_TOKEN`: Railway authentication token
- `GITHUB_TOKEN`: Automatically provided by GitHub

## ML Scheduler Service

### Features
- **Weekly Model Retraining**: Every Sunday at 2 AM
- **Valuation Refresh**: Every 6 hours
- **Data Cleanup**: Daily at 1 AM
- **Performance Monitoring**: Continuous tracking

### Cron Jobs
```javascript
// Weekly ML model retraining
'0 2 * * 0' // Every Sunday at 2 AM

// Refresh valuations every 6 hours
'0 */6 * * *' // Every 6 hours

// Daily cleanup
'0 1 * * *' // Every day at 1 AM
```

### Monitoring
- Crash detection with automatic restart
- Performance metrics collection
- Error logging and reporting
- Database health checks

## Database Management

### Migrations
```bash
# Push schema changes
npm run db:push

# Generate migration files
npm run db:generate

# Open database studio
npm run db:studio
```

### Backups
- Automated daily backups via cloud provider
- Point-in-time recovery available
- Regular backup validation

## Security Considerations

### Production Security
- SSL/TLS encryption for all endpoints
- API rate limiting (10 req/s for API, 30 req/s general)
- Security headers (HSTS, XSS protection, etc.)
- Input validation and sanitization
- JWT token expiration and refresh

### Network Security
- Private networking between services
- Firewall rules for database access
- VPC isolation where available

## Performance Optimization

### Caching Strategy
- Redis for session storage
- API response caching
- Database query optimization
- Static asset caching

### Database Optimization
- Proper indexing for search queries
- Connection pooling
- Query optimization
- Regular maintenance tasks

## Monitoring and Logging

### Application Monitoring
- Real-time error tracking
- Performance metrics
- User activity monitoring
- Business intelligence dashboards

### Infrastructure Monitoring
- Server resource usage
- Database performance
- Network latency
- Uptime monitoring

## Troubleshooting

### Common Issues
1. **Database Connection Errors**:
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check firewall rules

2. **Authentication Issues**:
   - Verify JWT_SECRET configuration
   - Check token expiration
   - Validate MSG91 API key

3. **Performance Issues**:
   - Review database query performance
   - Check Redis connection
   - Monitor server resources

### Support
For deployment support, refer to:
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Docker Documentation](https://docs.docker.com)