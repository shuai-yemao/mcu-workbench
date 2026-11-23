#!/usr/bin/env python3
"""Scan an embedded firmware project and print architecture signals."""

from __future__ import annotations

import argparse
import os
from pathlib import Path


SKIP_DIRS = {
    ".git",
    ".svn",
    ".hg",
    "build",
    "cmake-build-debug",
    "cmake-build-release",
    "Debug",
    "Release",
    "Objects",
    "Listings",
    "node_modules",
    "__pycache__",
}

SOURCE_EXTS = {".c", ".cc", ".cpp", ".h", ".hpp", ".s", ".S"}

SIGNALS = {
    "rtos": [
        "FreeRTOSConfig.h",
        "cmsis_os.h",
        "rtthread.h",
        "zephyr.h",
        "xTaskCreate",
        "osThreadNew",
        "rt_thread_create",
        "k_thread_create",
    ],
    "stm32": ["stm32", "HAL_Init", "MX_GPIO_Init", "SystemClock_Config"],
    "esp-idf": ["idf_component.yml", "sdkconfig", "esp_event", "app_main"],
    "cube-generated": ["Core/Src/main.c", "Core/Inc/main.h", ".ioc"],
    "layering": ["bsp", "driver", "drivers", "service", "services", "app", "platform"],
    "state-machine": ["state", "fsm", "STATE_", "_STATE_", "EVT_", "EVENT_"],
    "event-driven": ["queue", "event", "message", "publish", "subscribe", "notify"],
}


def iter_files(root: Path, limit: int):
    count = 0
    for current, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".cache")]
        for name in files:
            path = Path(current) / name
            count += 1
            if count > limit:
                return
            yield path


def safe_read(path: Path, max_bytes: int) -> str:
    try:
        data = path.read_bytes()[:max_bytes]
    except OSError:
        return ""
    for enc in ("utf-8", "gbk", "latin-1"):
        try:
            return data.decode(enc, errors="ignore")
        except UnicodeDecodeError:
            continue
    return ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".", help="Firmware project root")
    parser.add_argument("--limit", type=int, default=2500, help="Maximum files to scan")
    parser.add_argument("--read-bytes", type=int, default=12000, help="Bytes to inspect per source file")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"error: path does not exist: {root}")
        return 2

    files = list(iter_files(root, args.limit))
    source_files = [p for p in files if p.suffix in SOURCE_EXTS]
    names = [str(p.relative_to(root)).replace("\\", "/") for p in files]
    lower_names = [n.lower() for n in names]

    hits: dict[str, list[str]] = {key: [] for key in SIGNALS}

    for key, patterns in SIGNALS.items():
        for pattern in patterns:
            p_lower = pattern.lower()
            for name, lower in zip(names, lower_names):
                if p_lower in lower:
                    hits[key].append(f"path:{name}")
                    break

    for path in source_files[:400]:
        text = safe_read(path, args.read_bytes)
        if not text:
            continue
        rel = str(path.relative_to(root)).replace("\\", "/")
        for key, patterns in SIGNALS.items():
            for pattern in patterns:
                if pattern in text:
                    hits[key].append(f"code:{rel}:{pattern}")
                    break

    print(f"Project: {root}")
    print(f"Files scanned: {len(files)}")
    print(f"Source files: {len(source_files)}")
    print()
    print("Architecture signals:")
    for key, values in hits.items():
        unique = []
        for value in values:
            if value not in unique:
                unique.append(value)
        status = "yes" if unique else "no"
        print(f"- {key}: {status}")
        for value in unique[:8]:
            print(f"  - {value}")
    print()
    print("Top-level entries:")
    for child in sorted(root.iterdir(), key=lambda p: p.name.lower())[:80]:
        kind = "dir" if child.is_dir() else "file"
        print(f"- {kind}: {child.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
