#!/bin/bash

# Security Scan Script for MSMEBazaar
# This script runs comprehensive security scans locally before committing code

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRIVY_CONFIG="trivy.yaml"
TRIVYIGNORE_FILE=".trivyignore"
REPORT_DIR="./security-reports"
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

# Check if Trivy is installed
check_trivy() {
    if ! command -v trivy &> /dev/null; then
        print_error "Trivy is not installed. Please install it first:"
        echo "  # For macOS:"
        echo "  brew install aquasecurity/trivy/trivy"
        echo ""
        echo "  # For Ubuntu/Debian:"
        echo "  wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -"
        echo "  echo deb https://aquasecurity.github.io/trivy-repo/deb \$(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list"
        echo "  sudo apt-get update && sudo apt-get install trivy"
        echo ""
        echo "  # Or download binary from: https://github.com/aquasecurity/trivy/releases"
        exit 1
    fi
}

# Update Trivy vulnerability database
update_trivy_db() {
    print_info "Updating Trivy vulnerability database..."
    trivy image --download-db-only
    print_success "Trivy database updated"
}

# Scan filesystem for vulnerabilities
scan_filesystem() {
    print_header "Filesystem Vulnerability Scan"
    
    local report_file="$REPORT_DIR/filesystem_scan_${TIMESTAMP}.json"
    local sarif_file="$REPORT_DIR/filesystem_scan_${TIMESTAMP}.sarif"
    
    print_info "Scanning filesystem for vulnerabilities..."
    
    # Run filesystem scan
    trivy fs . \
        --config "$TRIVY_CONFIG" \
        --ignorefile "$TRIVYIGNORE_FILE" \
        --format json \
        --output "$report_file" \
        --severity CRITICAL,HIGH,MEDIUM \
        --quiet
    
    # Generate SARIF format for GitHub integration
    trivy fs . \
        --config "$TRIVY_CONFIG" \
        --ignorefile "$TRIVYIGNORE_FILE" \
        --format sarif \
        --output "$sarif_file" \
        --severity CRITICAL,HIGH,MEDIUM \
        --quiet
    
    # Display results
    trivy fs . \
        --config "$TRIVY_CONFIG" \
        --ignorefile "$TRIVYIGNORE_FILE" \
        --severity CRITICAL,HIGH,MEDIUM
    
    # Check for critical/high vulnerabilities
    local critical_high_count=$(jq '.Results[]? | select(.Vulnerabilities) | .Vulnerabilities[] | select(.Severity == "CRITICAL" or .Severity == "HIGH") | .VulnerabilityID' "$report_file" 2>/dev/null | wc -l || echo "0")
    
    if [ "$critical_high_count" -gt 0 ]; then
        print_error "Found $critical_high_count critical/high severity vulnerabilities in filesystem"
        return 1
    else
        print_success "No critical/high severity vulnerabilities found in filesystem"
        return 0
    fi
}

# Scan for secrets
scan_secrets() {
    print_header "Secret Detection Scan"
    
    local report_file="$REPORT_DIR/secrets_scan_${TIMESTAMP}.json"
    
    print_info "Scanning for secrets and credentials..."
    
    # Run secret scan
    trivy fs . \
        --security-checks secret \
        --format json \
        --output "$report_file" \
        --quiet
    
    # Display results
    trivy fs . \
        --security-checks secret
    
    # Check for secrets
    local secrets_count=$(jq '.Results[]? | select(.Secrets) | .Secrets | length' "$report_file" 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    
    if [ "$secrets_count" -gt 0 ]; then
        print_error "Found $secrets_count secrets in codebase"
        return 1
    else
        print_success "No secrets detected in codebase"
        return 0
    fi
}

# Scan Docker images
scan_docker_images() {
    print_header "Docker Image Security Scan"
    
    local images_found=false
    local scan_failed=false
    
    # List of images to scan
    local images=(
        "node:18-alpine"
        "python:3.11-slim"
    )
    
    # Check if any Dockerfiles exist
    if find . -name "Dockerfile*" -type f | grep -q .; then
        images_found=true
        print_info "Found Dockerfiles. Building and scanning images..."
        
        # Build and scan images from MSMEBazaar V2
        if [ -d "msmebazaar-v2/apps" ]; then
            for app_dir in msmebazaar-v2/apps/*/; do
                if [ -f "$app_dir/Dockerfile" ]; then
                    local app_name=$(basename "$app_dir")
                    local image_name="msmebazaar-$app_name:security-scan"
                    
                    print_info "Building image for $app_name..."
                    if docker build -t "$image_name" "$app_dir" >/dev/null 2>&1; then
                        print_info "Scanning $image_name..."
                        
                        local report_file="$REPORT_DIR/image_${app_name}_${TIMESTAMP}.json"
                        
                        trivy image "$image_name" \
                            --format json \
                            --output "$report_file" \
                            --severity CRITICAL,HIGH \
                            --quiet
                        
                        trivy image "$image_name" \
                            --severity CRITICAL,HIGH
                        
                        # Check for critical/high vulnerabilities
                        local vuln_count=$(jq '.Results[]? | select(.Vulnerabilities) | .Vulnerabilities[] | select(.Severity == "CRITICAL" or .Severity == "HIGH") | .VulnerabilityID' "$report_file" 2>/dev/null | wc -l || echo "0")
                        
                        if [ "$vuln_count" -gt 0 ]; then
                            print_error "Found $vuln_count critical/high vulnerabilities in $image_name"
                            scan_failed=true
                        else
                            print_success "No critical/high vulnerabilities in $image_name"
                        fi
                        
                        # Clean up image
                        docker rmi "$image_name" >/dev/null 2>&1 || true
                    else
                        print_warning "Failed to build image for $app_name"
                    fi
                fi
            done
        fi
    fi
    
    # Scan base images
    for image in "${images[@]}"; do
        images_found=true
        print_info "Scanning base image: $image"
        
        local safe_image_name=$(echo "$image" | sed 's/[^a-zA-Z0-9]/_/g')
        local report_file="$REPORT_DIR/base_image_${safe_image_name}_${TIMESTAMP}.json"
        
        trivy image "$image" \
            --format json \
            --output "$report_file" \
            --severity CRITICAL,HIGH \
            --quiet
        
        trivy image "$image" \
            --severity CRITICAL,HIGH
        
        # Check for critical/high vulnerabilities
        local vuln_count=$(jq '.Results[]? | select(.Vulnerabilities) | .Vulnerabilities[] | select(.Severity == "CRITICAL" or .Severity == "HIGH") | .VulnerabilityID' "$report_file" 2>/dev/null | wc -l || echo "0")
        
        if [ "$vuln_count" -gt 0 ]; then
            print_warning "Found $vuln_count critical/high vulnerabilities in base image $image"
            print_info "Consider updating to a newer version"
        else
            print_success "No critical/high vulnerabilities in base image $image"
        fi
    done
    
    if [ "$images_found" = false ]; then
        print_info "No Docker images to scan"
        return 0
    fi
    
    if [ "$scan_failed" = true ]; then
        return 1
    else
        return 0
    fi
}

# Check NPM packages for vulnerabilities
scan_npm_packages() {
    print_header "NPM Package Security Audit"
    
    local audit_failed=false
    
    # Check if package.json exists in root
    if [ -f "package.json" ]; then
        print_info "Running npm audit on root package.json..."
        if ! npm audit --audit-level high; then
            audit_failed=true
        fi
    fi
    
    # Check MSMEBazaar V2 packages
    if [ -f "msmebazaar-v2/package.json" ]; then
        print_info "Running npm audit on MSMEBazaar V2..."
        cd msmebazaar-v2
        if ! npm audit --audit-level high; then
            audit_failed=true
        fi
        cd ..
    fi
    
    # Check individual app packages
    if [ -d "msmebazaar-v2/apps" ]; then
        for app_dir in msmebazaar-v2/apps/*/; do
            if [ -f "$app_dir/package.json" ]; then
                local app_name=$(basename "$app_dir")
                print_info "Running npm audit on $app_name..."
                cd "$app_dir"
                if ! npm audit --audit-level high; then
                    audit_failed=true
                fi
                cd - >/dev/null
            fi
        done
    fi
    
    if [ "$audit_failed" = true ]; then
        print_error "NPM audit found high/critical vulnerabilities"
        return 1
    else
        print_success "NPM audit passed - no high/critical vulnerabilities"
        return 0
    fi
}

# Generate security summary report
generate_summary() {
    print_header "Security Scan Summary"
    
    local summary_file="$REPORT_DIR/security_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# Security Scan Summary

**Date**: $(date)
**Scan ID**: ${TIMESTAMP}

## Scan Results

EOF
    
    if [ -f "$REPORT_DIR/filesystem_scan_${TIMESTAMP}.json" ]; then
        local fs_vulns=$(jq '.Results[]? | select(.Vulnerabilities) | .Vulnerabilities | length' "$REPORT_DIR/filesystem_scan_${TIMESTAMP}.json" 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
        echo "- **Filesystem Vulnerabilities**: $fs_vulns" >> "$summary_file"
    fi
    
    if [ -f "$REPORT_DIR/secrets_scan_${TIMESTAMP}.json" ]; then
        local secrets=$(jq '.Results[]? | select(.Secrets) | .Secrets | length' "$REPORT_DIR/secrets_scan_${TIMESTAMP}.json" 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
        echo "- **Secrets Detected**: $secrets" >> "$summary_file"
    fi
    
    echo "" >> "$summary_file"
    echo "## Report Files Generated" >> "$summary_file"
    echo "" >> "$summary_file"
    
    for report in "$REPORT_DIR"/*_${TIMESTAMP}.*; do
        if [ -f "$report" ]; then
            echo "- $(basename "$report")" >> "$summary_file"
        fi
    done
    
    print_success "Security summary generated: $summary_file"
}

# Main execution
main() {
    print_header "MSMEBazaar Security Scanner"
    
    # Check prerequisites
    check_trivy
    
    # Initialize counters
    local total_scans=0
    local failed_scans=0
    
    # Update database
    update_trivy_db
    
    # Run filesystem scan
    print_info "Running filesystem vulnerability scan..."
    if ! scan_filesystem; then
        ((failed_scans++))
    fi
    ((total_scans++))
    
    echo ""
    
    # Run secret scan
    print_info "Running secret detection scan..."
    if ! scan_secrets; then
        ((failed_scans++))
    fi
    ((total_scans++))
    
    echo ""
    
    # Run Docker image scan
    print_info "Running Docker image security scan..."
    if ! scan_docker_images; then
        ((failed_scans++))
    fi
    ((total_scans++))
    
    echo ""
    
    # Run NPM audit
    print_info "Running NPM package security audit..."
    if ! scan_npm_packages; then
        ((failed_scans++))
    fi
    ((total_scans++))
    
    echo ""
    
    # Generate summary
    generate_summary
    
    # Final results
    print_header "Scan Complete"
    
    echo "📊 Scan Statistics:"
    echo "   Total scans: $total_scans"
    echo "   Passed: $((total_scans - failed_scans))"
    echo "   Failed: $failed_scans"
    echo ""
    echo "📁 Reports saved to: $REPORT_DIR"
    
    if [ "$failed_scans" -eq 0 ]; then
        print_success "🎉 All security scans passed! Safe to commit."
        exit 0
    else
        print_error "❌ $failed_scans security scan(s) failed. Please fix vulnerabilities before committing."
        echo ""
        echo "🔧 Next steps:"
        echo "1. Review the detailed reports in $REPORT_DIR"
        echo "2. Fix critical and high severity vulnerabilities"
        echo "3. Update dependencies and base images"
        echo "4. Add any accepted risks to .trivyignore with proper documentation"
        echo "5. Re-run this script before committing"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "MSMEBazaar Security Scanner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --fs-only      Run only filesystem scan"
        echo "  --secrets-only Run only secret detection"
        echo "  --docker-only  Run only Docker image scan"
        echo "  --npm-only     Run only NPM audit"
        echo ""
        echo "Examples:"
        echo "  $0                # Run all security scans"
        echo "  $0 --fs-only      # Run only filesystem vulnerability scan"
        echo "  $0 --secrets-only # Run only secret detection"
        exit 0
        ;;
    --fs-only)
        check_trivy
        update_trivy_db
        scan_filesystem
        exit $?
        ;;
    --secrets-only)
        check_trivy
        scan_secrets
        exit $?
        ;;
    --docker-only)
        check_trivy
        update_trivy_db
        scan_docker_images
        exit $?
        ;;
    --npm-only)
        scan_npm_packages
        exit $?
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac