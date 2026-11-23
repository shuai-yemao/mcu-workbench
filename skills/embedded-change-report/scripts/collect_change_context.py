#!/usr/bin/env python3
"""Collect embedded project change context into one JSON evidence file."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_EXCLUDED_DIRS = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    ".pio",
    "build",
    "cmake-build-debug",
    "cmake-build-release",
    "__pycache__",
}


def run_script(script: str, args: list[str]) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / script), *args],
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        return {"ok": False, "stderr": proc.stderr.strip(), "stdout": proc.stdout.strip()}
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "stderr": "script did not return JSON", "stdout": proc.stdout.strip()}


def read_text_with_fallback(path: Path) -> tuple[str, str]:
    raw = path.read_bytes()
    for encoding in ["utf-8-sig", "utf-8", "gbk", "cp936", "latin-1"]:
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def redact_sensitive(text: str) -> str:
    patterns = [
        (r"(?i)(password|passwd|pwd|token|secret|api[_-]?key)\s*[:=]\s*\S+", r"\1=<redacted>"),
        (r"\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b", "<mac-redacted>"),
        (r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "<ip-redacted>"),
        (r"(?i)\b(sn|serial|device[_-]?id)\s*[:=]\s*[\w.-]+", r"\1=<redacted>"),
    ]
    redacted = text
    for pattern, replacement in patterns:
        redacted = re.sub(pattern, replacement, redacted)
    return redacted


def read_optional_log(path: str | None, max_chars: int = 12000) -> dict | None:
    if not path:
        return None
    log_path = Path(path)
    if not log_path.exists():
        return {"path": str(log_path), "exists": False}
    text, encoding = read_text_with_fallback(log_path)
    preview = redact_sensitive(text[-max_chars:])
    return {
        "path": str(log_path.resolve()),
        "exists": True,
        "encoding": encoding,
        "size_bytes": log_path.stat().st_size,
        "preview": preview,
        "preview_policy": "last characters only; obvious secrets, MACs, IPs, and serial IDs redacted",
        "truncated_to_last_chars": max_chars if len(text) > max_chars else len(text),
    }


def iter_project_files(root: Path, max_depth: int) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        parts = set(relative.parts)
        if parts & DEFAULT_EXCLUDED_DIRS:
            continue
        if len(relative.parts) > max_depth + 1:
            continue
        if path.is_file():
            files.append(path)
    return files


def project_markers(root: Path, max_depth: int = 4) -> dict[str, list[str]]:
    marker_patterns = {
        "stm32_cubemx": [".ioc", "Core/Src", "Drivers"],
        "esp_idf": ["sdkconfig", "main/CMakeLists.txt", "components"],
        "platformio": ["platformio.ini"],
        "keil": [".uvprojx", ".uvoptx"],
        "iar": [".ewp", ".eww"],
        "cmake": ["CMakeLists.txt"],
        "make": ["Makefile"],
        "arduino": [".ino"],
        "linker": [".ld", ".icf", ".sct"],
        "map_or_elf": [".map", ".elf", ".axf"],
    }
    result: dict[str, list[str]] = {}
    files = iter_project_files(root, max_depth)
    dirs = [path for path in root.rglob("*") if path.is_dir()]

    for kind, patterns in marker_patterns.items():
        hits: list[str] = []
        for pattern in patterns:
            if "/" in pattern:
                candidate = root / pattern
                if candidate.exists():
                    hits.append(pattern)
                continue
            if pattern.startswith("."):
                hits.extend(str(path.relative_to(root)) for path in files if path.name.lower().endswith(pattern.lower()))
            elif "." in pattern:
                hits.extend(str(path.relative_to(root)) for path in files if path.name.lower() == pattern.lower())
            else:
                hits.extend(str(path.relative_to(root)) for path in dirs if path.name.lower() == pattern.lower())
        if hits:
            result[kind] = sorted(set(hits))[:50]
    return result


def collect_evidence_gaps(git_evidence: dict, build_summary: dict | None, args: argparse.Namespace) -> list[str]:
    gaps: list[str] = []
    if not git_evidence.get("git_available"):
        gaps.append("Git evidence unavailable.")
    elif not git_evidence.get("ok", True):
        gaps.append("Git evidence collection reported an error; do not treat the diff as complete.")
    if git_evidence.get("untracked_files"):
        gaps.append("Untracked files exist and must be reviewed before finalizing the report.")

    if not args.build_log:
        gaps.append("Build log not provided.")
    elif not build_summary or not build_summary.get("ok"):
        gaps.append("Build log could not be parsed.")
    elif build_summary.get("status") in ["failed", "ambiguous", "unknown"]:
        gaps.append(f"Build status is {build_summary.get('status')}; do not claim build verification passed.")

    if not any([args.test_log, args.serial_log, args.can_log, args.modbus_log]):
        gaps.append("Runtime or hardware verification logs not provided.")
    return gaps


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect embedded change report evidence.")
    parser.add_argument("--project-root", default=".", help="Project root")
    parser.add_argument("--base", help="Base ref for Git comparison")
    parser.add_argument("--head", default="HEAD", help="Head ref for Git comparison")
    parser.add_argument("--build-log", help="Build log path")
    parser.add_argument("--test-log", help="Test log path")
    parser.add_argument("--serial-log", help="Serial log path")
    parser.add_argument("--can-log", help="CAN log path")
    parser.add_argument("--modbus-log", help="Modbus log path")
    parser.add_argument("--max-depth", type=int, default=4, help="Max recursive depth for project marker detection")
    parser.add_argument("--output", help="Write JSON output to this path")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()

    git_args = ["--project-root", str(root)]
    if args.base:
        git_args.extend(["--base", args.base, "--head", args.head])
    git_evidence = run_script("extract_git_evidence.py", git_args)

    build_summary = None
    if args.build_log:
        build_summary = run_script("extract_build_summary.py", ["--log", args.build_log])

    result = {
        "project_root": str(root),
        "project_markers": project_markers(root, args.max_depth),
        "git": git_evidence,
        "build_summary": build_summary,
        "logs": {
            "test": read_optional_log(args.test_log),
            "serial": read_optional_log(args.serial_log),
            "can": read_optional_log(args.can_log),
            "modbus": read_optional_log(args.modbus_log),
        },
        "evidence_gaps": collect_evidence_gaps(git_evidence, build_summary, args),
        "privacy_note": "Log previews redact obvious secrets, MAC addresses, IP addresses, and serial IDs, but manual review is still required before sharing externally.",
    }

    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
