#!/usr/bin/env python3
"""Generate a lightweight task confirmation note from team sync state."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_excerpt(path: Path, max_chars: int = 1800) -> str:
    if not path.exists():
        return "未找到"
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    return text[:max_chars] + ("\n[truncated]" if len(text) > max_chars else "")


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()] if value else []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--goal", required=True)
    parser.add_argument("--allowed-files", default="")
    parser.add_argument("--forbidden-areas", default="startup files, linker scripts, generated code, verified hardware timing code")
    parser.add_argument("--validation-plan", default="")
    parser.add_argument("--pending-confirmations", default="")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    ai_dir = project_root / ".ai"
    missing = [name for name in ["TEAM_RULES.md", "PROJECT_STATUS.md"] if not (ai_dir / name).exists()]

    allowed = split_csv(args.allowed_files)
    forbidden = split_csv(args.forbidden_areas)
    validation = args.validation_plan.strip() or "待确认: build/test/hardware validation plan"
    pending = args.pending_confirmations.strip() or "待确认: allowed files, validation evidence, hardware risk"

    note = "\n".join(
        [
            "# Task Confirmation Note",
            "",
            f"- Project: {project_root}",
            f"- Goal: {args.goal}",
            f"- Allowed files: {', '.join(allowed) if allowed else '待确认'}",
            f"- Forbidden areas: {', '.join(forbidden) if forbidden else '待确认'}",
            f"- Validation plan: {validation}",
            f"- Pending confirmations: {pending}",
            "",
            "## Current Project Status Excerpt",
            "",
            read_excerpt(ai_dir / "PROJECT_STATUS.md"),
            "",
            "## Team Rules Excerpt",
            "",
            read_excerpt(ai_dir / "TEAM_RULES.md"),
            "",
            "Do not edit production code until the user confirms the task boundary when hardware behavior or high-risk files are involved.",
        ]
    )

    output = {"ok": not missing, "status": "ready" if not missing else "missing-team-sync-files", "missing": missing, "note": note}
    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        if missing:
            print("Missing files:")
            for name in missing:
                print(f"- .ai/{name}")
            print("")
        print(note)
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
