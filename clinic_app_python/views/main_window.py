from PySide6.QtWidgets import QMainWindow, QTabWidget, QVBoxLayout, QWidget, QMessageBox, QStatusBar, QPushButton, QHBoxLayout, QLabel, QDialog, QApplication
from PySide6.QtCore import Qt, QTimer, QSettings
from database.engine import SessionLocal
from views.dashboard_tab import DashboardTab
from views.doctors_tab import DoctorsTab
from views.patients_tab import PatientsTab
from views.shifts_tab import ShiftsTab
from views.finance_tab import FinanceTab
from views.reports_tab import ReportsTab
from views.users_tab import UsersTab
from views.logs_tab import LogsTab
from views.sms_tab import SmsTab
from views.stats_dashboard import StatsDashboard
from views.login_dialog import ModernLoginDialog as LoginDialog
import jdatetime
import os

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("سیستم مدیریت مرکز مشاوره")
        self.resize(1200, 700)
        self.setMinimumSize(1000, 600)
        self.setLayoutDirection(Qt.RightToLeft)
        
        self.session = SessionLocal()
        self.current_user = None
        self.current_role = None
        self.is_locked = False
        self.idle_counter = 0
        
        self.settings = QSettings("ClinicApp", "Settings")
        self.current_theme = self.settings.value("theme", "light")
        
        # ابتدا لاگین را نمایش بده
        if not self.show_login():
            QTimer.singleShot(0, self.close)
            return
        
        # فقط در صورت موفقیت آمیز بودن لاگین، UI را بساز
        self.setup_ui()
        self.apply_theme()
        
        self.idle_timer = QTimer()
        self.idle_timer.timeout.connect(self.check_idle)
        self.idle_timer.start(1000)
        
        # نمایش پنجره بعد از آماده شدن کامل UI با کمی تأخیر
        QTimer.singleShot(50, self.showMaximized)
    
    def setup_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(5)
        
        self.toolbar = QHBoxLayout()
        self.toolbar.setSpacing(8)
        
        self.lbl_user = QLabel("کاربر فعال: -")
        self.lbl_user.setProperty("heading", True)
        self.toolbar.addWidget(self.lbl_user)
        
        self.btn_lock = QPushButton("🔒 قفل سیستم")
        self.btn_lock.setFixedHeight(32)
        self.btn_lock.clicked.connect(self.lock_system)
        self.toolbar.addWidget(self.btn_lock)
        
        self.btn_switch = QPushButton("🔄 تغییر کاربر")
        self.btn_switch.setFixedHeight(32)
        self.btn_switch.clicked.connect(self.switch_user)
        self.toolbar.addWidget(self.btn_switch)
        
        self.btn_theme = QPushButton("🌙 تم تیره")
        self.btn_theme.setFixedHeight(32)
        self.btn_theme.setProperty("secondary", True)
        self.btn_theme.clicked.connect(self.toggle_theme)
        self.toolbar.addWidget(self.btn_theme)
        
        self.toolbar.addStretch()
        layout.addLayout(self.toolbar)
        
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabPosition(QTabWidget.North)
        self.tabs.setStyleSheet("QTabWidget::pane { border: none; } QTabBar::tab { padding: 6px 16px; }")
        self.tabs.tabBar().setMovable(True)
        layout.addWidget(self.tabs)
        
        # ایجاد تب‌ها
        self.dashboard_tab = DashboardTab(self)
        self.stats_tab = StatsDashboard(self)
        self.doctors_tab = DoctorsTab(self)
        self.patients_tab = PatientsTab(self)
        self.shifts_tab = ShiftsTab(self)
        self.finance_tab = FinanceTab(self)
        self.reports_tab = ReportsTab(self)
        self.users_tab = UsersTab(self)
        self.logs_tab = LogsTab(self)
        self.sms_tab = SmsTab(self)
        
        # لیست تب‌ها
        self.all_tabs = [
            (self.dashboard_tab, "نوبت‌دهی", "dashboard"),
            (self.stats_tab, "📊 داشبورد آماری", "stats"),
            (self.doctors_tab, "مدیریت اساتید", "doctors"),
            (self.patients_tab, "مدیریت مراجعین", "patients"),
            (self.shifts_tab, "شیفت‌ها و موضوعات", "shifts"),
            (self.finance_tab, "مدیریت مالی", "finance"),
            (self.reports_tab, "📈 گزارشات", "reports"),
            (self.users_tab, "مدیریت کاربران", "users"),
            (self.logs_tab, "گزارش فعالیت‌ها", "logs"),
            (self.sms_tab, "تنظیمات پیامک", "sms"),
        ]
        
        for tab, title, _ in self.all_tabs:
            self.tabs.addTab(tab, title)
        
        self.tabs.setCurrentIndex(0)
        
        self.status_bar = QStatusBar()
        self.status_bar.setVisible(False)
        self.setStatusBar(self.status_bar)
        
        self.update_status()
        self.update_tabs_by_role()
        
        # اتصال Signalها برای سینک شدن تب‌ها
        self.patients_tab.data_changed.connect(self.dashboard_tab.load_appointments)
        self.patients_tab.data_changed.connect(self.dashboard_tab.update_patient_lists)
        self.dashboard_tab.data_changed.connect(self.patients_tab.load_patients)
    
    def apply_theme(self):
        base_dir = os.path.dirname(__file__)
        parent_dir = os.path.dirname(base_dir)
        
        if self.current_theme == "dark":
            theme_path = os.path.join(parent_dir, "dark_theme.qss")
            self.btn_theme.setText("☀️ تم روشن")
        else:
            theme_path = os.path.join(parent_dir, "light_theme.qss")
            self.btn_theme.setText("🌙 تم تیره")
        
        if os.path.exists(theme_path):
            with open(theme_path, "r", encoding="utf-8") as f:
                self.setStyleSheet(f.read())
    
    def toggle_theme(self):
        if self.current_theme == "light":
            self.current_theme = "dark"
        else:
            self.current_theme = "light"
        self.settings.setValue("theme", self.current_theme)
        self.apply_theme()
    
    def update_status(self):
        self.lbl_user.setText(f"کاربر فعال: {self.current_user or '-'}")
    
    def update_tabs_by_role(self):
        if self.current_role == "secretary":
            visible_tabs = ["dashboard", "stats", "doctors", "patients", "shifts", "reports"]
            if hasattr(self.doctors_tab, 'set_readonly_mode'):
                self.doctors_tab.set_readonly_mode(True)
            if hasattr(self.shifts_tab, 'set_subjects_readonly'):
                self.shifts_tab.set_subjects_readonly(True)
        elif self.current_role == "admin":
            visible_tabs = ["dashboard", "stats", "doctors", "patients", "shifts", 
                           "finance", "reports", "users", "logs"]
            if hasattr(self.logs_tab, 'set_readonly_mode'):
                self.logs_tab.set_readonly_mode(True)
            if hasattr(self.users_tab, 'set_admin_restricted_mode'):
                self.users_tab.set_admin_restricted_mode(True)
        else:
            visible_tabs = ["dashboard", "stats", "doctors", "patients", "shifts", 
                           "finance", "reports", "users", "logs", "sms"]
        
        for tab, title, key in self.all_tabs:
            index = self.tabs.indexOf(tab)
            self.tabs.setTabVisible(index, key in visible_tabs)
    
    def show_login(self):
        dialog = LoginDialog(self)
        result = dialog.exec()
        
        if result == QDialog.Accepted and dialog.login_successful:
            self.current_user = dialog.current_user
            self.current_role = dialog.current_role
            self.log_activity("ورود", f"کاربر {self.current_user} وارد سیستم شد")
            return True
        return False
    
    def lock_system(self):
        if self.is_locked:
            return
        self.is_locked = True
        self.hide()
        lock_dialog = LoginDialog(self)
        lock_dialog.setWindowTitle("باز کردن قفل سیستم")
        lock_dialog.btn_login.setText("باز کردن قفل")
        lock_dialog.le_username.setText(self.current_user or "")
        if lock_dialog.exec() == QDialog.Accepted and lock_dialog.login_successful:
            self.current_user = lock_dialog.current_user
            self.current_role = lock_dialog.current_role
            self.update_status()
            self.update_tabs_by_role()
            self.log_activity("باز کردن قفل", f"سیستم توسط {self.current_user} باز شد")
            self.show()
        else:
            QApplication.quit()
        self.is_locked = False
        self.idle_counter = 0
    
    def switch_user(self):
        self.hide()
        dialog = LoginDialog(self)
        if dialog.exec() == QDialog.Accepted and dialog.login_successful:
            self.current_user = dialog.current_user
            self.current_role = dialog.current_role
            self.update_status()
            self.update_tabs_by_role()
            self.idle_counter = 0
            self.log_activity("تغییر کاربر", f"کاربر به {self.current_user} تغییر یافت")
            self.show()
            QMessageBox.information(self, "موفق", f"با موفقیت به عنوان {self.current_user} وارد شدید")
        else:
            self.show()
    
    def check_idle(self):
        if self.is_locked:
            return
        self.idle_counter += 1
        if self.idle_counter >= 900:
            self.lock_system()
    
    def log_activity(self, action_type, description):
        try:
            from database.models import ActivityLog
            now = jdatetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")
            log = ActivityLog(
                timestamp=now,
                username=self.current_user or "سیستم",
                action_type=action_type,
                description=description,
                is_hidden=0
            )
            self.session.add(log)
            self.session.commit()
        except Exception as e:
            print(f"Error logging activity: {e}")
    
    def closeEvent(self, event):
        try:
            self.session.close()
        except:
            pass
        event.accept()

