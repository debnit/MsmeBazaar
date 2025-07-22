#!/usr/bin/env node

/**
 * UI Components Verification Script
 * Verifies that all gold standard UI components are present and properly structured
 */

const fs = require('fs');
const path = require('path');

// Gold Standard UI Components that must exist
const REQUIRED_UI_COMPONENTS = [
  'accordion.tsx', 'alert-dialog.tsx', 'alert.tsx', 'aspect-ratio.tsx',
  'avatar.tsx', 'badge.tsx', 'breadcrumb.tsx', 'button.tsx',
  'calendar.tsx', 'card.tsx', 'carousel.tsx', 'chart.tsx',
  'checkbox.tsx', 'collapsible.tsx', 'command.tsx', 'context-menu.tsx',
  'dialog.tsx', 'drawer.tsx', 'dropdown-menu.tsx', 'form.tsx',
  'hover-card.tsx', 'input.tsx', 'label.tsx', 'menubar.tsx',
  'navigation-menu.tsx', 'pagination.tsx', 'popover.tsx', 'progress.tsx',
  'radio-group.tsx', 'resizable.tsx', 'scroll-area.tsx', 'select.tsx',
  'separator.tsx', 'sheet.tsx', 'skeleton.tsx', 'slider.tsx',
  'switch.tsx', 'table.tsx', 'tabs.tsx', 'textarea.tsx',
  'toast.tsx', 'toggle.tsx', 'tooltip.tsx'
];

const REQUIRED_ADVANCED_COMPONENTS = [
  'gamification/GamificationDashboard.tsx',
  'gamification/Leaderboard.tsx',
  'gamification/SpinWheel.tsx',
  'gamification/AchievementBadge.tsx',
  'gamification/ProgressBar.tsx',
  'gamification/DailyTasks.tsx',
  'auth/auth-provider.tsx',
  'auth/login-form.tsx',
  'auth/register-form.tsx',
  'admin/admin-dashboard.tsx',
  'maps/InteractiveMap.tsx',
  'vaas/pricing-dashboard.tsx'
];

const REQUIRED_PAGES = [
  'dashboard.tsx', 'landing.tsx', 'analytics.tsx',
  'admin/dashboard.tsx', 'auth/login.tsx',
  'buyer/dashboard.tsx', 'seller/dashboard.tsx',
  'nbfc/dashboard.tsx'
];

const REQUIRED_CONFIG_FILES = [
  'frontend/vite.config.ts',
  'frontend/tailwind.config.js',
  'frontend/tsconfig.json',
  'frontend/package.json',
  'frontend/index.html'
];

console.log('🔍 Verifying MSMEBazaar Gold Standard UI Components...\n');

let errors = 0;
let warnings = 0;

// Check UI Components
console.log('📦 Checking Core UI Components:');
const uiPath = path.join(__dirname, 'frontend/src/components/ui');
if (fs.existsSync(uiPath)) {
  REQUIRED_UI_COMPONENTS.forEach(component => {
    const componentPath = path.join(uiPath, component);
    if (fs.existsSync(componentPath)) {
      console.log(`  ✅ ${component}`);
    } else {
      console.log(`  ❌ ${component} - MISSING`);
      errors++;
    }
  });
} else {
  console.log('  ❌ UI components directory missing');
  errors++;
}

// Check Advanced Components
console.log('\n🎮 Checking Advanced Components:');
const componentsPath = path.join(__dirname, 'frontend/src/components');
REQUIRED_ADVANCED_COMPONENTS.forEach(component => {
  const componentPath = path.join(componentsPath, component);
  if (fs.existsSync(componentPath)) {
    console.log(`  ✅ ${component}`);
  } else {
    console.log(`  ⚠️  ${component} - Missing (optional)`);
    warnings++;
  }
});

// Check Pages
console.log('\n📄 Checking Key Pages:');
const pagesPath = path.join(__dirname, 'frontend/src/pages');
REQUIRED_PAGES.forEach(page => {
  const pagePath = path.join(pagesPath, page);
  if (fs.existsSync(pagePath)) {
    console.log(`  ✅ ${page}`);
  } else {
    console.log(`  ⚠️  ${page} - Missing (optional)`);
    warnings++;
  }
});

// Check Configuration Files
console.log('\n⚙️  Checking Configuration Files:');
REQUIRED_CONFIG_FILES.forEach(configFile => {
  const configPath = path.join(__dirname, configFile);
  if (fs.existsSync(configPath)) {
    console.log(`  ✅ ${configFile}`);
  } else {
    console.log(`  ❌ ${configFile} - MISSING`);
    errors++;
  }
});

// Check package.json for critical dependencies
console.log('\n📦 Checking Critical Dependencies:');
const packageJsonPath = path.join(__dirname, 'frontend/package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const criticalDeps = [
    'react', 'react-dom', 'vite', 'tailwindcss',
    'framer-motion', 'lucide-react', 'class-variance-authority',
    '@tanstack/react-query', 'zustand', 'react-hook-form'
  ];
  
  criticalDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`  ✅ ${dep} - ${dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      errors++;
    }
  });
}

// Summary
console.log('\n📊 Verification Summary:');
console.log('========================');

if (errors === 0) {
  console.log('🎉 All critical components verified!');
  console.log('✅ Gold Standard UI is intact and ready for deployment');
} else {
  console.log(`❌ ${errors} critical error(s) found`);
  console.log('🔧 Please fix critical errors before deployment');
}

if (warnings > 0) {
  console.log(`⚠️  ${warnings} optional component(s) missing`);
  console.log('💡 Consider adding missing components for full functionality');
}

console.log('\n🚀 UI Verification Complete!');

// Exit with appropriate code
process.exit(errors > 0 ? 1 : 0);