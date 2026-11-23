"""Main window for the generic PySide6 desktop application template."""
from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QAction
from PySide6.QtWidgets import (
    QApplication,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QStatusBar,
    QToolBar,
    QVBoxLayout,
    QWidget,
)

from config.loader import Config
from __version__ import APP_DISPLAY_NAME, __version__


class MainWindow(QMainWindow):
    def __init__(self, cfg: Config):
        super().__init__()
        self.cfg = cfg
        self.setWindowTitle(cfg.window_title)
        self.resize(cfg.window_width, cfg.window_height)

        self._build_actions()
        self._build_menu()
        self._build_toolbar()
        self._build_body()
        self._build_status_bar()

    def _build_actions(self) -> None:
        self.about_action = QAction("About", self)
        self.about_action.triggered.connect(self._show_about)

        self.quit_action = QAction("Quit", self)
        self.quit_action.setShortcut("Ctrl+Q")
        self.quit_action.triggered.connect(QApplication.quit)

    def _build_menu(self) -> None:
        file_menu = self.menuBar().addMenu("File")
        file_menu.addAction(self.quit_action)

        help_menu = self.menuBar().addMenu("Help")
        help_menu.addAction(self.about_action)

    def _build_toolbar(self) -> None:
        toolbar = QToolBar("Main")
        toolbar.setMovable(False)
        toolbar.addAction(self.about_action)
        self.addToolBar(Qt.TopToolBarArea, toolbar)

    def _build_body(self) -> None:
        central = QWidget()
        layout = QVBoxLayout(central)

        title = QLabel(APP_DISPLAY_NAME)
        title.setAlignment(Qt.AlignLeft)
        title.setStyleSheet("font-size: 24px; font-weight: 600;")
        layout.addWidget(title)

        subtitle = QLabel("A minimal PySide6 desktop application scaffold.")
        subtitle.setStyleSheet("color: #666;")
        layout.addWidget(subtitle)

        notes = QPlainTextEdit()
        notes.setReadOnly(True)
        notes.setPlainText(
            "Replace this central widget with your product UI.\n\n"
            "Template features:\n"
            "- YAML configuration\n"
            "- rotating application logs\n"
            "- menu, toolbar, status bar\n"
            "- PyInstaller/Inno packaging files"
        )
        layout.addWidget(notes, 1)

        self.setCentralWidget(central)

    def _build_status_bar(self) -> None:
        status = QStatusBar()
        status.showMessage(
            f"app={self.cfg.app_name}  version={self.cfg.app_version}  "
            f"config={self.cfg.path}  log={self.cfg.log_file}"
        )
        self.setStatusBar(status)

    def _show_about(self) -> None:
        QMessageBox.about(
            self,
            f"About {APP_DISPLAY_NAME}",
            f"{APP_DISPLAY_NAME}\nVersion {__version__}\n\n"
            "Generic PySide6 desktop application scaffold.",
        )
