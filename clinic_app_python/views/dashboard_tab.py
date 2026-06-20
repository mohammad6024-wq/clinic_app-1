from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QTableWidget, QTableWidgetItem, QCheckBox, QFrame,
    QMessageBox, QHeaderView, QAbstractItemView, QDialog,
    QGridLayout, QCompleter, QScrollArea, QGroupBox, QSizePolicy, QMenu
)
from PySide6.QtCore import Qt, QStringListModel, Signal, QSize
from PySide6.QtGui import QColor, QAction
from database.engine import SessionLocal
from database.models import Appointment, Doctor, Patient, Subject, DoctorAttendance, Shift
import jdatetime

from views.notification_center import NotificationCenter
from views.new_appointment_dialog import NewAppointmentDialog
from views.receipt_dialog import ReceiptDialog

class PersianCalendarDialog(QDialog):
    def __init__(self, parent=None, on_date_selected=None):
        super().__init__(parent)
        self.setWindowTitle("انتخاب تاریخ شمسی")
        self.setModal(True)
        self.setFixedSize(550, 520)
        self.on_date_selected = on_date_selected
        self.current_date = jdatetime.date.today()
        self.active_dates = set()
        if parent and hasattr(parent, 'get_active_dates'):
            self.active_dates = parent.get_active_dates()
        self.setup_ui()
        self.update_calendar()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        select_layout = QHBoxLayout()
        select_layout.addWidget(QLabel("سال:"))
        self.year_combo = QComboBox()
        for year in range(1390, jdatetime.date.today().year + 10):
            self.year_combo.addItem(str(year))
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.year_combo.currentTextChanged.connect(self.on_year_month_changed)
        select_layout.addWidget(self.year_combo)
        select_layout.addWidget(QLabel("ماه:"))
        self.month_combo = QComboBox()
        months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", 
                  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
        self.month_combo.addItems(months)
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
        self.month_combo.currentTextChanged.connect(self.on_year_month_changed)
        select_layout.addWidget(self.month_combo)
        select_layout.addStretch()
        layout.addLayout(select_layout)
        
        week_layout = QHBoxLayout()
        week_days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        for day in week_days:
            lbl = QLabel(day)
            lbl.setAlignment(Qt.AlignCenter)
            lbl.setStyleSheet("font-weight: bold; color: #2563eb; padding: 8px; font-size: 14px; background-color: #f1f5f9;")
            week_layout.addWidget(lbl)
        layout.addLayout(week_layout)
        
        self.day_grid = QGridLayout()
        self.day_grid.setSpacing(5)
        layout.addLayout(self.day_grid)
        btn_today = QPushButton("امروز")
        btn_today.setFixedHeight(35)
        btn_today.clicked.connect(self.go_today)
        layout.addWidget(btn_today, alignment=Qt.AlignCenter)
    
    def on_year_month_changed(self):
        year = int(self.year_combo.currentText())
        month = self.month_combo.currentIndex() + 1
        self.current_date = jdatetime.date(year, month, 1)
        self.update_calendar()
    
    def go_today(self):
        self.current_date = jdatetime.date.today()
        self.year_combo.setCurrentText(str(self.current_date.year))
        self.month_combo.setCurrentIndex(self.current_date.month - 1)
        self.update_calendar()
    
    def update_calendar(self):
        for i in reversed(range(self.day_grid.count())):
            widget = self.day_grid.itemAt(i).widget()
            if widget:
                widget.deleteLater()
        first_day = jdatetime.date(self.current_date.year, self.current_date.month, 1)
        start_weekday = first_day.weekday()
        if self.current_date.month <= 6:
            days_in_month = 31
        elif self.current_date.month <= 11:
            days_in_month = 30
        else:
            days_in_month = 30 if first_day.isleap() else 29
        row = 0
        col = start_weekday
        for day in range(1, days_in_month + 1):
            date = jdatetime.date(self.current_date.year, self.current_date.month, day)
            date_str = date.strftime("%Y/%m/%d")
            btn = QPushButton(str(day))
            btn.setFixedSize(60, 55)
            if date_str in self.active_dates:
                btn.setStyleSheet("QPushButton { background-color: #3b82f6; color: white; font-weight: bold; border-radius: 10px; font-size: 14px; }")
            else:
                btn.setStyleSheet("QPushButton { background-color: #e2e8f0; color: #1f2937; border-radius: 10px; font-size: 14px; } QPushButton:hover { background-color: #cbd5e1; }")
            btn.clicked.connect(lambda checked, d=date: self.select_date(d))
            self.day_grid.addWidget(btn, row, col)
            col += 1
            if col > 6:
                col = 0
                row += 1
    
    def select_date(self, date):
        if self.on_date_selected:
            self.on_date_selected(date)
        self.accept()


class DashboardTab(QWidget):
    data_changed = Signal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.current_date = jdatetime.date.today()
        self.selected_appt_id = None
        self.doc_colors = {}
        self.color_index = 0
        self.setup_ui()
        self.load_initial_data()
        self.update_attendance_panel()
        self.update_date_label()
        self.update_button_states()

    def is_patient_blocked(self, nat_id):
        if not nat_id:
            return False
        patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
        return patient.is_blocked == 1 if patient else False

    def get_session_color(self, session_count):
        enabled = True
        if hasattr(self.parent, 'patients_tab') and hasattr(self.parent.patients_tab, 'session_warning_enabled'):
            enabled = self.parent.patients_tab.session_warning_enabled
        if not enabled:
            return None
        if session_count == 3:
            return QColor("#f97316")
        if session_count > 3:
            return QColor("#ef4444")
        return None

    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(8)
        
        top_layout = QHBoxLayout()
        self.btn_prev = QPushButton("روز قبل >")
        self.btn_next = QPushButton("< روز بعد")
        self.btn_today = QPushButton("امروز")
        self.btn_calendar = QPushButton("تقویم")
        self.lbl_date = QLabel()
        self.lbl_date.setStyleSheet("font-size: 14pt; font-weight: bold; color: #2563eb;")
        self.search_entry = QLineEdit()
        self.search_entry.setPlaceholderText("جستجو...")
        self.btn_notification = QPushButton("📢 اطلاع‌رسانی")
        self.btn_notification.setProperty("secondary", True)
        self.btn_notification.clicked.connect(self.show_notification)
        self.btn_receipt = QPushButton("قبض")
        self.btn_receipt.clicked.connect(self.show_receipt)
        self.btn_sms = QPushButton("پیامک")
        
        top_layout.addWidget(self.btn_prev)
        top_layout.addWidget(self.btn_next)
        top_layout.addWidget(self.btn_today)
        top_layout.addWidget(self.btn_calendar)
        top_layout.addWidget(self.lbl_date)
        top_layout.addWidget(self.search_entry)
        top_layout.addWidget(self.btn_notification)
        top_layout.addWidget(self.btn_receipt)
        top_layout.addWidget(self.btn_sms)
        main_layout.addLayout(top_layout)
        
        actions_frame = QFrame()
        actions_frame.setStyleSheet("QFrame { background-color: #f1f5f9; border-radius: 10px; padding: 5px; }")
        actions_layout = QHBoxLayout(actions_frame)
        actions_layout.setSpacing(8)
        
        self.btn_edit = QPushButton("✏️ ویرایش")
        self.btn_edit.setProperty("secondary", True)
        self.btn_edit.clicked.connect(self.edit_appointment)
        actions_layout.addWidget(self.btn_edit)
        
        self.btn_done = QPushButton("✅ انجام شده")
        self.btn_done.setProperty("success", True)
        self.btn_done.clicked.connect(self.mark_done)
        actions_layout.addWidget(self.btn_done)
        
        self.btn_reactivate = QPushButton("🔄 فعال کردن")
        self.btn_reactivate.setProperty("info", True)
        self.btn_reactivate.clicked.connect(self.reactivate_appointment)
        actions_layout.addWidget(self.btn_reactivate)
        
        self.btn_cancel_doctor = QPushButton("❌ لغو استاد")
        self.btn_cancel_doctor.setProperty("warning", True)
        self.btn_cancel_doctor.clicked.connect(lambda: self.cancel_appointment("کنسل استاد"))
        actions_layout.addWidget(self.btn_cancel_doctor)
        
        self.btn_cancel_patient = QPushButton("❌ لغو مراجع")
        self.btn_cancel_patient.setProperty("warning", True)
        self.btn_cancel_patient.clicked.connect(lambda: self.cancel_appointment("کنسل مراجع"))
        actions_layout.addWidget(self.btn_cancel_patient)
        
        self.btn_delete = QPushButton("🗑️ حذف")
        self.btn_delete.setProperty("danger", True)
        self.btn_delete.clicked.connect(self.delete_appointment)
        actions_layout.addWidget(self.btn_delete)
        
        separator = QFrame()
        separator.setFrameShape(QFrame.VLine)
        separator.setFrameShadow(QFrame.Sunken)
        separator.setStyleSheet("background-color: #cbd5e1;")
        actions_layout.addWidget(separator)
        
        self.btn_new_appointment = QPushButton("➕ ثبت نوبت جدید")
        self.btn_new_appointment.setStyleSheet("""
            QPushButton {
                background-color: #10b981;
                color: white;
                font-weight: bold;
                padding: 6px 16px;
                border-radius: 8px;
            }
            QPushButton:hover {
                background-color: #059669;
            }
        """)
        self.btn_new_appointment.clicked.connect(self.open_new_appointment_dialog)
        actions_layout.addWidget(self.btn_new_appointment)
        
        actions_layout.addStretch()
        main_layout.addWidget(actions_frame)
        
        self.table = QTableWidget()
        headers = ["استاد", "وضعیت", "ساعت", "نام مراجع", "تلفن", "کد ملی", 
                   "جلسات", "هزینه", "تخفیف", "نهایی", "پرداختی", "موضوع", "نوع", "توضیحات"]
        self.table.setColumnCount(len(headers))
        self.table.setHorizontalHeaderLabels(headers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.setAlternatingRowColors(True)
        self.table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        column_widths = [120, 80, 70, 180, 100, 100, 60, 100, 100, 100, 90, 120, 80, 150]
        for col, width in enumerate(column_widths):
            self.table.setColumnWidth(col, width)
        header = self.table.horizontalHeader()
        header.setStretchLastSection(True)
        main_layout.addWidget(self.table)
        
        self.att_groupbox = QGroupBox("وضعیت حضور اساتید")
        self.att_groupbox.setMaximumHeight(85)
        self.att_groupbox.setStyleSheet("QGroupBox { font-weight: bold; margin-top: 2px; } QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 5px; }")
        
        self.att_scroll = QScrollArea()
        self.att_scroll.setWidgetResizable(True)
        self.att_scroll.setMaximumHeight(65)
        self.att_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.att_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.att_scroll.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        
        self.att_widget = QWidget()
        self.att_layout = QHBoxLayout(self.att_widget)
        self.att_layout.setContentsMargins(5, 2, 5, 2)
        self.att_layout.setSpacing(8)
        self.att_scroll.setWidget(self.att_widget)
        
        group_layout = QVBoxLayout(self.att_groupbox)
        group_layout.setContentsMargins(5, 2, 5, 2)
        group_layout.setSpacing(0)
        group_layout.addWidget(self.att_scroll)
        main_layout.addWidget(self.att_groupbox)
        
        self.btn_prev.clicked.connect(self.prev_day)
        self.btn_next.clicked.connect(self.next_day)
        self.btn_today.clicked.connect(self.go_today)
        self.btn_calendar.clicked.connect(self.open_calendar)
        self.search_entry.textChanged.connect(self.search_table)
        self.table.itemSelectionChanged.connect(self.on_select_row)
        
        self.setup_autocomplete()
    
    def update_button_states(self):
        has_selection = self.selected_appt_id is not None
        self.btn_edit.setEnabled(has_selection)
        self.btn_done.setEnabled(has_selection)
        self.btn_reactivate.setEnabled(has_selection)
        self.btn_cancel_doctor.setEnabled(has_selection)
        self.btn_cancel_patient.setEnabled(has_selection)
        self.btn_delete.setEnabled(has_selection)
    
    def show_notification(self):
        dialog = NotificationCenter(self, specific_date=self.current_date.strftime("%Y/%m/%d"))
        dialog.exec()
    
    def show_notification_for_appointment(self, appointment):
        dialog = NotificationCenter(self, specific_doctor=appointment.doctor, specific_date=appointment.date)
        dialog.exec()
    
    def show_receipt(self):
        if not self.selected_appt_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک نوبت را انتخاب کنید")
            return
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if not app:
            QMessageBox.warning(self, "خطا", "نوبت یافت نشد")
            return
        dialog = ReceiptDialog(app, self)
        dialog.exec()
    
    def show_context_menu(self, position):
        if self.selected_appt_id is None:
            return
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if not app:
            return
        menu = QMenu()
        menu.setStyleSheet("""
            QMenu {
                background-color: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 5px;
            }
            QMenu::item {
                padding: 8px 25px 8px 10px;
                margin: 2px;
                border-radius: 6px;
            }
            QMenu::item:selected {
                background-color: #eff6ff;
                color: #2563eb;
            }
        """)
        action_notify = QAction("📢 اطلاع‌رسانی این نوبت", self)
        action_notify.triggered.connect(lambda: self.show_notification_for_appointment(app))
        menu.addAction(action_notify)
        menu.addSeparator()
        action_receipt = QAction("🧾 صدور قبض", self)
        action_receipt.triggered.connect(self.show_receipt)
        menu.addAction(action_receipt)
        menu.addSeparator()
        action_edit = QAction("✏️ ویرایش نوبت", self)
        action_edit.triggered.connect(self.edit_appointment)
        menu.addAction(action_edit)
        menu.addSeparator()
        action_cancel_doctor = QAction("❌ لغو توسط استاد", self)
        action_cancel_doctor.triggered.connect(lambda: self.cancel_appointment("کنسل استاد"))
        menu.addAction(action_cancel_doctor)
        action_cancel_patient = QAction("❌ لغو توسط مراجع", self)
        action_cancel_patient.triggered.connect(lambda: self.cancel_appointment("کنسل مراجع"))
        menu.addAction(action_cancel_patient)
        menu.addSeparator()
        action_delete = QAction("🗑️ حذف نوبت", self)
        action_delete.triggered.connect(self.delete_appointment)
        menu.addAction(action_delete)
        if app.status in ["کنسل استاد", "کنسل مراجع", "انجام شده"]:
            action_reactivate = QAction("🔄 فعال کردن مجدد", self)
            action_reactivate.triggered.connect(self.reactivate_appointment)
            menu.addAction(action_reactivate)
        menu.exec(self.table.viewport().mapToGlobal(position))
    
    def select_all_on_click(self, event):
        widget = event.widget()
        widget.selectAll()
        super(QLineEdit, widget).mousePressEvent(event)
    
    def to_int(self, value):
        try:
            if value is None:
                return 0
            if isinstance(value, (int, float)):
                return int(value)
            if isinstance(value, str):
                value = value.replace(",", "").strip()
                return int(float(value)) if value else 0
            return 0
        except:
            return 0
    
    def check_duplicate_patient(self, name, nat_id, phone, exclude_nat_id=None):
        if nat_id:
            existing = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
            if existing:
                if exclude_nat_id and existing.nat_id == exclude_nat_id:
                    pass
                else:
                    return f"کد ملی {nat_id} قبلاً برای '{existing.name}' ثبت شده است"
        if phone:
            existing = self.session.query(Patient).filter(Patient.phone == phone).first()
            if existing:
                if exclude_nat_id and existing.nat_id == exclude_nat_id:
                    pass
                else:
                    return f"شماره تلفن {phone} قبلاً برای '{existing.name}' ثبت شده است"
        return None
    
    def setup_autocomplete(self):
        self.doctor_completer = QCompleter()
        self.doctor_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.doctor_completer.setFilterMode(Qt.MatchContains)
        self.cb_doctor = QComboBox()
        self.cb_doctor.setEditable(True)
        self.cb_doctor.setCompleter(self.doctor_completer)
        self.update_doctor_list()
        self.patient_completer = QCompleter()
        self.patient_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.patient_completer.setFilterMode(Qt.MatchContains)
        self.le_patient = QLineEdit()
        self.le_patient.setCompleter(self.patient_completer)
        self.natid_completer = QCompleter()
        self.natid_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_nat_id = QLineEdit()
        self.le_nat_id.setCompleter(self.natid_completer)
        self.p2_completer = QCompleter()
        self.p2_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.p2_completer.setFilterMode(Qt.MatchContains)
        self.le_p2_name = QLineEdit()
        self.le_p2_name.setCompleter(self.p2_completer)
        self.p2_natid_completer = QCompleter()
        self.p2_natid_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_p2_nat_id = QLineEdit()
        self.le_p2_nat_id.setCompleter(self.p2_natid_completer)
        self.update_patient_lists()
        self.patient_completer.activated.connect(self.on_patient_selected)
        self.natid_completer.activated.connect(self.on_natid_selected)
        self.p2_completer.activated.connect(self.on_p2_selected)
        self.p2_natid_completer.activated.connect(self.on_p2_natid_selected)
    
    def update_doctor_list(self):
        doctors = self.session.query(Doctor).all()
        doctor_names = [d.name for d in doctors]
        if hasattr(self, 'doctor_completer'):
            self.doctor_completer.setModel(QStringListModel(doctor_names))
    
    def update_patient_lists(self):
        patients = self.session.query(Patient).all()
        names = [p.name for p in patients]
        nat_ids = [p.nat_id for p in patients if p.nat_id]
        if hasattr(self, 'patient_completer'):
            self.patient_completer.setModel(QStringListModel(names))
            self.natid_completer.setModel(QStringListModel(nat_ids))
            self.p2_completer.setModel(QStringListModel(names))
            self.p2_natid_completer.setModel(QStringListModel(nat_ids))
    
    def load_subjects_to_combo(self):
        subjects = self.session.query(Subject).all()
        if hasattr(self, 'cb_subject'):
            self.cb_subject.clear()
            for subj in subjects:
                self.cb_subject.addItem(subj.name)
        if subjects and hasattr(self, 'cb_subject'):
            self.cb_subject.setCurrentIndex(0)
            self.toggle_patient2(subjects[0].name)
    
    def sync_patient_to_db(self, name, nat_id, phone, gender, patient_type):
        if not name:
            return
        patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
        if not patient:
            patient = self.session.query(Patient).filter(Patient.name == name).first()
        if patient:
            patient.name = name
            patient.phone = phone
            patient.gender = gender
            patient.type = patient_type
            if nat_id:
                patient.nat_id = nat_id
        else:
            patient = Patient(name=name, nat_id=nat_id, phone=phone, gender=gender, type=patient_type)
            self.session.add(patient)
        self.session.commit()
        return patient
    
    def get_patient_total_sessions(self, nat_id):
        if not nat_id:
            return 0
        count1 = self.session.query(Appointment).filter(
            Appointment.nat_id == nat_id,
            Appointment.status != "کنسل استاد",
            Appointment.status != "کنسل مراجع"
        ).count()
        count2 = self.session.query(Appointment).filter(
            Appointment.patient2_nat_id == nat_id,
            Appointment.status != "کنسل استاد",
            Appointment.status != "کنسل مراجع"
        ).count()
        return count1 + count2
    
    def on_patient_selected(self, name):
        patient = self.session.query(Patient).filter(Patient.name == name).first()
        if patient:
            self.fill_patient_data(patient)
    
    def on_natid_selected(self, nat_id):
        patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
        if patient:
            self.fill_patient_data(patient)
    
    def on_p2_selected(self, name):
        patient = self.session.query(Patient).filter(Patient.name == name).first()
        if patient:
            self.le_p2_name.setText(patient.name or "")
            self.le_p2_nat_id.setText(patient.nat_id or "")
            self.le_p2_phone.setText(patient.phone or "")
            if patient.gender:
                self.cb_p2_gender.setCurrentText(patient.gender)
    
    def on_p2_natid_selected(self, nat_id):
        patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
        if patient:
            self.le_p2_name.setText(patient.name or "")
            self.le_p2_nat_id.setText(patient.nat_id or "")
            self.le_p2_phone.setText(patient.phone or "")
            if patient.gender:
                self.cb_p2_gender.setCurrentText(patient.gender)
    
    def fill_patient_data(self, patient):
        self.le_patient.setText(patient.name or "")
        self.le_nat_id.setText(patient.nat_id or "")
        self.le_phone.setText(patient.phone or "")
        if patient.gender:
            self.cb_gender.setCurrentText(patient.gender)
    
    def get_active_dates(self):
        dates = self.session.query(Appointment.date).distinct().all()
        return [d[0] for d in dates]
    
    def load_initial_data(self):
        self.load_doctors_combo()
        shifts = self.session.query(Shift).all()
        if hasattr(self, 'cb_shift'):
            self.cb_shift.clear()
            for shift in shifts:
                self.cb_shift.addItem(shift.name)
        self.load_subjects_to_combo()
        self.load_appointments()
    
    def load_doctors_combo(self):
        today = self.current_date
        weekday_names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        today_name = weekday_names[today.weekday()]
        doctors = self.session.query(Doctor).all()
        if hasattr(self, 'cb_doctor'):
            self.cb_doctor.clear()
            for doc in doctors:
                working_days = doc.working_days or ""
                days_list = [d.strip() for d in working_days.split(",")] if working_days else []
                if today_name in days_list or "همه روزه" in days_list:
                    self.cb_doctor.addItem(doc.name)
        self.update_doctor_list()
    
    def on_all_doctors_toggle(self):
        if self.chk_all_doctors.isChecked():
            doctors = self.session.query(Doctor).all()
            self.cb_doctor.clear()
            for doc in doctors:
                self.cb_doctor.addItem(doc.name)
        else:
            self.load_doctors_combo()
    
    def update_time_combo(self):
        shift_name = self.cb_shift.currentText()
        shift = self.session.query(Shift).filter(Shift.name == shift_name).first()
        if shift and shift.time_range:
            try:
                parts = shift.time_range.split("-")
                start_h = int(parts[0])
                end_h = int(parts[1])
                hours = [f"{h}:00" for h in range(start_h, end_h + 1)]
                self.cb_time.clear()
                self.cb_time.addItems(hours)
            except:
                pass
    
    def update_date_label(self):
        weekday_names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        weekday = weekday_names[self.current_date.weekday()]
        self.lbl_date.setText(f"{self.current_date.strftime('%Y/%m/%d')} - {weekday}")
    
    def prev_day(self):
        self.current_date -= jdatetime.timedelta(days=1)
        self.update_date_label()
        self.load_doctors_combo()
        self.load_appointments()
        self.update_attendance_panel()
    
    def next_day(self):
        self.current_date += jdatetime.timedelta(days=1)
        self.update_date_label()
        self.load_doctors_combo()
        self.load_appointments()
        self.update_attendance_panel()
    
    def go_today(self):
        self.current_date = jdatetime.date.today()
        self.update_date_label()
        self.load_doctors_combo()
        self.load_appointments()
        self.update_attendance_panel()
    
    def open_calendar(self):
        dialog = PersianCalendarDialog(self, self.set_date_from_calendar)
        dialog.exec()
    
    def set_date_from_calendar(self, date):
        self.current_date = date
        self.update_date_label()
        self.load_doctors_combo()
        self.load_appointments()
        self.update_attendance_panel()
    
    def validate_nat_id(self, nat_id):
        if not nat_id:
            return True
        return len(nat_id) == 10 and nat_id.isdigit()
    
    def validate_phone(self, phone):
        if not phone:
            return True
        digits = ''.join(filter(str.isdigit, phone))
        return len(digits) == 11
    
    def load_appointments(self):
        self.session.expire_all()
        self.table.setRowCount(0)
        date_str = self.current_date.strftime("%Y/%m/%d")
        apps = self.session.query(Appointment).filter(Appointment.date == date_str).all()
        for i, app in enumerate(apps):
            self.table.insertRow(i)
            if app.doctor not in self.doc_colors:
                colors = ["#dbeafe", "#dcfce7", "#fef9c3", "#ffe4e6", "#f3e8ff", "#ffedd5"]
                self.doc_colors[app.doctor] = colors[self.color_index % len(colors)]
                self.color_index += 1
            name = app.patient_name
            if app.patient2_name:
                name += f" و {app.patient2_name}"
            session_count = self.get_patient_total_sessions(app.nat_id)
            for col in range(self.table.columnCount()):
                item = QTableWidgetItem()
                item.setBackground(QColor(self.doc_colors.get(app.doctor, "#ffffff")))
                self.table.setItem(i, col, item)
            self.table.setItem(i, 0, QTableWidgetItem(app.doctor or ""))
            
            status_item = QTableWidgetItem(app.status or "فعال")
            if app.status == "کنسل استاد":
                status_item.setBackground(QColor("#fecaca"))
                status_item.setForeground(QColor("#991b1b"))
            elif app.status == "کنسل مراجع":
                status_item.setBackground(QColor("#fed7aa"))
                status_item.setForeground(QColor("#9a3412"))
            elif app.status == "انجام شده":
                status_item.setBackground(QColor("#bbf7d0"))
                status_item.setForeground(QColor("#166534"))
            elif app.status == "مسدود":
                status_item.setBackground(QColor("#dc2626"))
                status_item.setForeground(QColor("#ffffff"))
                status_item.setText("🔒 مسدود")
            elif app.status == "فعال":
                status_item.setBackground(QColor("#3b82f6"))
                status_item.setForeground(QColor("#ffffff"))
            self.table.setItem(i, 1, status_item)
            
            self.table.setItem(i, 2, QTableWidgetItem(app.time or ""))
            self.table.setItem(i, 3, QTableWidgetItem(name))
            self.table.setItem(i, 4, QTableWidgetItem(app.phone or ""))
            self.table.setItem(i, 5, QTableWidgetItem(app.nat_id or ""))
            
            session_item = QTableWidgetItem(str(session_count))
            color = self.get_session_color(session_count)
            if color:
                session_item.setBackground(color)
            self.table.setItem(i, 6, session_item)
            
            self.table.setItem(i, 7, QTableWidgetItem(str(self.to_int(app.cost))))
            self.table.setItem(i, 8, QTableWidgetItem(str(self.to_int(app.discount))))
            self.table.setItem(i, 9, QTableWidgetItem(str(self.to_int(app.final_cost))))
            self.table.setItem(i, 10, QTableWidgetItem(app.pay_status or ""))
            self.table.setItem(i, 11, QTableWidgetItem(app.subject or ""))
            self.table.setItem(i, 12, QTableWidgetItem(app.type or ""))
            self.table.setItem(i, 13, QTableWidgetItem(app.desc or ""))
            self.table.item(i, 0).setData(Qt.UserRole, app.id)
    
    def add_appointment(self):
        QMessageBox.information(self, "توجه", "لطفاً از دکمه '➕ ثبت نوبت جدید' استفاده کنید")
    
    def edit_appointment(self):
        if not self.selected_appt_id:
            QMessageBox.warning(self, 'خطا', 'لطفاً یک نوبت را انتخاب کنید')
            return
        
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if not app:
            return
        
        msg = QMessageBox(self)
        msg.setWindowTitle('توجه')
        msg.setText("⚠️ اطلاعات مراجع (نام، کد ملی، تلفن، جنسیت، همسر) فقط از طریق تب مدیریت مراجعین قابل ویرایش است.\n\nدر این پنجره فقط می‌توانید اطلاعات نوبت (استاد، ساعت، هزینه و ...) را تغییر دهید.\n\nآیا ادامه می‌دهید؟")
        msg.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        msg.button(QMessageBox.Yes).setText('بله، ادامه')
        msg.button(QMessageBox.No).setText('خیر، انصراف')
        if msg.exec() != QMessageBox.Yes:
            return
        
        dialog = NewAppointmentDialog(self, self.current_date, self.session)
        dialog.setWindowTitle("✏️ ویرایش نوبت (فقط اطلاعات نوبت)")
        dialog.btn_save.setText("✅ ذخیره تغییرات")
        
        dialog.cb_doctor.setCurrentText(app.doctor or '')
        dialog.cb_shift.setCurrentText(app.shift or '')
        dialog.cb_time.setCurrentText(app.time or '')
        dialog.le_patient.setText(app.patient_name or '')
        dialog.le_nat_id.setText(app.nat_id or '')
        dialog.le_phone.setText(app.phone or '')
        dialog.cb_gender.setCurrentText(app.gender or 'مرد')
        dialog.cb_subject.setCurrentText(app.subject or '')
        dialog.cb_type.setCurrentText(app.type or '')
        dialog.le_desc.setText(app.desc or '')
        dialog.le_cost.setText(str(dialog.to_int(app.cost)))
        dialog.le_discount.setText(str(dialog.to_int(app.discount)))
        dialog.cb_pay_status.setCurrentText(app.pay_status or 'بدهکار')
        share = app.doc_share.replace('%', '') if app.doc_share else '60'
        dialog.le_doc_share.setText(share)
        dialog.chk_free.setChecked(int(app.is_free or 0) == 1)
        
        if app.patient2_name:
            dialog.le_p2_name.setText(app.patient2_name)
            dialog.le_p2_nat_id.setText(app.patient2_nat_id or '')
            dialog.le_p2_phone.setText(app.patient2_phone or '')
        
        dialog.calc_final()
        dialog.update_center_share()
        dialog.toggle_patient2(app.subject)
        
        dialog.le_patient.setReadOnly(True)
        dialog.le_patient.setEnabled(False)
        dialog.le_nat_id.setReadOnly(True)
        dialog.le_nat_id.setEnabled(False)
        dialog.le_phone.setReadOnly(True)
        dialog.le_phone.setEnabled(False)
        dialog.cb_gender.setEnabled(False)
        dialog.le_p2_name.setReadOnly(True)
        dialog.le_p2_name.setEnabled(False)
        dialog.le_p2_nat_id.setReadOnly(True)
        dialog.le_p2_nat_id.setEnabled(False)
        dialog.le_p2_phone.setReadOnly(True)
        dialog.le_p2_phone.setEnabled(False)
        dialog.cb_p2_gender.setEnabled(False)
        
        dialog.le_patient.setCompleter(None)
        dialog.le_nat_id.setCompleter(None)
        dialog.le_phone.setCompleter(None)
        dialog.le_p2_name.setCompleter(None)
        dialog.le_p2_nat_id.setCompleter(None)
        dialog.le_p2_phone.setCompleter(None)
        
        readonly_style = '''
            QLineEdit {
                background-color: #f1f5f9;
                color: #64748b;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 5px;
            }
        '''
        dialog.le_patient.setStyleSheet(readonly_style)
        dialog.le_nat_id.setStyleSheet(readonly_style)
        dialog.le_phone.setStyleSheet(readonly_style)
        dialog.le_p2_name.setStyleSheet(readonly_style)
        dialog.le_p2_nat_id.setStyleSheet(readonly_style)
        dialog.le_p2_phone.setStyleSheet(readonly_style)
        
        def on_edit_save():
            try:
                app.doctor = dialog.cb_doctor.currentText()
                app.shift = dialog.cb_shift.currentText()
                app.time = dialog.cb_time.currentText()
                app.type = dialog.cb_type.currentText()
                app.subject = dialog.cb_subject.currentText()
                app.desc = dialog.le_desc.text().strip()
                
                if dialog.chk_free.isChecked():
                    app.cost = 0
                    app.discount = 0
                    app.final_cost = 0
                    app.pay_status = 'تسویه'
                    app.is_free = 1
                else:
                    cost_text = dialog.le_cost.text().replace(',', '')
                    if not cost_text or int(cost_text) == 0:
                        QMessageBox.warning(dialog, 'خطا', 'لطفاً مبلغ هزینه را وارد کنید')
                        return
                    app.cost = int(cost_text)
                    app.discount = int(dialog.le_discount.text().replace(',', '') or 0)
                    app.final_cost = max(0, app.cost - app.discount)
                    app.pay_status = dialog.cb_pay_status.currentText()
                    app.is_free = 0
                
                app.ref_type = dialog.cb_ref_type.currentText()
                app.ref_model = dialog.cb_ref_model.currentText()
                share = dialog.to_int(dialog.le_doc_share.text())
                share = max(0, min(100, share))
                app.doc_share = f'{share}%'
                app.center_share = f'{100 - share}%'
                
                self.session.commit()
                
                self.load_appointments()
                self.update_patient_lists()
                self.data_changed.emit()
                QMessageBox.information(self, 'موفق', 'نوبت با موفقیت ویرایش شد')
                dialog.accept()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, 'خطا', f'خطا در ویرایش:\n{str(e)}')
        
        dialog.btn_save.clicked.disconnect()
        dialog.btn_save.clicked.connect(on_edit_save)
        dialog.exec()
    
    def delete_appointment(self):
        if not self.selected_appt_id:
            return
        msg = QMessageBox(self)
        msg.setWindowTitle("تایید حذف")
        msg.setText("آیا از حذف کامل این نوبت اطمینان دارید؟")
        msg.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        msg.button(QMessageBox.Yes).setText("بله")
        msg.button(QMessageBox.No).setText("خیر")
        if msg.exec() == QMessageBox.Yes:
            app = self.session.query(Appointment).get(self.selected_appt_id)
            if app:
                self.session.delete(app)
                self.session.commit()
                self.load_appointments()
                self.clear_form()
                self.data_changed.emit()
    
    def mark_done(self):
        if not self.selected_appt_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک نوبت را انتخاب کنید")
            return
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if app and app.status == "فعال":
            app.status = "انجام شده"
            self.session.commit()
            self.load_appointments()
            self.data_changed.emit()
            QMessageBox.information(self, "موفق", "وضعیت نوبت به انجام شده تغییر یافت")
    
    def reactivate_appointment(self):
        if not self.selected_appt_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک نوبت را انتخاب کنید")
            return
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if app and app.status in ["کنسل استاد", "کنسل مراجع", "انجام شده", "مسدود"]:
            if app.status == "مسدود" and app.nat_id and self.is_patient_blocked(app.nat_id):
                QMessageBox.warning(self, "خطا", "❌ امکان فعال کردن نوبت وجود ندارد. مراجع مسدود می‌باشد.")
                return
            app.status = "فعال"
            self.session.commit()
            self.load_appointments()
            self.data_changed.emit()
            QMessageBox.information(self, "موفق", "نوبت با موفقیت فعال شد")
    
    def cancel_appointment(self, status):
        if not self.selected_appt_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک نوبت را انتخاب کنید")
            return
        app = self.session.query(Appointment).get(self.selected_appt_id)
        if app and app.status == "فعال":
            app.status = status
            self.session.commit()
            self.load_appointments()
            self.data_changed.emit()
            QMessageBox.information(self, "موفق", f"نوبت با وضعیت {status} ثبت شد")
    
    def open_new_appointment_dialog(self):
        def on_appointment_saved():
            self.load_appointments()
            self.update_patient_lists()
            self.update_doctor_list()
            self.data_changed.emit()
        dialog = NewAppointmentDialog(
            self, 
            self.current_date, 
            self.session,
            lambda: (self.update_patient_lists(), self.update_doctor_list())
        )
        dialog.appointment_saved.connect(on_appointment_saved)
        dialog.exec()
    
    def clear_form(self):
        self.selected_appt_id = None
        self.update_button_states()
    
    def on_select_row(self):
        rows = self.table.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_appt_id = self.table.item(row, 0).data(Qt.UserRole)
        else:
            self.selected_appt_id = None
        self.update_button_states()
    
    def toggle_patient2(self, subject=None):
        if subject is None and hasattr(self, 'cb_subject'):
            subject = self.cb_subject.currentText()
        subj_obj = self.session.query(Subject).filter(Subject.name == subject).first()
        is_couple = subj_obj.is_couple == 1 if subj_obj else False
        if hasattr(self, 'frame_p2'):
            self.frame_p2.setVisible(is_couple)
    
    def calc_final(self):
        if hasattr(self, 'le_cost') and hasattr(self, 'le_discount') and hasattr(self, 'lbl_final'):
            cost = self.to_int(self.le_cost.text())
            disc = self.to_int(self.le_discount.text())
            final = max(0, cost - disc)
            self.lbl_final.setText(f"مبلغ نهایی: {final:,}")
    
    def update_center_share(self):
        if hasattr(self, 'le_doc_share') and hasattr(self, 'lbl_center_share'):
            share = self.to_int(self.le_doc_share.text())
            share = max(0, min(100, share))
            self.lbl_center_share.setText(f"سهم مرکز: {100 - share}%")
    
    def on_free_toggle(self):
        if hasattr(self, 'chk_free'):
            free = self.chk_free.isChecked()
            if hasattr(self, 'le_cost'):
                self.le_cost.setEnabled(not free)
            if hasattr(self, 'le_discount'):
                self.le_discount.setEnabled(not free)
            if hasattr(self, 'cb_pay_status'):
                self.cb_pay_status.setEnabled(not free)
            if free and hasattr(self, 'cb_pay_status'):
                self.cb_pay_status.setCurrentText("تسویه")
    
    def search_table(self, text):
        for row in range(self.table.rowCount()):
            hide = True
            for col in range(self.table.columnCount()):
                item = self.table.item(row, col)
                if item and text.lower() in item.text().lower():
                    hide = False
                    break
            self.table.setRowHidden(row, hide)
    
    def update_attendance_panel(self):
        for i in reversed(range(self.att_layout.count())):
            w = self.att_layout.itemAt(i).widget()
            if w:
                w.deleteLater()
        weekday_names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        today_name = weekday_names[self.current_date.weekday()]
        date_str = self.current_date.strftime("%Y/%m/%d")
        doctors = self.session.query(Doctor).all()
        for doc in doctors:
            working_days = doc.working_days or ""
            days_list = [d.strip() for d in working_days.split(",")] if working_days else []
            if today_name not in days_list and "همه روزه" not in days_list:
                continue
            container = QWidget()
            container.setStyleSheet("QWidget { background-color: #f1f5f9; border-radius: 8px; }")
            container.setMinimumHeight(45)
            container.setMinimumWidth(80)
            container.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Fixed)
            vbox = QVBoxLayout(container)
            vbox.setContentsMargins(5, 5, 5, 5)
            vbox.setSpacing(3)
            lbl_name = QLabel(doc.name)
            lbl_name.setAlignment(Qt.AlignCenter)
            lbl_name.setStyleSheet("font-weight: bold; font-size: 11px;")
            lbl_name.setWordWrap(False)
            vbox.addWidget(lbl_name)
            btn = QPushButton("✅ حضور")
            btn.setCheckable(True)
            btn.setFixedHeight(22)
            att = self.session.query(DoctorAttendance).filter(
                DoctorAttendance.doctor_name == doc.name,
                DoctorAttendance.date == date_str
            ).first()
            if att and att.status == "غایب":
                btn.setText("❌ عدم حضور")
                btn.setChecked(True)
                btn.setStyleSheet("background-color: #ef4444; color: white; font-size: 10px;")
            else:
                btn.setStyleSheet("background-color: #10b981; color: white; font-size: 10px;")
            btn.toggled.connect(lambda checked, d=doc.name: self.toggle_attendance(d, checked, date_str))
            vbox.addWidget(btn)
            self.att_layout.addWidget(container)
    
    def toggle_attendance(self, doc_name, checked, date_str):
        att = self.session.query(DoctorAttendance).filter(
            DoctorAttendance.doctor_name == doc_name,
            DoctorAttendance.date == date_str
        ).first()
        if not att:
            att = DoctorAttendance(doctor_name=doc_name, date=date_str)
            self.session.add(att)
        att.status = "غایب" if checked else "حاضر"
        self.session.commit()
        if checked:
            apps = self.session.query(Appointment).filter(
                Appointment.date == date_str,
                Appointment.doctor == doc_name,
                Appointment.status == "فعال"
            ).all()
            for a in apps:
                a.status = "کنسل استاد"
        else:
            apps = self.session.query(Appointment).filter(
                Appointment.date == date_str,
                Appointment.doctor == doc_name,
                Appointment.status == "کنسل استاد"
            ).all()
            for a in apps:
                a.status = "فعال"
        self.session.commit()
        self.load_appointments()
        self.update_attendance_panel()
        self.data_changed.emit()
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
