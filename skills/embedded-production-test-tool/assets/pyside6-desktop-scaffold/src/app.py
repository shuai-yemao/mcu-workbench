"""Application entrypoint: load config, set up logging, build the main window."""
from __future__ import annotations
import sys
from pathlib import Path

# Make `src/` importable when running `python src/app.py` from the project root.
SRC = Path(__file__).resolve().parent
sys.pycache_prefix = str(SRC.parent / ".pycache_root")
sys.path.insert(0, str(SRC))

from PySide6.QtWidgets import QApplication

from config.loader import Config, ConfigError
from reports.writer import setup_logging
from ui.main_window import MainWindow
from __version__ import __version__, APP_NAME


def _project_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def main() -> int:
    cfg_path = _project_root() / "config" / "app.yaml"
    try:
        cfg = Config.load(cfg_path)
    except ConfigError as exc:
        sys.stderr.write(f"Config error: {exc}\n")
        return 2

    setup_logging(cfg.log_file)

    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setApplicationVersion(__version__)
    win = MainWindow(cfg)
    win.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
