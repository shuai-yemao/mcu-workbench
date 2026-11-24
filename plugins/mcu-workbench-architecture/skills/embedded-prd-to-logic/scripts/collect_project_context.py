#!/usr/bin/env python3
"""Collect lightweight embedded project context for PRD-to-logic planning."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {
    ".git",
    ".svn",
    ".hg",
    ".vscode",
    ".idea",
    "__pycache__",
    "build",
    "cmake-build-debug",
    "cmake-build-release",
    "debug",
    "release",
    "node_modules",
    ".pio",
}

SOURCE_EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hpp", ".s", ".S", ".asm"}
TEXT_EXTS = SOURCE_EXTS | {".md", ".txt", ".ini", ".yml", ".yaml", ".json", ".ioc", ".ld", ".icf", ".sct"}
BUILD_PATTERNS = {
    "keil": [".uvprojx", ".uvoptx"],
    "iar": [".ewp", ".eww"],
    "cmake": ["CMakeLists.txt"],
    "platformio": ["platformio.ini"],
    "esp-idf": ["sdkconfig", "idf_component.yml"],
    "make": ["Makefile", "makefile"],
    "stm32cubemx": [".ioc"],
}
BOUNDARY_FILES = (
    ".ai/LLM_RULES.md",
    ".ai/LLM_BOUNDARY.md",
    ".ai/TEAM_RULES.md",
    ".ai/PROJECT_STATUS.md",
)


def rel(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def iter_files(root: Path, limit: int = 8000) -> Iterable[Path]:
    count = 0
    for current, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".tmp")]
        for name in files:
            count += 1
            if count > limit:
                return
            yield Path(current) / name


def detect_build_system(files: list[Path], root: Path) -> dict:
    found: dict[str, list[str]] = {}
    for file in files:
        name = file.name
        suffix = file.suffix
        for system, patterns in BUILD_PATTERNS.items():
            for pattern in patterns:
                if pattern.startswith(".") and suffix.lower() == pattern.lower():
                    found.setdefault(system, []).append(rel(file, root))
                elif name == pattern:
                    found.setdefault(system, []).append(rel(file, root))
    return found


def top_dirs(paths: list[Path], root: Path, markers: tuple[str, ...]) -> list[str]:
    results: set[str] = set()
    for path in paths:
        parts = path.relative_to(root).parts
        lowered = [p.lower() for p in parts]
        if any(marker in lowered for marker in markers):
            results.add(parts[0] if parts else ".")
    return sorted(results)[:40]


def find_by_names(files: list[Path], root: Path, names: tuple[str, ...]) -> list[str]:
    result = []
    wanted = tuple(n.lower() for n in names)
    for file in files:
        if file.name.lower() in wanted:
            result.append(rel(file, root))
    return sorted(result)[:80]


def find_by_substrings(files: list[Path], root: Path, words: tuple[str, ...]) -> list[str]:
    result = []
    for file in files:
        p = rel(file, root)
        low = p.lower()
        if any(word in low for word in words):
            result.append(p)
    return sorted(result)[:120]


def find_by_suffixes(files: list[Path], root: Path, suffixes: tuple[str, ...]) -> list[str]:
    normalized = tuple(s.lower() for s in suffixes)
    result = []
    for file in files:
        if file.name.lower().endswith(normalized):
            result.append(rel(file, root))
    return sorted(result)[:120]


def keyword_path_hits(files: list[Path], root: Path, keywords: list[str]) -> list[str]:
    if not keywords:
        return []
    lowered = [k.strip().lower() for k in keywords if k.strip()]
    hits = []
    for file in files:
        if file.suffix not in TEXT_EXTS:
            continue
        p = rel(file, root)
        low = p.lower()
        if any(k in low for k in lowered):
            hits.append(p)
    return sorted(hits)[:120]


def read_text_preview(path: Path, limit_bytes: int = 256_000) -> str:
    try:
        data = path.read_bytes()[:limit_bytes]
    except OSError:
        return ""
    for encoding in ("utf-8", "utf-8-sig", "gbk", "latin-1"):
        try:
            return data.decode(encoding, errors="ignore")
        except LookupError:
            continue
    return ""


def keyword_content_hits(files: list[Path], root: Path, keywords: list[str], max_files: int = 160) -> list[dict]:
    if not keywords:
        return []
    lowered = [k.strip().lower() for k in keywords if k.strip()]
    hits: list[dict] = []
    for file in files:
        if len(hits) >= max_files:
            break
        if file.suffix not in TEXT_EXTS:
            continue
        text = read_text_preview(file)
        if not text:
            continue
        low = text.lower()
        matched = [k for k in lowered if k in low]
        if not matched:
            continue
        lines = []
        for idx, line in enumerate(text.splitlines(), start=1):
            line_low = line.lower()
            if any(k in line_low for k in matched):
                compact = re.sub(r"\s+", " ", line).strip()
                if compact:
                    lines.append({"line": idx, "text": compact[:180]})
            if len(lines) >= 3:
                break
        hits.append({"path": rel(file, root), "matched": matched[:8], "sample_lines": lines})
    return hits


def collect_boundary_files(root: Path) -> dict:
    result = {}
    for item in BOUNDARY_FILES:
        path = root / item
        if path.exists() and path.is_file():
            preview = read_text_preview(path, limit_bytes=16_000)
            result[item] = {
                "exists": True,
                "preview": preview[:3000],
                "note": "Read the full file before proposing implementation boundaries.",
            }
        else:
            result[item] = {"exists": False}
    return result


def collect(root: Path, keywords: list[str], content_search: bool) -> dict:
    root = root.resolve()
    files = list(iter_files(root))
    source_files = [f for f in files if f.suffix in SOURCE_EXTS]

    context = {
        "ok": True,
        "project_root": str(root),
        "summary": {
            "file_count_scanned": len(files),
            "source_file_count": len(source_files),
        },
        "build_systems": detect_build_system(files, root),
        "entry_points": {
            "main_files": find_by_names(files, root, ("main.c", "main.cpp", "app_main.c")),
            "startup_files": find_by_substrings(files, root, ("startup_", "vectors", "vector_table")),
            "linker_scripts": find_by_suffixes(files, root, (".ld", ".icf", ".sct")),
        },
        "directories": {
            "source_like": top_dirs(source_files, root, ("src", "source", "app", "application", "components", "main")),
            "include_like": top_dirs(files, root, ("inc", "include", "includes")),
            "driver_like": top_dirs(files, root, ("driver", "drivers", "bsp", "hal", "ll", "cmsis")),
            "test_like": top_dirs(files, root, ("test", "tests", "unit", "unity", "ceedling")),
        },
        "rtos_hints": find_by_substrings(files, root, ("freertos", "rt-thread", "zephyr", "cmsis_os", "tx_api")),
        "communication_hints": find_by_substrings(
            files,
            root,
            ("can", "uart", "usart", "spi", "i2c", "modbus", "ethernet", "tcp", "udp", "ble", "usb"),
        ),
        "storage_hints": find_by_substrings(files, root, ("flash", "eeprom", "nvm", "storage", "littlefs", "fatfs")),
        "ai_boundary_files": collect_boundary_files(root),
        "keyword_path_hits": keyword_path_hits(files, root, keywords),
        "keyword_content_hits": keyword_content_hits(files, root, keywords) if content_search else [],
        "evidence_note": (
            "Path and content hits are candidate_impact only. Read relevant source files directly "
            "before claiming a definite integration point."
        ),
        "warnings": [],
    }

    if len(files) >= 8000:
        context["warnings"].append("File scan limit reached; context may be incomplete.")
    if not context["build_systems"]:
        context["warnings"].append("No common embedded build system marker found.")
    if not context["entry_points"]["main_files"]:
        context["warnings"].append("No main.c/main.cpp/app_main.c entry point found.")
    if keywords and not content_search:
        context["warnings"].append("Keyword search checked paths only. Use --content-search to search file contents.")
    if not any(item.get("exists") for item in context["ai_boundary_files"].values()):
        context["warnings"].append("No .ai boundary/status files found.")

    return context


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect lightweight embedded project context.")
    parser.add_argument("--project-root", default=".", help="Embedded project root.")
    parser.add_argument("--keywords", default="", help="Comma-separated PRD keywords to match against paths.")
    parser.add_argument("--content-search", action="store_true", help="Search text file contents for keywords.")
    parser.add_argument("--output", help="Optional JSON output path.")
    args = parser.parse_args()

    root = Path(args.project_root)
    if not root.exists() or not root.is_dir():
        data = {"ok": False, "error": f"Project root is not a directory: {root}"}
    else:
        keywords = [item.strip() for item in args.keywords.split(",") if item.strip()]
        data = collect(root, keywords, args.content_search)

    text = json.dumps(data, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0 if data.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
