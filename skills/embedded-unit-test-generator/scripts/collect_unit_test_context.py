#!/usr/bin/env python3
"""Collect project evidence useful for embedded unit-test generation."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any


TEST_MARKERS = {
    "ceedling": [r"\bproject\.yml\b", r"\bceedling\b"],
    "unity": [r"\bunity\.h\b", r"\bTEST_ASSERT_[A-Z0-9_]*\s*\(", r"\bRUN_TEST\s*\("],
    "cpputest": [r"\bCppUTest\b", r"\bTEST_GROUP\s*\(", r"\bMockSupport\b"],
    "googletest": [r"\bgtest\b", r"\bgmock\b", r"\bTEST_F\s*\(", r"\bASSERT_EQ\s*\(", r"\bEXPECT_EQ\s*\("],
    "ctest": [r"\benable_testing\s*\(", r"\badd_test\s*\(", r"\bctest\b"],
    "platformio": [r"\bplatformio\.ini\b", r"\bpio\s+test\b"],
}

PROJECT_MARKERS = [
    "*.ioc",
    "sdkconfig",
    "platformio.ini",
    "CMakeLists.txt",
    "Makefile",
    "*.uvprojx",
    "*.ewp",
    "compile_commands.json",
]

SOURCE_SUFFIXES = {".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".s", ".S"}
SKIP_DIRS = {
    ".git",
    ".tmp_validation",
    "build",
    "cmake-build-debug",
    "cmake-build-release",
    "__pycache__",
    ".pio",
    "node_modules",
}
NOISY_DIRS = {"Drivers", "Middlewares", "third_party", "vendor", "external"}


def rel(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def read_text_preview(path: Path, limit: int = 12000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except OSError:
        return ""


def iter_files(root: Path, max_files: int) -> list[Path]:
    results: list[Path] = []
    for current_root, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for filename in sorted(filenames):
            path = Path(current_root) / filename
            results.append(path)
            if len(results) >= max_files:
                return results
    return results


def find_project_markers(root: Path, files: list[Path]) -> list[str]:
    found: set[str] = set()
    for pattern in PROJECT_MARKERS:
        for path in root.rglob(pattern):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            found.add(rel(path, root))
    for path in files:
        if path.name in {"CMakeLists.txt", "Makefile", "platformio.ini", "project.yml"}:
            found.add(rel(path, root))
    return sorted(found)


def classify_project(root: Path, markers: list[str]) -> dict[str, Any]:
    marker_names = {Path(marker).name for marker in markers}
    types: list[str] = []
    if any(marker.endswith(".ioc") for marker in markers):
        types.append("stm32cubemx")
    if "sdkconfig" in marker_names:
        types.append("esp-idf")
    if "platformio.ini" in marker_names:
        types.append("platformio")
    if any(marker.endswith(".uvprojx") for marker in markers):
        types.append("keil-mdk")
    if any(marker.endswith(".ewp") for marker in markers):
        types.append("iar-ew")
    if "CMakeLists.txt" in marker_names:
        types.append("cmake")
    if "Makefile" in marker_names:
        types.append("make")
    return {
        "types": types or ["unknown"],
        "notes": [] if types else ["No common embedded project marker was detected."],
    }


def detect_frameworks(root: Path, files: list[Path]) -> dict[str, Any]:
    evidence: dict[str, list[str]] = {name: [] for name in TEST_MARKERS}
    for path in files:
        relative = rel(path, root)
        name_text = path.name
        if path.suffix.lower() not in SOURCE_SUFFIXES and path.name not in {"project.yml", "platformio.ini", "CMakeLists.txt"}:
            continue
        preview = read_text_preview(path, 8000)
        haystack = name_text + "\n" + preview
        for framework, markers in TEST_MARKERS.items():
            if any(re.search(marker, haystack) for marker in markers):
                evidence[framework].append(relative)
    detected = {key: sorted(value)[:20] for key, value in evidence.items() if value}
    return {
        "detected": sorted(detected),
        "evidence": detected,
    }


def run_git(root: Path, args: list[str]) -> dict[str, Any]:
    completed = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    return {
        "ok": completed.returncode == 0,
        "stdout": completed.stdout.splitlines(),
        "stderr": completed.stderr.strip(),
    }


def collect_git(root: Path, base: str | None, head: str | None) -> dict[str, Any]:
    result: dict[str, Any] = {"available": False}
    try:
        subprocess.run(["git", "-C", str(root), "rev-parse", "--is-inside-work-tree"], check=True, capture_output=True, text=True)
    except (OSError, subprocess.CalledProcessError):
        return result

    result["available"] = True
    result["status"] = run_git(root, ["status", "--short"])
    result["untracked_files"] = run_git(root, ["ls-files", "--others", "--exclude-standard"])
    if base and head:
        for ref_name, ref_value in {"base": base, "head": head}.items():
            ref_check = run_git(root, ["rev-parse", "--verify", f"{ref_value}^{{commit}}"])
            result[f"{ref_name}_ref"] = ref_check
            if not ref_check["ok"]:
                result["range_ok"] = False
                return result
        diff_range = f"{base}..{head}"
    else:
        diff_range = "HEAD"
    result["range_ok"] = True
    result["diff_files"] = run_git(root, ["diff", "--name-only", diff_range])
    result["diff_stat"] = run_git(root, ["diff", "--stat", diff_range])
    diff_hunks = run_git(root, ["diff", "--unified=40", "--no-ext-diff", diff_range])
    if diff_hunks["ok"]:
        lines = diff_hunks["stdout"]
        result["diff_hunks_preview"] = {
            "truncated": len(lines) > 500,
            "lines": lines[:500],
        }
    else:
        result["diff_hunks_preview"] = diff_hunks
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".", help="Embedded project root.")
    parser.add_argument("--target", action="append", default=[], help="Target source/header file. Can be repeated.")
    parser.add_argument("--base", help="Git base ref for regression-test context.")
    parser.add_argument("--head", help="Git head ref for regression-test context.")
    parser.add_argument("--output", help="Write JSON output to this path.")
    parser.add_argument("--max-files", type=int, default=1500)
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    warnings: list[str] = []
    evidence_gaps: list[str] = []

    if not root.exists():
        output = {
            "ok": False,
            "status": "project-root-missing",
            "project_root": str(root),
            "warnings": [f"Project root does not exist: {root}"],
            "evidence_gaps": ["No project files could be scanned."],
        }
        text = json.dumps(output, ensure_ascii=False, indent=2)
        if args.output:
            Path(args.output).write_text(text, encoding="utf-8")
        else:
            print(text)
        return 2

    files = iter_files(root, args.max_files)
    source_files = [path for path in files if path.suffix in SOURCE_SUFFIXES]
    test_like_files = [path for path in source_files if any(part.lower() in {"test", "tests", "unit_tests"} for part in path.parts) or path.name.lower().startswith("test_")]
    target_paths = []
    for target in args.target:
        target_path = (root / target).resolve()
        if target_path.exists():
            target_paths.append(rel(target_path, root))
        else:
            warnings.append(f"Target not found: {target}")

    if not source_files:
        evidence_gaps.append("No C/C++ source or header files detected.")
    if not test_like_files:
        evidence_gaps.append("No existing test files detected.")
    if not target_paths and args.target:
        evidence_gaps.append("Specified test targets were not found.")
    if len(files) >= args.max_files:
        warnings.append(f"File scan stopped at --max-files={args.max_files}; evidence may be incomplete.")

    noisy_samples = [rel(path, root) for path in source_files if any(part in NOISY_DIRS for part in path.parts)]
    project_markers = find_project_markers(root, files)

    output = {
        "ok": True,
        "status": "collected",
        "project_root": str(root),
        "targets": target_paths,
        "project_markers": project_markers,
        "project_profile": classify_project(root, project_markers),
        "frameworks": detect_frameworks(root, files),
        "source_summary": {
            "total_files_scanned": len(files),
            "source_file_count": len(source_files),
            "test_like_file_count": len(test_like_files),
            "sample_sources": [rel(path, root) for path in source_files[:40]],
            "sample_tests": [rel(path, root) for path in test_like_files[:40]],
            "noisy_dependency_samples": noisy_samples[:40],
        },
        "git": collect_git(root, args.base, args.head),
        "warnings": warnings,
        "evidence_gaps": evidence_gaps,
    }

    text = json.dumps(output, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
