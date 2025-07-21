# 🚀 Deployment Setup Guide

## 🔧 **Required GitHub Repository Settings**

### 1. **Actions Permissions**
Go to **Settings > Actions > General**:
- ✅ Enable "Allow all actions and reusable workflows"
- ✅ Set Workflow permissions to "Read and write permissions"
- ✅ Enable "Allow GitHub Actions to create and approve pull requests"

### 2. **GitHub Container Registry (GHCR) - Automatic ✅**
No setup required! The workflow uses `GITHUB_TOKEN` automatically.

## 🔐 **Required Secrets**

Go to **Settings > Secrets and variables > Actions** and add:

### **For Render Deployment**
```
RENDER_SERVICE_ID=srv-xxxxxxxxxxxxxxxxxxxxx
RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxxxxx
```

**How to get these:**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service
3. Copy the Service ID from the URL: `https://dashboard.render.com/web/srv-XXXXX`
4. Go to Account Settings > API Keys
5. Create a new API key and copy it

### **For Railway Deployment**
```
RAILWAY_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**How to get this:**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Generate token: `railway auth`
4. Or get it from [Railway Dashboard](https://railway.app/account/tokens)

## 🚀 **Deployment Triggers**

### **Automatic Deployments**
- **Render**: Deploys automatically on `main` branch pushes
- **Railway**: Only deploys when:
  - Manually triggered via GitHub Actions UI, OR
  - Commit message contains `[railway]`

### **Manual Deployment**
1. Go to **Actions** tab in your repository
2. Select "CI/CD Pipeline" 
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## 📋 **Verification Checklist**

After setup, verify:
- [ ] Repository permissions are set correctly
- [ ] Secrets are added (if using Render/Railway)
- [ ] Workflow runs successfully on push to main
- [ ] Docker image is pushed to GHCR
- [ ] Security scans appear in Security tab
- [ ] Deployments trigger (if secrets configured)

## 🆘 **If Something Goes Wrong**

1. **Check the workflow logs** in the Actions tab
2. **Verify secrets** are set correctly (no extra spaces, correct format)
3. **Test locally** using the commands in `CI_CD_DEBUGGING_GUIDE.md`
4. **Check repository permissions** in Settings > Actions > General

## 🎯 **Success Indicators**

When everything works, you'll see:
- ✅ Green checkmarks on all workflow jobs
- ✅ Docker image in Packages tab: `ghcr.io/debnit/msmebazaar:latest`
- ✅ Security scan results in Security tab
- ✅ Deployment status in workflow summary
- ✅ Your app running on Render/Railway (if configured)

---

**Need help?** Check the detailed troubleshooting guide in `CI_CD_DEBUGGING_GUIDE.md`!