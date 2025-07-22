#!/bin/bash

# MSMEBazaar V2 Deployment Helper Script
# This script helps validate and prepare your deployment to Render

set -e

echo "🚀 MSMEBazaar V2 Deployment Helper"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    print_error "render.yaml not found. Please run this script from the project root."
    exit 1
fi

print_status "Found render.yaml configuration"

# Validate project structure
echo
echo "🔍 Validating Project Structure"
echo "==============================="

# Check frontend structure
if [ -d "frontend" ] && [ -f "frontend/package.json" ] && [ -f "frontend/vite.config.ts" ]; then
    print_status "Frontend structure is valid"
else
    print_error "Frontend structure is invalid. Missing frontend/, package.json, or vite.config.ts"
    exit 1
fi

# Check backend services
services=("auth-api" "msme-api" "admin-api" "payments-api" "whatsapp-bot")
for service in "${services[@]}"; do
    if [ -d "backend/$service" ] && [ -f "backend/$service/Dockerfile" ] && [ -f "backend/$service/main.py" ]; then
        print_status "Backend service '$service' structure is valid"
    else
        print_error "Backend service '$service' is missing required files (Dockerfile, main.py)"
        exit 1
    fi
done

# Validate environment variables
echo
echo "🔐 Validating Environment Variables"
echo "==================================="

if [ -f ".env.example" ]; then
    print_status "Found .env.example file"
    
    # Check for required environment variables
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "SECRET_KEY"
        "STRIPE_SECRET_KEY"
        "TWILIO_ACCOUNT_SID"
        "SENDGRID_API_KEY"
        "OPENAI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.example; then
            print_status "Required variable '$var' is documented"
        else
            print_warning "Required variable '$var' is missing from .env.example"
        fi
    done
else
    print_error "Missing .env.example file"
    exit 1
fi

# Check Docker files
echo
echo "🐳 Validating Docker Configuration"
echo "=================================="

for service in "${services[@]}"; do
    dockerfile="backend/$service/Dockerfile"
    if [ -f "$dockerfile" ]; then
        # Check if Dockerfile has required components
        if grep -q "FROM python:3.11-slim" "$dockerfile" && \
           grep -q "EXPOSE" "$dockerfile" && \
           grep -q "CMD.*uvicorn" "$dockerfile"; then
            print_status "Dockerfile for '$service' is properly configured"
        else
            print_warning "Dockerfile for '$service' may be missing required components"
        fi
    fi
done

# Validate render.yaml
echo
echo "📋 Validating render.yaml"
echo "========================="

if command -v python3 &> /dev/null; then
    python3 -c "
import yaml
import sys

try:
    with open('render.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Check services
    if 'services' not in config:
        print('❌ No services defined in render.yaml')
        sys.exit(1)
    
    services = config['services']
    service_names = [s['name'] for s in services]
    
    required_services = [
        'msmebazaar-postgres',
        'msmebazaar-redis',
        'msmebazaar-frontend',
        'msmebazaar-auth-api',
        'msmebazaar-msme-api',
        'msmebazaar-admin-api',
        'msmebazaar-payments-api',
        'msmebazaar-whatsapp-bot'
    ]
    
    for service in required_services:
        if service in service_names:
            print(f'✅ Service {service} is configured')
        else:
            print(f'⚠️  Service {service} is missing')
    
    print('✅ render.yaml structure is valid')
    
except yaml.YAMLError as e:
    print(f'❌ Invalid YAML syntax: {e}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error validating render.yaml: {e}')
    sys.exit(1)
"
else
    print_warning "Python3 not found. Skipping render.yaml validation."
fi

# Check Git status
echo
echo "📝 Git Repository Status"
echo "========================"

if [ -d ".git" ]; then
    print_status "Git repository detected"
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes. Consider committing before deployment."
        git status --short
    else
        print_status "Working directory is clean"
    fi
    
    # Show current branch
    current_branch=$(git branch --show-current)
    print_info "Current branch: $current_branch"
    
    # Check if we have a remote origin
    if git remote get-url origin &> /dev/null; then
        remote_url=$(git remote get-url origin)
        print_status "Remote origin: $remote_url"
    else
        print_warning "No remote origin configured"
    fi
else
    print_error "Not a Git repository. Render requires a Git repository."
    exit 1
fi

# Generate deployment checklist
echo
echo "📋 Pre-Deployment Checklist"
echo "==========================="

cat << EOF
Before deploying to Render, make sure you have:

1. 🔐 Prepared all environment variables and API keys:
   - Stripe API keys (secret and publishable)
   - Twilio credentials (Account SID, Auth Token)
   - SendGrid API key
   - OpenAI API key
   - AWS credentials (if using S3)
   - Google Analytics ID (optional)
   - Sentry DSN (optional)

2. 🏦 Set up external services:
   - Stripe account with products configured
   - Twilio account with WhatsApp Business API
   - SendGrid account with verified domain
   - AWS S3 bucket (if using file storage)

3. 🔧 Render account setup:
   - Connected GitHub account
   - Payment method added (for paid plans)
   - Custom domain configured (if needed)

4. 📊 Monitoring setup:
   - Sentry project created (optional)
   - Google Analytics property (optional)

5. 🚀 Final checks:
   - All code committed and pushed to GitHub
   - render.yaml reviewed and validated
   - Environment variables documented
   - Health check endpoints working
EOF

echo
print_status "Validation complete! Your project is ready for Render deployment."
print_info "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Go to https://dashboard.render.com"
echo "3. Connect your repository"
echo "4. Set environment variables"
echo "5. Deploy!"

echo
print_info "For detailed deployment instructions, see the README.md file."