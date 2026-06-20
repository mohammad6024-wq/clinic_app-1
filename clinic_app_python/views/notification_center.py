from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton,
    QGroupBox, QRadioButton, QMessageBox, QFrame,
    QTabWidget, QWidget, QTextEdit, QCompleter, QGridLayout, QScrollArea
)
from PySide6.QtCore import Qt, QStringListModel
from PySide6.QtGui import QGuiApplication
from database.engine import SessionLocal
from database.models import Appointment, Doctor, Patient
import jdatetime

def safe_int(value):
    try:
        if value is None:
            return 0
        return int(float(value))
    except:
        return 0

class PersianCalendarDialog(QDialog):
    def __init__(self, parent=None, callback=None):
        super().__init__(parent)
        self.setWindowTitle("انتخاب تاریخ شمسی")
        self.setModal(True)
        self.setFixedSize(550, 520)
        self.callback = callback
        self.current_date = jdatetime.date.today()
        
        layout = QVBoxLayout(self)
        header = QLabel("📅 تقویم شمسی")
        header.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb; padding: 10px; background: #eff6ff; border-radius: 10px;")
        header.setAlignment(Qt.AlignCenter)
        layout.addWidget(header)
        
        nav_layout = QHBoxLayout()
        self.prev_year_btn = QPushButton("<<")
        self.prev_year_btn.setFixedSize(45, 35)
        self.prev_year_btn.clicked.connect(self.prev_year)
        nav_layout.addWidget(self.prev_year_btn)
        self.prev_month_btn = QPushButton("<")
        self.prev_month_btn.setFixedSize(45, 35)
        self.prev_month_btn.clicked.connect(self.prev_month)
        nav_layout.addWidget(self.prev_month_btn)
        nav_layout.addStretch()
        
        self.year_combo = QComboBox()
        for y in range(1390, jdatetime.date.today().year + 10):
            self.year_combo.addItem(str(y))
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.year_combo.currentTextChanged.connect(self.update_calendar)
        nav_layout.addWidget(self.year_combo)
        
        self.month_combo = QComboBox()
        months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", 
                  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
        self.month_combo.addItems(months)
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
        self.month_combo.currentTextChanged.connect(self.update_calendar)
        nav_layout.addWidget(self.month_combo)
        
        nav_layout.addStretch()
        self.next_month_btn = QPushButton(">")
        self.next_month_btn.setFixedSize(45, 35)
        self.next_month_btn.clicked.connect(self.next_month)
        nav_layout.addWidget(self.next_month_btn)
        self.next_year_btn = QPushButton(">>")
        self.next_year_btn.setFixedSize(45, 35)
        self.next_year_btn.clicked.connect(self.next_year)
        nav_layout.addWidget(self.next_year_btn)
        layout.addLayout(nav_layout)
        
        week_layout = QHBoxLayout()
        week_days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        for day in week_days:
            lbl = QLabel(day)
            lbl.setAlignment(Qt.AlignCenter)
            lbl.setStyleSheet("font-weight: bold; color: #2563eb; padding: 10px; background: #dbeafe; border-radius: 8px;")
            week_layout.addWidget(lbl)
        layout.addLayout(week_layout)
        
        self.day_grid = QGridLayout()
        self.day_grid.setSpacing(8)
        layout.addLayout(self.day_grid)
        
        today_btn = QPushButton("📅 امروز")
        today_btn.setStyleSheet("background: #10b981; color: white; padding: 10px; border-radius: 10px; font-weight: bold;")
        today_btn.clicked.connect(self.go_today)
        layout.addWidget(today_btn, alignment=Qt.AlignCenter)
        
        self.update_calendar()
    
    def prev_year(self):
        self.current_date = jdatetime.date(self.current_date.year - 1, self.current_date.month, 1)
        self.year_combo.setCurrentText(str(self.current_date.year))
    
    def next_year(self):
        self.current_date = jdatetime.date(self.current_date.year + 1, self.current_date.month, 1)
        self.year_combo.setCurrentText(str(self.current_date.year))
    
    def prev_month(self):
        if self.current_date.month == 1:
            self.current_date = jdatetime.date(self.current_date.year - 1, 12, 1)
        else:
            self.current_date = jdatetime.date(self.current_date.year, self.current_date.month - 1, 1)
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
    
    def next_month(self):
        if self.current_date.month == 12:
            self.current_date = jdatetime.date(self.current_date.year + 1, 1, 1)
        else:
            self.current_date = jdatetime.date(self.current_date.year, self.current_date.month + 1, 1)
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
    
    def go_today(self):
        self.current_date = jdatetime.date.today()
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
    
    def update_calendar(self):
        for i in reversed(range(self.day_grid.count())):
            w = self.day_grid.itemAt(i).widget()
            if w:
                w.deleteLater()
        
        year = int(self.year_combo.currentText())
        month = self.month_combo.currentIndex() + 1
        
        first_day = jdatetime.date(year, month, 1)
        start_weekday = first_day.weekday()
        
        if month <= 6:
            days = 31
        elif month <= 11:
            days = 30
        else:
            days = 30 if first_day.isleap() else 29
        
        row, col = 0, start_weekday
        for day in range(1, days + 1):
            date = jdatetime.date(year, month, day)
            btn = QPushButton(str(day))
            btn.setFixedSize(55, 45)
            if date == jdatetime.date.today():
                btn.setStyleSheet("QPushButton { background: #3b82f6; color: white; border-radius: 12px; font-size: 14px; font-weight: bold; }")
            else:
                btn.setStyleSheet("QPushButton { background: #f1f5f9; color: #1e293b; border-radius: 12px; font-size: 14px; } QPushButton:hover { background: #cbd5e1; }")
            btn.clicked.connect(lambda checked, d=date: self.select_date(d))
            self.day_grid.addWidget(btn, row, col)
            col += 1
            if col > 6:
                col = 0
                row += 1
    
    def select_date(self, date):
        if self.callback:
            self.callback(date.strftime("%Y/%m/%d"))
        self.accept()


class NotificationCenter(QDialog):
    def __init__(self, parent=None, specific_doctor=None, specific_patient=None, specific_date=None):
        super().__init__(parent)
        self.session = SessionLocal()
        self.specific_doctor = specific_doctor
        
        # تنظیم تاریخ بر اساس specific_date (در صورت وجود)
        if specific_date:
            try:
                self.current_date = jdatetime.datetime.strptime(specific_date, "%Y/%m/%d").date()
                self.range_type = "custom"
            except:
                self.current_date = jdatetime.date.today()
                self.range_type = "today"
        else:
            self.current_date = jdatetime.date.today()
            self.range_type = "today"
        
        self.setWindowTitle("📢 مرکز اطلاع‌رسانی")
        self.setModal(True)
        self.resize(900, 700)
        self.setMinimumSize(800, 600)
        self.setLayoutDirection(Qt.RightToLeft)
        
        flags = self.windowFlags()
        self.setWindowFlags(flags | Qt.WindowMaximizeButtonHint | Qt.WindowMinimizeButtonHint | Qt.WindowCloseButtonHint)
        
        self.setup_ui()
        self.load_data()
        self.update_date_display()
        self.refresh_preview()
        self.showMaximized()
    
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(10)
        
        header = QLabel("📢 مرکز اطلاع‌رسانی مرکز مشاوره آرامش")
        header.setStyleSheet("font-size: 18px; font-weight: bold; color: white; background: #2563eb; padding: 12px; border-radius: 10px;")
        header.setAlignment(Qt.AlignCenter)
        main_layout.addWidget(header)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(12)
        
        self.tabs = QTabWidget()
        
        doctor_tab = QWidget()
        doctor_layout = QVBoxLayout(doctor_tab)
        doctor_layout.setSpacing(12)
        
        date_frame = QFrame()
        date_frame.setStyleSheet("QFrame { background: #f8fafc; border-radius: 8px; padding: 8px; }")
        date_layout = QVBoxLayout(date_frame)
        
        nav_layout = QHBoxLayout()
        self.prev_btn = QPushButton("◀ روز قبل")
        self.prev_btn.clicked.connect(self.prev_day)
        nav_layout.addWidget(self.prev_btn)
        nav_layout.addStretch()
        self.date_label = QLabel()
        self.date_label.setStyleSheet("font-weight: bold; color: #1e40af; background: #dbeafe; padding: 5px 15px; border-radius: 8px;")
        self.date_label.setAlignment(Qt.AlignCenter)
        nav_layout.addWidget(self.date_label)
        nav_layout.addStretch()
        self.next_btn = QPushButton("روز بعد ▶")
        self.next_btn.clicked.connect(self.next_day)
        nav_layout.addWidget(self.next_btn)
        date_layout.addLayout(nav_layout)
        
        quick_layout = QHBoxLayout()
        self.today_btn = QPushButton("📅 امروز")
        self.today_btn.clicked.connect(self.set_today)
        quick_layout.addWidget(self.today_btn)
        self.tomorrow_btn = QPushButton("📅 فردا")
        self.tomorrow_btn.clicked.connect(self.set_tomorrow)
        quick_layout.addWidget(self.tomorrow_btn)
        self.week_btn = QPushButton("📆 این هفته")
        self.week_btn.clicked.connect(self.set_week)
        quick_layout.addWidget(self.week_btn)
        self.calendar_btn = QPushButton("📅 انتخاب از تقویم")
        self.calendar_btn.clicked.connect(self.open_calendar)
        quick_layout.addWidget(self.calendar_btn)
        date_layout.addLayout(quick_layout)
        doctor_layout.addWidget(date_frame)
        
        doc_frame = QFrame()
        doc_frame.setStyleSheet("QFrame { background: #f8fafc; border-radius: 8px; padding: 8px; }")
        doc_layout = QHBoxLayout(doc_frame)
        doc_layout.addWidget(QLabel("👨‍⚕️ استاد:"))
        self.doctor_combo = QComboBox()
        self.doctor_combo.setEditable(True)
        self.doctor_combo.setMinimumWidth(200)
        self.doctor_combo.currentTextChanged.connect(self.refresh_preview)
        doc_layout.addWidget(self.doctor_combo)
        doc_layout.addStretch()
        doctor_layout.addWidget(doc_frame)
        
        preview_group = QGroupBox("📝 پیش‌نمایش پیام")
        preview_layout = QVBoxLayout(preview_group)
        self.doctor_preview = QTextEdit()
        self.doctor_preview.setReadOnly(True)
        self.doctor_preview.setMinimumHeight(180)
        self.doctor_preview.setMaximumHeight(250)
        preview_layout.addWidget(self.doctor_preview)
        doctor_layout.addWidget(preview_group)
        
        copy_btn = QPushButton("📋 کپی متن در کلیپ‌بورد")
        copy_btn.setStyleSheet("background: #10b981; color: white; padding: 10px; border-radius: 8px;")
        copy_btn.clicked.connect(self.copy_doctor_message)
        doctor_layout.addWidget(copy_btn)
        
        self.tabs.addTab(doctor_tab, "👨‍⚕️ اطلاع‌رسانی به استاد")
        
        patient_tab = QWidget()
        patient_layout = QVBoxLayout(patient_tab)
        patient_layout.setSpacing(12)
        
        pat_frame = QFrame()
        pat_frame.setStyleSheet("QFrame { background: #f8fafc; border-radius: 8px; padding: 8px; }")
        pat_layout = QVBoxLayout(pat_frame)
        
        select_layout = QHBoxLayout()
        select_layout.addWidget(QLabel("👤 مراجع:"))
        self.patient_combo = QComboBox()
        self.patient_combo.setEditable(True)
        self.patient_combo.setMinimumWidth(200)
        self.patient_combo.currentTextChanged.connect(self.load_patient_appointments)
        select_layout.addWidget(self.patient_combo)
        select_layout.addStretch()
        pat_layout.addLayout(select_layout)
        
        app_layout = QHBoxLayout()
        app_layout.addWidget(QLabel("📅 نوبت:"))
        self.appointment_combo = QComboBox()
        self.appointment_combo.setMinimumWidth(300)
        self.appointment_combo.currentIndexChanged.connect(self.refresh_patient_preview)
        app_layout.addWidget(self.appointment_combo)
        app_layout.addStretch()
        pat_layout.addLayout(app_layout)
        
        radio_layout = QHBoxLayout()
        self.single_btn = QRadioButton("📍 فقط این نوبت")
        self.all_btn = QRadioButton("📋 همه نوبت‌های این مراجع")
        self.single_btn.setChecked(True)
        self.all_btn.toggled.connect(self.refresh_patient_preview)
        radio_layout.addWidget(self.single_btn)
        radio_layout.addWidget(self.all_btn)
        radio_layout.addStretch()
        pat_layout.addLayout(radio_layout)
        
        patient_layout.addWidget(pat_frame)
        
        self.patient_preview = QTextEdit()
        self.patient_preview.setReadOnly(True)
        self.patient_preview.setMinimumHeight(180)
        self.patient_preview.setMaximumHeight(250)
        patient_layout.addWidget(self.patient_preview)
        
        copy_patient_btn = QPushButton("📋 کپی متن در کلیپ‌بورد")
        copy_patient_btn.setStyleSheet("background: #10b981; color: white; padding: 10px; border-radius: 8px;")
        copy_patient_btn.clicked.connect(self.copy_patient_message)
        patient_layout.addWidget(copy_patient_btn)
        
        self.tabs.addTab(patient_tab, "👤 اطلاع‌رسانی به مراجع")
        
        scroll_layout.addWidget(self.tabs)
        
        close_btn = QPushButton("❌ بستن")
        close_btn.setStyleSheet("background: #ef4444; color: white; padding: 8px; border-radius: 8px;")
        close_btn.clicked.connect(self.accept)
        scroll_layout.addWidget(close_btn, alignment=Qt.AlignCenter)
        
        scroll.setWidget(scroll_content)
        main_layout.addWidget(scroll)
    
    def load_data(self):
        doctors = self.session.query(Doctor).order_by(Doctor.name).all()
        doctor_names = []
        
        self.doctor_combo.addItem("👨‍⚕️ همه اساتید")
        
        for doc in doctors:
            self.doctor_combo.addItem(doc.name)
            doctor_names.append(doc.name)
        
        self.doctor_combo.setCurrentIndex(0)
        
        if self.specific_doctor:
            index = self.doctor_combo.findText(self.specific_doctor)
            if index >= 0:
                self.doctor_combo.setCurrentIndex(index)
        
        completer = QCompleter(doctor_names)
        completer.setCaseSensitivity(Qt.CaseInsensitive)
        completer.setFilterMode(Qt.MatchContains)
        self.doctor_combo.setCompleter(completer)
        
        patients = self.session.query(Patient).order_by(Patient.name).all()
        patient_names = []
        for pat in patients:
            text = pat.name
            if pat.phone:
                text += f" - {pat.phone}"
            self.patient_combo.addItem(text)
            patient_names.append(pat.name)
        
        patient_completer = QCompleter(patient_names)
        patient_completer.setCaseSensitivity(Qt.CaseInsensitive)
        patient_completer.setFilterMode(Qt.MatchContains)
        self.patient_combo.setCompleter(patient_completer)
    
    def get_appointments_by_range(self, doctor_name=None):
        if self.range_type == "today":
            date_str = self.current_date.strftime("%Y/%m/%d")
            apps = self.session.query(Appointment).filter(Appointment.date == date_str).all()
        elif self.range_type == "tomorrow":
            target_date = self.current_date + jdatetime.timedelta(days=1)
            date_str = target_date.strftime("%Y/%m/%d")
            apps = self.session.query(Appointment).filter(Appointment.date == date_str).all()
        elif self.range_type == "week":
            start_of_week = self.current_date - jdatetime.timedelta(days=self.current_date.weekday())
            end_of_week = start_of_week + jdatetime.timedelta(days=6)
            apps = self.session.query(Appointment).filter(
                Appointment.date >= start_of_week.strftime("%Y/%m/%d"),
                Appointment.date <= end_of_week.strftime("%Y/%m/%d")
            ).all()
        else:
            date_str = self.current_date.strftime("%Y/%m/%d")
            apps = self.session.query(Appointment).filter(Appointment.date == date_str).all()
        
        if doctor_name and doctor_name != "👨‍⚕️ همه اساتید":
            apps = [app for app in apps if app.doctor == doctor_name]
        
        apps = [app for app in apps if app.status not in ["کنسل استاد", "کنسل مراجع"]]
        return apps
    
    def get_patient_appointments(self, patient_name):
        apps = self.session.query(Appointment).filter(
            (Appointment.patient_name == patient_name) |
            (Appointment.patient2_name == patient_name)
        ).order_by(Appointment.date.desc()).all()
        return [app for app in apps if app.status not in ["کنسل استاد", "کنسل مراجع"]]
    
    def get_date_range_text(self):
        if self.range_type == "today":
            return f"امروز {self.current_date.strftime('%Y/%m/%d')}"
        elif self.range_type == "tomorrow":
            target_date = self.current_date + jdatetime.timedelta(days=1)
            return f"فردا {target_date.strftime('%Y/%m/%d')}"
        elif self.range_type == "week":
            start_of_week = self.current_date - jdatetime.timedelta(days=self.current_date.weekday())
            end_of_week = start_of_week + jdatetime.timedelta(days=6)
            return f"هفته جاری ({start_of_week.strftime('%Y/%m/%d')} تا {end_of_week.strftime('%Y/%m/%d')})"
        else:
            return f"تاریخ {self.current_date.strftime('%Y/%m/%d')}"
    
    def refresh_preview(self):
        doctor = self.doctor_combo.currentText()
        if not doctor:
            return
        
        apps = self.get_appointments_by_range(doctor)
        date_text = self.get_date_range_text()
        
        if not apps:
            self.doctor_preview.setText(f"⚠️ هیچ نوبتی برای {doctor} در {date_text} وجود ندارد.")
            return
        
        total = sum(safe_int(app.final_cost) for app in apps)
        
        message = f"""
استاد گرامی {doctor}

سلام علیکم

نوبت‌های {date_text} شما:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        for i, app in enumerate(apps, 1):
            message += f"""
{i}. 🕐 ساعت: {app.time}
   👤 مراجع: {app.patient_name}
   📞 تلفن: {app.phone or '-'}
   📝 موضوع: {app.subject or '-'}
   💰 مبلغ: {safe_int(app.final_cost):,} تومان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        message += f"""
📊 جمع‌بندی:
🔹 تعداد نوبت‌ها: {len(apps)} نوبت
🔹 مجموع مبلغ: {total:,} تومان

با تشکر
مدیریت مرکز مشاوره آرامش"""
        
        self.doctor_preview.setText(message)
    
    def load_patient_appointments(self):
        self.appointment_combo.clear()
        text = self.patient_combo.currentText()
        if not text:
            return
        
        patient_name = text.split(" - ")[0]
        apps = self.get_patient_appointments(patient_name)
        
        for app in apps:
            self.appointment_combo.addItem(f"{app.date} | {app.time} | {app.doctor} | {safe_int(app.final_cost):,} تومان")
        
        self.patient_apps = apps
        if apps:
            self.appointment_combo.setCurrentIndex(0)
        self.refresh_patient_preview()
    
    def refresh_patient_preview(self):
        text = self.patient_combo.currentText()
        if not text:
            return
        
        patient_name = text.split(" - ")[0]
        
        if not hasattr(self, 'patient_apps') or not self.patient_apps:
            self.patient_preview.setText("⚠️ هیچ نوبتی برای این مراجع وجود ندارد")
            return
        
        if self.single_btn.isChecked():
            idx = self.appointment_combo.currentIndex()
            if idx >= 0 and idx < len(self.patient_apps):
                app = self.patient_apps[idx]
                message = f"""
مراجع گرامی {app.patient_name}

سلام علیکم

نوبت مشاوره شما:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 تاریخ: {app.date}
🕐 ساعت: {app.time}
👨‍⚕️ استاد: {app.doctor}
📝 موضوع: {app.subject or '-'}
💰 مبلغ: {safe_int(app.final_cost):,} تومان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 لطفاً ۱۵ دقیقه قبل از ساعت مقرر حضور داشته باشید.

با تشکر
مرکز مشاوره آرامش"""
                self.patient_preview.setPlainText(message)
        else:
            total = sum(safe_int(app.final_cost) for app in self.patient_apps)
            
            message = f"""
مراجع گرامی {patient_name}

سلام علیکم

لیست نوبت‌های شما:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            for i, app in enumerate(self.patient_apps, 1):
                message += f"""
{i}. 📅 {app.date} | 🕐 {app.time}
   👨‍⚕️ {app.doctor}
   💰 {safe_int(app.final_cost):,} تومان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            message += f"""
📊 جمع‌بندی:
🔹 تعداد نوبت‌ها: {len(self.patient_apps)} نوبت
🔹 مجموع مبلغ: {total:,} تومان

با تشکر
مرکز مشاوره آرامش"""
            self.patient_preview.setPlainText(message)
    
    def copy_doctor_message(self):
        text = self.doctor_preview.toPlainText()
        if text.startswith("⚠️"):
            QMessageBox.warning(self, "خطا", text)
            return
        QGuiApplication.clipboard().setText(text)
        QMessageBox.information(self, "موفق", "✅ متن پیام در حافظه کپی شد")
    
    def copy_patient_message(self):
        text = self.patient_preview.toPlainText()
        if text.startswith("⚠️"):
            QMessageBox.warning(self, "خطا", text)
            return
        QGuiApplication.clipboard().setText(text)
        QMessageBox.information(self, "موفق", "✅ متن پیام در حافظه کپی شد")
    
    def update_date_display(self):
        weekday_names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        weekday = weekday_names[self.current_date.weekday()]
        
        if self.range_type == "today":
            self.date_label.setText(f"📅 {self.current_date.strftime('%Y/%m/%d')} - {weekday}")
        elif self.range_type == "tomorrow":
            target_date = self.current_date + jdatetime.timedelta(days=1)
            weekday_target = weekday_names[target_date.weekday()]
            self.date_label.setText(f"📅 {target_date.strftime('%Y/%m/%d')} - {weekday_target} (فردا)")
        elif self.range_type == "week":
            start_of_week = self.current_date - jdatetime.timedelta(days=self.current_date.weekday())
            end_of_week = start_of_week + jdatetime.timedelta(days=6)
            self.date_label.setText(f"📆 {start_of_week.strftime('%Y/%m/%d')} تا {end_of_week.strftime('%Y/%m/%d')}")
        else:
            self.date_label.setText(f"📅 {self.current_date.strftime('%Y/%m/%d')} - {weekday}")
    
    def prev_day(self):
        if self.range_type == "week":
            self.range_type = "custom"
        self.current_date -= jdatetime.timedelta(days=1)
        self.update_date_display()
        self.refresh_preview()
    
    def next_day(self):
        if self.range_type == "week":
            self.range_type = "custom"
        self.current_date += jdatetime.timedelta(days=1)
        self.update_date_display()
        self.refresh_preview()
    
    def set_today(self):
        self.current_date = jdatetime.date.today()
        self.range_type = "today"
        self.update_date_display()
        self.refresh_preview()
    
    def set_tomorrow(self):
        self.current_date = jdatetime.date.today()
        self.range_type = "tomorrow"
        self.update_date_display()
        self.refresh_preview()
    
    def set_week(self):
        self.current_date = jdatetime.date.today()
        self.range_type = "week"
        self.update_date_display()
        self.refresh_preview()
    
    def open_calendar(self):
        def on_date_selected(date_str):
            try:
                self.current_date = jdatetime.datetime.strptime(date_str, "%Y/%m/%d").date()
                self.range_type = "custom"
                self.update_date_display()
                self.refresh_preview()
            except:
                pass
        dialog = PersianCalendarDialog(self, on_date_selected)
        dialog.exec()
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
