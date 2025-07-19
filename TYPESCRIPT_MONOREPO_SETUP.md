# 🔧 TypeScript Monorepo Debugging & Setup Guide

## ✅ **Issues Fixed:**

1. ✅ **GitHub Actions deprecated `upload-artifact@v3`** → Updated to `v4`
2. ✅ **Missing TypeScript configurations** → Added proper `tsconfig.json` hierarchy
3. ✅ **Inconsistent monorepo setup** → Configured `pnpm` + `turbo` properly
4. ✅ **Missing path mappings** → Fixed module resolution
5. ✅ **No testing framework integration** → Added Jest with TypeScript support

## 🏗️ **New Monorepo Structure:**

```
msmebazaar-v2/
├── package.json           # Root with pnpm workspaces + turbo
├── pnpm-workspace.yaml    # pnpm workspace config
├── turbo.json            # Turbo build system config
├── tsconfig.json         # Root TypeScript config
├── jest.config.js        # Root Jest config
├── .eslintrc.json        # Root ESLint config
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json  # Extends root config
│   │   └── ...
│   ├── auth-api/         # Python FastAPI (no TS config needed)
│   ├── msme-api/         # Python FastAPI
│   └── ...
└── libs/
    ├── shared/
    │   ├── package.json
    │   ├── tsconfig.json  # Extends root config
    │   └── src/
    └── db/
        ├── package.json
        ├── tsconfig.json  # Extends root config
        └── src/
```

## 🔧 **Setup Instructions:**

### 1. **Install Dependencies**
```bash
# Install pnpm globally
npm install -g pnpm@8

# Navigate to MSMEBazaar V2
cd msmebazaar-v2

# Install all dependencies
pnpm install

# Install turbo globally (optional)
pnpm add -g turbo
```

### 2. **TypeScript Check Commands**
```bash
# Check all packages
pnpm run type-check

# Check specific app
pnpm run type-check --filter=@msmebazaar/web

# Check root only
npx tsc --noEmit
```

### 3. **Build Commands**
```bash
# Build all packages
pnpm run build

# Build specific app
pnpm run build --filter=@msmebazaar/web

# Watch mode for development
pnpm run dev
```

### 4. **Testing**
```bash
# Run all tests
pnpm run test

# Run tests for specific package
pnpm run test --filter=@msmebazaar/web

# Watch mode
pnpm run test:watch
```

## 🔍 **Debugging TypeScript Errors:**

### **Common Issues & Solutions:**

#### **1. Module Resolution Errors**
```bash
# Error: Cannot find module '@/components/...'
# Solution: Check tsconfig.json paths mapping
```

**Fix in `apps/web/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*", "./components/*", "./lib/*"],
      "@msmebazaar/shared/*": ["../../libs/shared/src/*"]
    }
  }
}
```

#### **2. Type Import Errors**
```bash
# Error: Module '"@msmebazaar/shared"' has no exported member
# Solution: Check exports in shared library
```

**Fix in `libs/shared/src/index.ts`:**
```typescript
// Export all types and utilities
export * from './types'
export * from './utils'
export * from './schemas'
```

#### **3. Jest Configuration Issues**
```bash
# Error: Jest cannot resolve modules
# Solution: Update jest.config.js moduleNameMapping
```

**Fix in `jest.config.js`:**
```javascript
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/apps/web/$1',
  '^@msmebazaar/shared/(.*)$': '<rootDir>/libs/shared/src/$1',
}
```

## 🚀 **CI/CD Fixes:**

### **Updated GitHub Actions:**
- ✅ `actions/upload-artifact@v4` (was v3)
- ✅ `actions/download-artifact@v4` (was v3)
- ✅ `pnpm/action-setup@v2` for pnpm support
- ✅ Proper TypeScript checking for all packages

### **CI Commands:**
```yaml
# Install dependencies
- run: pnpm install --frozen-lockfile

# TypeScript check
- run: pnpm run type-check

# Build
- run: pnpm run build

# Test
- run: pnpm run test
```

## 📁 **File Configurations:**

### **Root `package.json` Scripts:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "lint": "turbo run lint"
  }
}
```

### **Turbo Configuration (`turbo.json`):**
```json
{
  "tasks": {
    "type-check": {
      "dependsOn": ["^type-check"],
      "inputs": ["$TURBO_DEFAULT$", "tsconfig.json"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

## 🧪 **Testing TypeScript Setup:**

```bash
# 1. Check TypeScript compilation
cd msmebazaar-v2
pnpm run type-check

# 2. Check specific app
pnpm run type-check --filter=@msmebazaar/web

# 3. Run build to catch build-time errors
pnpm run build

# 4. Run tests
pnpm run test

# 5. Check linting
pnpm run lint
```

## 🔄 **Migration from npm to pnpm:**

```bash
# 1. Remove old node_modules
rm -rf node_modules apps/*/node_modules libs/*/node_modules

# 2. Remove package-lock.json files
find . -name "package-lock.json" -delete

# 3. Install with pnpm
pnpm install

# 4. Update CI scripts to use pnpm commands
```

## 🐛 **Troubleshooting:**

### **If TypeScript errors persist:**

1. **Clear cache:**
```bash
rm -rf node_modules/.cache
rm -rf .next
rm -rf dist
pnpm install
```

2. **Check TypeScript version consistency:**
```bash
pnpm list typescript
```

3. **Verify path mappings:**
```bash
npx tsc --showConfig
```

4. **Check imports in files:**
```typescript
// ❌ Wrong
import { Component } from '@/components/Component'

// ✅ Correct (if in web app)
import { Component } from '@/components/Component'

// ✅ Correct (if importing shared)
import { Utils } from '@msmebazaar/shared/utils'
```

## 📊 **Performance:**

- **Turbo caching** reduces build times by ~50-80%
- **pnpm** saves disk space with content-addressable storage
- **TypeScript project references** enable incremental compilation

## 🔒 **Next Steps:**

1. ✅ **Fixed GitHub Actions** (v3 → v4)
2. ✅ **Setup proper TypeScript configs**
3. ✅ **Configure pnpm + turbo monorepo**
4. ✅ **Add Jest testing framework**
5. ✅ **Setup ESLint + Prettier**

### **To Deploy:**
```bash
# Build and test locally
pnpm run build && pnpm run test

# Commit changes
git add .
git commit -m "fix: Update TypeScript monorepo setup and fix CI"

# Push to trigger CI
git push origin main
```

## 📞 **Support:**

If you encounter issues:
1. Check the error message carefully
2. Verify all `tsconfig.json` files are properly configured
3. Ensure all dependencies are installed (`pnpm install`)
4. Clear cache and rebuild (`pnpm run clean && pnpm run build`)

**Expected Result:**
✅ No TypeScript errors during tests  
✅ `pnpm test --filter=apps/msme-api` passes  
✅ `pnpm build` succeeds  
✅ CI pipeline passes successfully