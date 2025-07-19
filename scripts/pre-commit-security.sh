#!/bin/bash

# Pre-commit Security Hook for MSMEBazaar
# This script runs basic security checks before committing code
# 
# To install: Copy this file to .git/hooks/pre-commit and make it executable
# cp scripts/pre-commit-security.sh .git/hooks/pre-commit
# chmod +x .git/hooks/pre-commit

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 Running pre-commit security checks...${NC}"

# Check if trivy is available
if ! command -v trivy &> /dev/null; then
    echo -e "${YELLOW}⚠️  Trivy not installed. Skipping advanced security checks.${NC}"
    echo -e "${YELLOW}   Install with: brew install aquasecurity/trivy/trivy${NC}"
    trivy_available=false
else
    trivy_available=true
fi

# Get list of staged files
staged_files=$(git diff --cached --name-only)

if [ -z "$staged_files" ]; then
    echo -e "${GREEN}✅ No staged files to check${NC}"
    exit 0
fi

echo "Checking staged files..."

# 1. Check for common secrets in staged files
echo -e "${YELLOW}🔍 Checking for secrets...${NC}"

secret_patterns=(
    'AKIA[0-9A-Z]{16}'                    # AWS Access Key
    '[0-9a-zA-Z/+]{40}'                   # AWS Secret Key pattern
    'ghp_[0-9a-zA-Z]{36}'                 # GitHub Personal Access Token
    'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'  # JWT Token
    'sk-[a-zA-Z0-9]{48}'                  # OpenAI API Key
    'postgres://[^:]+:[^@]+@'             # Database URL with credentials
    'mysql://[^:]+:[^@]+@'                # MySQL URL with credentials
    'mongodb://[^:]+:[^@]+@'              # MongoDB URL with credentials
)

secret_found=false

for file in $staged_files; do
    if [ -f "$file" ]; then
        for pattern in "${secret_patterns[@]}"; do
            if grep -qE "$pattern" "$file" 2>/dev/null; then
                echo -e "${RED}❌ Potential secret found in $file${NC}"
                echo -e "${RED}   Pattern: $pattern${NC}"
                secret_found=true
            fi
        done
    fi
done

if [ "$secret_found" = true ]; then
    echo -e "${RED}❌ Secrets detected! Please remove them before committing.${NC}"
    echo -e "${YELLOW}💡 Use environment variables or secure secret management instead.${NC}"
    exit 1
fi

# 2. Check for hardcoded passwords/tokens in common patterns
echo -e "${YELLOW}🔍 Checking for hardcoded credentials...${NC}"

credential_patterns=(
    'password\s*=\s*["\'][^"\']*["\']'
    'PASSWORD\s*=\s*["\'][^"\']*["\']'
    'api[_-]?key\s*=\s*["\'][^"\']*["\']'
    'API[_-]?KEY\s*=\s*["\'][^"\']*["\']'
    'secret\s*=\s*["\'][^"\']*["\']'
    'SECRET\s*=\s*["\'][^"\']*["\']'
    'token\s*=\s*["\'][^"\']*["\']'
    'TOKEN\s*=\s*["\'][^"\']*["\']'
)

credential_found=false

for file in $staged_files; do
    if [ -f "$file" ] && [[ "$file" != *.md ]] && [[ "$file" != *.txt ]]; then
        for pattern in "${credential_patterns[@]}"; do
            if grep -qEi "$pattern" "$file" 2>/dev/null; then
                # Skip if it's a comment or example
                if ! grep -E "^\s*(#|//|\*|<!--)" "$file" | grep -qEi "$pattern" 2>/dev/null; then
                    echo -e "${RED}❌ Potential hardcoded credential in $file${NC}"
                    echo -e "${RED}   Pattern: $pattern${NC}"
                    credential_found=true
                fi
            fi
        done
    fi
done

if [ "$credential_found" = true ]; then
    echo -e "${RED}❌ Hardcoded credentials detected!${NC}"
    echo -e "${YELLOW}💡 Use environment variables or configuration files instead.${NC}"
    exit 1
fi

# 3. Quick filesystem scan with Trivy (if available)
if [ "$trivy_available" = true ]; then
    echo -e "${YELLOW}🔍 Running quick Trivy scan...${NC}"
    
    # Run a quick scan on staged files only
    temp_dir=$(mktemp -d)
    
    # Copy staged files to temp directory for scanning
    for file in $staged_files; do
        if [ -f "$file" ]; then
            mkdir -p "$temp_dir/$(dirname "$file")"
            cp "$file" "$temp_dir/$file"
        fi
    done
    
    # Run Trivy on temp directory
    if trivy fs "$temp_dir" --severity CRITICAL,HIGH --quiet --exit-code 1 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ No critical/high vulnerabilities in staged files${NC}"
    else
        echo -e "${RED}❌ Critical or high vulnerabilities found in staged files!${NC}"
        echo -e "${YELLOW}💡 Run './scripts/security-scan.sh' for detailed analysis${NC}"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    rm -rf "$temp_dir"
fi

# 4. Check for .env files being committed
echo -e "${YELLOW}🔍 Checking for .env files...${NC}"

for file in $staged_files; do
    if [[ "$file" == *.env ]] || [[ "$file" == .env* ]]; then
        if [[ "$file" != *.env.example ]] && [[ "$file" != *.env.template ]]; then
            echo -e "${RED}❌ Environment file being committed: $file${NC}"
            echo -e "${YELLOW}💡 Add to .gitignore or use .env.example instead${NC}"
            exit 1
        fi
    fi
done

# 5. Check for large files that might contain sensitive data
echo -e "${YELLOW}🔍 Checking for large files...${NC}"

for file in $staged_files; do
    if [ -f "$file" ]; then
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
        if [ "$file_size" -gt 1048576 ]; then  # 1MB
            echo -e "${YELLOW}⚠️  Large file being committed: $file ($(($file_size / 1024))KB)${NC}"
            echo -e "${YELLOW}   Consider if this file contains sensitive data${NC}"
        fi
    fi
done

# 6. Check package.json files for vulnerable dependencies (basic check)
echo -e "${YELLOW}🔍 Checking package.json files...${NC}"

for file in $staged_files; do
    if [[ "$file" == *package.json ]]; then
        echo -e "${YELLOW}📦 package.json modified: $file${NC}"
        echo -e "${YELLOW}💡 Run 'npm audit' to check for vulnerabilities${NC}"
    fi
done

echo -e "${GREEN}✅ Pre-commit security checks passed!${NC}"
echo -e "${YELLOW}💡 For comprehensive security scanning, run: ./scripts/security-scan.sh${NC}"

exit 0