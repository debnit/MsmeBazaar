# 🚀 CI/CD Debugging Guide for Node.js GitHub Actions

## 📋 **Major Fixes Applied**

### ✅ **1. Replaced `ci-install.js` with Standard `npm ci`**
**Problem**: Custom installation script was unreliable and used ES6 imports in Node.js context
**Solution**: 
```yaml
- name: 📦 Install dependencies
  run: |
    echo "🔄 Installing dependencies with npm ci..."
    npm ci --no-audit --no-fund --prefer-offline
    echo "✅ Dependencies installed successfully"
```

### ✅ **2. Fixed PostgreSQL Readiness Check**
**Problem**: Database operations were running before PostgreSQL was fully ready
**Solution**: 
```yaml
- name: ⏳ Wait for PostgreSQL
  run: |
    echo "🔍 Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
      if pg_isready -h localhost -p 5432 -U postgres; then
        echo "✅ PostgreSQL is ready!"
        break
      fi
      echo "⏳ PostgreSQL not ready yet, waiting... ($i/30)"
      sleep 2
    done
    
    # Verify connection with test query
    PGPASSWORD=postgres psql -h localhost -U postgres -d msme_test -c "SELECT version();"
```

### ✅ **3. Removed Excessive `continue-on-error`**
**Problem**: Critical failures were being masked, preventing proper debugging
**Solution**: Only use `continue-on-error` for non-critical steps like linting

### ✅ **4. Fixed Docker Authentication to GHCR**
**Problem**: Docker push to GitHub Container Registry was failing
**Solution**: 
```yaml
- name: 🔐 Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: 🏗️ Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### ✅ **5. Enhanced Deployment Logic**
**Problem**: Deployments were unreliable with silent failures
**Solution**: 
- Added proper secret validation
- Improved error messages
- Added deployment status reporting
- Made Railway deployment conditional on commit message or manual trigger

## 🔧 **Required GitHub Secrets**

### **For Docker Registry (Automatic - No Setup Required)**
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### **For Render Deployment**
```bash
# Add these secrets in GitHub repository settings:
RENDER_SERVICE_ID=srv-xxxxxxxxxxxxx
RENDER_API_KEY=rnd_xxxxxxxxxxxxx
```

### **For Railway Deployment**
```bash
# Add this secret in GitHub repository settings:
RAILWAY_TOKEN=xxxxxxxxxxxxx
```

## 🐛 **Debugging GitHub Actions Runs**

### **1. Check Workflow Run Logs**
1. Go to **Actions** tab in your repository
2. Click on the failed workflow run
3. Click on the failed job (e.g., "Test & Quality Checks")
4. Expand each step to see detailed logs
5. Look for error messages in red

### **2. Common Issues & Solutions**

#### **🔴 npm ci fails**
```bash
# Check if package-lock.json is committed and up to date
git status
npm ci  # Test locally first
```

#### **🔴 PostgreSQL not ready**
```bash
# The new workflow includes proper waiting logic
# If still failing, increase retries in workflow:
--health-retries 15  # Increase from 10 to 15
```

#### **🔴 Docker build fails**
```bash
# Test Docker build locally
docker build -t test-image .
docker run --rm test-image

# Check Dockerfile syntax and dependencies
```

#### **🔴 Docker push to GHCR fails**
```bash
# Verify repository has proper permissions
# Go to repository Settings > Actions > General
# Ensure "Read and write permissions" is enabled
```

#### **🔴 TypeScript errors**
```bash
# Fix TypeScript issues locally first
npm run check
npm run build

# Or make TypeScript check non-blocking temporarily
npm run check || echo "TypeScript issues found but continuing"
```

#### **🔴 Deployment secrets missing**
```bash
# Check if secrets are properly set:
# Repository Settings > Secrets and variables > Actions

# For Render:
echo ${{ secrets.RENDER_SERVICE_ID }}
echo ${{ secrets.RENDER_API_KEY }}

# For Railway:
echo ${{ secrets.RAILWAY_TOKEN }}
```

### **3. Local Testing Commands**

#### **Test Dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
npm ci
```

#### **Test Database Connection**
```bash
# Start PostgreSQL locally
docker run --name test-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=msme_test -p 5432:5432 -d postgres:15

# Test connection
PGPASSWORD=postgres psql -h localhost -U postgres -d msme_test -c "SELECT version();"

# Test database push
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/msme_test npm run db:push
```

#### **Test Build Process**
```bash
npm run build
npm run ci-build  # If using fallback script
```

#### **Test Docker Build**
```bash
docker build -t msme-test .
docker run --rm -p 5000:5000 msme-test
curl http://localhost:5000/health
```

### **4. Workflow Debugging Tips**

#### **Add Debug Steps**
```yaml
- name: 🐛 Debug Environment
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Current directory: $(pwd)"
    echo "Files in directory:"
    ls -la
    echo "Environment variables:"
    env | grep -E "(NODE_|NPM_|CI)"
```

#### **Enable Debug Logging**
```yaml
- name: 📦 Install dependencies
  run: npm ci --verbose  # Add --verbose for detailed logs
```

#### **Check Service Health**
```yaml
- name: 🔍 Check PostgreSQL
  run: |
    docker ps
    docker logs $(docker ps -q --filter "ancestor=postgres:15")
```

### **5. Performance Optimization**

#### **Use Caching Effectively**
```yaml
- name: 🟢 Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

#### **Parallel Job Execution**
Jobs that don't depend on each other run in parallel:
- `test` and `security-scan` run simultaneously
- `deploy-render` and `deploy-railway` run simultaneously

#### **Conditional Deployments**
```yaml
# Only deploy on main branch pushes
if: github.ref == 'refs/heads/main' && github.event_name == 'push'

# Deploy to Railway only with [railway] in commit message or manual trigger
if: github.ref == 'refs/heads/main' && (github.event_name == 'workflow_dispatch' || contains(github.event.head_commit.message, '[railway]'))
```

## 🚨 **Emergency Debugging**

### **If Everything is Failing**

1. **Simplify the workflow temporarily**:
```yaml
jobs:
  debug:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: |
        echo "Basic environment check"
        node --version
        npm --version
        ls -la
        cat package.json
```

2. **Check repository permissions**:
   - Go to Settings > Actions > General
   - Ensure "Read and write permissions" is enabled
   - Check if "Allow GitHub Actions to create and approve pull requests" is enabled

3. **Verify branch protection rules**:
   - Go to Settings > Branches
   - Check if branch protection is blocking deployments

4. **Test with manual trigger**:
   - Go to Actions tab
   - Select "CI/CD Pipeline"
   - Click "Run workflow"
   - Select your branch and trigger manually

## 📊 **Success Indicators**

When everything is working correctly, you'll see:

### ✅ **Test Job**
- Dependencies install successfully
- PostgreSQL connects and is ready
- Linting passes (or shows warnings but continues)
- TypeScript check passes
- Database setup completes
- Tests run successfully

### ✅ **Security Scan Job**
- Trivy installs successfully
- Filesystem scan completes
- Dependency scan completes
- Docker image builds and scans
- SARIF results upload to GitHub Security tab

### ✅ **Build & Deploy Job**
- Application builds successfully
- Docker image builds and pushes to GHCR
- Image is tagged with both `latest` and commit SHA
- Image verification passes

### ✅ **Deployment Jobs**
- Render deployment triggers successfully (if secrets configured)
- Railway deployment completes (if triggered)
- Deployment summary shows success status

## 🔗 **Useful Links**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [PostgreSQL in GitHub Actions](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Render API Documentation](https://api-docs.render.com/)
- [Railway CLI Documentation](https://docs.railway.app/develop/cli)

---

**Remember**: Always test changes locally before committing to avoid breaking the CI/CD pipeline!