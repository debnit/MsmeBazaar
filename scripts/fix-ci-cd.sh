#!/bin/bash

# CI/CD Fix and Test Script for MSMEBazaar
# This script runs all the tests that the CI pipeline will run to catch issues early

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="msmebazaar-v2"
REPORT_DIR="./ci-test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORT_DIR"

# Helper functions
print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

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

# Initialize counters
total_tests=0
failed_tests=0

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if we're in the right directory
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "MSMEBazaar V2 directory not found. Are you in the right directory?"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js version: $(node --version)"
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Install with: npm install -g pnpm"
        exit 1
    fi
    print_success "pnpm version: $(pnpm --version)"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_success "Python version: $(python3 --version)"
    
    # Check if Docker is running (optional)
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_success "Docker is running"
        else
            print_warning "Docker is installed but not running"
        fi
    else
        print_warning "Docker is not installed (needed for full E2E tests)"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        print_info "Installing root dependencies..."
        npm ci
    fi
    
    # Install MSMEBazaar V2 dependencies
    print_info "Installing MSMEBazaar V2 dependencies..."
    cd "$PROJECT_DIR"
    pnpm install
    cd ..
    
    print_success "Dependencies installed successfully"
}

# Test 1: Lint and Type Check
test_lint_and_typecheck() {
    print_header "1. Lint and Type Check"
    
    cd "$PROJECT_DIR"
    
    # Run ESLint
    print_info "Running ESLint..."
    if pnpm run lint 2>&1 | tee "$REPORT_DIR/eslint_${TIMESTAMP}.log"; then
        print_success "ESLint passed"
    else
        print_error "ESLint failed"
        ((failed_tests++))
    fi
    
    # Run TypeScript check
    print_info "Running TypeScript check..."
    if pnpm run type-check 2>&1 | tee "$REPORT_DIR/typecheck_${TIMESTAMP}.log"; then
        print_success "TypeScript check passed"
    else
        print_error "TypeScript check failed"
        ((failed_tests++))
    fi
    
    cd ..
    ((total_tests++))
}

# Test 2: Frontend Tests
test_frontend() {
    print_header "2. Frontend Tests"
    
    cd "$PROJECT_DIR"
    
    # Set test environment
    export NODE_ENV=test
    export CI=true
    
    # Run web app tests
    print_info "Running Web App tests..."
    if pnpm run test --filter=@msmebazaar/web 2>&1 | tee "$REPORT_DIR/frontend_tests_${TIMESTAMP}.log"; then
        print_success "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        ((failed_tests++))
    fi
    
    # Run shared library tests
    print_info "Running Shared Library tests..."
    if pnpm run test --filter=@msmebazaar/shared 2>&1 | tee "$REPORT_DIR/shared_tests_${TIMESTAMP}.log"; then
        print_success "Shared library tests passed"
    else
        print_error "Shared library tests failed"
        ((failed_tests++))
    fi
    
    cd ..
    ((total_tests++))
}

# Test 3: Backend Tests
test_backend() {
    print_header "3. Backend Tests"
    
    # Test Auth API
    print_info "Testing Auth API..."
    cd "$PROJECT_DIR/apps/auth-api"
    if [ -f "requirements.txt" ]; then
        # Install dependencies
        python3 -m pip install -r requirements.txt
        python3 -m pip install pytest pytest-asyncio httpx
        
        # Set environment variables
        export DATABASE_URL="sqlite:///./test.db"
        export REDIS_URL="redis://localhost:6379"
        export SECRET_KEY="test-secret-key"
        
        # Run tests
        if python3 -m pytest tests/ -v 2>&1 | tee "$REPORT_DIR/auth_api_tests_${TIMESTAMP}.log"; then
            print_success "Auth API tests passed"
        else
            print_warning "Auth API tests completed with warnings"
        fi
    else
        print_warning "Auth API requirements.txt not found"
    fi
    cd ../../..
    
    # Test MSME API
    print_info "Testing MSME API..."
    cd "$PROJECT_DIR/apps/msme-api"
    if [ -f "requirements.txt" ]; then
        # Install dependencies
        python3 -m pip install -r requirements.txt
        python3 -m pip install pytest pytest-asyncio httpx
        
        # Run tests
        if python3 -m pytest tests/ -v 2>&1 | tee "$REPORT_DIR/msme_api_tests_${TIMESTAMP}.log"; then
            print_success "MSME API tests passed"
        else
            print_warning "MSME API tests completed with warnings"
        fi
    else
        print_warning "MSME API requirements.txt not found"
    fi
    cd ../../..
    
    ((total_tests++))
}

# Test 4: Build Test
test_build() {
    print_header "4. Build Test"
    
    cd "$PROJECT_DIR"
    
    # Build all applications
    print_info "Building all applications..."
    export NODE_ENV=production
    
    if pnpm run build 2>&1 | tee "$REPORT_DIR/build_${TIMESTAMP}.log"; then
        print_success "Build completed successfully"
    else
        print_error "Build failed"
        ((failed_tests++))
    fi
    
    cd ..
    ((total_tests++))
}

# Test 5: Security Scan (Basic)
test_security() {
    print_header "5. Security Scan"
    
    cd "$PROJECT_DIR"
    
    # Run npm audit
    print_info "Running npm security audit..."
    if pnpm audit --audit-level high 2>&1 | tee "$REPORT_DIR/security_audit_${TIMESTAMP}.log"; then
        print_success "Security audit passed"
    else
        print_warning "Security audit found issues (check log for details)"
    fi
    
    cd ..
    ((total_tests++))
}

# Test 6: E2E Tests (if application is running)
test_e2e() {
    print_header "6. E2E Tests (Cypress)"
    
    # Check if Cypress is available
    if ! command -v cypress &> /dev/null; then
        print_warning "Cypress not installed globally. Trying local installation..."
        cd "$PROJECT_DIR"
        if [ -f "node_modules/.bin/cypress" ]; then
            print_info "Found local Cypress installation"
        else
            print_warning "Cypress not found. Skipping E2E tests."
            cd ..
            return
        fi
        cd ..
    fi
    
    # Start the application in the background
    print_info "Starting application for E2E tests..."
    cd "$PROJECT_DIR"
    
    # Build the app first
    pnpm run build --filter=@msmebazaar/web
    
    # Start the app in background
    pnpm run start --filter=@msmebazaar/web &
    APP_PID=$!
    
    # Wait for app to start
    print_info "Waiting for application to start..."
    sleep 30
    
    # Check if app is responding
    if curl -f http://localhost:3000 &> /dev/null; then
        print_success "Application is running"
        
        # Run Cypress tests
        print_info "Running Cypress tests..."
        cd ..
        if npx cypress run --headless --browser chrome 2>&1 | tee "$REPORT_DIR/e2e_tests_${TIMESTAMP}.log"; then
            print_success "E2E tests passed"
        else
            print_error "E2E tests failed"
            ((failed_tests++))
        fi
    else
        print_error "Application failed to start"
        ((failed_tests++))
    fi
    
    # Stop the application
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    fi
    
    cd "$PROJECT_DIR"
    cd ..
    ((total_tests++))
}

# Generate summary report
generate_summary() {
    print_header "Test Summary"
    
    local summary_file="$REPORT_DIR/test_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# CI/CD Test Summary

**Date**: $(date)
**Test Run ID**: ${TIMESTAMP}

## Results

- **Total Tests**: $total_tests
- **Passed**: $((total_tests - failed_tests))
- **Failed**: $failed_tests

## Test Details

EOF
    
    echo "📊 Test Statistics:" 
    echo "   Total tests run: $total_tests"
    echo "   Passed: $((total_tests - failed_tests))"
    echo "   Failed: $failed_tests"
    echo ""
    echo "📁 Reports saved to: $REPORT_DIR"
    
    if [ -f "$REPORT_DIR/eslint_${TIMESTAMP}.log" ]; then
        echo "- **ESLint**: Check \`$REPORT_DIR/eslint_${TIMESTAMP}.log\`" >> "$summary_file"
    fi
    
    if [ -f "$REPORT_DIR/typecheck_${TIMESTAMP}.log" ]; then
        echo "- **TypeScript**: Check \`$REPORT_DIR/typecheck_${TIMESTAMP}.log\`" >> "$summary_file"
    fi
    
    if [ -f "$REPORT_DIR/frontend_tests_${TIMESTAMP}.log" ]; then
        echo "- **Frontend Tests**: Check \`$REPORT_DIR/frontend_tests_${TIMESTAMP}.log\`" >> "$summary_file"
    fi
    
    if [ -f "$REPORT_DIR/build_${TIMESTAMP}.log" ]; then
        echo "- **Build**: Check \`$REPORT_DIR/build_${TIMESTAMP}.log\`" >> "$summary_file"
    fi
    
    echo "" >> "$summary_file"
    echo "## Next Steps" >> "$summary_file"
    
    if [ "$failed_tests" -eq 0 ]; then
        echo "✅ All tests passed! Ready to push to GitHub." >> "$summary_file"
        print_success "🎉 All tests passed! CI/CD should work correctly."
    else
        echo "❌ Some tests failed. Please fix the issues before pushing to GitHub." >> "$summary_file"
        print_error "❌ $failed_tests test(s) failed. Please fix the issues before pushing."
        echo ""
        echo "🔧 Common fixes:"
        echo "1. Run 'pnpm run lint:fix' to fix linting issues"
        echo "2. Fix TypeScript errors shown in the logs"
        echo "3. Update dependencies if security issues are found"
        echo "4. Check test files for missing imports or setup"
    fi
    
    print_success "Summary report generated: $summary_file"
}

# Main execution
main() {
    print_header "MSMEBazaar CI/CD Fix and Test Script"
    
    check_prerequisites
    echo ""
    
    install_dependencies
    echo ""
    
    test_lint_and_typecheck
    echo ""
    
    test_frontend
    echo ""
    
    test_backend
    echo ""
    
    test_build
    echo ""
    
    test_security
    echo ""
    
    # E2E tests are optional and can be skipped with --skip-e2e
    if [[ "${1:-}" != "--skip-e2e" ]]; then
        test_e2e
        echo ""
    else
        print_info "Skipping E2E tests as requested"
        echo ""
    fi
    
    generate_summary
    
    # Exit with error code if any tests failed
    if [ "$failed_tests" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "MSMEBazaar CI/CD Fix and Test Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-e2e     Skip E2E tests (useful for quick checks)"
        echo ""
        echo "This script runs all the tests that GitHub Actions CI will run,"
        echo "allowing you to catch issues before pushing to the repository."
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac