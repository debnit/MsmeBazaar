#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// CHANGE this if your frontend app name changes
const CLIENT_DIR = path.resolve("client");
const PACKAGE_JSON_PATH = path.join(CLIENT_DIR, "package.json");

// Read package.json deps
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
const existingDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {})
]);

// Recursively scan files for imports
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

const allFiles = scanDir(CLIENT_DIR);

// Regex to match ES imports and CommonJS requires
const importRegex = /\b(?:import|require)\s*(?:\(|['"])([^'"]+)(?:['"]\)?)/g;

let allImports = new Set();
for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content))) {
    const dep = match[1];
    // Skip relative and alias imports
    if (dep.startsWith(".") || dep.startsWith("@/")) continue;
    allImports.add(dep.split("/")[0].startsWith("@") ? dep.split("/").slice(0, 2).join("/") : dep.split("/")[0]);
  }
}

// Find missing deps
const missingDeps = [...allImports].filter(dep => !existingDeps.has(dep));

if (missingDeps.length === 0) {
  console.log("✅ No missing dependencies found.");
  process.exit(0);
}

console.log("📦 Missing dependencies found:\n", missingDeps.join("\n"));

// Install in correct workspace scope
try {
  execSync(`pnpm add -F msmebazaar-client ${missingDeps.join(" ")}`, { stdio: "inherit" });
  console.log("✅ All missing dependencies installed successfully!");
} catch (err) {
  console.error("❌ Failed to install missing dependencies:", err);
  process.exit(1);
}
