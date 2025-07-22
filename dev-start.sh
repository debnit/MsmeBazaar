#!/bin/bash

# MSMEBazaar V2 Development Startup Script
echo "🚀 Starting MSMEBazaar V2 Development Environment..."

# Check if concurrently is installed
if ! command -v concurrently &> /dev/null; then
    echo "📦 Installing concurrently..."
    npm install -g concurrently
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start development servers
echo "🔥 Starting development servers..."
concurrently \
    --prefix-colors "cyan,magenta,yellow,green,blue" \
    --names "FRONTEND,AUTH-API,MSME-API,ADMIN-API,ML-API" \
    "cd frontend && npm run dev" \
    "cd backend/auth-api && python -m uvicorn main:app --reload --port 8001" \
    "cd backend/msme-api && python -m uvicorn main:app --reload --port 8002" \
    "cd backend/admin-api && python -m uvicorn main:app --reload --port 8003" \
    "cd backend/ml-api && python -m uvicorn main:app --reload --port 8004"