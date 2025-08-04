import fs from "fs";
import path from "path";

const dirs = [
  // Web App Features
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
  "apps/web/lib/rbac",
  "apps/web/lib/ssr",
  "apps/web/components",
  "apps/web/pages",

  // SuperAdmin SaaS
  "apps/sadmin-saas",
  "apps/sadmin-saas/workflow-helper",
  "apps/sadmin-saas/analytics",
  "apps/sadmin-saas/rbac",
  "apps/sadmin-saas/pages",

  // Admin SaaS
  "apps/admin-saas/features/nbfc-onboarding",
  "apps/admin-saas/features/global-loan-rules",
  "apps/admin-saas/features/loan-analytics",
  "apps/admin-saas/features/workflow-helper",
  "apps/admin-saas/features/rbac",

  // Microservices
  "microservices/buyer-service",
  "microservices/seller-service",
  "microservices/agent-service",
  "microservices/nbfc-service",
  "microservices/nbfc-service",
  "microservices/recommendation-service",
  "microservices/valuation-service",
  "microservices/payments-service",
  "microservices/notification-service",
  "microservices/admin-service",

  // Libraries
  "libs/db/schema",
  "libs/db/migrations",
  "libs/shared/schema",
  "libs/shared/types",
  "libs/shared/utils",
  "libs/shared/constants",
  "libs/shared/hooks",
  "libs/ml",

  // Server
  "server/middleware",
  "server/routes",
  "server/services",
  "server/ssr",
  "server/controllers",
  "server/utils",

  // Infrastructure
  "infrastructure/docker",
  "infrastructure/k8s",
  "infrastructure/airflow",
  "infrastructure/monitoring",

  // Scripts
  "scripts/utils",
];

// NBFC Whitespace
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

  // NBFC Backend
  "microservices/nbfc-service/modules/loan-processing",
  "microservices/nbfc-service/modules/compliance",
  "microservices/nbfc-service/modules/escrow",
  "microservices/nbfc-service/modules/analytics",
  "microservices/nbfc-service/prisma/migrations",

  // Loan Core
  "microservices/loan-service/modules/core",
  "microservices/loan-service/modules/scoring",
  "microservices/loan-service/modules/disbursement",

  // Compliance Integration
  "microservices/compliance-service/adapters",
  "microservices/compliance-service/modules/pan-verification",
  "microservices/compliance-service/modules/aadhaar-verification",
  "microservices/compliance-service/modules/gst-verification",
  "microservices/compliance-service/modules/cibil-integration",

  // DB & Shared
  "libs/db/schema",
  "libs/db/migrations",
  "libs/db/seed",
  "libs/shared/schema",
  "libs/shared/types",
  "libs/shared/utils",
  "libs/shared/constants",
  "libs/shared/hooks",
];

// Append NBFC folders to dirs
dirs.push(...nbfcFolders);

function scaffold() {
  dirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created ${dir}`);
    }
  });
}

scaffold();
