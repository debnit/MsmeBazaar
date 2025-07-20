// scripts/safe-build.js
const { execSync } = require("node:child_process");

function run(label, command) {
  console.log(`\n🔧 Running: ${label}`);
  try {
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${label} succeeded`);
  } catch (err) {
    console.error(`❌ ${label} failed`);
    process.exit(1);
  }
}

run("Vite frontend build", "vite build");
run("esbuild backend build", "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist");
