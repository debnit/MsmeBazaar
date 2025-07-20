#!/usr/bin/env node

/**
 * MSMEBazaar Deployment Configuration
 * Handles building and deployment across different platforms
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deployment configuration
const config = {
  buildDir: 'dist',
  clientDir: 'dist/public',
  serverFile: 'dist/index.js',
  requiredFiles: [
    'dist/index.js',
    'dist/public/index.html'
  ],
  platforms: {
    render: {
      buildCommand: 'npm run build',
      startCommand: 'node start-production.js',
      envRequired: ['DATABASE_URL', 'OPENAI_API_KEY', 'PINECONE_API_KEY']
    },
    vercel: {
      buildCommand: 'npm run build',
      startCommand: 'node start-production.js'
    },
    railway: {
      buildCommand: 'npm run build',
      startCommand: 'node start-production.js'
    },
    heroku: {
      buildCommand: 'npm run build',
      startCommand: 'node start-production.js'
    }
  }
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${timestamp} ${prefix} ${message}`);
}

function executeCommand(command, description) {
  log(`Executing: ${description}`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    log(`Completed: ${description}`, 'success');
    return true;
  } catch (error) {
    log(`Failed: ${description} - ${error.message}`, 'error');
    return false;
  }
}

function verifyBuildFiles() {
  log('Verifying build files...');
  
  for (const file of config.requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      log(`Missing required file: ${file}`, 'error');
      return false;
    } else {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      log(`Found: ${file} (${size} KB)`, 'success');
    }
  }
  
  return true;
}

function buildApplication() {
  log('Starting MSMEBazaar build process...');
  
  // Set production environment
  process.env.NODE_ENV = 'production';
  
  // Install dependencies if needed
  if (!fs.existsSync('node_modules')) {
    if (!executeCommand('npm ci --legacy-peer-deps', 'Installing dependencies')) {
      return false;
    }
  }
  
  // Build client (frontend)
  if (!executeCommand('npm run build:client', 'Building frontend')) {
    return false;
  }
  
  // Build server (backend)
  if (!executeCommand('npm run build:server', 'Building backend')) {
    return false;
  }
  
  // Verify build
  if (!verifyBuildFiles()) {
    log('Build verification failed', 'error');
    return false;
  }
  
  log('Build completed successfully!', 'success');
  return true;
}

function createDeploymentInfo() {
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.env.PLATFORM || 'unknown',
    environment: process.env.NODE_ENV || 'production',
    buildFiles: config.requiredFiles.map(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          file,
          size: stats.size,
          modified: stats.mtime
        };
      }
      return { file, error: 'File not found' };
    })
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'deployment-info.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  log('Created deployment info file', 'success');
}

// Main deployment function
export function deploy(platform = 'render') {
  log(`Starting deployment for platform: ${platform}`);
  
  if (!config.platforms[platform]) {
    log(`Unknown platform: ${platform}`, 'error');
    return false;
  }
  
  if (!buildApplication()) {
    log('Deployment failed during build phase', 'error');
    return false;
  }
  
  createDeploymentInfo();
  
  log(`Deployment ready for ${platform}!`, 'success');
  log('Next steps:');
  log(`- Build Command: ${config.platforms[platform].buildCommand}`);
  log(`- Start Command: ${config.platforms[platform].startCommand}`);
  
  if (config.platforms[platform].envRequired) {
    log('Required environment variables:');
    config.platforms[platform].envRequired.forEach(env => {
      log(`  - ${env}`);
    });
  }
  
  return true;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const platform = process.argv[2] || 'render';
  deploy(platform);
}