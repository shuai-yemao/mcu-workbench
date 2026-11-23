"""Small YAML config loader for the desktop app template."""
from __future__ import annotations

from pathlib import Path
from typing import Any


class ConfigError(Exception):
    """Raised when the application configuration cannot be loaded."""


DEFAULT_CONFIG: dict[str, Any] = {
    "app": {
        "name": "ProductionTools",
        "version": "0.1.0",
        "log_file": "logs/app.log",
        "window": {
            "title": "Production Tools",
            "width": 1100,
            "height": 720,
            "theme": "system",
        },
    }
}


def _deep_merge(defaults: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    merged = dict(defaults)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


class Config:
    def __init__(self, data: dict[str, Any], path: Path):
        self.d = data
        self.path = path

    @classmethod
    def load(cls, path: str | Path) -> "Config":
        import yaml

        path = Path(path)
        if not path.exists():
            return cls(DEFAULT_CONFIG, path)
        try:
            with path.open("r", encoding="utf-8") as fh:
                raw = yaml.safe_load(fh)
        except yaml.YAMLError as exc:
            raise ConfigError(f"Invalid YAML in {path}: {exc}") from exc
        except OSError as exc:
            raise ConfigError(f"Cannot read config {path}: {exc}") from exc
        if raw is None:
            raw = {}
        if not isinstance(raw, dict):
            raise ConfigError(f"Config root must be a mapping: {path}")
        return cls(_deep_merge(DEFAULT_CONFIG, raw), path)

    @property
    def app_name(self) -> str:
        return str(self.d.get("app", {}).get("name", "ProductionTools"))

    @property
    def app_version(self) -> str:
        return str(self.d.get("app", {}).get("version", "0.1.0"))

    @property
    def window(self) -> dict[str, Any]:
        return self.d.get("app", {}).get("window", {})

    @property
    def window_title(self) -> str:
        return str(self.window.get("title", f"{self.app_name} {self.app_version}"))

    @property
    def window_width(self) -> int:
        return int(self.window.get("width", 1100))

    @property
    def window_height(self) -> int:
        return int(self.window.get("height", 720))

    @property
    def theme(self) -> str:
        return str(self.window.get("theme", "system"))

    @property
    def log_file(self) -> str:
        return str(self.d.get("app", {}).get("log_file", "logs/app.log"))
