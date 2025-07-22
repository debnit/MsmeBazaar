#!/bin/bash

# MSMEBazaar V2 Post-Deployment Validation Script
# Run this after your services are deployed to Render

set -e

echo "🔍 MSMEBazaar V2 Post-Deployment Validation"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
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

# Configuration - Update these URLs after deployment
BASE_DOMAIN="onrender.com"
FRONTEND_URL="https://msmebazaar-frontend.${BASE_DOMAIN}"
AUTH_API_URL="https://msmebazaar-auth-api.${BASE_DOMAIN}"
MSME_API_URL="https://msmebazaar-msme-api.${BASE_DOMAIN}"
ADMIN_API_URL="https://msmebazaar-admin-api.${BASE_DOMAIN}"
PAYMENTS_API_URL="https://msmebazaar-payments-api.${BASE_DOMAIN}"
WHATSAPP_BOT_URL="https://msmebazaar-whatsapp-bot.${BASE_DOMAIN}"

# Function to check HTTP status
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local service_name=$3
    
    print_info "Checking $service_name: $url"
    
    if command -v curl >/dev/null 2>&1; then
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30)
        
        if [ "$status_code" -eq "$expected_status" ]; then
            print_success "$service_name is responding (HTTP $status_code)"
            return 0
        else
            print_error "$service_name returned HTTP $status_code (expected $expected_status)"
            return 1
        fi
    else
        print_warning "curl not found. Skipping HTTP check for $service_name"
        return 0
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local url=$1
    local service_name=$2
    
    print_info "Checking JSON response from $service_name"
    
    if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        local response=$(curl -s "$url" --max-time 30)
        
        if echo "$response" | jq . >/dev/null 2>&1; then
            local status=$(echo "$response" | jq -r '.status // "unknown"')
            local service=$(echo "$response" | jq -r '.service // "unknown"')
            
            print_success "$service_name JSON response is valid"
            print_info "Status: $status, Service: $service"
            return 0
        else
            print_error "$service_name returned invalid JSON"
            print_info "Response: $response"
            return 1
        fi
    else
        print_warning "curl or jq not found. Skipping JSON validation for $service_name"
        return 0
    fi
}

# Test all services
echo
echo "🌐 Testing Service Endpoints"
echo "============================"

services_ok=0
services_total=6

# Test Frontend
if check_endpoint "$FRONTEND_URL" 200 "Frontend"; then
    ((services_ok++))
fi

# Test Backend APIs with health checks
if check_endpoint "$AUTH_API_URL/health" 200 "Auth API"; then
    check_json_endpoint "$AUTH_API_URL/health" "Auth API"
    ((services_ok++))
fi

if check_endpoint "$MSME_API_URL/health" 200 "MSME API"; then
    check_json_endpoint "$MSME_API_URL/health" "MSME API"
    ((services_ok++))
fi

if check_endpoint "$ADMIN_API_URL/health" 200 "Admin API"; then
    check_json_endpoint "$ADMIN_API_URL/health" "Admin API"
    ((services_ok++))
fi

if check_endpoint "$PAYMENTS_API_URL/health" 200 "Payments API"; then
    check_json_endpoint "$PAYMENTS_API_URL/health" "Payments API"
    ((services_ok++))
fi

if check_endpoint "$WHATSAPP_BOT_URL/health" 200 "WhatsApp Bot"; then
    check_json_endpoint "$WHATSAPP_BOT_URL/health" "WhatsApp Bot"
    ((services_ok++))
fi

# Test API Documentation
echo
echo "📚 Testing API Documentation"
echo "============================"

api_docs_ok=0
api_docs_total=5

# Test OpenAPI docs for each service
apis=("$AUTH_API_URL" "$MSME_API_URL" "$ADMIN_API_URL" "$PAYMENTS_API_URL" "$WHATSAPP_BOT_URL")
api_names=("Auth API" "MSME API" "Admin API" "Payments API" "WhatsApp Bot")

for i in "${!apis[@]}"; do
    url="${apis[$i]}/docs"
    name="${api_names[$i]}"
    
    if check_endpoint "$url" 200 "$name Docs"; then
        ((api_docs_ok++))
    fi
done

# Test CORS (for frontend-backend communication)
echo
echo "🔗 Testing CORS Configuration"
echo "============================="

if command -v curl >/dev/null 2>&1; then
    cors_test_url="$AUTH_API_URL/health"
    
    print_info "Testing CORS headers"
    cors_headers=$(curl -s -I -H "Origin: $FRONTEND_URL" "$cors_test_url" --max-time 30)
    
    if echo "$cors_headers" | grep -q "Access-Control-Allow-Origin"; then
        print_success "CORS headers are present"
    else
        print_warning "CORS headers not found - this may cause frontend issues"
    fi
else
    print_warning "curl not found. Skipping CORS test"
fi

# Test SSL Certificates
echo
echo "🔒 Testing SSL Certificates"
echo "==========================="

if command -v openssl >/dev/null 2>&1; then
    urls=("$FRONTEND_URL" "$AUTH_API_URL" "$MSME_API_URL" "$ADMIN_API_URL" "$PAYMENTS_API_URL" "$WHATSAPP_BOT_URL")
    
    for url in "${urls[@]}"; do
        domain=$(echo "$url" | sed 's|https://||' | sed 's|/.*||')
        
        print_info "Checking SSL certificate for $domain"
        
        if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
            print_success "SSL certificate is valid for $domain"
        else
            print_warning "Could not verify SSL certificate for $domain"
        fi
    done
else
    print_warning "openssl not found. Skipping SSL certificate check"
fi

# Performance Test
echo
echo "⚡ Basic Performance Test"
echo "========================"

if command -v curl >/dev/null 2>&1; then
    print_info "Testing response times"
    
    # Test frontend load time
    frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL" --max-time 30)
    if (( $(echo "$frontend_time < 5.0" | bc -l) )); then
        print_success "Frontend loads in ${frontend_time}s (good)"
    else
        print_warning "Frontend loads in ${frontend_time}s (consider optimization)"
    fi
    
    # Test API response time
    api_time=$(curl -s -w "%{time_total}" -o /dev/null "$AUTH_API_URL/health" --max-time 30)
    if (( $(echo "$api_time < 2.0" | bc -l) )); then
        print_success "API responds in ${api_time}s (good)"
    else
        print_warning "API responds in ${api_time}s (consider optimization)"
    fi
else
    print_warning "curl not found. Skipping performance test"
fi

# Summary
echo
echo "📊 Validation Summary"
echo "===================="

print_info "Services Status: $services_ok/$services_total services are healthy"
print_info "API Docs Status: $api_docs_ok/$api_docs_total documentation endpoints are accessible"

if [ $services_ok -eq $services_total ] && [ $api_docs_ok -eq $api_docs_total ]; then
    print_success "All systems are operational! 🎉"
    echo
    echo "🚀 Your MSMEBazaar V2 deployment is successful!"
    echo
    echo "📱 Access your application:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   API Docs: $AUTH_API_URL/docs"
    echo
    echo "🔧 Next steps:"
    echo "   1. Test user registration and login"
    echo "   2. Verify payment processing (if enabled)"
    echo "   3. Test MSME data management"
    echo "   4. Check notification systems"
    echo "   5. Set up monitoring and alerts"
    
    exit 0
else
    print_error "Some services are not working properly"
    echo
    echo "🔧 Troubleshooting steps:"
    echo "   1. Check Render dashboard for service status"
    echo "   2. Review service logs for errors"
    echo "   3. Verify environment variables are set"
    echo "   4. Check database and Redis connectivity"
    echo "   5. Ensure all external API keys are valid"
    
    exit 1
fi