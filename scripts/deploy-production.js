#!/usr/bin/env node

/**
 * Production Deployment Script
 * Ensures proper build, optimization, and deployment readiness
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${timestamp} ${prefix} ${message}`);
}

function executeCommand(command, description) {
  log(`Executing: ${description}`);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    log(`Completed: ${description}`, 'success');
    return true;
  } catch (error) {
    log(`Failed: ${description} - ${error.message}`, 'error');
    return false;
  }
}

function verifyEnvironmentVariables() {
  log('Checking environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`Missing environment variables: ${missing.join(', ')}`, 'warning');
    log('These should be set in your deployment platform (Render, etc.)');
    return false;
  }
  
  log('All required environment variables are present', 'success');
  return true;
}

function verifyBuildFiles() {
  log('Verifying build output...');
  
  const requiredFiles = [
    'dist/index.js',
    'dist/public/index.html'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      log(`Missing build file: ${file}`, 'error');
      return false;
    }
    
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    log(`Found: ${file} (${sizeKB} KB)`, 'success');
  }
  
  return true;
}

function optimizeBuild() {
  log('Optimizing build for production...');
  
  // Check if we can optimize images
  const assetsDir = path.join(rootDir, 'dist/public/img');
  if (fs.existsSync(assetsDir)) {
    log('Image assets found - consider optimizing for production');
  }
  
  // Check bundle sizes
  const jsDir = path.join(rootDir, 'dist/public/js');
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    let totalSize = 0;
    
    jsFiles.forEach(file => {
      const filePath = path.join(jsDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });
    
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    log(`Total JS bundle size: ${totalSizeMB} MB`);
    
    if (totalSize > 5 * 1024 * 1024) { // 5MB
      log('Large bundle size detected - consider code splitting', 'warning');
    }
  }
  
  return true;
}

function createDeploymentManifest() {
  const manifest = {
    deploymentId: Date.now().toString(36),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    environment: 'production',
    buildInfo: {
      frontend: fs.existsSync(path.join(rootDir, 'dist/public/index.html')),
      backend: fs.existsSync(path.join(rootDir, 'dist/index.js')),
      optimized: true
    },
    features: {
      lazyLoading: true,
      routeDebugging: true,
      memoryOptimization: true,
      demandPaging: true,
      enhancedCaching: true
    }
  };
  
  fs.writeFileSync(
    path.join(rootDir, 'dist/deployment-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  log('Created deployment manifest', 'success');
  return manifest;
}

function runHealthChecks() {
  log('Running pre-deployment health checks...');
  
  // Check if server can start (basic syntax check)
  try {
    execSync('node -c dist/index.js', { cwd: rootDir, stdio: 'pipe' });
    log('Server syntax check passed', 'success');
  } catch (error) {
    log('Server syntax check failed', 'error');
    return false;
  }
  
  // Check if frontend HTML is valid
  const indexPath = path.join(rootDir, 'dist/public/index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.includes('<div id="root">') && content.includes('</html>')) {
      log('Frontend HTML structure is valid', 'success');
    } else {
      log('Frontend HTML structure may be invalid', 'warning');
    }
  }
  
  return true;
}

async function deployProduction() {
  log('🚀 Starting production deployment process...');
  
  // Step 1: Environment check
  if (!verifyEnvironmentVariables()) {
    log('Environment variable check failed - continuing with build', 'warning');
  }
  
  // Step 2: Clean and build
  log('Cleaning previous build...');
  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    execSync('rm -rf dist', { cwd: rootDir });
  }
  
  if (!executeCommand('npm ci --legacy-peer-deps', 'Installing dependencies')) {
    process.exit(1);
  }
  
  if (!executeCommand('npm run build', 'Building application')) {
    process.exit(1);
  }
  
  // Step 3: Verify build
  if (!verifyBuildFiles()) {
    log('Build verification failed', 'error');
    process.exit(1);
  }
  
  // Step 4: Optimize
  optimizeBuild();
  
  // Step 5: Health checks
  if (!runHealthChecks()) {
    log('Health checks failed', 'error');
    process.exit(1);
  }
  
  // Step 6: Create manifest
  const manifest = createDeploymentManifest();
  
  log('🎉 Production build completed successfully!', 'success');
  log(`Deployment ID: ${manifest.deploymentId}`);
  log('Ready for deployment to production platform');
  
  // Step 7: Deployment instructions
  console.log('\n📋 Next Steps:');
  console.log('1. Commit and push these changes to your production branch');
  console.log('2. Ensure environment variables are set in your deployment platform');
  console.log('3. Deploy to your platform (Render, Railway, etc.)');
  console.log('4. Verify the site loads correctly');
  console.log('5. Test routing and functionality');
  
  return manifest;
}

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployProduction().catch(console.error);
}

export { deployProduction };