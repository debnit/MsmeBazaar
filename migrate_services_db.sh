#!/bin/bash

set -e

SERVICES_DIR="microservices"

# Import lines
DB_IMPORT_LINE="from libs.db.session import get_session"
AUTH_IMPORT_LINE="from libs.shared.auth.dependencies import get_current_user"
USER_IMPORT_LINE="from libs.db.models.user import User"

echo "🚀 Starting migration of DB-enabled microservices..."

for SERVICE in "$SERVICES_DIR"/*; do
  SERVICE_NAME=$(basename "$SERVICE")
  
  if [[ -d "$SERVICE" ]]; then
    echo "🔍 Processing service: $SERVICE_NAME"

    ROUTES_DIR="$SERVICE/routes"
    SERVICES_DIR_PATH="$SERVICE/services"

    HAS_DB_LOGIC=false

    # Check if service has any ORM/DB/session usage (lib/db/session, sqlalchemy, models, etc.)
    for TARGET_DIR in "$ROUTES_DIR" "$SERVICES_DIR_PATH"; do
      if [[ -d "$TARGET_DIR" ]]; then
        if grep -qriE "sqlalchemy|get_session|get_db|Base|declarative_base|User" "$TARGET_DIR"; then
          HAS_DB_LOGIC=true
          break
        fi
      fi
    done

    if [[ "$HAS_DB_LOGIC" == true ]]; then
      echo "   📦 Detected DB logic, migrating $SERVICE_NAME..."

      # Remove legacy engine/sessionmaker if any
      find "$SERVICE" -name "*.py" -exec sed -i '/sessionmaker\|engine *=\|create_engine/d' {} +

      for file in $(find "$SERVICE" -type f \( -path "*/routes/*.py" -o -path "*/services/*.py" \)); do
        # Inject imports only if missing
        grep -qF "$DB_IMPORT_LINE" "$file" || sed -i "1i$DB_IMPORT_LINE" "$file"
        grep -qF "$AUTH_IMPORT_LINE" "$file" || sed -i "1i$AUTH_IMPORT_LINE" "$file"
        grep -qF "$USER_IMPORT_LINE" "$file" || sed -i "1i$USER_IMPORT_LINE" "$file"

        # Remove in-memory fake dicts like `fake_users = {}`
        sed -i '/fake_users *= *{}/d' "$file"
      done

      echo "   ✅ Migrated: $SERVICE_NAME"
    else
      echo "   ⚠️ No DB logic detected, skipping: $SERVICE_NAME"
    fi
  fi
done

echo "🎉 All eligible services migrated!"
