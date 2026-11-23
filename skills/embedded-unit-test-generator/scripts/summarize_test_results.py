#!/usr/bin/env python3
"""Summarize common embedded unit-test runner logs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


PATTERNS = {
    "ceedling": {
        "passed": [r"(\d+)\s+Tests?\s+(\d+)\s+Failures?\s+(\d+)\s+Ignored?", r"OK"],
        "failed": [r"FAILURES?", r"FAILED", r":FAIL:"],
    },
    "unity": {
        "passed": [r"(\d+)\s+Tests?\s+0\s+Failures?", r"OK"],
        "failed": [r"FAIL", r"FAILED", r"Assertion"],
    },
    "cpputest": {
        "passed": [r"OK\s+\(\d+\s+tests?"],
        "failed": [r"Errors\s+\(\d+\s+failures?", r"Failure:"],
    },
    "googletest": {
        "passed": [r"\[\s+PASSED\s+\]\s+\d+\s+tests?"],
        "failed": [r"\[\s+FAILED\s+\]", r"FAILED TEST"],
    },
    "auto": {
        "passed": [r"\bOK\b", r"\[\s+PASSED\s+\]", r"0\s+Failures?"],
        "failed": [r"\bFAIL(?:ED|URES?)?\b", r"\[\s+FAILED\s+\]", r"Assertion"],
    },
}


def match_any(patterns: list[str], text: str) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def extract_counts(framework: str, text: str) -> dict[str, int | None]:
    patterns = [
        r"(?P<total>\d+)\s+Tests?\s+(?P<failed>\d+)\s+Failures?\s+(?P<ignored>\d+)\s+Ignored?",
        r"\[\s+PASSED\s+\]\s+(?P<passed>\d+)\s+tests?",
        r"\[\s+FAILED\s+\]\s+(?P<failed>\d+)\s+tests?",
        r"OK\s+\((?P<passed>\d+)\s+tests?",
    ]
    counts: dict[str, int | None] = {"total": None, "passed": None, "failed": None, "ignored": None}
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            for key, value in match.groupdict().items():
                if value is not None:
                    current = counts.get(key)
                    parsed = int(value)
                    counts[key] = parsed if current is None else max(current, parsed)
    if counts["total"] is not None and counts["failed"] is not None:
        ignored = counts["ignored"] or 0
        counts["passed"] = max(counts["total"] - counts["failed"] - ignored, 0)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log", required=True, help="Test runner log.")
    parser.add_argument("--framework", choices=sorted(PATTERNS), default="auto")
    parser.add_argument("--output", help="Write JSON summary.")
    args = parser.parse_args()

    path = Path(args.log)
    if not path.exists():
        output = {
            "ok": False,
            "status": "log-missing",
            "warnings": [f"Log file does not exist: {path}"],
            "evidence_gaps": ["No test execution log was available."],
        }
    else:
        text = path.read_text(encoding="utf-8", errors="replace")
        patterns = PATTERNS[args.framework]
        has_pass = match_any(patterns["passed"], text)
        has_fail = match_any(patterns["failed"], text)
        counts = extract_counts(args.framework, text)
        compile_error = bool(re.search(r"\b(?:undefined reference|fatal error|error:|FAILED TO COMPILE|build failed)\b", text, flags=re.IGNORECASE))
        if compile_error:
            status = "build-or-compile-failed"
        elif counts.get("failed") == 0 and counts.get("total") is not None:
            status = "passed"
        elif counts.get("failed") and counts.get("failed", 0) > 0:
            status = "failed"
        elif has_pass and not has_fail:
            status = "passed"
        elif has_fail and not has_pass:
            status = "failed"
        elif has_pass and has_fail:
            status = "ambiguous"
        else:
            status = "unknown"
        failures = []
        for line in text.splitlines():
            if re.search(r"(?<!0\s)Failures?|FAILED|Assertion|Error", line, flags=re.IGNORECASE):
                failures.append(line.strip())
            if len(failures) >= 20:
                break
        output = {
            "ok": True,
            "status": status,
            "framework": args.framework,
            "log": str(path.resolve()),
            "counts": counts,
            "failure_preview": failures,
            "warnings": [] if status != "ambiguous" else ["Both pass and fail markers were detected."],
            "evidence_gaps": [] if status in {"passed", "failed"} else ["Log did not contain enough recognizable result markers."],
        }

    result = json.dumps(output, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
    else:
        print(result)
    return 0 if output.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
