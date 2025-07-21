#!/bin/sh
# Pre-commit hook to ensure package-lock.json is in sync with package.json

echo "🔍 Checking if package-lock.json is in sync with package.json..."

# Generate lock file without installing packages
npm install --package-lock-only --silent

# Check if lock file was modified
if ! git diff --exit-code package-lock.json > /dev/null 2>&1; then
  echo "❌ package-lock.json is out of sync with package.json"
  echo ""
  echo "🛠️  To fix this issue:"
  echo "   1. Run: npm install"
  echo "   2. Run: git add package-lock.json"
  echo "   3. Commit the updated lock file"
  echo ""
  echo "📋 Changes needed:"
  git diff --name-only package-lock.json
  echo ""
  exit 1
fi

echo "✅ package-lock.json is properly synchronized"
exit 0