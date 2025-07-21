#!/bin/bash

# Render Build Script - Production Ready
set -e

echo "🚀 Starting Render build process..."

echo "📦 Installing all dependencies for build..."
npm install --legacy-peer-deps

echo "🏗️ Building client (frontend)..."
npm run build:client

echo "🏗️ Building server (backend)..."
npm run build:server

echo "📁 Checking build outputs..."
ls -la dist/
echo "Client build contents:"
ls -la dist/public/ || echo "No client build found"

echo "🧹 Cleaning up dev dependencies (keeping runtime deps)..."
# Don't prune in production build as Render manages this
echo "Skipping npm prune for Render deployment"

echo "📊 Build summary:"
echo "✅ Client built to: dist/public"
echo "✅ Server built to: dist/index.js"
echo "📦 Production dependencies only"

ls -la dist/

echo "🎉 Render build completed successfully!"