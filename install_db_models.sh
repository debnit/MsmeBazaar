#!/bin/bash

# install_models.sh - Autogenerate libs/db/models/ folder with placeholder models
# For MSMEBazaar v2.0 Microservices
# Author: ChatGPT CTO Mode 🧠

set -e

# Set target model directory
MODEL_DIR="libs/db/models"
MICROSERVICES_DIR="microservices"

# List of service names that should generate models (filtered)
SERVICES=(
  "auth"
  "user_profile"
  "loan"
  "nbfc"
  "payment"
  "recommendation"
  "valuation"
  "transaction_matching"
  "search_matchmaking"
  "msme_listing"
  "compliance"
  "gamification"
  "notification"
  "seller"
  "admin"
  "eaas"
)

# Clean old models if needed
if [ -d "$MODEL_DIR" ]; then
  echo "[*] Removing existing models folder..."
  rm -rf "$MODEL_DIR"
fi

echo "[*] Creating models folder: $MODEL_DIR"
mkdir -p "$MODEL_DIR"

# Generate models for each service
echo "[*] Generating model stubs..."

for service in "${SERVICES[@]}"; do
  snake_name="${service//-/_}"
  model_file="${MODEL_DIR}/${snake_name}_models.py"

  cat > "$model_file" <<EOF
# ${snake_name}_models.py
# Auto-generated SQLAlchemy model for ${service}-service

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class ${snake_name^}Model(Base):
    __tablename__ = '${snake_name}s'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Add more fields and relationships as per your schema
EOF

  echo "  [+] Created: $model_file"
done

# Create __init__.py aggregator
echo "[*] Generating __init__.py aggregator..."

INIT_FILE="$MODEL_DIR/__init__.py"
echo "# __init__.py - Aggregator for all SQLAlchemy models" > "$INIT_FILE"

for service in "${SERVICES[@]}"; do
  snake_name="${service//-/_}"
  echo "from .${snake_name}_models import ${snake_name^}Model" >> "$INIT_FILE"
done

echo "" >> "$INIT_FILE"
echo "# Optional: List of all models" >> "$INIT_FILE"
echo "ALL_MODELS = [" >> "$INIT_FILE"
for service in "${SERVICES[@]}"; do
  snake_name="${service//-/_}"
  echo "    ${snake_name^}Model," >> "$INIT_FILE"
done
echo "]" >> "$INIT_FILE"

echo "[✅] Models generated successfully in $MODEL_DIR"
