#!/usr/bin/env python3
"""Extract Git change evidence for embedded change reports."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


HIGH_RISK_PATTERNS = {
    "startup_or_vector": ["startup", "vector", "isr", "interrupt", "irq", "it.c", "stm32", "_it."],
    "linker_or_flash_layout": [".ld", ".icf", ".sct", "scatter", "partition", "flash", "bootloader"],
    "rtos_or_concurrency": ["freertos", "rtos", "thread", "task", "queue", "sem", "mutex", "rtthread", "zephyr"],
    "bsp_or_driver": [
        "bsp",
        "driver",
        "drivers",
        "hal",
        "msp",
        "gpio",
        "uart",
        "usart",
        "spi",
        "qspi",
        "ospi",
        "i2c",
        "can",
        "fdcan",
        "adc",
        "dac",
        "pwm",
        "tim",
        "usb",
        "eth",
        "lwip",
    ],
    "communication": ["modbus", "can", "fdcan", "uart", "usart", "tcp", "udp", "protocol", "frame", "scpi", "visa", "mqtt", "lwip"],
    "generated_code": ["cubemx", "generated", "codegen", ".ioc", ".mex"],
    "build_system": ["cmakelists.txt", "makefile", "platformio.ini", ".uvprojx", ".uvoptx", ".ewp", ".eww", "sdkconfig"],
}


def run_git(args: list[str], cwd: Path) -> tuple[int, str, str]:
    proc = subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return proc.returncode, proc.stdout.strip(), proc.stderr.strip()


def parse_name_status(output: str, source: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for line in output.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") and len(parts) >= 3:
            entries.append({"status": status, "old_path": parts[1], "path": parts[2], "source": source})
        elif len(parts) >= 2:
            entries.append({"status": status, "path": parts[1], "source": source})
    return entries


def classify_path(path: str) -> list[str]:
    lower = path.lower().replace("\\", "/")
    hits: list[str] = []
    for category, patterns in HIGH_RISK_PATTERNS.items():
        if any(pattern in lower for pattern in patterns):
            hits.append(category)
    return hits


def verify_ref(repo: Path, ref: str) -> tuple[bool, str]:
    code, out, err = run_git(["rev-parse", "--verify", f"{ref}^{{commit}}"], repo)
    return code == 0, out if code == 0 else err


def untracked_entries(repo: Path) -> list[dict[str, str]]:
    code, out, _ = run_git(["ls-files", "--others", "--exclude-standard"], repo)
    if code != 0:
        return []
    return [{"status": "??", "path": line, "source": "untracked"} for line in out.splitlines() if line.strip()]


def build_risk_hints(entries: list[dict[str, str]]) -> dict[str, list[str]]:
    risk_hints: dict[str, list[str]] = {}
    for entry in entries:
        path = entry.get("path", "")
        if not path:
            continue
        categories = classify_path(path)
        if categories:
            risk_hints[path] = categories
    return risk_hints


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract Git evidence for embedded change reports.")
    parser.add_argument("--project-root", default=".", help="Project root containing .git")
    parser.add_argument("--base", help="Base ref. If omitted, inspect working tree changes.")
    parser.add_argument("--head", default="HEAD", help="Head ref when --base is provided")
    parser.add_argument("--output", help="Write JSON output to this path")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    code, top, err = run_git(["rev-parse", "--show-toplevel"], root)
    if code != 0:
        result = {"ok": False, "git_available": False, "error": err or "not a git repository"}
    else:
        repo = Path(top)
        status_code, status_out, status_err = run_git(["status", "--short"], repo)
        branch_code, branch_out, _ = run_git(["branch", "--show-current"], repo)
        head_code, head_out, _ = run_git(["rev-parse", "HEAD"], repo)
        _, recent_out, _ = run_git(["log", "--oneline", "-n", "10"], repo)

        result: dict[str, object] = {
            "ok": True,
            "git_available": True,
            "repo_root": str(repo),
            "branch": branch_out if branch_code == 0 else "",
            "head_commit": head_out if head_code == 0 else "",
            "status_short": status_out if status_code == 0 else "",
            "status_error": status_err if status_code != 0 else "",
            "recent_commits": recent_out,
            "range": "",
            "changed_files": [],
            "staged_files": [],
            "unstaged_files": [],
            "untracked_files": [],
            "diff_stat": "",
            "staged_diff_stat": "",
            "risk_hints": {},
            "high_risk_flags": [],
            "warnings": [],
        }

        if args.base:
            base_ok, base_msg = verify_ref(repo, args.base)
            head_ok, head_msg = verify_ref(repo, args.head)
            if not base_ok or not head_ok:
                result.update(
                    {
                        "ok": False,
                        "range": f"{args.base}..{args.head}",
                        "error": "Invalid Git ref for requested comparison.",
                        "base_error": "" if base_ok else base_msg,
                        "head_error": "" if head_ok else head_msg,
                    }
                )
            else:
                range_label = f"{args.base}..{args.head}"
                diff_code, name_status_out, name_status_err = run_git(["diff", "--name-status", range_label], repo)
                stat_code, stat_out, stat_err = run_git(["diff", "--stat", range_label], repo)
                if diff_code != 0 or stat_code != 0:
                    result.update(
                        {
                            "ok": False,
                            "range": range_label,
                            "error": "Git diff failed for requested comparison.",
                            "diff_error": name_status_err or stat_err,
                        }
                    )
                else:
                    entries = parse_name_status(name_status_out, "range")
                    result["range"] = range_label
                    result["changed_files"] = entries
                    result["diff_stat"] = stat_out

                untracked = untracked_entries(repo)
                if status_out or untracked:
                    result["warnings"] = [
                        "Working tree has local changes. The requested commit range may not include them."
                    ]
                    result["untracked_files"] = untracked
        else:
            unstaged_code, unstaged_out, unstaged_err = run_git(["diff", "--name-status", "HEAD"], repo)
            unstaged_stat_code, unstaged_stat, unstaged_stat_err = run_git(["diff", "--stat", "HEAD"], repo)
            staged_code, staged_out, staged_err = run_git(["diff", "--cached", "--name-status"], repo)
            staged_stat_code, staged_stat, staged_stat_err = run_git(["diff", "--cached", "--stat"], repo)

            if any(code != 0 for code in [unstaged_code, unstaged_stat_code, staged_code, staged_stat_code]):
                result.update(
                    {
                        "ok": False,
                        "range": "working-tree-vs-HEAD",
                        "error": "Git working-tree diff failed.",
                        "diff_error": unstaged_err or unstaged_stat_err or staged_err or staged_stat_err,
                    }
                )
            else:
                unstaged_entries = parse_name_status(unstaged_out, "unstaged")
                staged_entries = parse_name_status(staged_out, "staged")
                untracked = untracked_entries(repo)
                combined = unstaged_entries + staged_entries + untracked
                result["range"] = "working-tree-vs-HEAD"
                result["changed_files"] = combined
                result["unstaged_files"] = unstaged_entries
                result["staged_files"] = staged_entries
                result["untracked_files"] = untracked
                result["diff_stat"] = unstaged_stat
                result["staged_diff_stat"] = staged_stat

        all_entries = list(result.get("changed_files", [])) + list(result.get("untracked_files", []))
        risk_hints = build_risk_hints(all_entries)  # type: ignore[arg-type]
        result["risk_hints"] = risk_hints
        result["high_risk_flags"] = sorted({flag for flags in risk_hints.values() for flag in flags})

    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
