"""Redirect Python bytecode caches away from source directories."""
from __future__ import annotations

import os
import sys
from pathlib import Path


if not sys.pycache_prefix:
    root = Path(__file__).resolve().parent.parent
    sys.pycache_prefix = os.environ.get("PYTHONPYCACHEPREFIX", str(root / ".pycache_root"))
