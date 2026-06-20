from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton,
    QMessageBox, QListWidget, QListWidgetItem, QFrame, QGraphicsDropShadowEffect, QSpacerItem, QSizePolicy
)
from PySide6.QtCore import Qt, Signal, QTimer
from PySide6.QtGui import QFont, QColor
from database.engine import SessionLocal
from database.models import User
import hashlib
import hmac
import time

class ModernLoginDialog(QDialog):
    login_successful = Signal(str, str)
    
    def __init__(self, parent=None, mode="login"):
        super().__init__(parent)
        self.mode = mode
        self.session = SessionLocal()
        self.failed_attempts = 0
        self.lock_until = 0
        self.login_successful_flag = False
        self.current_user = None
        self.current_role = None
        
        title = "ورود به سیستم - مرکز مشاوره آرامش" if mode == "login" else "باز کردن قفل سیستم"
        self.setWindowTitle(title)
        self.setModal(True)
        self.setFixedSize(450, 520)
        self.setLayoutDirection(Qt.RightToLeft)
        
        self.setup_ui()
        self.load_usernames()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(12)
        layout.setContentsMargins(20, 25, 20, 25)
        
        # عنوان اصلی
        title = QLabel("🧘 مرکز مشاوره آرامش")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("""
            font-size: 20px;
            font-weight: bold;
            color: #1e3a8a;
            padding: 12px;
            background: #eff6ff;
            border-radius: 12px;
            margin-bottom: 5px;
        """)
        layout.addWidget(title)
        
        # زیر عنوان
        subtitle = QLabel("به سامانه مدیریت خوش آمدید" if self.mode == "login" else "باز کردن قفل سیستم")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("font-size: 12px; color: #64748b; margin-bottom: 10px;")
        layout.addWidget(subtitle)
        
        # خط جداکننده
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet("background-color: #e2e8f0; max-height: 1px; margin-bottom: 10px;")
        layout.addWidget(line)
        
        # فیلد نام کاربری
        layout.addWidget(QLabel("نام کاربری"))
        self.le_username = QLineEdit()
        self.le_username.setPlaceholderText("نام کاربری خود را وارد کنید")
        self.le_username.setMinimumHeight(38)
        self.le_username.setStyleSheet("""
            QLineEdit {
                padding: 8px 12px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border: 2px solid #3b82f6;
            }
        """)
        self.le_username.textChanged.connect(self.auto_suggest)
        layout.addWidget(self.le_username)
        
        # لیست پیشنهادی با ارتفاع محدود
        self.user_list = QListWidget()
        self.user_list.setMaximumHeight(100)
        self.user_list.setVisible(False)
        self.user_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                margin-top: 2px;
            }
            QListWidget::item {
                padding: 6px 12px;
                border-radius: 4px;
            }
            QListWidget::item:hover {
                background: #eff6ff;
            }
            QListWidget::item:selected {
                background: #3b82f6;
                color: white;
            }
        """)
        self.user_list.itemClicked.connect(self.select_username)
        layout.addWidget(self.user_list)
        
        # فیلد رمز عبور
        layout.addWidget(QLabel("رمز عبور"))
        self.le_password = QLineEdit()
        self.le_password.setEchoMode(QLineEdit.Password)
        self.le_password.setPlaceholderText("رمز عبور خود را وارد کنید")
        self.le_password.setMinimumHeight(38)
        self.le_password.setStyleSheet("""
            QLineEdit {
                padding: 8px 12px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border: 2px solid #3b82f6;
            }
        """)
        self.le_password.returnPressed.connect(self.login)
        layout.addWidget(self.le_password)
        
        # دکمه نمایش رمز
        self.btn_toggle_pwd = QPushButton("👁 نمایش رمز")
        self.btn_toggle_pwd.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: #64748b;
                border: none;
                text-align: right;
                font-size: 11px;
                padding: 5px;
            }
            QPushButton:hover {
                color: #3b82f6;
            }
        """)
        self.btn_toggle_pwd.clicked.connect(self.toggle_password)
        layout.addWidget(self.btn_toggle_pwd)
        
        # فاصله الاستیک برای نگه داشتن دکمه‌ها در پایین
        layout.addSpacerItem(QSpacerItem(20, 20, QSizePolicy.Minimum, QSizePolicy.Expanding))
        
        # دکمه ورود
        self.btn_login = QPushButton("ورود به سیستم" if self.mode == "login" else "باز کردن قفل")
        self.btn_login.setMinimumHeight(45)
        self.btn_login.setStyleSheet("""
            QPushButton {
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: #2563eb;
            }
            QPushButton:pressed {
                background: #1d4ed8;
            }
        """)
        self.btn_login.clicked.connect(self.login)
        layout.addWidget(self.btn_login)
        
        # دکمه خروج
        if self.mode == "login":
            btn_cancel = QPushButton("خروج از برنامه")
            btn_cancel.setStyleSheet("""
                QPushButton {
                    background: transparent;
                    color: #94a3b8;
                    border: none;
                    font-size: 12px;
                    padding: 8px;
                }
                QPushButton:hover {
                    color: #ef4444;
                }
            """)
            btn_cancel.clicked.connect(self.reject)
            layout.addWidget(btn_cancel)
        
        self.le_username.setFocus()
    
    def load_usernames(self):
        try:
            users = self.session.query(User).filter(User.is_active == 1).all()
            self.usernames = [u.username for u in users]
        except:
            self.usernames = []
    
    def auto_suggest(self, text):
        if not text:
            self.user_list.setVisible(False)
            self.user_list.clear()
            return
        
        matches = [u for u in self.usernames if text.lower() in u.lower()]
        if matches:
            self.user_list.clear()
            for m in matches[:4]:
                self.user_list.addItem(m)
            self.user_list.setVisible(True)
            height = min(len(matches) * 32 + 8, 100)
            self.user_list.setMaximumHeight(height)
        else:
            self.user_list.setVisible(False)
    
    def select_username(self, item):
        self.le_username.setText(item.text())
        self.user_list.setVisible(False)
        self.le_password.setFocus()
    
    def toggle_password(self):
        if self.le_password.echoMode() == QLineEdit.Password:
            self.le_password.setEchoMode(QLineEdit.Normal)
            self.btn_toggle_pwd.setText("🙈 مخفی کردن رمز")
        else:
            self.le_password.setEchoMode(QLineEdit.Password)
            self.btn_toggle_pwd.setText("👁 نمایش رمز")
    
    def verify_password(self, input_password, stored_password, stored_hash):
        if stored_password and input_password == stored_password:
            return True
        
        if stored_hash and stored_hash.startswith('$pbkdf2$'):
            try:
                parts = stored_hash.split('$')
                if len(parts) >= 5:
                    iterations = int(parts[2])
                    salt = parts[3]
                    expected = parts[4]
                    actual = hashlib.pbkdf2_hmac('sha256', input_password.encode('utf-8'), salt.encode('utf-8'), iterations).hex()
                    return hmac.compare_digest(actual, expected)
            except:
                pass
        
        return False
    
    def login(self):
        current_time = time.time()
        
        if current_time < self.lock_until:
            remaining = int(self.lock_until - current_time)
            QMessageBox.warning(self, "قفل امنیتی", f"{remaining} ثانیه دیگر تلاش کنید")
            return
        
        username = self.le_username.text().strip()
        password = self.le_password.text().strip()
        
        if not username or not password:
            QMessageBox.warning(self, "خطا", "لطفاً نام کاربری و رمز عبور را وارد کنید")
            return
        
        user = self.session.query(User).filter(User.username == username, User.is_active == 1).first()
        
        if user and self.verify_password(password, user.password or "", user.password_hash or ""):
            self.current_user = user.username
            self.current_role = user.role
            self.login_successful_flag = True
            self.accept()
            return
        
        self.failed_attempts += 1
        remaining = 3 - self.failed_attempts
        
        if self.failed_attempts >= 3:
            self.lock_until = time.time() + 60
            self.failed_attempts = 0
            QMessageBox.warning(self, "قفل امنیتی", "سیستم به مدت ۱ دقیقه قفل شد")
        else:
            QMessageBox.warning(self, "خطا", 
                f"نام کاربری یا رمز عبور اشتباه است.\nتلاش‌های باقیمانده: {remaining}")
            self.le_password.clear()
            self.le_password.setFocus()
    
    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Down and self.user_list.isVisible():
            self.user_list.setFocus()
            if self.user_list.currentRow() == -1:
                self.user_list.setCurrentRow(0)
        elif event.key() == Qt.Key_Up and self.user_list.isVisible():
            self.user_list.setFocus()
        elif event.key() == Qt.Key_Return or event.key() == Qt.Key_Enter:
            if self.user_list.isVisible() and self.user_list.currentItem():
                self.select_username(self.user_list.currentItem())
            else:
                self.login()
        elif event.key() == Qt.Key_Escape:
            self.reject()
        else:
            super().keyPressEvent(event)
    
    def __del__(self):
        try:
            self.session.close()
        except:
            pass


LoginDialog = ModernLoginDialog
