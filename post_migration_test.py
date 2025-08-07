import os
from pathlib import Path
from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_FILE)

CENTRAL_IMPORT = "from libs.db.connection import get_db, async_session"
IGNORED_DIRS = ["/.venv", "/venv", "/site-packages", "__pycache__"]

MICROSERVICES_ROOT = Path(__file__).resolve().parent / "microservices"
EXCLUDE_FOLDERS = ["frontend", "web", "ml-api", "mobile"]

def should_skip_dir(path: str) -> bool:
    return any(ignored in path.replace("\\", "/") for ignored in IGNORED_DIRS)

def find_db_py_files():
    paths = []
    for service_path in MICROSERVICES_ROOT.iterdir():
        if not service_path.is_dir() or service_path.name in EXCLUDE_FOLDERS:
            continue
        for root, dirs, files in os.walk(service_path):
            if should_skip_dir(root):
                continue
            for file in files:
                if file == "db.py":
                    paths.append(Path(root) / file)
    return paths

def refactor_db_file(file_path: Path):
    content = file_path.read_text()
    if CENTRAL_IMPORT in content:
        print(f"✔ Already migrated: {file_path}")
        return

    updated = (
        "# Refactored to use centralized DB connection\n"
        + CENTRAL_IMPORT
    )
    file_path.write_text(updated)
    print(f"✅ Refactored: {file_path}")

def create_db_test_file(service_path: Path):
    test_path = service_path / "test_db_connection.py"
    if test_path.exists():
        print(f"🧪 Test already exists: {test_path}")
        return

    test_code = f"""
import asyncio
from libs.db.session import async_session

@pytest.mark.asyncio
async def test_connection():
    async with async_session() as session:
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1
    except Exception as e:
        print("❌ DB connection failed:", str(e))

if __name__ == "__main__":
    asyncio.run(test_db_connection())
"""
    test_path.write_text(test_code.strip())
    print(f"🧪 Created test: {test_path}")

def generate_cleanup_script(paths):
    script_path = Path(__file__).parent / "cleanup_old_db_files.py"
    lines = [
        "import os",
        "",
        "files_to_delete = ["
    ]
    for path in paths:
        lines.append(f'    r"{str(path)}",')
    lines += [
        "]",
        "",
        "for file_path in files_to_delete:",
        "    if os.path.exists(file_path):",
        "        os.remove(file_path)",
        '        print(f"🗑 Deleted: {file_path}")',
        "    else:",
        '        print(f"❓ File not found: {file_path}")',
    ]
    script_path.write_text("\n".join(lines))
    print(f"🧼 Generated cleanup script: {script_path}")

if __name__ == "__main__":
    db_py_files = find_db_py_files()

    if not db_py_files:
        print("🚫 No db.py files found.")
        exit(0)

    service_roots = set()

    for path in db_py_files:
        refactor_db_file(path)
        service_roots.add(path.parent)

    for root in service_roots:
        create_db_test_file(root)

    generate_cleanup_script(db_py_files)
