#!/usr/bin/env python3
"""Create a concise snapshot from .ai team sync files."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


FILES = ["TEAM_RULES.md", "PROJECT_STATUS.md", "SKILL_REGISTRY.md", "TASK_LOG.md"]


def read_excerpt(path: Path, max_chars: int, *, tail: bool = False) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    if len(text) <= max_chars:
        return text
    if tail:
        return "[truncated: showing latest content]\n" + text[-max_chars:]
    return text[:max_chars] + "\n[truncated: showing first content]"


def extract_bullets(text: str, heading: str) -> list[str]:
    match = re.search(rf"^##\s+{re.escape(heading)}\s*$([\s\S]*?)(?=^##\s+|\Z)", text, flags=re.MULTILINE)
    if not match:
        return []
    return [line.strip()[2:].strip() for line in match.group(1).splitlines() if line.strip().startswith("- ")]


def latest_tasks(task_log: str, count: int = 3) -> list[str]:
    matches = list(re.finditer(r"^##\s+\d{4}-\d{2}-\d{2}\s+Task:\s+.*$", task_log, flags=re.MULTILINE))
    tasks: list[str] = []
    for index, match in enumerate(matches[-count:]):
        start = match.start()
        end = matches[-count + index + 1].start() if index + 1 < min(count, len(matches)) else len(task_log)
        tasks.append(task_log[start:end].strip())
    return tasks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--max-chars", type=int, default=3000)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    ai_dir = project_root / ".ai"
    missing = [name for name in FILES if not (ai_dir / name).exists()]
    sections = {}
    for name in FILES:
        path = ai_dir / name
        if path.exists():
            sections[name] = read_excerpt(path, args.max_chars, tail=name == "TASK_LOG.md")

    status_text = (ai_dir / "PROJECT_STATUS.md").read_text(encoding="utf-8", errors="replace") if (ai_dir / "PROJECT_STATUS.md").exists() else ""
    task_text = (ai_dir / "TASK_LOG.md").read_text(encoding="utf-8", errors="replace") if (ai_dir / "TASK_LOG.md").exists() else ""
    summary = {
        "current_phase": extract_bullets(status_text, "Current Phase"),
        "validation": extract_bullets(status_text, "Build / Test / Validation") or extract_bullets(status_text, "Build") + extract_bullets(status_text, "Test"),
        "risks": extract_bullets(status_text, "Current Risks"),
        "next_step": extract_bullets(status_text, "Next Step"),
        "latest_tasks": latest_tasks(task_text),
    }

    output = {
        "ok": not missing,
        "status": "complete" if not missing else "incomplete",
        "project_root": str(project_root),
        "missing": missing,
        "summary": summary,
        "sections": sections,
    }
    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(f"# Team Sync Snapshot\n\nProject: {project_root}\n")
        if missing:
            print("Missing files:")
            for name in missing:
                print(f"- .ai/{name}")
            print("")
        print("## Summary\n")
        for key, values in summary.items():
            print(f"### {key}")
            if values:
                for value in values:
                    print(value if value.startswith("## ") else f"- {value}")
            else:
                print("- 未填写")
            print("")
        for name in FILES:
            if name in sections:
                print(f"## {name}\n")
                print(sections[name].strip())
                print("")
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
