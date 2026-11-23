#!/usr/bin/env python3
"""Extract a compact build summary from common embedded build logs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SUCCESS_PATTERNS = [
    r"\b0\s+error\(s\)",
    r"\b0\s+errors?\b",
    r"\bbuild complete\b",
    r"\bbuild succeeded\b",
    r"\bsuccessfully generated\b",
    r"\bsuccessfully built\b",
    r"\[100%\].*built target",
]

FAIL_PATTERNS = [
    r"\berror:",
    r"\bfatal error:",
    r"\bundefined reference\b",
    r"\bmultiple definition\b",
    r"\bNo space in execution regions\b",
    r"\bregion .* overflowed\b",
    r"\bbuild failed\b",
    r"\bcompilation terminated\b",
    r"\bpost-build.*failed\b",
    r"\bfailed\b",
    r"\b[1-9]\d*\s+error\(s\)",
    r"\b[1-9]\d*\s+errors?\b",
]

WARNING_PATTERNS = [
    r"\bwarning:",
    r"\b[1-9]\d*\s+warning\(s\)",
    r"\b[1-9]\d*\s+warnings?\b",
]

MEMORY_PATTERNS = [
    r"(?:Program Size|Total RO\s+Size|Total RW\s+Size|Total ROM\s+Size|text\s+data\s+bss|Memory region|RAM|Flash|ROM).*",
    r"\b(?:FLASH|RAM|ROM|IRAM|IROM|ER_IROM|RW_IRAM)\b.*\b(?:used|overflowed|origin|length|size)\b.*",
]

ARTIFACT_PATTERNS = [
    r"([^\s\"<>|]+\.(?:elf|axf|hex|bin|map))",
]


def read_text_with_fallback(path: Path) -> tuple[str, str]:
    raw = path.read_bytes()
    for encoding in ["utf-8-sig", "utf-8", "gbk", "cp936", "latin-1"]:
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def find_matches(patterns: list[str], text: str, flags: int = re.IGNORECASE) -> list[str]:
    matches: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags):
            line_start = text.rfind("\n", 0, match.start()) + 1
            line_end = text.find("\n", match.end())
            if line_end == -1:
                line_end = len(text)
            line = text[line_start:line_end].strip()
            if line and line not in matches:
                matches.append(line)
    return matches


def classify_status(success_lines: list[str], fail_lines: list[str]) -> tuple[str, list[str]]:
    notes: list[str] = []
    if fail_lines and success_lines:
        notes.append("Build log contains both success and failure evidence. Treat the result as ambiguous until reviewed.")
        return "ambiguous", notes
    if fail_lines:
        return "failed", notes
    if success_lines:
        return "success", notes
    notes.append("No reliable success or failure marker found.")
    return "unknown", notes


def estimate_error_warning_counts(text: str) -> dict[str, int | None]:
    error_counts = [int(value) for value in re.findall(r"\b(\d+)\s+error(?:\(s\)|s?)\b", text, flags=re.IGNORECASE)]
    warning_counts = [int(value) for value in re.findall(r"\b(\d+)\s+warning(?:\(s\)|s?)\b", text, flags=re.IGNORECASE)]
    return {
        "reported_error_count": error_counts[-1] if error_counts else None,
        "reported_warning_count": warning_counts[-1] if warning_counts else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract summary from embedded build logs.")
    parser.add_argument("--log", required=True, help="Build log path")
    parser.add_argument("--output", help="Write JSON output to this path")
    args = parser.parse_args()

    path = Path(args.log)
    if not path.exists():
        result = {"ok": False, "log": str(path), "error": "build log does not exist"}
    else:
        text, encoding = read_text_with_fallback(path)

        warning_lines = find_matches(WARNING_PATTERNS, text)
        fail_lines = find_matches(FAIL_PATTERNS, text)
        success_lines = find_matches(SUCCESS_PATTERNS, text)
        memory_lines = find_matches(MEMORY_PATTERNS, text)

        artifact_matches: list[str] = []
        for pattern in ARTIFACT_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                artifact = match.group(1).strip()
                if artifact not in artifact_matches:
                    artifact_matches.append(artifact)

        status, notes = classify_status(success_lines, fail_lines)
        counts = estimate_error_warning_counts(text)

        result = {
            "ok": True,
            "log": str(path.resolve()),
            "encoding": encoding,
            "line_count": text.count("\n") + 1 if text else 0,
            "status": status,
            "success": status == "success",
            "has_error": status in ["failed", "ambiguous"],
            **counts,
            "success_evidence": success_lines[-10:],
            "error_evidence": fail_lines[:30],
            "warning_count_estimate": len(warning_lines),
            "warning_evidence": warning_lines[:30],
            "memory_evidence": memory_lines[:40],
            "artifacts": artifact_matches[:40],
            "notes": notes,
        }

    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
