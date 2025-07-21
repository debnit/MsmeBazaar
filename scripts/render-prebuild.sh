#!/bin/bash

# Render Pre-build Script - Dependency Conflict Resolution
set -e

echo "🔧 Pre-build: Resolving Pinecone dependency conflicts..."

# Remove any cached lock files
rm -f package-lock.json
rm -f yarn.lock
rm -rf node_modules/.cache

# Ensure npm is configured for legacy peer deps
npm config set legacy-peer-deps true
npm config set audit false
npm config set fund false

echo "✅ Pre-build: Dependencies configured for legacy peer deps"
echo "✅ Pre-build: Ready for main build process"