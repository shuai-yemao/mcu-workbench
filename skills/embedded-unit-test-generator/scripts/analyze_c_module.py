#!/usr/bin/env python3
"""Analyze a C/C++ module for unit-test generation hints."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


COMMENT_RE = re.compile(r"/\*.*?\*/|//.*?$", re.DOTALL | re.MULTILINE)
FUNCTION_RE = re.compile(
    r"(?P<ret>(?:[A-Za-z_][\w\s\*\(\)]*?\s+)+)"
    r"(?P<name>[A-Za-z_]\w*)\s*"
    r"\((?P<args>[^;{}()]*(?:\([^)]*\)[^;{}()]*)*)\)\s*"
    r"(?P<end>[;{])",
    re.MULTILINE,
)
INCLUDE_RE = re.compile(r"^\s*#\s*include\s+[<\"]([^>\"]+)[>\"]", re.MULTILINE)
DEFINE_RE = re.compile(r"^\s*#\s*define\s+([A-Za-z_]\w*)\b(.*)$", re.MULTILINE)
ENUM_RE = re.compile(r"\benum\s+([A-Za-z_]\w*)?", re.MULTILINE)
STRUCT_RE = re.compile(r"\b(?:typedef\s+)?struct\s+([A-Za-z_]\w*)?", re.MULTILINE)

HARDWARE_PATTERNS = {
    "hal_calls": r"\b(?:HAL|LL|BSP|MX|nrfx|esp|gpio|i2c|spi|uart|can|adc|dac|tim|pwm|flash)_[A-Za-z0-9_]+\b",
    "rtos_calls": r"\b(?:xQueue|xSemaphore|xTask|vTask|osThread|osDelay|k_mutex|k_sem|k_thread)[A-Za-z0-9_]*\b",
    "volatile": r"\bvolatile\b",
    "register_access": r"(?:->\s*[A-Z][A-Z0-9_]*|\*\s*\(\s*volatile)",
    "interrupts": r"\b(?:IRQHandler|ISR|NVIC_|__disable_irq|__enable_irq)\b",
    "blocking_waits": r"\b(?:while|for)\s*\([^)]*(?:HAL_|LL_|flag|Flag|READY|BUSY|timeout|Timeout)",
}
STORAGE_OR_ATTRIBUTE_WORDS = {
    "__attribute__",
    "__weak",
    "__STATIC_INLINE",
    "inline",
    "static",
    "extern",
}
TEST_HARNESS_NAMES = {"setUp", "tearDown", "setup", "teardown", "main"}


def strip_comments(text: str) -> str:
    return COMMENT_RE.sub("", text)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def parse_functions(text: str) -> list[dict[str, Any]]:
    clean = strip_comments(text)
    functions: list[dict[str, Any]] = []
    control_words = {"if", "for", "while", "switch", "return", "sizeof"}
    for match in FUNCTION_RE.finditer(clean):
        name = match.group("name")
        ret = " ".join(match.group("ret").split())
        if name in control_words or ret in control_words:
            continue
        args = " ".join(match.group("args").split())
        is_test_harness = name in TEST_HARNESS_NAMES or name.startswith("test_") or name.startswith("TEST_")
        is_public_candidate = (
            match.group("end") == "{"
            and not ret.startswith("static ")
            and not ret.startswith("inline ")
            and not any(word in ret.split() for word in {"static", "__STATIC_INLINE"})
            and not is_test_harness
        )
        functions.append(
            {
                "name": name,
                "return_type": ret,
                "args": args,
                "kind": "prototype" if match.group("end") == ";" else "definition",
                "public_candidate": is_public_candidate,
                "test_harness_candidate": is_test_harness,
                "has_pointer_args": "*" in args,
                "has_numeric_hint": bool(re.search(r"\b(?:int|uint\d+_t|int\d+_t|size_t|long|short|float|double)\b", args)),
            }
        )
    return functions


def scan_patterns(text: str) -> dict[str, list[str]]:
    findings: dict[str, list[str]] = {}
    for key, pattern in HARDWARE_PATTERNS.items():
        matches = sorted(set(re.findall(pattern, text, flags=re.IGNORECASE)))
        if matches:
            findings[key] = [str(m) for m in matches[:40]]
    return findings


def choose_header(source: Path, includes: list[str], include_args: list[str]) -> dict[str, Any]:
    candidates: list[str] = []
    for include in include_args:
        path = Path(include)
        if path.exists():
            candidates.append(str(path.resolve()))
    same_name = source.with_suffix(".h")
    if same_name.exists():
        candidates.append(str(same_name.resolve()))
    stem = source.stem.lower()
    for include in includes:
        if Path(include).stem.lower() == stem:
            candidates.append(include)
    unique = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return {
        "recommended_include": unique[0] if unique else None,
        "candidates": unique,
        "confidence": "high" if unique else "unknown",
    }


def dependency_summary(findings: dict[str, list[str]]) -> dict[str, Any]:
    if not findings:
        return {"level": "low", "notes": ["No hardware or RTOS dependency pattern detected by lightweight scan."]}
    high_keys = {"register_access", "interrupts", "blocking_waits"}
    if any(key in findings for key in high_keys):
        level = "high"
    elif any(key in findings for key in {"hal_calls", "rtos_calls", "volatile"}):
        level = "medium"
    else:
        level = "low"
    notes = [f"Detected {key}: {len(values)} occurrence pattern(s)." for key, values in findings.items()]
    return {"level": level, "notes": notes}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Source file to analyze.")
    parser.add_argument("--include", action="append", default=[], help="Related header file. Can be repeated.")
    parser.add_argument("--output", help="Write JSON output to this path.")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    warnings: list[str] = []
    evidence_gaps: list[str] = []

    if not source.exists():
        output = {
            "ok": False,
            "status": "source-missing",
            "source": str(source),
            "warnings": [f"Source file does not exist: {source}"],
            "evidence_gaps": ["No source code analyzed."],
        }
        text = json.dumps(output, ensure_ascii=False, indent=2)
        if args.output:
            Path(args.output).write_text(text, encoding="utf-8")
        else:
            print(text)
        return 2

    texts: dict[str, str] = {str(source): read(source)}
    for include in args.include:
        path = Path(include).resolve()
        if path.exists():
            texts[str(path)] = read(path)
        else:
            warnings.append(f"Include file not found: {include}")

    combined = "\n".join(texts.values())
    functions = parse_functions(combined)
    definitions = [item for item in functions if item["kind"] == "definition"]
    prototypes = [item for item in functions if item["kind"] == "prototype"]
    if not definitions and not prototypes:
        evidence_gaps.append("No function signatures detected by lightweight parser.")

    includes = sorted(set(INCLUDE_RE.findall(combined)))
    defines = [{"name": name, "value": value.strip()} for name, value in DEFINE_RE.findall(combined)[:80]]
    hardware_findings = scan_patterns(combined)

    output = {
        "ok": True,
        "status": "analyzed",
        "source": str(source),
        "related_files": list(texts),
        "includes": includes,
        "defines": defines,
        "enum_count": len(ENUM_RE.findall(combined)),
        "struct_count": len(STRUCT_RE.findall(combined)),
        "functions": functions,
        "header": choose_header(source, includes, args.include),
        "testability": {
            "definition_count": len(definitions),
            "prototype_count": len(prototypes),
            "public_candidate_count": len([item for item in functions if item.get("public_candidate")]),
            "hardware_findings": hardware_findings,
            "dependency_summary": dependency_summary(hardware_findings),
        },
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
