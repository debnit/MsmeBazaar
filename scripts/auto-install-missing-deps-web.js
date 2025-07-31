#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths
const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const PACKAGE_JSON_PATH = path.join(WEB_DIR, "package.json");

// Ensure package.json exists
if (!fs.existsSync(PACKAGE_JSON_PATH)) {
  console.error("❌ apps/web/package.json not found. Are you sure this is the Next.js project root?");
  process.exit(1);
}
