#!/bin/bash
set -e

echo "🚀 MSMEBazaar Backend Migration Started..."

# Backup
mkdir -p _backup_before_migration
cp -r apps/*-api _backup_before_migration/ 2>/dev/null || true
cp -r microservices _backup_before_migration/ 2>/dev/null || true

# Create target dirs
mkdir -p microservices/{api-gateway,auth-service,msme-service,payments-service,valuation-service,matchmaking-service,notification-service,ml-services/{recommendation-service,ml-monitoring-service},shared}

# Move APIs
move_service() {
  local src=$1
  local dest=$2
  if [ -d "$src" ]; then
    echo "📦 Moving $src → $dest"
    mv "$src"/* "$dest"/ 2>/dev/null || true
  else
    echo "⚠️ $src not found"
  fi
}

move_service "apps/auth-api" "microservices/auth-service"
move_service "apps/msme-api" "microservices/msme-service"
move_service "apps/payments-api" "microservices/payments-service"
move_service "apps/valuation-api" "microservices/valuation-service"
move_service "apps/match-api" "microservices/matchmaking-service"
move_service "apps/ml-api" "microservices/ml-services/recommendation-service"

echo "✅ Backend migration complete. Frontend untouched."
