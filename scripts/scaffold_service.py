import os
import sys
import json
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONFIG_PATH = os.path.join(ROOT, "scripts", "scaffold.config.json")
MICROSERVICES_DIR = os.path.join(ROOT, "microservices")

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    print(f"✅ Ensured directory: {path}")

def copy_model(model_file, target_dir):
    os.makedirs(target_dir, exist_ok=True)
    os.system(f"cp {model_file} {target_dir}")
    print(f"🔗 Linked DB model: {os.path.basename(model_file)} → {target_dir}/{os.path.basename(model_file)}")

def copy_shared_config(service_dir):
    config_src = os.path.join(ROOT, "libs/shared/config.py")
    config_dst = os.path.join(service_dir, "config.py")
    os.system(f"cp {config_src} {config_dst}")
    print(f"✅ Copied shared config to: {config_dst}")

def generate_pydantic_and_routes(model_path, model_name):
    print("⚙️ Generating Pydantic schemas and routes...")
    cmd = f"python scripts/generate_pydantic_and_routes.py {model_path} {model_name}"
    os.system(cmd)

def scaffold_service(service_name):
    with open(CONFIG_PATH) as f:
        config = json.load(f)

    if service_name not in config:
        print(f"❌ Service {service_name} not found in scaffold.config.json")
        return

    cfg = config[service_name]
    model_file = os.path.join(ROOT, cfg["model_file"])
    model_name = cfg["model_name"]
    requires_auth = cfg.get("requires_auth", True)

    service_dir = os.path.join(MICROSERVICES_DIR, service_name)

    print(f"\n🚀 Scaffolding service: {service_name}")
    ensure_dir(service_dir)
    ensure_dir(os.path.join(service_dir, "models"))
    ensure_dir(os.path.join(service_dir, "schemas"))
    ensure_dir(os.path.join(service_dir, "routes"))

    copy_shared_config(service_dir)
    copy_model(model_file, os.path.join(service_dir, "models"))

    generate_pydantic_and_routes(model_file, model_name)

    print(f"\n🔁 API Gateway Registration Snippet:")
    print(json.dumps({
        "route": f"/api/{service_name.replace('-service', '')}",
        "service": service_name,
        "auth_required": requires_auth
    }, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scaffold_service.py <service-name>")
        sys.exit(1)

    service_name = sys.argv[1]
    scaffold_service(service_name)
