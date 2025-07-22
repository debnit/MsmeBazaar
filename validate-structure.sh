#!/bin/bash

echo "🔍 MSMEBazaar Monorepo Structure Validation"
echo "=========================================="

# Initialize counters
errors=0
warnings=0

# Check render.yaml exists
if [[ -f "render.yaml" ]]; then
    echo "✅ render.yaml found"
else
    echo "❌ render.yaml missing"
    ((errors++))
fi

# Check frontend structure
echo ""
echo "📁 Frontend Validation:"
if [[ -f "frontend/index.html" ]]; then
    echo "✅ frontend/index.html found"
else
    echo "❌ frontend/index.html missing"
    ((errors++))
fi

if [[ -f "frontend/vite.config.ts" ]]; then
    echo "✅ frontend/vite.config.ts found"
else
    echo "❌ frontend/vite.config.ts missing"
    ((errors++))
fi

if [[ -f "frontend/package.json" ]]; then
    echo "✅ frontend/package.json found"
else
    echo "❌ frontend/package.json missing"
    ((errors++))
fi

# Check backend services
echo ""
echo "🔧 Backend Services Validation:"

services=("auth-api" "msme-api" "admin-api" "payments-api" "whatsapp-bot")
for service in "${services[@]}"; do
    echo ""
    echo "Checking $service:"
    
    if [[ -f "backend/$service/main.py" ]]; then
        echo "  ✅ main.py found"
    else
        echo "  ❌ main.py missing"
        ((errors++))
    fi
    
    if [[ -f "backend/$service/requirements.txt" ]]; then
        echo "  ✅ requirements.txt found"
    else
        echo "  ❌ requirements.txt missing"
        ((errors++))
    fi
done

# Check for FastAPI app in main.py files
echo ""
echo "🚀 FastAPI App Validation:"
for service in "${services[@]}"; do
    if [[ -f "backend/$service/main.py" ]]; then
        if grep -q "FastAPI" "backend/$service/main.py"; then
            echo "✅ $service: FastAPI app found"
        else
            echo "⚠️  $service: FastAPI app not detected"
            ((warnings++))
        fi
    fi
done

# Check for health endpoints
echo ""
echo "🏥 Health Endpoint Validation:"
for service in "${services[@]}"; do
    if [[ -f "backend/$service/main.py" ]]; then
        if grep -q "/health" "backend/$service/main.py"; then
            echo "✅ $service: Health endpoint found"
        else
            echo "⚠️  $service: Health endpoint not detected"
            ((warnings++))
        fi
    fi
done

# Summary
echo ""
echo "📊 Validation Summary:"
echo "====================="
if [[ $errors -eq 0 ]]; then
    echo "🎉 All critical validations passed!"
    echo "✅ Ready for Render deployment"
else
    echo "❌ $errors critical error(s) found"
    echo "🔧 Please fix the errors before deploying"
fi

if [[ $warnings -gt 0 ]]; then
    echo "⚠️  $warnings warning(s) found"
    echo "💡 Consider addressing warnings for optimal deployment"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Fix any errors shown above"
echo "2. Commit render.yaml to your repository"
echo "3. Deploy using Render Blueprint"
echo "4. Configure environment variables in Render dashboard"

# Exit with error code if critical errors found
if [[ $errors -gt 0 ]]; then
    exit 1
else
    exit 0
fi