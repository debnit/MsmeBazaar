#!/usr/bin/env bash
set -e

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Global venv path
GLOBAL_VENV="./venv"

# Activate global venv (create if not exists)
if [ ! -d "$GLOBAL_VENV" ]; then
    echo "📦 Creating global virtual environment..."
    python3 -m venv "$GLOBAL_VENV"
fi
source "$GLOBAL_VENV/bin/activate"

# Directories to scan
SERVICES_DIR="./microservices"

# Loop over each microservice
for SERVICE_DIR in "$SERVICES_DIR"/*; do
    [ -d "$SERVICE_DIR" ] || continue

    echo "🔍 Scanning: $SERVICE_DIR"
    REQ_FILE="$SERVICE_DIR/requirements.txt"

    # Create requirements.txt if missing
    if [ ! -f "$REQ_FILE" ]; then
        echo "📝 Creating $REQ_FILE..."
        touch "$REQ_FILE"
    fi

    # Detect missing modules
    MISSING_MODULES=$(python - <<PY
import os, re, importlib, sys

scan_dir = "$SERVICE_DIR"
import_re = re.compile(r'^\s*(?:import|from)\s+([a-zA-Z0-9_\.]+)')
skip_modules = {
    "typing", "dataclasses", "os", "sys", "re", "pathlib",
    "logging", "json", "time", "subprocess", "shutil", "functools",
    "itertools", "uuid", "enum", "math", "asyncio", "contextlib"
}

found_modules = set()

for root, _, files in os.walk(scan_dir):
    for f in files:
        if f.endswith(".py"):
            try:
                with open(os.path.join(root, f), "r", encoding="utf-8") as fh:
                    for line in fh:
                        match = import_re.match(line)
                        if match:
                            mod = match.group(1).split('.')[0].strip()
                            if mod and not mod.startswith(".") and mod not in skip_modules:
                                found_modules.add(mod)
            except Exception:
                pass

missing = []
for mod in sorted(found_modules):
    if not mod:
        continue
    if mod in sys.builtin_module_names:
        continue
    try:
        importlib.import_module(mod)
    except ImportError:
        missing.append(mod)

print(" ".join(missing))
PY
)

    # Install and append to requirements.txt if needed
    if [ -n "$MISSING_MODULES" ]; then
        echo "📦 Missing modules detected: $MISSING_MODULES"
        for pkg in $MISSING_MODULES; do
            if ! grep -qi "^$pkg" "$REQ_FILE"; then
                echo "$pkg" >> "$REQ_FILE"
                echo "➕ Added $pkg to $REQ_FILE"
            fi
        done
        pip install $MISSING_MODULES
    else
        echo "✅ No missing modules found for $SERVICE_DIR."
    fi

done

echo "🎯 Dependency scan & install complete for all microservices."
