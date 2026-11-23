#!/usr/bin/env python3
"""Initialize lightweight .ai team sync files for an embedded project."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


FILES = ["TEAM_RULES.md", "PROJECT_STATUS.md", "SKILL_REGISTRY.md", "TASK_LOG.md"]
APPEND_ONLY_FILES = {"TASK_LOG.md"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".", help="Target embedded project root.")
    parser.add_argument("--skill-dir", default=Path(__file__).resolve().parents[1], help="Skill directory.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing non-append-only .ai files.")
    parser.add_argument("--force-task-log", action="store_true", help="Also overwrite TASK_LOG.md. Dangerous for team history.")
    parser.add_argument("--json", action="store_true", help="Print JSON summary.")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    skill_dir = Path(args.skill_dir).resolve()
    assets_dir = skill_dir / "assets"
    ai_dir = project_root / ".ai"

    if not project_root.exists():
        output = {"ok": False, "status": "project-root-missing", "project_root": str(project_root)}
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return 2

    ai_dir.mkdir(exist_ok=True)
    created: list[str] = []
    skipped: list[str] = []
    overwritten: list[str] = []
    protected: list[str] = []

    for name in FILES:
        source = assets_dir / name
        target = ai_dir / name
        existed_before = target.exists()
        if existed_before and name in APPEND_ONLY_FILES and not args.force_task_log:
            protected.append(str(target))
            continue
        force_this_file = args.force or (name in APPEND_ONLY_FILES and args.force_task_log)
        if existed_before and not force_this_file:
            skipped.append(str(target))
            continue
        shutil.copyfile(source, target)
        if existed_before:
            overwritten.append(str(target))
        else:
            created.append(str(target))

    output = {
        "ok": True,
        "status": "initialized",
        "project_root": str(project_root),
        "ai_dir": str(ai_dir),
        "created": created,
        "skipped_existing": skipped,
        "overwritten": overwritten,
        "protected_append_only": protected,
    }
    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(f"Initialized team sync at {ai_dir}")
        if created:
            print("Created:")
            for path in created:
                print(f"  - {path}")
        if skipped:
            print("Skipped existing:")
            for path in skipped:
                print(f"  - {path}")
        if protected:
            print("Protected append-only files:")
            for path in protected:
                print(f"  - {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
