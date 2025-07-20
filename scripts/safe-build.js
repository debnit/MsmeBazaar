const { execSync } = require('node:child_process');

try {
  execSync('vite build', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Vite build failed');
  process.exit(1);
}

try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ esbuild failed');
  process.exit(1);
}
