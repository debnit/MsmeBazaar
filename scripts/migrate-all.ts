// scripts/migrate-all.ts
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Project } from "ts-morph";

// ------------------ 1. ARCHITECTURE DIRECTORIES ------------------ //
const dirs = [
  // --- Apps / Frontend ---
  "apps/web/features/user",
  "apps/web/features/buyer",
  "apps/web/features/seller",
  "apps/web/features/agent",
  "apps/web/features/nbfc",
  "apps/web/features/auth",
  "apps/web/features/marketplace/browse-msmes",
  "apps/web/features/loan-application/apply",
  "apps/web/features/loan-application/track-status",
  "apps/web/features/loan-application/nbfc-offers",
  "apps/web/features/admin/moderation",
  "apps/web/features/admin/loan-approvals",
  "apps/web/features/admin/analytics",
  "apps/web/features/admin/dispute-management",
  "apps/web/features/common",
  "apps/web/lib/api",
  "apps/web/lib/utils",
  "apps/web/lib/hooks",
  "apps/web/components",
  "apps/web/lib/rbac",
  "apps/web/lib/ssr",
  "apps/web/pages",

  // --- SuperAdmin SaaS ---
  "apps/sadmin-saas",
  "apps/sadmin-saas/workflow-helper",
  "apps/sadmin-saas/analytics",
  "apps/sadmin-saas/rbac",
  "apps/sadmin-saas/pages",

  // --- Admin SaaS ---
  "apps/admin-web",
  "apps/admin-saas/features/nbfc-onboarding",
  "apps/admin-saas/features/global-loan-rules",
  "apps/admin-saas/features/loan-analytics",

  // --- Microservices ---
  "microservices/compliance-service/adapters",
  "microservices/compliance-service/modules/pan-verification",
  "microservices/compliance-service/modules/aadhaar-verification",
  "microservices/compliance-service/modules/gst-verification",
  "microservices/compliance-service/modules/cibil-integration",
  "microservices/buyer-service",
  "microservices/seller-service",
  "microservices/agent-service",
  "microservices/nbfc-service",
  "microservices/recommendation-service",
  "microservices/valuation-service",
  "microservices/payments-service",
  "microservices/notification-service",
  "microservices/admin-service",

  // --- Shared ---
  "libs/db/schema",
  "libs/db/migrations",
  "libs/db/seed",
  "libs/shared/schema",
  "libs/shared/types",
  "libs/shared/utils",
  "libs/shared/constants",
  "libs/shared/hooks",
  "libs/ml",

  // --- Server ---
  "server/middleware",
  "server/routes",
  "server/services",
  "server/ssr",
  "server/controllers",
  "server/utils",

  // --- Infrastructure ---
  "infrastructure/docker",
  "infrastructure/k8s",
  "infrastructure/airflow",
  "infrastructure/monitoring",

  // --- Scripts ---
  "scripts/utils",
];

// NBFC Specific
const nbfcFolders = [
  "apps/nbfc-portal/features/dashboard",
  "apps/nbfc-portal/features/loan-processing",
  "apps/nbfc-portal/features/compliance",
  "apps/nbfc-portal/features/escrow-management",
  "apps/nbfc-portal/features/analytics",
  "apps/nbfc-portal/features/notifications",
  "apps/nbfc-portal/lib/api",
  "apps/nbfc-portal/lib/utils",
  "apps/nbfc-portal/lib/hooks",
  "apps/nbfc-portal/components",
  "apps/nbfc-portal/pages",

  "microservices/nbfc-service/modules/loan-processing",
  "microservices/nbfc-service/modules/compliance",
  "microservices/nbfc-service/modules/escrow",
  "microservices/nbfc-service/modules/analytics",
  "microservices/nbfc-service/prisma/migrations",

  "microservices/loan-service/modules/core",
  "microservices/loan-service/modules/scoring",
  "microservices/loan-service/modules/disbursement",
];

dirs.push(...nbfcFolders);

// ------------------ 2. CREATE DIRECTORIES ------------------ //
console.log("📂 Creating architecture folders...");
dirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  }
});

// ------------------ 3. MOVE CODE PRESERVING HISTORY ------------------ //
const moveMap: Record<string, string> = {
  "client/src/pages/buyer": "apps/web/features/buyer",
  "client/src/pages/seller": "apps/web/features/seller",
  "client/src/pages/agent": "apps/web/features/agent",
  "client/src/pages/nbfc": "apps/web/features/nbfc",
  "frontend/src/auth": "apps/web/features/auth",
  "frontend/src/components": "apps/web/components",
  "frontend/src/lib": "apps/web/lib",
  "microservices/auth-service/src": "microservices/auth-service/src",
  "microservices/msme-service/src": "microservices/msme-service/src",
  "microservices/loan-service/src": "microservices/loan-service/src",
  "libs/shared/schema": "libs/shared/schema",
  "libs/shared/utils": "libs/shared/utils",
  "shared/constants": "libs/shared/constants",
  "shared/hooks": "libs/shared/hooks",
  "libs/db/schema": "libs/db/schema",
};

function gitMove(oldPath: string, newPath: string) {
  if (fs.existsSync(oldPath)) {
    const dir = path.dirname(newPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    execSync(`git mv "${oldPath}" "${newPath}"`);
    console.log(`📦 Moved ${oldPath} → ${newPath}`);
  } else {
    console.warn(`⚠ Skipping missing: ${oldPath}`);
  }
}

Object.entries(moveMap).forEach(([oldPath, newPath]) => gitMove(oldPath, newPath));

// ------------------ 4. REWRITE IMPORTS ------------------ //
console.log("🛠 Rewriting imports...");
const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});
project.getSourceFiles().forEach((file) => {
  file.getImportDeclarations().forEach((importDecl) => {
    let importPath = importDecl.getModuleSpecifierValue();
    if (importPath.startsWith("../../") || importPath.startsWith("../")) {
      const resolvedPath = path.resolve(path.dirname(file.getFilePath()), importPath);
      const relative = path.relative(process.cwd(), resolvedPath).replace(/\\/g, "/");
      if (!relative.startsWith(".")) {
        importDecl.setModuleSpecifier(`@/${relative}`);
      }
    }
  });
});
project.saveSync();
console.log("✅ Imports rewritten");

// ------------------ 5. RESTORE .vscode ------------------ //
const vscodeBackup = path.join(process.cwd(), ".vscode-backup");
if (fs.existsSync(vscodeBackup) && !fs.existsSync(".vscode")) {
  fs.renameSync(vscodeBackup, ".vscode");
  console.log("🔄 Restored .vscode from backup");
}

console.log("🎉 Migration complete! Now run: pnpm install && pnpm build");
