#!/bin/bash

# Render Build Script - Production Ready
set -e

echo "🚀 Starting Render build process..."

# Set production environment
export NODE_ENV=production

echo "📦 Installing all dependencies for build (legacy peer deps)..."
npm install --no-audit --no-fund --legacy-peer-deps

echo "🏗️ Building client (frontend)..."
npm run build:client

echo "🏗️ Building server (backend)..."
npm run build:server

echo "📁 Checking build outputs..."
ls -la dist/
echo "Client build contents:"
ls -la dist/public/ || echo "No client build found"

echo "🧹 Cleaning up dev dependencies..."
npm prune --production

echo "📊 Build summary:"
echo "✅ Client built to: dist/public"
echo "✅ Server built to: dist/index.js"
echo "📦 Production dependencies only"

ls -la dist/

echo "🎉 Render build completed successfully!"
