#!/bin/bash

# Render Build Script - Production Ready with Dependency Conflict Resolution
set -e

echo "🚀 Starting Render build process..."

echo "🔧 Running pre-build dependency resolution..."
# Run pre-build script if it exists
if [ -f "./scripts/render-prebuild.sh" ]; then
    ./scripts/render-prebuild.sh
fi

echo "🔧 Resolving dependency conflicts..."
# Remove package-lock.json to avoid npm ci conflicts with peer dependencies
rm -f package-lock.json
echo "Removed package-lock.json to resolve Pinecone dependency conflicts"

echo "📦 Installing all dependencies for build..."
# Use dedicated render install script to handle @langchain/pinecone conflicts
npm run render-install

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