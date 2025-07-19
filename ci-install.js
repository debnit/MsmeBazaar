#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting robust CI dependency installation...');

const installCommands = [
  // Primary: npm ci with optimizations
  'npm ci --no-audit --no-fund --prefer-offline --silent',
  
  // Fallback 1: npm ci without optimizations
  'npm ci --no-audit --no-fund --silent',
  
  // Fallback 2: npm ci with legacy peer deps
  'npm ci --no-audit --no-fund --legacy-peer-deps --silent',
  
  // Fallback 3: npm install as last resort
  'npm install --no-audit --no-fund --prefer-offline --silent',
  
  // Final fallback: npm install with legacy peer deps
  'npm install --no-audit --no-fund --legacy-peer-deps --silent'
];

async function tryInstall() {
  // Verify package-lock.json exists
  if (!existsSync('package-lock.json')) {
    console.log('❌ package-lock.json not found! Running npm install...');
    try {
      execSync('npm install --no-audit --no-fund --silent', { stdio: 'inherit' });
      console.log('✅ package-lock.json generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate package-lock.json:', error.message);
      process.exit(1);
    }
  }

  // Try each installation command
  for (let i = 0; i < installCommands.length; i++) {
    const command = installCommands[i];
    console.log(`📦 Attempt ${i + 1}/${installCommands.length}: ${command}`);
    
    try {
      execSync(command, { stdio: 'inherit', timeout: 300000 }); // 5 minute timeout
      console.log('✅ Dependencies installed successfully!');
      
      // Verify installation
      if (existsSync('node_modules')) {
        console.log('✅ node_modules directory verified');
        console.log('🎉 CI installation completed successfully!');
        process.exit(0);
      }
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === installCommands.length - 1) {
        console.error('❌ All installation attempts failed');
        process.exit(1);
      }
      console.log('🔄 Trying next approach...');
    }
  }
}

tryInstall().catch(error => {
  console.error('❌ Installation script failed:', error);
  process.exit(1);
});