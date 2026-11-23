#!/usr/bin/env python
"""Create a generic PySide6 desktop application scaffold from bundled assets."""
from __future__ import annotations

import argparse
import sys
import re
import shutil
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
sys.pycache_prefix = str(SKILL_DIR / ".pycache_root")
TEMPLATE_DIR = SKILL_DIR / "assets" / "pyside6-desktop-scaffold"
TEXT_SUFFIXES = {
    ".py",
    ".ps1",
    ".iss",
    ".spec",
    ".yaml",
    ".yml",
    ".md",
    ".txt",
    ".toml",
    ".json",
    ".csv",
}
APP_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")
VERSION_RE = re.compile(r"^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][A-Za-z0-9_.-]+)?$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Target project directory to create.")
    parser.add_argument("--app-name", required=True, help="ASCII Python/EXE-safe application id, e.g. MyTool.")
    parser.add_argument("--display-name", required=True, help="Human-facing app name, e.g. My Tool.")
    parser.add_argument("--version", default="0.1.0", help="Initial app version, e.g. 0.1.0.")
    parser.add_argument("--force", action="store_true", help="Allow writing into an existing directory.")
    return parser.parse_args()


def validate(args: argparse.Namespace) -> None:
    if not TEMPLATE_DIR.exists():
        raise SystemExit(f"Template directory not found: {TEMPLATE_DIR}")
    if not APP_NAME_RE.match(args.app_name):
        raise SystemExit("--app-name must match ^[A-Za-z][A-Za-z0-9_]*$")
    if not VERSION_RE.match(args.version):
        raise SystemExit("--version must look like a semantic version, e.g. 0.1.0")


def ensure_output(path: Path, force: bool) -> None:
    if path == TEMPLATE_DIR.resolve() or TEMPLATE_DIR.resolve() in path.parents:
        raise SystemExit(f"Refusing to write inside the bundled template: {TEMPLATE_DIR}")
    if path.exists() and any(path.iterdir()) and not force:
        raise SystemExit(f"Output directory is not empty: {path}. Use --force to write into it.")
    path.mkdir(parents=True, exist_ok=True)


def copy_template(output: Path) -> None:
    for item in TEMPLATE_DIR.iterdir():
        target = output / item.name
        if item.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(item, target, ignore=ignore_generated)
        else:
            shutil.copy2(item, target)


def ignore_generated(_dir: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name in {".venv", "dist", "build", "logs", "__pycache__", ".pycache_root"}
        or name.endswith(".pyc")
    }


def replace_placeholders(output: Path, values: dict[str, str]) -> None:
    for path in output.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8")
        for key, value in values.items():
            text = text.replace("{{" + key + "}}", value)
        path.write_text(text, encoding="utf-8", newline="")


def main() -> int:
    args = parse_args()
    validate(args)

    output = Path(args.output).expanduser().resolve()
    ensure_output(output, args.force)
    copy_template(output)
    replace_placeholders(
        output,
        {
            "APP_NAME": args.app_name,
            "APP_DISPLAY_NAME": args.display_name,
            "APP_VERSION": args.version,
            "WINDOW_TITLE": args.display_name,
        },
    )

    print(f"Created PySide6 desktop scaffold: {output}")
    print("")
    print("Next steps:")
    print(f"  cd {output}")
    print("  pip install -r requirements.txt")
    print("  $env:PYTHONPYCACHEPREFIX = Join-Path (Resolve-Path .).Path '.pycache_root'")
    print("  python src/app.py")
    print("")
    print("Package on Windows:")
    print("  powershell -ExecutionPolicy Bypass -File packaging\\build.ps1 -SkipInstaller")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
