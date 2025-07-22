#!/bin/bash
set -e

echo "🚀 Setting up MSMEBazaar V2.0 Development Environment..."

# Make sure we're in the right directory
cd /workspace

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Install shared library dependencies
if [ -f "libs/shared/requirements.txt" ]; then
    echo "📦 Installing shared library dependencies..."
    pip install -r libs/shared/requirements.txt
fi

# Install dependencies for each service
services=("auth-api" "msme-api" "valuation-api" "match-api" "admin-api" "whatsapp-bot")

for service in "${services[@]}"; do
    if [ -f "apps/$service/requirements.txt" ]; then
        echo "📦 Installing dependencies for $service..."
        pip install -r "apps/$service/requirements.txt"
    fi
done

# Install Node.js dependencies for frontend
if [ -f "apps/web/package.json" ]; then
    echo "📦 Installing Node.js dependencies for frontend..."
    cd apps/web
    npm install
    cd /workspace
fi

# Set up environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file from template..."
    if [ -f ".env.template" ]; then
        cp .env.template .env
        echo "✅ .env file created from template"
    else
        echo "⚠️  No .env.template found, creating basic .env file"
        cat > .env << 'EOF'
# MSMEBazaar V2.0 Development Environment
ENVIRONMENT=development
DEBUG=true

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/msmebazaar_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-super-secret-jwt-key-for-development-only

# External APIs (set your own keys)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
OPENAI_API_KEY=your_openai_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
EOF
    fi
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs data uploads backups

# Set up Git configuration
echo "🔧 Setting up Git configuration..."
git config --global --add safe.directory /workspace

# Install additional development tools
echo "🛠️  Installing additional development tools..."
pip install --user \
    ipython \
    jupyter \
    pre-commit \
    bandit \
    safety

# Set up pre-commit hooks if .pre-commit-config.yaml exists
if [ -f ".pre-commit-config.yaml" ]; then
    echo "🪝 Setting up pre-commit hooks..."
    pre-commit install
fi

# Create helpful aliases
echo "🔧 Setting up helpful aliases..."
cat >> ~/.bashrc << 'EOF'

# MSMEBazaar V2.0 Development Aliases
alias ll='ls -la'
alias la='ls -la'
alias ..='cd ..'
alias ...='cd ../..'

# Service management
alias start-auth='cd /workspace/apps/auth-api && uvicorn main:app --host 0.0.0.0 --port 8001 --reload'
alias start-msme='cd /workspace/apps/msme-api && uvicorn main:app --host 0.0.0.0 --port 8002 --reload'
alias start-valuation='cd /workspace/apps/valuation-api && uvicorn main:app --host 0.0.0.0 --port 8003 --reload'
alias start-match='cd /workspace/apps/match-api && uvicorn main:app --host 0.0.0.0 --port 8004 --reload'
alias start-admin='cd /workspace/apps/admin-api && uvicorn main:app --host 0.0.0.0 --port 8005 --reload'
alias start-bot='cd /workspace/apps/whatsapp-bot && python main.py'
alias start-web='cd /workspace/apps/web && npm run dev'

# Development helpers
alias pytest-all='python -m pytest tests/ -v'
alias format-code='black . && isort . && flake8 .'
alias type-check='mypy apps/ libs/'
alias logs='tail -f logs/*.log'

# Quick navigation
alias goto-auth='cd /workspace/apps/auth-api'
alias goto-msme='cd /workspace/apps/msme-api'
alias goto-valuation='cd /workspace/apps/valuation-api'
alias goto-match='cd /workspace/apps/match-api'
alias goto-admin='cd /workspace/apps/admin-api'
alias goto-web='cd /workspace/apps/web'
alias goto-bot='cd /workspace/apps/whatsapp-bot'
alias goto-shared='cd /workspace/libs/shared'
alias goto-tests='cd /workspace/tests'

EOF

# Create a startup script for all services
echo "🚀 Creating startup script for all services..."
cat > /workspace/start-all-services.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting all MSMEBazaar V2.0 services..."

# Function to start a service in background
start_service() {
    local service_name=$1
    local service_path=$2
    local start_command=$3
    
    echo "Starting $service_name..."
    cd "$service_path"
    $start_command &
    echo "$service_name started with PID $!"
}

# Start all FastAPI services
start_service "Auth API" "/workspace/apps/auth-api" "uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
start_service "MSME API" "/workspace/apps/msme-api" "uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
start_service "Valuation API" "/workspace/apps/valuation-api" "uvicorn main:app --host 0.0.0.0 --port 8003 --reload"
start_service "Match API" "/workspace/apps/match-api" "uvicorn main:app --host 0.0.0.0 --port 8004 --reload"
start_service "Admin API" "/workspace/apps/admin-api" "uvicorn main:app --host 0.0.0.0 --port 8005 --reload"

# Start WhatsApp bot
start_service "WhatsApp Bot" "/workspace/apps/whatsapp-bot" "python main.py"

# Start Next.js frontend
start_service "Frontend" "/workspace/apps/web" "npm run dev"

echo ""
echo "✅ All services started successfully!"
echo ""
echo "🌐 Services available at:"
echo "  Frontend:     http://localhost:3000"
echo "  Auth API:     http://localhost:8001/docs"
echo "  MSME API:     http://localhost:8002/docs"
echo "  Valuation API: http://localhost:8003/docs"
echo "  Match API:    http://localhost:8004/docs"
echo "  Admin API:    http://localhost:8005/docs"
echo "  WhatsApp Bot: http://localhost:5000"
echo ""
echo "📝 To stop all services, run: pkill -f 'uvicorn\|npm\|python'"
echo ""

# Keep script running
wait
EOF

chmod +x /workspace/start-all-services.sh

# Create a health check script
echo "🏥 Creating health check script..."
cat > /workspace/health-check.sh << 'EOF'
#!/bin/bash

echo "🔍 MSMEBazaar V2.0 Health Check..."
echo "=================================="

# Check if services are running
services=(
    "Frontend:3000"
    "Auth API:8001"
    "MSME API:8002"
    "Valuation API:8003"
    "Match API:8004"
    "Admin API:8005"
    "WhatsApp Bot:5000"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $name is running on port $port"
        else
            echo "❌ $name is not responding on port $port"
        fi
    else
        # Fallback to curl for HTTP services
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            echo "✅ $name is running on port $port"
        else
            echo "❌ $name is not responding on port $port"
        fi
    fi
done

echo ""
echo "🏁 Health check completed!"
EOF

chmod +x /workspace/health-check.sh

# Print helpful information
echo ""
echo "✅ MSMEBazaar V2.0 Development Environment Setup Complete!"
echo ""
echo "🚀 Quick Start:"
echo "  1. Start all services: ./start-all-services.sh"
echo "  2. Check health: ./health-check.sh"
echo "  3. Run tests: pytest-all"
echo "  4. Format code: format-code"
echo ""
echo "📚 Helpful aliases have been added to your ~/.bashrc"
echo "   Restart your terminal or run 'source ~/.bashrc' to use them"
echo ""
echo "🌐 Once services are running, visit:"
echo "  - Frontend: http://localhost:3000"
echo "  - API Docs: http://localhost:8001/docs (and other ports)"
echo ""
echo "Happy coding! 🎉"