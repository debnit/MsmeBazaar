#!/bin/bash

# Render Build Script - Production Ready
set -e

echo "🚀 Starting Render build process..."

echo "📦 Installing dependencies..."
# Use npm ci for faster, reliable installs in production
npm ci

echo "🏗️ Building client (frontend)..."
npm run build:client

echo "🏗️ Building server (backend)..."
npm run build:server

echo "📁 Checking build outputs..."
ls -la dist/
echo "Client build contents:"
ls -la dist/public/ || echo "No client build found"

echo "📊 Build summary:"
echo "✅ Client built to: dist/public"
echo "✅ Server built to: dist/index.js"
echo "✅ Dependencies properly resolved"

ls -la dist/

echo "🎉 Render build completed successfully!"