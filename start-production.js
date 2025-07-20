#!/usr/bin/env node

// Production Start Script
// Ensures proper environment and starts the server

console.log('🚀 Starting MSME Bazaar in production mode...');

// Force production environment
process.env.NODE_ENV = 'production';

// Verify required files exist
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredFiles = [
  'dist/index.js',
  'dist/public/index.html'
];

console.log('📋 Checking required files...');
for (const file of requiredFiles) {
  const fullPath = path.resolve(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required file: ${file}`);
    console.error('Please run the build process first:');
    console.error('  npm run build:client');
    console.error('  npm run build:server');
    process.exit(1);
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

console.log('🔧 Environment check...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT || 3000}`);

console.log('🎯 Starting server...');

// Import and start the server
import('./dist/index.js').catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});