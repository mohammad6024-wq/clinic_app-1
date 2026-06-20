"""
پنجره جداگانه ثبت نوبت جدید
"""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QCheckBox, QFrame, QMessageBox, QGroupBox, QGridLayout,
    QCompleter, QApplication, QScrollArea, QWidget
)
from PySide6.QtCore import Qt, Signal, QStringListModel
from database.engine import SessionLocal
from database.models import Appointment, Doctor, Patient, Subject, Shift, DoctorAttendance
import jdatetime

class NewAppointmentDialog(QDialog):
    appointment_saved = Signal()
    
    def __init__(self, parent=None, current_date=None, session=None, update_patient_lists_callback=None):
        super().__init__(parent)
        self.parent = parent
        self.session = session or SessionLocal()
        self.current_date = current_date or jdatetime.date.today()
        self.update_patient_lists_callback = update_patient_lists_callback
        
        self.setWindowTitle("📝 ثبت نوبت جدید")
        self.setModal(True)
        self.resize(950, 750)
        self.setMinimumSize(800, 600)
        self.setLayoutDirection(Qt.RightToLeft)
        
        flags = self.windowFlags()
        self.setWindowFlags(flags | Qt.WindowMaximizeButtonHint | Qt.WindowCloseButtonHint)
        
        self.setup_ui()
        self.load_initial_data()
        self.setup_autocomplete()
        self.on_free_toggle()
        self.showMaximized()
    
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(15)
        main_layout.setContentsMargins(15, 15, 15, 15)
        
        header = QLabel("📝 ثبت نوبت جدید - مرکز مشاوره آرامش")
        header.setStyleSheet("font-size: 18px; font-weight: bold; color: white; background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #1e3a5f, stop:1 #2563eb); padding: 15px; border-radius: 12px;")
        header.setAlignment(Qt.AlignCenter)
        main_layout.addWidget(header)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(12)
        
        form_frame = QFrame()
        form_frame.setStyleSheet("QFrame { background-color: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0; }")
        form_layout = QVBoxLayout(form_frame)
        form_layout.setSpacing(12)
        
        row1 = QHBoxLayout()
        row1.setSpacing(10)
        row1.addWidget(QLabel("استاد:"))
        self.cb_doctor = QComboBox()
        self.cb_doctor.setEditable(True)
        self.cb_doctor.setMinimumWidth(160)
        row1.addWidget(self.cb_doctor)
        
        self.chk_all_doctors = QCheckBox("همه اساتید")
        row1.addWidget(self.chk_all_doctors)
        
        row1.addWidget(QLabel("شیفت:"))
        self.cb_shift = QComboBox()
        self.cb_shift.setMinimumWidth(100)
        row1.addWidget(self.cb_shift)
        
        row1.addWidget(QLabel("ساعت:"))
        self.cb_time = QComboBox()
        self.cb_time.setMinimumWidth(80)
        row1.addWidget(self.cb_time)
        
        row1.addWidget(QLabel("موضوع:"))
        self.cb_subject = QComboBox()
        self.cb_subject.setMinimumWidth(130)
        row1.addWidget(self.cb_subject)
        
        row1.addWidget(QLabel("نوع:"))
        self.cb_type = QComboBox()
        self.cb_type.addItems(["حضوری", "تلفنی", "آنلاین"])
        self.cb_type.setMinimumWidth(80)
        row1.addWidget(self.cb_type)
        form_layout.addLayout(row1)
        
        row2 = QHBoxLayout()
        row2.setSpacing(10)
        row2.addWidget(QLabel("مراجع:"))
        self.le_patient = QLineEdit()
        self.le_patient.setMinimumWidth(160)
        row2.addWidget(self.le_patient)
        
        row2.addWidget(QLabel("کد ملی:"))
        self.le_nat_id = QLineEdit()
        self.le_nat_id.setMinimumWidth(120)
        row2.addWidget(self.le_nat_id)
        
        row2.addWidget(QLabel("تلفن:"))
        self.le_phone = QLineEdit()
        self.le_phone.setMinimumWidth(120)
        row2.addWidget(self.le_phone)
        
        row2.addWidget(QLabel("جنسیت:"))
        self.cb_gender = QComboBox()
        self.cb_gender.addItems(["مرد", "زن"])
        self.cb_gender.setMinimumWidth(70)
        row2.addWidget(self.cb_gender)
        form_layout.addLayout(row2)
        
        self.frame_p2 = QFrame()
        p2_layout = QHBoxLayout(self.frame_p2)
        p2_layout.setSpacing(10)
        p2_layout.addWidget(QLabel("همسر:"))
        self.le_p2_name = QLineEdit()
        self.le_p2_name.setMinimumWidth(150)
        p2_layout.addWidget(self.le_p2_name)
        p2_layout.addWidget(QLabel("کد ملی:"))
        self.le_p2_nat_id = QLineEdit()
        self.le_p2_nat_id.setMinimumWidth(120)
        p2_layout.addWidget(self.le_p2_nat_id)
        p2_layout.addWidget(QLabel("تلفن:"))
        self.le_p2_phone = QLineEdit()
        self.le_p2_phone.setMinimumWidth(120)
        p2_layout.addWidget(self.le_p2_phone)
        p2_layout.addWidget(QLabel("جنسیت:"))
        self.cb_p2_gender = QComboBox()
        self.cb_p2_gender.addItems(["زن", "مرد"])
        self.cb_p2_gender.setMinimumWidth(70)
        p2_layout.addWidget(self.cb_p2_gender)
        self.frame_p2.hide()
        form_layout.addWidget(self.frame_p2)
        
        row3 = QHBoxLayout()
        row3.setSpacing(10)
        row3.addWidget(QLabel("توضیحات:"))
        self.le_desc = QLineEdit()
        self.le_desc.setMinimumWidth(300)
        row3.addWidget(self.le_desc)
        form_layout.addLayout(row3)
        
        row4 = QHBoxLayout()
        row4.setSpacing(10)
        self.chk_free = QCheckBox("رایگان")
        self.chk_free.setChecked(True)
        self.chk_free.toggled.connect(self.on_free_toggle)
        row4.addWidget(self.chk_free)
        
        row4.addWidget(QLabel("هزینه:"))
        self.le_cost = QLineEdit()
        self.le_cost.setPlaceholderText("0")
        self.le_cost.setMaximumWidth(100)
        self.le_cost.textChanged.connect(self.calc_final)
        row4.addWidget(self.le_cost)
        
        row4.addWidget(QLabel("تخفیف:"))
        self.le_discount = QLineEdit()
        self.le_discount.setPlaceholderText("0")
        self.le_discount.setMaximumWidth(100)
        self.le_discount.textChanged.connect(self.calc_final)
        row4.addWidget(self.le_discount)
        
        self.lbl_final = QLabel("مبلغ نهایی: 0")
        self.lbl_final.setStyleSheet("font-weight: bold; color: #10b981; font-size: 13px;")
        row4.addWidget(self.lbl_final)
        
        row4.addWidget(QLabel("وضعیت:"))
        self.cb_pay_status = QComboBox()
        self.cb_pay_status.addItems(["بدهکار", "تسویه", "کیف پول"])
        self.cb_pay_status.setMinimumWidth(90)
        row4.addWidget(self.cb_pay_status)
        form_layout.addLayout(row4)
        
        row5 = QHBoxLayout()
        row5.setSpacing(10)
        row5.addWidget(QLabel("ارجاع:"))
        self.cb_ref_type = QComboBox()
        self.cb_ref_type.addItems(["آزاد", "حوزه", "امداد", "بهزیستی"])
        self.cb_ref_type.setMinimumWidth(120)
        row5.addWidget(self.cb_ref_type)
        
        row5.addWidget(QLabel("مدل:"))
        self.cb_ref_model = QComboBox()
        self.cb_ref_model.addItems(["مرکز به استاد", "استاد به مرکز"])
        self.cb_ref_model.setMinimumWidth(150)
        row5.addWidget(self.cb_ref_model)
        
        row5.addWidget(QLabel("سهم استاد:"))
        self.le_doc_share = QLineEdit()
        self.le_doc_share.setPlaceholderText("60")
        self.le_doc_share.setMaximumWidth(80)
        self.le_doc_share.textChanged.connect(self.update_center_share)
        row5.addWidget(self.le_doc_share)
        self.le_doc_share.setText("60")
        
        self.lbl_center_share = QLabel("سهم مرکز: 40%")
        self.lbl_center_share.setStyleSheet("font-weight: bold; color: #3b82f6; font-size: 12px;")
        row5.addWidget(self.lbl_center_share)
        
        row5.addStretch()
        form_layout.addLayout(row5)
        
        scroll_layout.addWidget(form_frame)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.btn_save = QPushButton("✅ ثبت نوبت")
        self.btn_save.setStyleSheet("background: #10b981; color: white; padding: 10px 30px; border-radius: 10px; font-weight: bold; font-size: 14px;")
        self.btn_save.clicked.connect(self.add_appointment)
        btn_layout.addWidget(self.btn_save)
        
        self.btn_cancel = QPushButton("❌ انصراف")
        self.btn_cancel.setStyleSheet("background: #ef4444; color: white; padding: 10px 30px; border-radius: 10px; font-weight: bold; font-size: 14px;")
        self.btn_cancel.clicked.connect(self.reject)
        btn_layout.addWidget(self.btn_cancel)
        
        btn_layout.addStretch()
        scroll_layout.addLayout(btn_layout)
        
        scroll.setWidget(scroll_content)
        main_layout.addWidget(scroll)
        
        self.cb_subject.currentTextChanged.connect(self.toggle_patient2)
        self.cb_shift.currentTextChanged.connect(self.update_time_combo)
        self.chk_all_doctors.toggled.connect(self.on_all_doctors_toggle)
        
        self.le_patient.textChanged.connect(self.on_patient_name_changed)
        self.le_nat_id.textChanged.connect(self.on_nat_id_changed)
        self.le_phone.textChanged.connect(self.on_phone_changed)
        
        self.le_p2_name.textChanged.connect(self.on_p2_name_changed)
        self.le_p2_nat_id.textChanged.connect(self.on_p2_nat_id_changed)
        self.le_p2_phone.textChanged.connect(self.on_p2_phone_changed)
    
    def setup_autocomplete(self):
        patients = self.session.query(Patient).all()
        patient_names = [p.name for p in patients if p.name]
        patient_nat_ids = [p.nat_id for p in patients if p.nat_id]
        patient_phones = [p.phone for p in patients if p.phone]
        
        self.patient_completer = QCompleter(patient_names)
        self.patient_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.patient_completer.setFilterMode(Qt.MatchContains)
        self.le_patient.setCompleter(self.patient_completer)
        
        self.natid_completer = QCompleter(patient_nat_ids)
        self.natid_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_nat_id.setCompleter(self.natid_completer)
        
        self.phone_completer = QCompleter(patient_phones)
        self.phone_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_phone.setCompleter(self.phone_completer)
        
        self.p2_completer = QCompleter(patient_names)
        self.p2_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.p2_completer.setFilterMode(Qt.MatchContains)
        self.le_p2_name.setCompleter(self.p2_completer)
        
        self.p2_natid_completer = QCompleter(patient_nat_ids)
        self.p2_natid_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_p2_nat_id.setCompleter(self.p2_natid_completer)
        
        self.p2_phone_completer = QCompleter(patient_phones)
        self.p2_phone_completer.setCaseSensitivity(Qt.CaseInsensitive)
        self.le_p2_phone.setCompleter(self.p2_phone_completer)
        
        self.patient_completer.activated.connect(self.on_patient_selected)
        self.natid_completer.activated.connect(self.on_natid_selected)
        self.phone_completer.activated.connect(self.on_phone_selected)
        
        self.p2_completer.activated.connect(self.on_p2_selected)
        self.p2_natid_completer.activated.connect(self.on_p2_natid_selected)
        self.p2_phone_completer.activated.connect(self.on_p2_phone_selected)
    
    def on_patient_name_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.name == text).first()
            if patient:
                self.fill_patient_data(patient)
    
    def on_nat_id_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.nat_id == text).first()
            if patient:
                self.fill_patient_data(patient)
    
    def on_phone_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.phone == text).first()
            if patient:
                self.fill_patient_data(patient)
    
    def on_patient_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.name == text).first()
        if patient:
            self.fill_patient_data(patient)
    
    def on_natid_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.nat_id == text).first()
        if patient:
            self.fill_patient_data(patient)
    
    def on_phone_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.phone == text).first()
        if patient:
            self.fill_patient_data(patient)
    
    def on_p2_name_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.name == text).first()
            if patient:
                self.fill_p2_data(patient)
    
    def on_p2_nat_id_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.nat_id == text).first()
            if patient:
                self.fill_p2_data(patient)
    
    def on_p2_phone_changed(self, text):
        if text:
            patient = self.session.query(Patient).filter(Patient.phone == text).first()
            if patient:
                self.fill_p2_data(patient)
    
    def on_p2_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.name == text).first()
        if patient:
            self.fill_p2_data(patient)
    
    def on_p2_natid_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.nat_id == text).first()
        if patient:
            self.fill_p2_data(patient)
    
    def on_p2_phone_selected(self, text):
        patient = self.session.query(Patient).filter(Patient.phone == text).first()
        if patient:
            self.fill_p2_data(patient)
    
    def fill_patient_data(self, patient):
        self.le_patient.setText(patient.name or "")
        self.le_nat_id.setText(patient.nat_id or "")
        self.le_phone.setText(patient.phone or "")
        if patient.gender:
            self.cb_gender.setCurrentText(patient.gender)
    
    def fill_p2_data(self, patient):
        self.le_p2_name.setText(patient.name or "")
        self.le_p2_nat_id.setText(patient.nat_id or "")
        self.le_p2_phone.setText(patient.phone or "")
        if patient.gender:
            self.cb_p2_gender.setCurrentText(patient.gender)
    
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
    
    def load_initial_data(self):
        self.load_doctors_combo()
        shifts = self.session.query(Shift).all()
        self.cb_shift.clear()
        for shift in shifts:
            self.cb_shift.addItem(shift.name)
        self.load_subjects_to_combo()
    
    def load_doctors_combo(self):
        weekday_names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        today_name = weekday_names[self.current_date.weekday()]
        doctors = self.session.query(Doctor).all()
        self.cb_doctor.clear()
        for doc in doctors:
            working_days = doc.working_days or ""
            days_list = [d.strip() for d in working_days.split(",")] if working_days else []
            if today_name in days_list or "همه روزه" in days_list:
                self.cb_doctor.addItem(doc.name)
    
    def on_all_doctors_toggle(self):
        if self.chk_all_doctors.isChecked():
            doctors = self.session.query(Doctor).all()
            self.cb_doctor.clear()
            for doc in doctors:
                self.cb_doctor.addItem(doc.name)
        else:
            self.load_doctors_combo()
    
    def load_subjects_to_combo(self):
        subjects = self.session.query(Subject).all()
        self.cb_subject.clear()
        for subj in subjects:
            self.cb_subject.addItem(subj.name)
        if subjects:
            self.cb_subject.setCurrentIndex(0)
            self.toggle_patient2(subjects[0].name)
    
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
    
    def toggle_patient2(self, subject=None):
        if subject is None:
            subject = self.cb_subject.currentText()
        subj_obj = self.session.query(Subject).filter(Subject.name == subject).first()
        is_couple = subj_obj.is_couple == 1 if subj_obj else False
        self.frame_p2.setVisible(is_couple)
    
    def on_free_toggle(self):
        free = self.chk_free.isChecked()
        self.le_cost.setEnabled(not free)
        self.le_discount.setEnabled(not free)
        self.cb_pay_status.setEnabled(not free)
        if free:
            self.cb_pay_status.setCurrentText("تسویه")
        else:
            self.le_cost.setFocus()
    
    def calc_final(self):
        cost = self.to_int(self.le_cost.text())
        disc = self.to_int(self.le_discount.text())
        final = max(0, cost - disc)
        self.lbl_final.setText(f"مبلغ نهایی: {final:,}")
    
    def update_center_share(self):
        share = self.to_int(self.le_doc_share.text())
        share = max(0, min(100, share))
        # self.lbl_center_share.setText(f"سهم مرکز: {100 - share}%")
    
    def validate_nat_id(self, nat_id):
        if not nat_id:
            return True
        return len(nat_id) == 10 and nat_id.isdigit()
    
    def validate_phone(self, phone):
        if not phone:
            return True
        digits = ''.join(filter(str.isdigit, phone))
        return len(digits) == 11
    
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
    
    # ========== تغییر: متد add_appointment با بررسی مسدود بودن مراجع ==========
    def add_appointment(self):
        try:
            # بررسی مسدود بودن مراجع اصلی
            nat_id = self.le_nat_id.text().strip()
            if nat_id:
                patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
                if patient and patient.is_blocked == 1:
                    QMessageBox.warning(self, "خطا", f"❌ امکان ثبت نوبت برای مراجع '{patient.name}' وجود ندارد. این مراجع مسدود شده است.")
                    return
            
            # بررسی مسدود بودن همسر (در صورت وجود)
            if self.frame_p2.isVisible():
                p2_nat_id = self.le_p2_nat_id.text().strip()
                if p2_nat_id:
                    p2_patient = self.session.query(Patient).filter(Patient.nat_id == p2_nat_id).first()
                    if p2_patient and p2_patient.is_blocked == 1:
                        QMessageBox.warning(self, "خطا", f"❌ امکان ثبت نوبت برای همسر '{p2_patient.name}' وجود ندارد. این مراجع مسدود شده است.")
                        return
            
            # ادامه کد اصلی بدون تغییر
            if not self.cb_doctor.currentText():
                QMessageBox.warning(self, "خطا", "استاد را انتخاب کنید")
                return
            if not self.le_patient.text().strip():
                QMessageBox.warning(self, "خطا", "نام مراجع را وارد کنید")
                return
            
            nat_id = self.le_nat_id.text().strip()
            if not self.validate_nat_id(nat_id):
                QMessageBox.warning(self, "خطا", "کد ملی باید ۱۰ رقم باشد")
                return
            
            phone = self.le_phone.text().strip()
            if not self.validate_phone(phone):
                QMessageBox.warning(self, "خطا", "شماره تلفن باید ۱۱ رقم باشد")
                return
            
            date_str = self.current_date.strftime("%Y/%m/%d")
            existing = self.session.query(Appointment).filter(
                Appointment.date == date_str,
                Appointment.doctor == self.cb_doctor.currentText(),
                Appointment.time == self.cb_time.currentText(),
                Appointment.status == "فعال"
            ).first()
            if existing:
                QMessageBox.warning(self, "خطا", "این ساعت برای این استاد قبلاً پر شده است")
                return
            
            att = self.session.query(DoctorAttendance).filter(
                DoctorAttendance.doctor_name == self.cb_doctor.currentText(),
                DoctorAttendance.date == date_str
            ).first()
            if att and att.status == "غایب":
                QMessageBox.warning(self, "خطا", f"استاد {self.cb_doctor.currentText()} در این روز غایب است")
                return
            
            if self.frame_p2.isVisible():
                p2_name = self.le_p2_name.text().strip()
                if not p2_name:
                    QMessageBox.warning(self, "خطا", "برای مشاوره زوجی، نام همسر الزامی است")
                    return
                p2_nat_id = self.le_p2_nat_id.text().strip()
                if not p2_nat_id:
                    QMessageBox.warning(self, "خطا", "کد ملی همسر الزامی است")
                    return
                if not self.validate_nat_id(p2_nat_id):
                    QMessageBox.warning(self, "خطا", "کد ملی همسر باید ۱۰ رقم باشد")
                    return
                p2_phone = self.le_p2_phone.text().strip()
                if not p2_phone:
                    QMessageBox.warning(self, "خطا", "شماره تلفن همسر الزامی است")
                    return
                if not self.validate_phone(p2_phone):
                    QMessageBox.warning(self, "خطا", "شماره تلفن همسر باید ۱۱ رقم باشد")
                    return
            
            app = Appointment()
            app.date = date_str
            app.doctor = self.cb_doctor.currentText()
            app.shift = self.cb_shift.currentText()
            app.time = self.cb_time.currentText()
            app.patient_name = self.le_patient.text().strip()
            app.nat_id = nat_id
            app.phone = phone
            app.gender = self.cb_gender.currentText()
            app.type = self.cb_type.currentText()
            app.subject = self.cb_subject.currentText()
            app.desc = self.le_desc.text().strip()
            
            if self.chk_free.isChecked():
                app.cost = 0
                app.discount = 0
                app.final_cost = 0
                app.pay_status = "تسویه"
                app.is_free = 1
            else:
                cost_text = self.le_cost.text().replace(",", "")
                if not cost_text or int(cost_text) == 0:
                    QMessageBox.warning(self, "خطا", "لطفاً مبلغ هزینه را وارد کنید")
                    return
                app.cost = int(cost_text)
                app.discount = int(self.le_discount.text().replace(",", "") or 0)
                app.final_cost = max(0, app.cost - app.discount)
                app.pay_status = self.cb_pay_status.currentText()
                app.is_free = 0
            
            app.ref_type = self.cb_ref_type.currentText()
            app.ref_model = self.cb_ref_model.currentText()
            share = self.to_int(self.le_doc_share.text())
            share = max(0, min(100, share))
            app.doc_share = f"{share}%"
            app.center_share = f"{100 - share}%"
            app.status = "فعال"
            
            if self.frame_p2.isVisible():
                app.patient2_name = self.le_p2_name.text().strip()
                app.patient2_nat_id = self.le_p2_nat_id.text().strip()
                app.patient2_phone = self.le_p2_phone.text().strip()
            
            self.session.add(app)
            self.session.commit()
            
            existing_patient = self.session.query(Patient).filter(Patient.nat_id == app.nat_id).first()
            if not existing_patient:
                self.sync_patient_to_db(app.patient_name, app.nat_id, app.phone, app.gender, app.type)
            
            if app.patient2_name:
                self.sync_patient_to_db(app.patient2_name, app.patient2_nat_id, app.patient2_phone, self.cb_p2_gender.currentText(), app.type)
            
            QMessageBox.information(self, "موفق", "نوبت با موفقیت ثبت شد")
            self.appointment_saved.emit()
            
            if self.update_patient_lists_callback:
                self.update_patient_lists_callback()
            
            self.accept()
            
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ثبت نوبت:\n{str(e)}")
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
