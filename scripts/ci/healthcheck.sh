#!/bin/bash
set -euo pipefail

# =============================================================================
# VyapaarMitra Post-Deployment Health Check Script
# Validates all services and endpoints after Kubernetes deployment
# =============================================================================

# Configuration
NAMESPACE="${KUBERNETES_NAMESPACE:-vyapaarmitra}"
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
RETRY_INTERVAL="${HEALTH_CHECK_RETRY_INTERVAL:-10}"
MAX_RETRIES="${HEALTH_CHECK_MAX_RETRIES:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Global variables
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Function to increment check counters
increment_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

increment_failure() {
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

# Function to get service URL from Kubernetes
get_service_url() {
    local service_name=$1
    local port=$2
    
    # Try to get LoadBalancer external IP first
    local external_ip
    external_ip=$(kubectl get service "${service_name}" -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [[ -n "$external_ip" ]]; then
        echo "http://${external_ip}:${port}"
        return
    fi
    
    # Try to get LoadBalancer hostname
    local external_hostname
    external_hostname=$(kubectl get service "${service_name}" -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [[ -n "$external_hostname" ]]; then
        echo "http://${external_hostname}:${port}"
        return
    fi
    
    # Fallback to port-forward
    log_warning "No external access found for ${service_name}, using port-forward"
    kubectl port-forward "service/${service_name}" "${port}:${port}" -n "${NAMESPACE}" &
    local pf_pid=$!
    sleep 5
    echo "http://localhost:${port}"
    # Store PID for cleanup
    echo "$pf_pid" >> /tmp/healthcheck_pids
}

# Function to cleanup port-forwards
cleanup_port_forwards() {
    if [[ -f /tmp/healthcheck_pids ]]; then
        while read -r pid; do
            kill "$pid" 2>/dev/null || true
        done < /tmp/healthcheck_pids
        rm -f /tmp/healthcheck_pids
    fi
}

# Trap to cleanup on exit
trap cleanup_port_forwards EXIT

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local max_wait=$2
    
    log_info "Waiting for service ${service_name} to be ready..."
    
    local wait_time=0
    while [[ $wait_time -lt $max_wait ]]; do
        if kubectl get service "${service_name}" -n "${NAMESPACE}" >/dev/null 2>&1; then
            log_success "Service ${service_name} is ready"
            return 0
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    log_error "Service ${service_name} is not ready after ${max_wait} seconds"
    return 1
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-10}
    local description=$4
    
    increment_check
    log_info "Checking ${description}: ${url}"
    
    local response
    local http_code
    
    # Make HTTP request with timeout
    if response=$(curl -s -w "%{http_code}" -o /tmp/curl_response --max-time "$timeout" "$url" 2>/dev/null); then
        http_code=${response: -3}
        
        if [[ "$http_code" == "$expected_status" ]]; then
            log_success "${description} responded with HTTP ${http_code}"
            return 0
        else
            log_error "${description} responded with HTTP ${http_code}, expected ${expected_status}"
            if [[ -f /tmp/curl_response ]]; then
                log_error "Response body: $(cat /tmp/curl_response)"
            fi
            increment_failure
            return 1
        fi
    else
        log_error "${description} request failed or timed out"
        increment_failure
        return 1
    fi
}

# Function to check JSON API endpoint
check_json_endpoint() {
    local url=$1
    local expected_field=$2
    local expected_value=$3
    local description=$4
    
    increment_check
    log_info "Checking ${description}: ${url}"
    
    local response
    if response=$(curl -s --max-time 10 "$url" 2>/dev/null); then
        # Check if response is valid JSON
        if echo "$response" | jq . >/dev/null 2>&1; then
            # Extract field value
            local field_value
            field_value=$(echo "$response" | jq -r "$expected_field" 2>/dev/null || echo "null")
            
            if [[ "$field_value" == "$expected_value" ]]; then
                log_success "${description} returned correct JSON response"
                return 0
            else
                log_error "${description} returned unexpected value: ${field_value}, expected: ${expected_value}"
                increment_failure
                return 1
            fi
        else
            log_error "${description} returned invalid JSON response"
            log_error "Response: $response"
            increment_failure
            return 1
        fi
    else
        log_error "${description} request failed"
        increment_failure
        return 1
    fi
}

# Function to check Kubernetes pods
check_pods_status() {
    log_info "Checking Kubernetes pods status..."
    increment_check
    
    local not_ready_pods
    not_ready_pods=$(kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase!=Running -o name 2>/dev/null | wc -l)
    
    if [[ "$not_ready_pods" -eq 0 ]]; then
        log_success "All pods are running"
        
        # Check if pods are ready
        local pods_not_ready
        pods_not_ready=$(kubectl get pods -n "${NAMESPACE}" -o json | jq '.items[] | select(.status.conditions[]? | select(.type=="Ready" and .status!="True")) | .metadata.name' 2>/dev/null | wc -l)
        
        if [[ "$pods_not_ready" -eq 0 ]]; then
            log_success "All pods are ready"
            return 0
        else
            log_error "Some pods are not ready"
            kubectl get pods -n "${NAMESPACE}" | grep -v "Running.*1/1"
            increment_failure
            return 1
        fi
    else
        log_error "Found ${not_ready_pods} pods not in Running state"
        kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase!=Running
        increment_failure
        return 1
    fi
}

# Function to check deployments rollout status
check_deployments() {
    log_info "Checking deployment rollout status..."
    
    local deployments
    deployments=$(kubectl get deployments -n "${NAMESPACE}" -o name 2>/dev/null)
    
    if [[ -z "$deployments" ]]; then
        log_warning "No deployments found in namespace ${NAMESPACE}"
        return 0
    fi
    
    local failed_deployments=0
    
    while IFS= read -r deployment; do
        increment_check
        local deployment_name
        deployment_name=$(echo "$deployment" | cut -d'/' -f2)
        
        log_info "Checking rollout status for ${deployment_name}..."
        
        if kubectl rollout status "$deployment" -n "${NAMESPACE}" --timeout=60s >/dev/null 2>&1; then
            log_success "${deployment_name} rollout completed successfully"
        else
            log_error "${deployment_name} rollout failed or timed out"
            kubectl rollout status "$deployment" -n "${NAMESPACE}" || true
            increment_failure
            failed_deployments=$((failed_deployments + 1))
        fi
    done <<< "$deployments"
    
    if [[ $failed_deployments -eq 0 ]]; then
        return 0
    else
        return 1
    fi
}

# Function to check services
check_services() {
    log_info "Checking Kubernetes services..."
    increment_check
    
    local services
    services=$(kubectl get services -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '{print $1}')
    
    if [[ -z "$services" ]]; then
        log_error "No services found in namespace ${NAMESPACE}"
        increment_failure
        return 1
    fi
    
    log_success "Found services: $(echo "$services" | tr '\n' ' ')"
    return 0
}

# Function to test database connectivity
check_database_connectivity() {
    log_info "Checking database connectivity..."
    increment_check
    
    # Try to run a simple database query from one of the API pods
    local auth_pod
    auth_pod=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/component=auth-api --no-headers -o custom-columns=":metadata.name" | head -1)
    
    if [[ -z "$auth_pod" ]]; then
        log_error "No auth-api pod found for database connectivity test"
        increment_failure
        return 1
    fi
    
    if kubectl exec "$auth_pod" -n "${NAMESPACE}" -- python -c "
import os
import asyncpg
import asyncio

async def test_db():
    try:
        conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
        result = await conn.fetchval('SELECT 1')
        await conn.close()
        print('Database connection successful')
        return result == 1
    except Exception as e:
        print(f'Database connection failed: {e}')
        return False

print('Database test:', asyncio.run(test_db()))
" 2>/dev/null | grep -q "Database connection successful"; then
        log_success "Database connectivity test passed"
        return 0
    else
        log_error "Database connectivity test failed"
        increment_failure
        return 1
    fi
}

# Function to check Redis connectivity
check_redis_connectivity() {
    log_info "Checking Redis connectivity..."
    increment_check
    
    # Try to connect to Redis from one of the API pods
    local auth_pod
    auth_pod=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/component=auth-api --no-headers -o custom-columns=":metadata.name" | head -1)
    
    if [[ -z "$auth_pod" ]]; then
        log_error "No auth-api pod found for Redis connectivity test"
        increment_failure
        return 1
    fi
    
    if kubectl exec "$auth_pod" -n "${NAMESPACE}" -- python -c "
import os
import redis

try:
    r = redis.from_url(os.getenv('REDIS_URL'))
    r.ping()
    print('Redis connection successful')
except Exception as e:
    print(f'Redis connection failed: {e}')
" 2>/dev/null | grep -q "Redis connection successful"; then
        log_success "Redis connectivity test passed"
        return 0
    else
        log_error "Redis connectivity test failed"
        increment_failure
        return 1
    fi
}

# Function to check ingress
check_ingress() {
    log_info "Checking ingress configuration..."
    increment_check
    
    if kubectl get ingress -n "${NAMESPACE}" >/dev/null 2>&1; then
        local ingress_ready
        ingress_ready=$(kubectl get ingress -n "${NAMESPACE}" -o json | jq '.items[0].status.loadBalancer.ingress[0].ip // .items[0].status.loadBalancer.ingress[0].hostname // empty' 2>/dev/null)
        
        if [[ -n "$ingress_ready" && "$ingress_ready" != "null" ]]; then
            log_success "Ingress is ready with external access: ${ingress_ready}"
            return 0
        else
            log_warning "Ingress exists but no external IP/hostname assigned yet"
            kubectl get ingress -n "${NAMESPACE}"
            return 0
        fi
    else
        log_warning "No ingress found in namespace ${NAMESPACE}"
        return 0
    fi
}

# Main health check function
main() {
    log_info "Starting VyapaarMitra health check..."
    log_info "Namespace: ${NAMESPACE}"
    log_info "Timeout: ${TIMEOUT}s"
    
    # Create temporary file for port-forward PIDs
    touch /tmp/healthcheck_pids
    
    # Step 1: Check Kubernetes resources
    log_info "=== Step 1: Kubernetes Resources ==="
    check_pods_status
    check_deployments
    check_services
    check_ingress
    
    # Step 2: Check database and cache connectivity
    log_info "=== Step 2: Database and Cache Connectivity ==="
    check_database_connectivity
    check_redis_connectivity
    
    # Step 3: Wait for services to be ready
    log_info "=== Step 3: Service Readiness ==="
    wait_for_service "vyapaarmitra-web" 60
    wait_for_service "vyapaarmitra-auth-api" 60
    wait_for_service "vyapaarmitra-msme-api" 60
    
    # Step 4: Check HTTP endpoints
    log_info "=== Step 4: HTTP Endpoint Checks ==="
    
    # Get service URLs
    local web_url
    local auth_api_url
    local msme_api_url
    
    web_url=$(get_service_url "vyapaarmitra-web" 80)
    auth_api_url=$(get_service_url "vyapaarmitra-auth-api" 80)
    msme_api_url=$(get_service_url "vyapaarmitra-msme-api" 80)
    
    # Wait a bit for port-forwards to establish
    sleep 10
    
    # Check web frontend
    check_http_endpoint "${web_url}/" 200 15 "Web Frontend Root"
    check_http_endpoint "${web_url}/api/health" 200 15 "Web Frontend Health"
    
    # Check auth API
    check_http_endpoint "${auth_api_url}/health" 200 15 "Auth API Health"
    check_http_endpoint "${auth_api_url}/metrics" 200 15 "Auth API Metrics"
    check_json_endpoint "${auth_api_url}/health" ".status" "healthy" "Auth API Health JSON"
    
    # Check MSME API  
    check_http_endpoint "${msme_api_url}/health" 200 15 "MSME API Health"
    check_http_endpoint "${msme_api_url}/metrics" 200 15 "MSME API Metrics"
    check_json_endpoint "${msme_api_url}/health" ".status" "healthy" "MSME API Health JSON"
    
    # Optional: Check valuation API if enabled
    if kubectl get service "vyapaarmitra-valuation-api" -n "${NAMESPACE}" >/dev/null 2>&1; then
        local valuation_api_url
        valuation_api_url=$(get_service_url "vyapaarmitra-valuation-api" 80)
        check_http_endpoint "${valuation_api_url}/health" 200 15 "Valuation API Health"
        check_http_endpoint "${valuation_api_url}/metrics" 200 15 "Valuation API Metrics"
    fi
    
    # Optional: Check admin dashboard if enabled
    if kubectl get service "vyapaarmitra-admin-dashboard" -n "${NAMESPACE}" >/dev/null 2>&1; then
        local admin_url
        admin_url=$(get_service_url "vyapaarmitra-admin-dashboard" 80)
        check_http_endpoint "${admin_url}/" 200 15 "Admin Dashboard"
    fi
    
    # Step 5: Performance check
    log_info "=== Step 5: Performance Check ==="
    increment_check
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 30 "${web_url}/" 2>/dev/null || echo "999")
    
    if (( $(echo "$response_time < 5.0" | bc -l) )); then
        log_success "Frontend response time: ${response_time}s (acceptable)"
    else
        log_warning "Frontend response time: ${response_time}s (slower than expected)"
    fi
    
    # Final summary
    log_info "=== Health Check Summary ==="
    log_info "Total checks performed: ${TOTAL_CHECKS}"
    log_info "Failed checks: ${FAILED_CHECKS}"
    log_info "Success rate: $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))%"
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "🎉 All health checks passed! VyapaarMitra is ready for traffic."
        exit 0
    else
        log_error "❌ ${FAILED_CHECKS} health check(s) failed. Please investigate before proceeding."
        
        # Show summary of cluster state for troubleshooting
        log_info "=== Troubleshooting Information ==="
        echo "Pods status:"
        kubectl get pods -n "${NAMESPACE}" || true
        echo ""
        echo "Services:"
        kubectl get services -n "${NAMESPACE}" || true
        echo ""
        echo "Ingress:"
        kubectl get ingress -n "${NAMESPACE}" || true
        
        exit 1
    fi
}

# Check dependencies
command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed. Aborting."; exit 1; }
command -v curl >/dev/null 2>&1 || { log_error "curl is required but not installed. Aborting."; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "jq is required but not installed. Aborting."; exit 1; }
command -v bc >/dev/null 2>&1 || { log_error "bc is required but not installed. Aborting."; exit 1; }

# Run main function
main "$@"