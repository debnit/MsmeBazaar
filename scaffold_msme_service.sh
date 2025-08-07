#!/bin/bash

set -e

SERVICE_NAME="msme-api"
SERVICE_DIR="microservices/$SERVICE_NAME"
TEMPLATE_DIR="./templates"
DB_MODELS_DIR="libs/db/models"
SHARED_CONFIG="libs/shared/config.py"
SHARED_AUTH="libs/shared/auth"

echo "🧹 Cleaning old microservices/$SERVICE_NAME..."
rm -rf "$SERVICE_DIR"

echo "📁 Creating new structure for $SERVICE_NAME..."
mkdir -p "$SERVICE_DIR/app/api"
mkdir -p "$SERVICE_DIR/app/services"
mkdir -p "$SERVICE_DIR/app/models"
mkdir -p "$SERVICE_DIR/app/schemas"
mkdir -p "$SERVICE_DIR/app/utils"
mkdir -p "$SERVICE_DIR/tests"

echo "🔗 Copying shared config and auth..."
if [[ -f "$SHARED_CONFIG" ]]; then
  cp "$SHARED_CONFIG" "$SERVICE_DIR/app/config.py"
else
  echo "❌ Shared config.py not found at $SHARED_CONFIG"
fi

if [[ -d "$SHARED_AUTH" ]]; then
  cp -r "$SHARED_AUTH" "$SERVICE_DIR/app/auth"
else
  echo "❌ Shared auth folder not found at $SHARED_AUTH"
fi

echo "📦 Copying DB model for MSME..."
if [[ -f "$DB_MODELS_DIR/msme.py" ]]; then
  cp "$DB_MODELS_DIR/msme.py" "$SERVICE_DIR/app/models/msme.py"
else
  echo "❌ msme.py not found in $DB_MODELS_DIR"
fi

echo "🛠 Writing router..."
cat > "$SERVICE_DIR/app/api/routes.py" <<EOF
from fastapi import APIRouter, Depends
from app.services.msme_service import get_msme_data

router = APIRouter()

@router.get("/msme")
async def read_msme():
    return await get_msme_data()
EOF

echo "⚙️ Writing service logic..."
cat > "$SERVICE_DIR/app/services/msme_service.py" <<EOF
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.msme import MSMEModel
from libs.db.session import get_db

async def get_msme_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Hello from MSME service"}
EOF

echo "🚀 Creating main FastAPI app..."
cat > "$SERVICE_DIR/main.py" <<EOF
from fastapi import FastAPI
from app.api.routes import router as msme_router

app = FastAPI(title="MSME API")

app.include_router(msme_router, prefix="/api/msme")
EOF

echo "✅ $SERVICE_NAME microservice scaffolded successfully."
