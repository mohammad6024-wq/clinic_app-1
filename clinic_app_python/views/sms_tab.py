from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton,
    QTextEdit, QGroupBox, QComboBox, QMessageBox, QTabWidget, QTableWidget,
    QTableWidgetItem, QHeaderView, QAbstractItemView
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import SmsSetting, Doctor, Appointment
import jdatetime
import urllib.request
import urllib.parse

class SmsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.setup_ui()
        self.load_settings()
    
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        
        self.inner_tabs = QTabWidget()
        
        # ========== تب 1: تنظیمات ==========
        settings_tab = QWidget()
        settings_layout = QVBoxLayout(settings_tab)
        
        basic_group = QGroupBox("تنظیمات پایه پیامک")
        basic_layout = QVBoxLayout(basic_group)
        
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("API Key:"))
        self.le_api_key = QLineEdit()
        self.le_api_key.setEchoMode(QLineEdit.Password)
        self.le_api_key.setMinimumWidth(300)
        row1.addWidget(self.le_api_key)
        basic_layout.addLayout(row1)
        
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("شماره فرستنده:"))
        self.le_sender = QLineEdit()
        self.le_sender.setPlaceholderText("مثال: 300012345")
        self.le_sender.setMinimumWidth(200)
        row2.addWidget(self.le_sender)
        basic_layout.addLayout(row2)
        
        settings_layout.addWidget(basic_group)
        
        template_group = QGroupBox("قالب‌های پیامک")
        template_layout = QVBoxLayout(template_group)
        
        template_layout.addWidget(QLabel("قالب پیامک به مراجع (متغیرها: {name}, {date}, {time}, {doctor}):"))
        self.txt_patient_template = QTextEdit()
        self.txt_patient_template.setMaximumHeight(80)
        template_layout.addWidget(self.txt_patient_template)
        
        template_layout.addWidget(QLabel("قالب پیامک تکی به استاد (متغیرها: {doctor}, {patient}, {date}, {time}):"))
        self.txt_doctor_single = QTextEdit()
        self.txt_doctor_single.setMaximumHeight(80)
        template_layout.addWidget(self.txt_doctor_single)
        
        template_layout.addWidget(QLabel("قالب پیامک گروهی به استاد (متغیرها: {doctor}, {date}, {appointments}):"))
        self.txt_doctor_bulk = QTextEdit()
        self.txt_doctor_bulk.setMaximumHeight(100)
        template_layout.addWidget(self.txt_doctor_bulk)
        
        settings_layout.addWidget(template_group)
        
        self.btn_save = QPushButton("💾 ذخیره تنظیمات")
        self.btn_save.setStyleSheet("background-color: #10b981; color: white; font-weight: bold;")
        settings_layout.addWidget(self.btn_save)
        
        self.inner_tabs.addTab(settings_tab, "تنظیمات")
        
        # ========== تب 2: پیامک گروهی به اساتید ==========
        bulk_tab = QWidget()
        bulk_layout = QVBoxLayout(bulk_tab)
        
        filter_layout = QHBoxLayout()
        filter_layout.addWidget(QLabel("استاد:"))
        self.cb_doctor = QComboBox()
        self.cb_doctor.setMinimumWidth(150)
        filter_layout.addWidget(self.cb_doctor)
        
        filter_layout.addWidget(QLabel("بازه زمانی:"))
        self.cb_range = QComboBox()
        self.cb_range.addItems(["امروز", "فردا", "این هفته"])
        filter_layout.addWidget(self.cb_range)
        
        self.btn_preview = QPushButton("📄 پیش‌نمایش")
        filter_layout.addWidget(self.btn_preview)
        
        self.btn_send_bulk = QPushButton("📨 ارسال به استاد")
        self.btn_send_bulk.setStyleSheet("background-color: #3b82f6; color: white;")
        filter_layout.addWidget(self.btn_send_bulk)
        filter_layout.addStretch()
        bulk_layout.addLayout(filter_layout)
        
        bulk_layout.addWidget(QLabel("پیش‌نمایش پیامک:"))
        self.txt_preview = QTextEdit()
        self.txt_preview.setReadOnly(True)
        self.txt_preview.setMaximumHeight(200)
        bulk_layout.addWidget(self.txt_preview)
        
        bulk_layout.addWidget(QLabel("لیست نوبت‌های ارسالی:"))
        self.table_bulk = QTableWidget()
        self.table_bulk.setColumnCount(4)
        self.table_bulk.setHorizontalHeaderLabels(["تاریخ", "ساعت", "نام مراجع", "نوع"])
        self.table_bulk.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table_bulk.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        bulk_layout.addWidget(self.table_bulk)
        
        self.inner_tabs.addTab(bulk_tab, "پیامک گروهی")
        
        main_layout.addWidget(self.inner_tabs)
        
        self.btn_save.clicked.connect(self.save_settings)
        self.btn_preview.clicked.connect(self.generate_preview)
        self.btn_send_bulk.clicked.connect(self.send_bulk_sms)
        
        self.load_doctors()
    
    def load_doctors(self):
        doctors = self.session.query(Doctor).all()
        self.cb_doctor.clear()
        for doc in doctors:
            self.cb_doctor.addItem(doc.name)
    
    def load_settings(self):
        setting = self.session.query(SmsSetting).first()
        if setting:
            self.le_api_key.setText(setting.api_key or "")
            self.le_sender.setText(setting.sender_number or "")
            self.txt_patient_template.setPlainText(setting.patient_template or "")
            self.txt_doctor_single.setPlainText(setting.doctor_single_template or "")
            self.txt_doctor_bulk.setPlainText(setting.doctor_bulk_template or "")
        else:
            default_patient = "مراجع گرامی {name}، نوبت شما برای تاریخ {date} ساعت {time} نزد استاد {doctor} ثبت گردید. لطفا 15 دقیقه زودتر حضور داشته باشید."
            default_doctor_single = "استاد گرامی {doctor}، یک نوبت جدید برای {patient} در تاریخ {date} ساعت {time} ثبت شد."
            default_doctor_bulk = "استاد گرامی {doctor}\nبرنامه کاری شما در تاریخ {date}:\n{appointments}\nبا تشکر"
            self.txt_patient_template.setPlainText(default_patient)
            self.txt_doctor_single.setPlainText(default_doctor_single)
            self.txt_doctor_bulk.setPlainText(default_doctor_bulk)
    
    def save_settings(self):
        setting = self.session.query(SmsSetting).first()
        if not setting:
            setting = SmsSetting()
            self.session.add(setting)
        
        setting.api_key = self.le_api_key.text().strip()
        setting.sender_number = self.le_sender.text().strip()
        setting.patient_template = self.txt_patient_template.toPlainText()
        setting.doctor_single_template = self.txt_doctor_single.toPlainText()
        setting.doctor_bulk_template = self.txt_doctor_bulk.toPlainText()
        
        try:
            self.session.commit()
            QMessageBox.information(self, "موفق", "تنظیمات پیامک با موفقیت ذخیره شد")
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ذخیره:\n{str(e)}")
    
    def get_appointments_for_date_range(self, doctor_name, range_type):
        today = jdatetime.date.today()
        
        if range_type == "امروز":
            dates = [today]
        elif range_type == "فردا":
            dates = [today + jdatetime.timedelta(days=1)]
        else:
            dates = [today + jdatetime.timedelta(days=i) for i in range(7)]
        
        date_strs = [d.strftime("%Y/%m/%d") for d in dates]
        
        appointments = []
        for date_str in date_strs:
            apps = self.session.query(Appointment).filter(
                Appointment.date == date_str,
                Appointment.doctor == doctor_name,
                Appointment.status != "کنسل استاد",
                Appointment.status != "کنسل مراجع"
            ).all()
            appointments.extend(apps)
        
        return appointments, date_strs
    
    def generate_preview(self):
        doctor = self.cb_doctor.currentText()
        range_type = self.cb_range.currentText()
        
        if not doctor:
            QMessageBox.warning(self, "خطا", "لطفاً استاد را انتخاب کنید")
            return
        
        appointments, date_strs = self.get_appointments_for_date_range(doctor, range_type)
        
        if not appointments:
            self.txt_preview.setPlainText("هیچ نوبتی در این بازه یافت نشد")
            self.table_bulk.setRowCount(0)
            return
        
        self.table_bulk.setRowCount(0)
        for i, app in enumerate(appointments):
            self.table_bulk.insertRow(i)
            self.table_bulk.setItem(i, 0, QTableWidgetItem(app.date or ""))
            self.table_bulk.setItem(i, 1, QTableWidgetItem(app.time or ""))
            self.table_bulk.setItem(i, 2, QTableWidgetItem(app.patient_name or ""))
            self.table_bulk.setItem(i, 3, QTableWidgetItem(app.type or ""))
        
        setting = self.session.query(SmsSetting).first()
        if setting and setting.doctor_bulk_template:
            template = setting.doctor_bulk_template
        else:
            template = "استاد گرامی {doctor}\nبرنامه کاری شما در تاریخ {date}:\n{appointments}"
        
        appt_lines = []
        for i, app in enumerate(appointments, 1):
            appt_lines.append(f"{i}. {app.patient_name} - ساعت {app.time}")
        
        date_display = date_strs[0]
        if len(date_strs) > 1:
            date_display = f"{date_strs[0]} تا {date_strs[-1]}"
        
        preview = template.format(
            doctor=doctor,
            date=date_display,
            appointments="\n".join(appt_lines)
        )
        
        self.txt_preview.setPlainText(preview)
    
    def send_sms(self, phone, text):
        """ارسال پیامک از طریق API کاوه‌نگار"""
        if not phone:
            return False, "شماره تلفن نامعتبر است"
        
        setting = self.session.query(SmsSetting).first()
        if not setting or not setting.api_key:
            print(f"\n📱 [حالت شبیه‌سازی] به {phone}:")
            print(f"   {text}\n")
            return True, "پیامک با موفقیت ارسال شد (حالت شبیه‌سازی - API Key تنظیم نشده)"
        
        try:
            clean_phone = ''.join(filter(str.isdigit, phone))
            if not clean_phone.startswith('09') or len(clean_phone) != 11:
                clean_phone = '0' + clean_phone if len(clean_phone) == 10 else clean_phone
            
            url = f"https://api.kavenegar.com/v1/{setting.api_key}/sms/send.json"
            
            data = urllib.parse.urlencode({
                'receptor': clean_phone,
                'message': text,
                'sender': setting.sender_number or "1000596446"
            }).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, method='POST')
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            
            with urllib.request.urlopen(req, timeout=15) as response:
                response_data = response.read().decode('utf-8')
                print(f"✅ پیامک ارسال شد به {clean_phone}: {response_data[:100]}")
                return True, "پیامک با موفقیت ارسال شد"
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ خطا در ارسال پیامک: {error_msg}")
            if "403" in error_msg or "unauthorized" in error_msg.lower():
                return False, "API Key نامعتبر است. لطفاً API Key صحیح را وارد کنید"
            return False, f"خطا در ارسال: {error_msg[:100]}"
    
    def send_bulk_sms(self):
        doctor = self.cb_doctor.currentText()
        range_type = self.cb_range.currentText()
        
        if not doctor:
            QMessageBox.warning(self, "خطا", "لطفاً استاد را انتخاب کنید")
            return
        
        doctor_obj = self.session.query(Doctor).filter(Doctor.name == doctor).first()
        if not doctor_obj or not doctor_obj.phone:
            QMessageBox.warning(self, "خطا", f"شماره تلفن استاد {doctor} ثبت نشده است")
            return
        
        text = self.txt_preview.toPlainText()
        if not text or text == "هیچ نوبتی در این بازه یافت نشد":
            QMessageBox.warning(self, "خطا", "لطفاً ابتدا پیش‌نمایش را ایجاد کنید")
            return
        
        reply = QMessageBox.question(self, "تایید ارسال",
            f"آیا از ارسال پیامک به استاد {doctor} (شماره: {doctor_obj.phone}) اطمینان دارید؟",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            success, msg = self.send_sms(doctor_obj.phone, text)
            if success:
                QMessageBox.information(self, "موفق", msg)
                if self.parent and hasattr(self.parent, 'log_activity'):
                    self.parent.log_activity("ارسال پیامک", f"پیامک گروهی برای استاد {doctor} ارسال شد")
            else:
                QMessageBox.critical(self, "خطا", msg)
    
    def __del__(self):
        if hasattr(self, 'session'):
            self.session.close()

