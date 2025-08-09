import os
import sys
import importlib.util
from pathlib import Path
from typing import get_type_hints
import ast
import textwrap

def generate_schema_code(model_class):
    fields = get_type_hints(model_class)
    lines = [
        "from pydantic import BaseModel",
        "from typing import Optional",
        "",
        f"class {model_class.__name__}Base(BaseModel):"
    ]
    for name, type_hint in fields.items():
        if name == "id" or name.endswith("_id"):
            continue
        lines.append(f"    {name}: Optional[{type_hint.__name__}] = None")
    lines.append("")
    lines.append(f"class {model_class.__name__}Create({model_class.__name__}Base):")
    lines.append(f"    pass")
    lines.append("")
    lines.append(f"class {model_class.__name__}Read({model_class.__name__}Base):")
    lines.append(f"    id: int")
    lines.append("")

    return "\n".join(lines)


def generate_route_code(service_name: str, model_name: str):
    lines = [
        "from fastapi import APIRouter, Depends, HTTPException",
        f"from ..schemas.{model_name.lower()} import {model_name}Create, {model_name}Read",
        "from typing import List",
        "",
        f"router = APIRouter(prefix='/{model_name.lower()}', tags=['" + model_name + "'])",
        "",
        "@router.post('/', response_model=" + model_name + "Read)",
        f"async def create_{model_name.lower()}(payload: {model_name}Create):",
        f"    # TODO: implement create logic",
        f"    return {{'id': 1, **payload.dict()}}",
        "",
        "@router.get('/', response_model=List[" + model_name + "Read])",
        f"async def list_{model_name.lower()}s():",
        f"    # TODO: implement list logic",
        f"    return []",
        "",
    ]
    return "\n".join(lines)


def load_class_from_file(filepath: Path, classname: str):
    spec = importlib.util.spec_from_file_location("module.name", str(filepath))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, classname)


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_pydantic_and_routes.py <model_path> <model_class>")
        return

    model_path = Path(sys.argv[1])
    model_class = sys.argv[2]
    service_dir = model_path.parent.parent

    model_cls = load_class_from_file(model_path, model_class)

    # Generate schema
    schema_code = generate_schema_code(model_cls)
    schema_path = service_dir / 'schemas' / f"{model_class.lower()}.py"
    schema_path.write_text(schema_code)
    print(f"✅ Generated schema: {schema_path}")

    # Generate routes
    route_code = generate_route_code(service_dir.name, model_class)
    route_path = service_dir / 'routes' / f"{model_class.lower()}.py"
    route_path.write_text(route_code)
    print(f"✅ Generated route: {route_path}")


if __name__ == "__main__":
    main()
