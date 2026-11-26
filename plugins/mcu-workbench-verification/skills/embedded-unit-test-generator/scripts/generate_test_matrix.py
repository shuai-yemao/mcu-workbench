#!/usr/bin/env python3
"""Generate a conservative Markdown test matrix from module analysis JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def escape_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def case_rows(analysis: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    source = Path(analysis.get("source", "module")).name
    dependency_level = analysis.get("testability", {}).get("dependency_summary", {}).get("level", "unknown")
    functions = analysis.get("functions", [])
    public_functions = [item for item in functions if item.get("public_candidate")]
    candidates = public_functions or [
        item for item in functions if item.get("kind") == "definition" and not item.get("test_harness_candidate")
    ]

    for index, function in enumerate(candidates[:20], start=1):
        name = function.get("name", "function")
        status = "ready" if dependency_level == "low" else "pending"
        evidence = f"自动发现: {source}::{name}"
        mock_setup = "none" if dependency_level == "low" else "待确认: mock/stub hardware or RTOS dependency"
        rows.append(
            {
                "id": f"UT-{index:03d}",
                "behavior": f"{name} normal behavior",
                "preconditions": "module initialized if required",
                "input": "valid input set from requirement/code evidence",
                "mock": mock_setup,
                "expected": "待用户确认: expected output/state must be backed by requirement or explicit code path",
                "evidence": evidence,
                "status": status,
            }
        )
        next_id = len(rows) + 1
        if function.get("has_pointer_args"):
            rows.append(
                {
                    "id": f"UT-{next_id:03d}",
                    "behavior": f"{name} pointer argument validation",
                    "preconditions": "none",
                    "input": "NULL pointer or invalid buffer",
                    "mock": mock_setup,
                    "expected": "工程推断: confirm expected error handling before asserting",
                    "evidence": f"自动发现: pointer argument in {name} signature",
                    "status": "pending",
                }
            )
        next_id = len(rows) + 1
        if function.get("has_numeric_hint"):
            rows.append(
                {
                    "id": f"UT-{next_id:03d}",
                    "behavior": f"{name} numeric boundary handling",
                    "preconditions": "none",
                    "input": "min/max/zero/limit values",
                    "mock": mock_setup,
                    "expected": "待用户确认: legal range and saturation/error policy",
                    "evidence": f"工程推断: numeric argument in {name} signature",
                    "status": "pending",
                }
            )

    if dependency_level == "high":
        rows.append(
            {
                "id": f"UT-{len(rows) + 1:03d}",
                "behavior": "hardware-coupled behavior",
                "preconditions": "real peripheral/ISR/timing behavior required",
                "input": "hardware event or timing-sensitive path",
                "mock": "not sufficient for full behavior claim",
                "expected": "Do not claim unit-test coverage; require integration or hardware verification",
                "evidence": "自动发现: high-risk embedded dependency pattern",
                "status": "not-unit-testable",
            }
        )

    if not rows:
        rows.append(
            {
                "id": "UT-001",
                "behavior": "No testable function detected",
                "preconditions": "source parser found no definitions",
                "input": "n/a",
                "mock": "n/a",
                "expected": "Inspect source manually or provide public API header",
                "evidence": "脚本证据缺口",
                "status": "pending",
            }
        )
    return rows


def render_markdown(analysis: dict[str, Any]) -> str:
    header = analysis.get("header", {})
    dependency = analysis.get("testability", {}).get("dependency_summary", {})
    lines = [
        "# Test Case Matrix",
        "",
        f"- Source: `{analysis.get('source', 'unknown')}`",
        f"- Recommended include: `{header.get('recommended_include') or '待确认'}`",
        f"- Dependency risk: `{dependency.get('level', 'unknown')}`",
        "",
        "| ID | Function / Behavior | Preconditions | Input | Mock / Stub Setup | Expected Result | Evidence | Status |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for row in case_rows(analysis):
        lines.append(
            "| {id} | {behavior} | {preconditions} | {input} | {mock} | {expected} | {evidence} | {status} |".format(
                **{key: escape_cell(value) for key, value in row.items()}
            )
        )
    lines.extend(["", "Note: convert `pending` cases to assertions only after requirement/code evidence or user confirmation."])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--analysis", required=True, help="JSON from analyze_c_module.py.")
    parser.add_argument("--output", help="Write Markdown matrix to this path.")
    args = parser.parse_args()

    analysis = load_json(Path(args.analysis))
    if not analysis.get("ok", False):
        raise SystemExit("Analysis JSON is not ok; inspect warnings/evidence_gaps first.")
    text = render_markdown(analysis)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8", newline="\n")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
