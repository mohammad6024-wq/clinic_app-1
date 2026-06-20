"""
پنجره نمایش جزئیات با قابلیت فیلتر و جستجو - نسخه با تقویم شمسی
"""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QTableWidget, 
    QTableWidgetItem, QPushButton, QHeaderView, QLineEdit,
    QMessageBox, QComboBox, QGroupBox, QGridLayout, QWidget,
    QCalendarWidget
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import Appointment, Doctor, Patient, User
import jdatetime

class PersianDateEdit(QWidget):
    """ویجت ساده برای انتخاب تاریخ شمسی"""
    def __init__(self, parent=None):
        super().__init__(parent)
        from PySide6.QtWidgets import QHBoxLayout, QLineEdit, QPushButton, QDialog, QVBoxLayout, QCalendarWidget
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.date_edit = QLineEdit()
        self.date_edit.setPlaceholderText("1403/01/01")
        self.date_edit.setText(jdatetime.date.today().strftime("%Y/%m/%d"))
        layout.addWidget(self.date_edit)
        
        self.calendar_btn = QPushButton("📅")
        self.calendar_btn.setFixedWidth(30)
        self.calendar_btn.clicked.connect(self.show_calendar)
        layout.addWidget(self.calendar_btn)
    
    def show_calendar(self):
        from PySide6.QtWidgets import QDialog, QVBoxLayout, QCalendarWidget
        
        dialog = QDialog(self)
        dialog.setWindowTitle("انتخاب تاریخ")
        dialog.setModal(True)
        dialog.resize(350, 300)
        
        layout = QVBoxLayout(dialog)
        
        calendar = QCalendarWidget()
        # تنظیم به تقویم میلادی
        try:
            current_jalali = jdatetime.datetime.strptime(self.get_date(), "%Y/%m/%d")
            greg_date = current_jalali.togregorian()
            calendar.setSelectedDate(greg_date)
        except:
            pass
        
        def on_date_selected():
            greg_date = calendar.selectedDate()
            jalali_date = jdatetime.date.fromgregorian(date=greg_date.toPython())
            self.set_date(jalali_date.strftime("%Y/%m/%d"))
            dialog.accept()
        
        calendar.clicked.connect(on_date_selected)
        layout.addWidget(calendar)
        
        dialog.exec()
    
    def get_date(self):
        return self.date_edit.text().strip()
    
    def set_date(self, date_str):
        self.date_edit.setText(date_str)
    
    def date(self):
        try:
            return jdatetime.datetime.strptime(self.get_date(), "%Y/%m/%d").date()
        except:
            return jdatetime.date.today()

class DetailViewDialog(QDialog):
    def __init__(self, title, data, headers, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.resize(1100, 600)
        self.setLayoutDirection(Qt.RightToLeft)
        
        layout = QVBoxLayout(self)
        
        title_label = QLabel(title)
        title_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #2563eb; padding: 10px; background-color: #eff6ff; border-radius: 10px;")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("🔍 جستجو:"))
        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("جستجو در لیست...")
        self.search_box.textChanged.connect(self.search_table)
        search_layout.addWidget(self.search_box)
        search_layout.addStretch()
        
        self.btn_export = QPushButton("📎 خروجی اکسل")
        self.btn_export.setStyleSheet("background-color: #10b981; color: white; padding: 5px 10px;")
        self.btn_export.clicked.connect(self.export_to_excel)
        search_layout.addWidget(self.btn_export)
        
        layout.addLayout(search_layout)
        
        self.table = QTableWidget()
        self.table.setColumnCount(len(headers))
        self.table.setHorizontalHeaderLabels(headers)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)
        
        stats_label = QLabel(f"جمع کل: {len(data)} مورد")
        stats_label.setStyleSheet("font-size: 12px; color: #6b7280; padding: 5px;")
        stats_label.setAlignment(Qt.AlignLeft)
        layout.addWidget(stats_label)
        
        btn_close = QPushButton("بستن")
        btn_close.setStyleSheet("background-color: #3b82f6; color: white; padding: 8px; border-radius: 8px;")
        btn_close.clicked.connect(self.accept)
        layout.addWidget(btn_close, alignment=Qt.AlignCenter)
        
        self.load_data(data)
        self.all_data = data
    
    def load_data(self, data):
        self.table.setRowCount(len(data))
        total_amount = 0
        for row, item in enumerate(data):
            for col, value in enumerate(item):
                self.table.setItem(row, col, QTableWidgetItem(str(value)))
                if col == len(item) - 1 and value != "-":
                    try:
                        val = str(value).replace(",", "").replace("تومان", "").strip()
                        if val.isdigit():
                            total_amount += int(val)
                    except:
                        pass
        
        if total_amount > 0:
            stats_label = self.layout().itemAt(4).widget()
            if stats_label:
                stats_label.setText(f"جمع کل: {len(data)} مورد - مجموع مبلغ: {total_amount:,} تومان")
    
    def search_table(self, text):
        for row in range(self.table.rowCount()):
            hide = True
            for col in range(self.table.columnCount()):
                item = self.table.item(row, col)
                if item and text.lower() in item.text().lower():
                    hide = False
                    break
            self.table.setRowHidden(row, hide)
    
    def export_to_excel(self):
        QMessageBox.information(self, "خروجی اکسل", "قابلیت خروجی اکسل در حال توسعه است")


class AdvancedFilterDialog(QDialog):
    """پنجره فیلتر پیشرفته نوبت‌ها با تقویم شمسی"""
    def __init__(self, parent=None, session=None):
        super().__init__(parent)
        self.parent = parent
        self.session = session
        self.setWindowTitle("فیلتر پیشرفته نوبت‌ها")
        self.setModal(True)
        self.resize(550, 480)
        self.setLayoutDirection(Qt.RightToLeft)
        
        layout = QVBoxLayout(self)
        
        title_label = QLabel("🔍 فیلتر پیشرفته نوبت‌ها")
        title_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #2563eb; padding: 10px;")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        form_group = QGroupBox("معیارهای جستجو")
        form_layout = QGridLayout(form_group)
        
        # تاریخ شروع (شمسی)
        form_layout.addWidget(QLabel("از تاریخ (شمسی):"), 0, 0)
        self.start_date = QLineEdit()
        self.start_date.setPlaceholderText("مثال: 1403/01/01")
        today = jdatetime.date.today()
        last_month = today - jdatetime.timedelta(days=30)
        self.start_date.setText(last_month.strftime("%Y/%m/%d"))
        form_layout.addWidget(self.start_date, 0, 1)
        
        # تاریخ پایان (شمسی)
        form_layout.addWidget(QLabel("تا تاریخ (شمسی):"), 1, 0)
        self.end_date = QLineEdit()
        self.end_date.setPlaceholderText("مثال: 1403/12/29")
        self.end_date.setText(today.strftime("%Y/%m/%d"))
        form_layout.addWidget(self.end_date, 1, 1)
        
        # استاد
        form_layout.addWidget(QLabel("استاد:"), 2, 0)
        self.doctor_combo = QComboBox()
        self.doctor_combo.addItem("همه اساتید")
        form_layout.addWidget(self.doctor_combo, 2, 1)
        
        # وضعیت
        form_layout.addWidget(QLabel("وضعیت:"), 3, 0)
        self.status_combo = QComboBox()
        self.status_combo.addItems(["همه", "فعال", "انجام شده", "کنسل استاد", "کنسل مراجع"])
        form_layout.addWidget(self.status_combo, 3, 1)
        
        # نوع نوبت
        form_layout.addWidget(QLabel("نوع نوبت:"), 4, 0)
        self.type_combo = QComboBox()
        self.type_combo.addItems(["همه", "حضوری", "تلفنی", "آنلاین"])
        form_layout.addWidget(self.type_combo, 4, 1)
        
        # توضیح
        info_label = QLabel("⚠️ تاریخ را به صورت شمسی و با فرمت سال/ماه/روز وارد کنید")
        info_label.setStyleSheet("color: #f59e0b; font-size: 10px;")
        form_layout.addWidget(info_label, 5, 0, 1, 2)
        
        layout.addWidget(form_group)
        
        btn_layout = QHBoxLayout()
        btn_search = QPushButton("🔍 جستجو")
        btn_search.setStyleSheet("background-color: #3b82f6; color: white; padding: 8px; border-radius: 8px;")
        btn_search.clicked.connect(self.search)
        btn_layout.addWidget(btn_search)
        
        btn_cancel = QPushButton("لغو")
        btn_cancel.setStyleSheet("background-color: #ef4444; color: white; padding: 8px; border-radius: 8px;")
        btn_cancel.clicked.connect(self.reject)
        btn_layout.addWidget(btn_cancel)
        
        layout.addLayout(btn_layout)
        
        self.load_doctors()
    
    def load_doctors(self):
        doctors = self.session.query(Doctor).order_by(Doctor.name).all()
        for doc in doctors:
            self.doctor_combo.addItem(doc.name)
    
    def validate_date(self, date_str):
        """اعتبارسنجی تاریخ شمسی"""
        try:
            parts = date_str.split('/')
            if len(parts) != 3:
                return False
            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
            if year < 1300 or year > 1500:
                return False
            if month < 1 or month > 12:
                return False
            if day < 1 or day > 31:
                return False
            # بررسی ساده روزهای ماه
            if month > 6 and day > 30:
                return False
            if month == 12 and day > 29:
                # سال کبیسه شمسی
                if not (year % 33 in [1, 5, 9, 13, 17, 22, 26, 30]):
                    return day <= 29
            return True
        except:
            return False
    
    def search(self):
        start_date_str = self.start_date.text().strip()
        end_date_str = self.end_date.text().strip()
        
        if not self.validate_date(start_date_str):
            QMessageBox.warning(self, "خطا", "تاریخ شروع نامعتبر است. فرمت صحیح: 1403/01/01")
            return
        
        if not self.validate_date(end_date_str):
            QMessageBox.warning(self, "خطا", "تاریخ پایان نامعتبر است. فرمت صحیح: 1403/12/29")
            return
        
        try:
            start_jalali = jdatetime.datetime.strptime(start_date_str, "%Y/%m/%d").date()
            end_jalali = jdatetime.datetime.strptime(end_date_str, "%Y/%m/%d").date()
        except:
            QMessageBox.warning(self, "خطا", "فرمت تاریخ صحیح نیست. از فرمت 1403/01/01 استفاده کنید")
            return
        
        query = self.session.query(Appointment).filter(
            Appointment.date >= start_jalali.strftime("%Y/%m/%d"),
            Appointment.date <= end_jalali.strftime("%Y/%m/%d")
        )
        
        if self.doctor_combo.currentText() != "همه اساتید":
            query = query.filter(Appointment.doctor == self.doctor_combo.currentText())
        
        if self.status_combo.currentText() != "همه":
            query = query.filter(Appointment.status == self.status_combo.currentText())
        
        if self.type_combo.currentText() != "همه":
            query = query.filter(Appointment.type == self.type_combo.currentText())
        
        apps = query.order_by(Appointment.date, Appointment.time).all()
        
        if not apps:
            QMessageBox.information(self, "اطلاع", "هیچ نوبتی با معیارهای انتخاب شده یافت نشد")
            return
        
        data = []
        for app in apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.phone, app.type, app.status, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "تلفن", "نوع", "وضعیت", "مبلغ"]
        dialog = DetailViewDialog(f"نتایج جستجو ({len(apps)} مورد)", data, headers, self.parent)
        dialog.exec()
        self.accept()


class AppointmentDetailView:
    @staticmethod
    def show_today_appointments(parent, session):
        today = jdatetime.date.today().strftime("%Y/%m/%d")
        apps = session.query(Appointment).filter(Appointment.date == today).all()
        
        valid_apps = [app for app in apps if app.status not in ["کنسل استاد", "کنسل مراجع"]]
        
        if not valid_apps:
            QMessageBox.information(parent, "اطلاع", f"هیچ نوبتی برای امروز ({today}) وجود ندارد")
            return
        
        data = []
        for app in valid_apps:
            data.append([
                app.id, app.time, app.doctor, app.patient_name, 
                app.phone, app.type, app.status, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "ساعت", "استاد", "نام مراجع", "تلفن", "نوع", "وضعیت", "مبلغ"]
        dialog = DetailViewDialog(f"📅 نوبت‌های امروز ({len(valid_apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_week_appointments(parent, session):
        today = jdatetime.date.today()
        days_since_saturday = today.weekday()
        week_start = today - jdatetime.timedelta(days=days_since_saturday)
        week_end = week_start + jdatetime.timedelta(days=6)
        
        apps = session.query(Appointment).filter(
            Appointment.date >= week_start.strftime("%Y/%m/%d"),
            Appointment.date <= week_end.strftime("%Y/%m/%d")
        ).order_by(Appointment.date).all()
        
        valid_apps = [app for app in apps if app.status not in ["کنسل استاد", "کنسل مراجع"]]
        
        if not valid_apps:
            QMessageBox.information(parent, "اطلاع", "هیچ نوبتی در این هفته وجود ندارد")
            return
        
        data = []
        for app in valid_apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.phone, app.type, app.status, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "تلفن", "نوع", "وضعیت", "مبلغ"]
        dialog = DetailViewDialog(f"📆 نوبت‌های هفته جاری ({len(valid_apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_month_appointments(parent, session):
        today = jdatetime.date.today()
        month_start = jdatetime.date(today.year, today.month, 1)
        
        if today.month == 12:
            next_month = jdatetime.date(today.year + 1, 1, 1)
        else:
            next_month = jdatetime.date(today.year, today.month + 1, 1)
        
        month_end = next_month - jdatetime.timedelta(days=1)
        
        apps = session.query(Appointment).filter(
            Appointment.date >= month_start.strftime("%Y/%m/%d"),
            Appointment.date <= month_end.strftime("%Y/%m/%d")
        ).order_by(Appointment.date).all()
        
        valid_apps = [app for app in apps if app.status not in ["کنسل استاد", "کنسل مراجع"]]
        
        if not valid_apps:
            QMessageBox.information(parent, "اطلاع", f"هیچ نوبتی در ماه جاری وجود ندارد")
            return
        
        month_names = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", 
                       "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
        
        data = []
        for app in valid_apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.phone, app.type, app.status, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "تلفن", "نوع", "وضعیت", "مبلغ"]
        dialog = DetailViewDialog(f"📅 نوبت‌های ماه {month_names[today.month-1]} ({len(valid_apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_status_appointments(parent, session, status):
        apps = session.query(Appointment).filter(Appointment.status == status).all()
        
        if not apps:
            QMessageBox.information(parent, "اطلاع", f"هیچ نوبتی با وضعیت '{status}' وجود ندارد")
            return
        
        data = []
        for app in apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.phone, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "تلفن", "مبلغ"]
        dialog = DetailViewDialog(f"✅ نوبت‌های {status} ({len(apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_cancelled_appointments(parent, session):
        apps = session.query(Appointment).filter(
            Appointment.status.in_(["کنسل استاد", "کنسل مراجع"])
        ).all()
        
        if not apps:
            QMessageBox.information(parent, "اطلاع", "هیچ نوبت لغو شده‌ای وجود ندارد")
            return
        
        data = []
        for app in apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.status, app.phone
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "وضعیت لغو", "تلفن"]
        dialog = DetailViewDialog(f"❌ نوبت‌های لغو شده ({len(apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_referred_appointments(parent, session):
        apps = session.query(Appointment).filter(
            Appointment.ref_type != "آزاد",
            Appointment.ref_type.isnot(None),
            Appointment.ref_type != ""
        ).all()
        
        if not apps:
            QMessageBox.information(parent, "اطلاع", "هیچ نوبت ارجاعی وجود ندارد")
            return
        
        data = []
        for app in apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.ref_type, app.status, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "نوع ارجاع", "وضعیت", "مبلغ"]
        dialog = DetailViewDialog(f"🔄 نوبت‌های ارجاعی ({len(apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_couple_appointments(parent, session):
        apps = session.query(Appointment).filter(
            Appointment.patient2_name.isnot(None),
            Appointment.patient2_name != ""
        ).all()
        
        if not apps:
            QMessageBox.information(parent, "اطلاع", "هیچ نوبت زوجی وجود ندارد")
            return
        
        data = []
        for app in apps:
            data.append([
                app.id, app.date, app.time, app.doctor, app.patient_name, 
                app.patient2_name, app.phone, f"{int(app.final_cost or 0):,}"
            ])
        
        headers = ["شناسه", "تاریخ", "ساعت", "استاد", "نام مراجع", "نام همسر", "تلفن", "مبلغ"]
        dialog = DetailViewDialog(f"💑 نوبت‌های زوجی ({len(apps)} مورد)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_doctors_list(parent, session):
        doctors = session.query(Doctor).order_by(Doctor.name).all()
        
        if not doctors:
            QMessageBox.information(parent, "اطلاع", "هیچ استادی ثبت نشده است")
            return
        
        data = []
        for doc in doctors:
            app_count = session.query(Appointment).filter(
                Appointment.doctor == doc.name
            ).count()
            data.append([
                doc.id, doc.name, doc.spec or "-", doc.phone or "-", 
                doc.gender or "-", app_count, doc.working_days or "-"
            ])
        
        headers = ["شناسه", "نام", "تخصص", "تلفن", "جنسیت", "تعداد نوبت", "روزهای حضور"]
        dialog = DetailViewDialog(f"👨‍⚕️ لیست اساتید ({len(doctors)} نفر)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_patients_list(parent, session):
        patients = session.query(Patient).order_by(Patient.name).all()
        
        if not patients:
            QMessageBox.information(parent, "اطلاع", "هیچ مراجعی ثبت نشده است")
            return
        
        data = []
        for pat in patients:
            session_count = session.query(Appointment).filter(
                (Appointment.nat_id == pat.nat_id) | (Appointment.patient2_nat_id == pat.nat_id)
            ).count()
            data.append([
                pat.id, pat.name, pat.nat_id or "-", pat.phone or "-", 
                pat.gender or "-", pat.type or "-", session_count
            ])
        
        headers = ["شناسه", "نام", "کد ملی", "تلفن", "جنسیت", "نوع", "تعداد جلسات"]
        dialog = DetailViewDialog(f"👥 لیست مراجعین ({len(patients)} نفر)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_users_list(parent, session):
        users = session.query(User).filter(User.is_active == 1).order_by(User.username).all()
        
        if not users:
            QMessageBox.information(parent, "اطلاع", "هیچ کاربر فعالی وجود ندارد")
            return
        
        data = []
        for user in users:
            role_fa = "مدیر ارشد" if user.role == "super_admin" else ("مدیر" if user.role == "admin" else "منشی")
            data.append([
                user.id, user.username, user.name or "-", role_fa, 
                user.phone or "-", user.gender or "-"
            ])
        
        headers = ["شناسه", "نام کاربری", "نام کامل", "نقش", "تلفن", "جنسیت"]
        dialog = DetailViewDialog(f"👤 کاربران فعال سیستم ({len(users)} نفر)", data, headers, parent)
        dialog.exec()
    
    @staticmethod
    def show_advanced_filter(parent, session):
        dialog = AdvancedFilterDialog(parent, session)
        dialog.exec()
