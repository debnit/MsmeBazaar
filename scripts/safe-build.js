// scripts/safe-build.js
import { execSync } from "node:child_process";

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

run("Client build (Vite)", "npm run build:client");
run("Server build (esbuild)", "npm run build:server");
