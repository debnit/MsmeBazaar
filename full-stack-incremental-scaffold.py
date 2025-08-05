#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import json

# ---------------- CONFIG ----------------
BASE_DIR = Path(__file__).resolve().parent
MICROSERVICES_DIR = BASE_DIR / "microservices"
FRONTEND_API_DIR = BASE_DIR / "apps" / "web" / "lib" / "api"
GATEWAY_CLIENTS_DIR = BASE_DIR / "api-gateway" / "src" / "clients"
GATEWAY_CONFIG_FILE = BASE_DIR / "api-gateway" / "src" / "config" / "services.ts"

SKIP_SERVICES = {"auth-service", "notification-service"}
SERVICE_LIST = [
    "admin-service",
    "msme-service",
    "valuation-service",
    "matchmaking-service",
    "compliance-service",
    "eaas-service",
    "gamification-service",
    "loan-service",
    "ml-monitoring-service",
    "msme-listing-service",
    "nbfc-service",
    "payment-service",
    "recommendation-service",
    "search-matchmaking-service",
    "seller-service",
    "transaction-matching-service",
    "user-profile-service",
]

DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar"
DEFAULT_REDIS_URL = "redis://localhost:6379"
DEFAULT_JWT_SECRET = "changeme"

# ----------- HELPERS -----------

def safe_write(path: Path, content: str):
    """Write file only if it doesn't exist."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        print(f"✅ Created: {path}")
    else:
        print(f"⏩ Skipped (exists): {path}")

# ----------- BACKEND (Python) -----------

def scaffold_python_service(service_name: str):
    """Create a minimal FastAPI service if missing."""
    service_dir = MICROSERVICES_DIR / service_name
    if service_dir.exists():
        print(f"⏩ Skipped backend (exists): {service_name}")
        return

    os.makedirs(service_dir / service_name / "api" / "routes", exist_ok=True)
    os.makedirs(service_dir / service_name / "core", exist_ok=True)

    # main.py
    safe_write(
        service_dir / service_name / "main.py",
        f"""from fastapi import FastAPI
from .api import routes
from .core.config import settings

app = FastAPI(title="{service_name}")

app.include_router(routes.router)

@app.get("/health")
async def health():
    return {{"status": "ok"}}
"""
    )

    # config.py
    safe_write(
        service_dir / service_name / "core" / "config.py",
        f"""import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "{service_name}")
    DB_URL: str = os.getenv("DB_URL", "{DEFAULT_DB_URL}")
    REDIS_URL: str = os.getenv("REDIS_URL", "{DEFAULT_REDIS_URL}")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "{DEFAULT_JWT_SECRET}")

settings = Settings()
"""
    )

    # routes/__init__.py
    safe_write(
        service_dir / service_name / "api" / "routes" / "__init__.py",
        "from fastapi import APIRouter\n\nrouter = APIRouter()\n"
    )

    # routes/example.py
    safe_write(
        service_dir / service_name / "api" / "routes" / "example.py",
        """from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Hello from microservice"}
"""
    )

    print(f"🎯 Backend scaffolded: {service_name}")

# ----------- FRONTEND (TS) -----------

def scaffold_frontend_client(service_name: str):
    """Create axios client for the service if missing."""
    name_ts = service_name.replace("-service", "")
    file_path = FRONTEND_API_DIR / f"{name_ts}.ts"

    safe_write(
        file_path,
        f"""import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const {name_ts}Client = axios.create({{
  baseURL: `${{API_GATEWAY_URL}}/api/{name_ts}`,
  headers: {{
    "Content-Type": "application/json"
  }}
}});
"""
    )

# ----------- API GATEWAY -----------

def update_gateway_services(service_name: str):
    """Add service to services.ts without overwriting existing ones."""
    if not GATEWAY_CONFIG_FILE.exists():
        GATEWAY_CONFIG_FILE.write_text("export const servicesConfig = {} as const;\n")

    content = GATEWAY_CONFIG_FILE.read_text()
    name_ts = service_name.replace("-service", "")
    env_var = service_name.upper().replace("-", "_") + "_URL"

    if f"{name_ts}:" in content:
        print(f"⏩ Skipped gateway config (exists): {service_name}")
        return

    insert_line = f'  {name_ts}: process.env.{env_var} || "http://localhost:8000/{name_ts}"'
    content = content.replace(
        "} as const;",
        f"{insert_line},\n}} as const;"
    )
    GATEWAY_CONFIG_FILE.write_text(content)
    print(f"🔗 Added to API Gateway config: {service_name}")

    # Create gateway client
    safe_write(
        GATEWAY_CLIENTS_DIR / f"{name_ts}Client.ts",
        f"""import {{ createBaseClient }} from "./baseClient";
import {{ servicesConfig }} from "../config/services";

export const {name_ts}Client = createBaseClient(servicesConfig.{name_ts});
"""
    )

# ----------- MAIN EXECUTION -----------

if __name__ == "__main__":
    for service in SERVICE_LIST:
        if service in SKIP_SERVICES:
            print(f"🚫 Skipped special service: {service}")
            continue

        scaffold_python_service(service)
        scaffold_frontend_client(service)
        update_gateway_services(service)

    print("\n✅ Full-stack scaffold complete — backend + frontend + gateway are connected!")
