#!/usr/bin/env python3
"""Append a concise task entry to .ai/TASK_LOG.md."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path


def normalize(value: str | None) -> str:
    return value.strip() if value and value.strip() else "未填写"


def evidence_status(validation: str) -> str:
    text = validation.lower()
    if not validation.strip():
        return "未验证"
    if any(marker in text for marker in ["未验证", "not run", "not executed", "未执行", "not verified"]):
        return "未验证 / 待补证据"
    return "用户提供 / 待复核"


def update_project_status(path: Path, *, goal: str, validation: str, result: str, risks: str, next_step: str, date: str) -> None:
    lines = [
        "# Project Status",
        "",
        "## Current Phase",
        "",
        f"- Phase: {normalize(result)}",
        f"- Active focus: {normalize(goal)}",
        f"- Last updated: {date}",
        "",
        "## Build / Test / Validation",
        "",
        f"- Latest validation: {normalize(validation)}",
        f"- Evidence status: {evidence_status(validation)}",
        "",
        "## Current Risks",
        "",
        f"- {normalize(risks)}",
        "",
        "## Blockers",
        "",
        "- 无 / 未填写",
        "",
        "## Next Step",
        "",
        f"- {normalize(next_step)}",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--owner", default="")
    parser.add_argument("--goal", required=True)
    parser.add_argument("--changed-files", default="")
    parser.add_argument("--validation", default="")
    parser.add_argument("--result", default="")
    parser.add_argument("--risks", default="")
    parser.add_argument("--next", default="")
    parser.add_argument("--date", default=dt.date.today().isoformat())
    parser.add_argument("--update-status", action="store_true", help="Also update .ai/PROJECT_STATUS.md with the latest task summary.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    task_log = project_root / ".ai" / "TASK_LOG.md"
    if not task_log.exists():
        output = {"ok": False, "status": "task-log-missing", "path": str(task_log)}
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return 2

    entry = f"""
## {args.date} Task: {normalize(args.goal)}

- Owner: {normalize(args.owner)}
- Goal: {normalize(args.goal)}
- Changed files: {normalize(args.changed_files)}
- Validation: {normalize(args.validation)}
- Result: {normalize(args.result)}
- Risks: {normalize(args.risks)}
- Next: {normalize(args.next)}
"""
    with task_log.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(entry)

    status_path = project_root / ".ai" / "PROJECT_STATUS.md"
    status_updated = False
    if args.update_status:
        update_project_status(
            status_path,
            goal=args.goal,
            validation=args.validation,
            result=args.result,
            risks=args.risks,
            next_step=args.next,
            date=args.date,
        )
        status_updated = True

    output = {"ok": True, "status": "appended", "path": str(task_log), "goal": args.goal, "project_status_updated": status_updated}
    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(f"Appended task log: {task_log}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
