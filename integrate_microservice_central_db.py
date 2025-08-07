#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
MICROSERVICES_DIR = ROOT_DIR / "microservices"
ALEMBIC_DIR = ROOT_DIR / "libs" / "db"
SESSION_IMPORT = "from libs.db.session import get_db"
MODEL_IMPORT_SHARED = "from libs.shared.models import"
MODEL_IMPORT_LOCAL = "from libs.db.models import"

# All microservices to attempt migration on (no skipping now)
DB_SERVICES = [
    "admin-service", "auth-service", "compliance-service", "eaasservice", "gamification-service",
    "loan-service", "matchmaking-service", "ml-services", "mlmonitoringservice", "monitoring",
    "msme-listing-service", "msme-service", "nbfcservice", "notification-service", "payment-service",
    "recommendation-service", "recommendationservice", "search-matchmaking-service",
    "searchmatchmakingservice", "seller-service", "transaction-matching-service",
    "transactionmatchingservice", "user-profile-service", "valuation-engine", "valuation-service"
]

def inject_db_dependency(service_path):
    """Inject `get_db` and update model imports in the service."""
    print(f"🔧 Patching service: {service_path.name}")
    updated = False
    

    for root, _, files in os.walk(service_path):

        if any(ignored in root for ignored in ["/.venv", "/venv", "/site-packages", "__pycache__"]):
            continue

        for file in files:
            if file.endswith(".py"):
                file_path = Path(root) / file
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                original_content = content

                # Replace in-memory db imports
                content = content.replace("import db", SESSION_IMPORT)
                content = content.replace("from . import db", SESSION_IMPORT)
                content = content.replace("from app import db", SESSION_IMPORT)

                # Add get_db import if missing and used
                if "get_db" in content and SESSION_IMPORT not in content:
                    content = SESSION_IMPORT + "\n" + content

                # Replace model imports
                content = content.replace("from app.models", MODEL_IMPORT_SHARED)
                content = content.replace("from models", MODEL_IMPORT_LOCAL)

                if content != original_content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"  ✅ Updated {file_path.relative_to(ROOT_DIR)}")
                    updated = True

    if not updated:
        print("  ⚠️  No changes made to source files.")

def run_alembic_migration():
    """Run Alembic migration centrally from libs/db"""
    print("\n🚀 Running Alembic migration from libs/db...")
    if not (ALEMBIC_DIR / "alembic.ini").exists() and not (ALEMBIC_DIR / "alembic").exists():
        print("❌ Alembic not configured in libs/db. Skipping migration.")
        return

    try:
        subprocess.run(["alembic", "upgrade", "head"], cwd=ALEMBIC_DIR, check=True)
        print("✅ Alembic migration successful.")
    except subprocess.CalledProcessError as e:
        print("❌ Alembic migration failed:", e)

def main():
    print("🔄 Starting Phase 3 Migration: Replace in-memory DBs with centralized DB session\n")

    for service in DB_SERVICES:
        service_path = MICROSERVICES_DIR / service
        if not service_path.exists():
            print(f"❌ Skipped (not found): {service_path}")
            continue
        inject_db_dependency(service_path)

    run_alembic_migration()
    print("\n🎉 Migration script completed.\n")

if __name__ == "__main__":
    main()
