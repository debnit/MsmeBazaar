#!/bin/bash

# Render Build Script for MSMEBazaar
# This script runs on Render to build the application

set -e  # Exit on any error

echo "🚀 Starting MSMEBazaar build process..."

# Set production environment
export NODE_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production --legacy-peer-deps

# Install dev dependencies needed for build
echo "🔧 Installing build dependencies..."
npm install --legacy-peer-deps

# Build the client (frontend)
echo "🎨 Building client (frontend)..."
npm run build:client

# Build the server (backend)
echo "⚙️ Building server (backend)..."
npm run build:server

# Verify build files exist
echo "✅ Verifying build files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Server build failed - dist/index.js not found"
    exit 1
fi

if [ ! -f "dist/public/index.html" ]; then
    echo "❌ Client build failed - dist/public/index.html not found"
    exit 1
fi

echo "🎉 Build completed successfully!"
echo "📊 Build summary:"
echo "   - Server: dist/index.js ($(du -h dist/index.js | cut -f1))"
echo "   - Client: dist/public/ ($(du -sh dist/public/ | cut -f1))"
echo "   - Assets: $(find dist/public -name "*.js" -o -name "*.css" | wc -l) files"

# List generated files for debugging
echo "📁 Generated files:"
ls -la dist/
ls -la dist/public/

echo "✅ MSMEBazaar build ready for production!"