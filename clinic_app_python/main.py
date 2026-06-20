#!/usr/bin/env python3
import sys
import os
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont
from views.main_window import MainWindow
from database.engine import init_db
from backup_manager import run_backup

def load_stylesheet(theme):
    base_dir = os.path.dirname(__file__)
    if theme == "dark":
        theme_path = os.path.join(base_dir, "dark_theme.qss")
    else:
        theme_path = os.path.join(base_dir, "light_theme.qss")
    
    if os.path.exists(theme_path):
        with open(theme_path, "r", encoding="utf-8") as f:
            return f.read()
    return ""

def main():
    # گرفتن بکاپ خودکار از دیتابیس (فقط یک بار در روز)
    run_backup()
    
    app = QApplication(sys.argv)
    app.setLayoutDirection(Qt.RightToLeft)
    app.setStyle("Fusion")
    
    # تنظیم فونت پیش‌فرض Tahoma سایز 9 (استاندارد)
    font = QFont("Tahoma", 9)
    app.setFont(font)
    
    init_db()
    window = MainWindow()
    
    # اعمال استایل اولیه
    theme = window.current_theme
    stylesheet = load_stylesheet(theme)
    if stylesheet:
        app.setStyleSheet(stylesheet)
    
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()