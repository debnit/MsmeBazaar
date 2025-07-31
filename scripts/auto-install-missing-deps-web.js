#!/usr/bin/env node

/**
 * Auto-install missing dependencies for apps/web (Next.js frontend)
 *
 * Scans all .ts, .tsx, .js, .jsx files for imports and installs any missing packages.
 * Works from anywhere in the repo because it resolves paths relative to this script.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Always resolve paths relative to repo root
const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const PACKAGE_JSON_PATH = path.join(WEB_DIR, "package.json");

// Ensure package.json exists
if (!fs.existsSync(PACKAGE_JSON_PATH)) {
  console.error("❌ apps/web/package.json not found. Are you sure this is the Next.js project root?");
  process.exit(1);
}

// Read package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
const packageName = pkg.name || "@msmebazaar/web";

console.log(`📦 Target workspace package: ${packageName}`);

// Gather existing dependencies
const existingDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

/**
 * Recursively scan directory for .ts, .tsx, .js, .jsx files
 */
function scanDir(dir, files = []) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file === "node_modules" || file.startsWith(".")) continue;
      scanDir(full, files);
    } else if (/\.(t|j)sx?$/.test(file)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = scanDir(WEB_DIR);

// Match ES imports and CommonJS requires
const importRegex = /\b(?:import|require)\s*(?:\(|['"])([^'"]+)(?:['"]\)?)/g;

let allImports = new Set();
for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content))) {
    const dep = match[1];
    // Skip relative paths and TS path aliases
    if (dep.startsWith(".") || dep.startsWith("@/")) continue;
    // Handle scoped packages like @tailwindcss/typography
    allImports.add(
      dep.split("/")[0].startsWith("@")
        ? dep.split("/").slice(0, 2).join("/")
        : dep.split("/")[0]
    );
  }
}

// Find missing dependencies
const missingDeps = [...allImports].filter(dep => !existingDeps.has(dep));

if (missingDeps.length === 0) {
  console.log("✅ No missing dependencies found for apps/web.");
  process.exit(0);
}

console.log("📦 Missing dependencies found:\n", missingDeps.join("\n"));

// Install in correct workspace scope
try {
  execSync(`pnpm add -F ${packageName} ${missingDeps.join(" ")}`, { stdio: "inherit" });
  console.log("✅ All missing dependencies installed successfully for apps/web!");
} catch (err) {
  console.error("❌ Failed to install missing dependencies:", err);
  process.exit(1);
}
