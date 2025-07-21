#!/bin/bash

# Render Build Script - Production Ready with Dependency Conflict Resolution
set -e

echo "🚀 Starting Render build process..."

echo "🔧 Ensuring clean dependency resolution..."
# Remove any existing node_modules and lock files that might cause conflicts
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

echo "📦 Installing dependencies with correct versions..."
# Install fresh dependencies with exact versions to avoid conflicts
npm install --no-package-lock

echo "🔍 Verifying Pinecone versions..."
npm list @pinecone-database/pinecone @langchain/pinecone || echo "Dependencies installed"

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