#!/bin/sh
# Pre-commit check to prevent package-lock.json sync issues
# This prevents the npm ci failure loop

echo "🔍 Checking package-lock.json sync with package.json..."

# Generate lock file without installing packages
npm install --package-lock-only

# Check if lock file was modified
if ! git diff --exit-code package-lock.json > /dev/null 2>&1; then
  echo "❌ package-lock.json is out of sync with package.json"
  echo ""
  echo "🛠️  To fix this issue:"
  echo "   1. Run: npm install"
  echo "   2. Run: git add package-lock.json"
  echo "   3. Commit the updated lock file"
  echo ""
  echo "⚠️  This prevents npm ci failures in CI/CD"
  exit 1
fi

echo "✅ package-lock.json is properly synchronized"
exit 0