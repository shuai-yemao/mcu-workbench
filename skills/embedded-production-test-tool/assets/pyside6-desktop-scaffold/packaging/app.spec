# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the generic PySide6 desktop template."""
from __future__ import annotations

import runpy
from pathlib import Path

block_cipher = None
SPEC_ROOT = Path(SPECPATH).resolve()
if (SPEC_ROOT / "src" / "__version__.py").exists():
    PROJECT_ROOT = SPEC_ROOT
elif (SPEC_ROOT.parent / "src" / "__version__.py").exists():
    PROJECT_ROOT = SPEC_ROOT.parent
else:
    raise FileNotFoundError(f"Cannot locate project root from SPECPATH={SPEC_ROOT}")
VERSION_INFO = runpy.run_path(str(PROJECT_ROOT / "src" / "__version__.py"))

APP_NAME = VERSION_INFO["APP_NAME"]
ENTRY = str(PROJECT_ROOT / "src" / "app.py")
ICON = PROJECT_ROOT / "assets" / "app.ico"

datas = [(str(PROJECT_ROOT / "config"), "config")]
style = PROJECT_ROOT / "assets" / "style.qss"
if style.exists():
    datas.append((str(style), "assets"))

a = Analysis(
    [ENTRY],
    pathex=[str(PROJECT_ROOT / "src")],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "PySide6.QtCore",
        "PySide6.QtGui",
        "PySide6.QtWidgets",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=APP_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon=str(ICON) if ICON.exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    name=APP_NAME,
)
