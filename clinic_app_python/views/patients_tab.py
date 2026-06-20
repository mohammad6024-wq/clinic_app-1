from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QTableWidget, QTableWidgetItem, QMessageBox, QMenu,
    QHeaderView, QAbstractItemView, QGroupBox, QTextEdit, QDialog
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QAction, QColor
from database.engine import SessionLocal
from database.models import Patient, Appointment

class PatientsTab(QWidget):
    data_changed = Signal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.selected_patient_id = None
        self.session_warning_enabled = True
        self.setup_ui()
        self.load_patients()
        
        if parent and hasattr(parent, 'dashboard_tab'):
            parent.dashboard_tab.data_changed.connect(self.load_patients)

    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        
        form_group = QGroupBox("اطلاعات مراجع")
        form_layout = QVBoxLayout(form_group)
        
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("نام مراجع:"))
        self.le_pat_name = QLineEdit()
        self.le_pat_name.setMinimumWidth(150)
        row1.addWidget(self.le_pat_name)
        
        row1.addWidget(QLabel("کد ملی:"))
        self.le_pat_nat_id = QLineEdit()
        self.le_pat_nat_id.setMinimumWidth(120)
        row1.addWidget(self.le_pat_nat_id)
        
        row1.addWidget(QLabel("تلفن:"))
        self.le_pat_phone = QLineEdit()
        self.le_pat_phone.setMinimumWidth(120)
        row1.addWidget(self.le_pat_phone)
        
        row1.addWidget(QLabel("جنسیت:"))
        self.cb_pat_gender = QComboBox()
        self.cb_pat_gender.addItems(["", "مرد", "زن"])
        self.cb_pat_gender.setMinimumWidth(80)
        row1.addWidget(self.cb_pat_gender)
        form_layout.addLayout(row1)
        
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("نوع مراجع:"))
        self.cb_pat_type = QComboBox()
        self.cb_pat_type.addItems(["", "حضوری", "آنلاین", "تلفنی"])
        self.cb_pat_type.setMinimumWidth(100)
        row2.addWidget(self.cb_pat_type)
        
        row2.addWidget(QLabel("وضعیت:"))
        self.cb_block_status = QComboBox()
        self.cb_block_status.addItems(["فعال", "مسدود"])
        self.cb_block_status.setMinimumWidth(80)
        row2.addWidget(self.cb_block_status)
        
        row2.addWidget(QLabel("توضیحات:"))
        self.le_pat_desc = QLineEdit()
        self.le_pat_desc.setMinimumWidth(250)
        row2.addWidget(self.le_pat_desc)
        form_layout.addLayout(row2)
        
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(5)
        
        self.btn_save = QPushButton("ثبت مراجع")
        self.btn_save.setProperty("success", True)
        self.btn_save.setFixedHeight(30)
        btn_layout.addWidget(self.btn_save)
        
        self.btn_update = QPushButton("ویرایش")
        self.btn_update.setProperty("secondary", True)
        self.btn_update.setFixedHeight(30)
        btn_layout.addWidget(self.btn_update)
        
        self.btn_delete = QPushButton("حذف")
        self.btn_delete.setProperty("danger", True)
        self.btn_delete.setFixedHeight(30)
        btn_layout.addWidget(self.btn_delete)
        
        self.btn_clear = QPushButton("پاک کردن فرم")
        self.btn_clear.setProperty("secondary", True)
        self.btn_clear.setFixedHeight(30)
        btn_layout.addWidget(self.btn_clear)
        
        self.btn_block_toggle = QPushButton("🚫 مسدود/فعال کردن")
        self.btn_block_toggle.setProperty("warning", True)
        self.btn_block_toggle.setFixedHeight(30)
        btn_layout.addWidget(self.btn_block_toggle)
        
        self.chk_session_warning = QPushButton("✅ هشدار تعداد جلسات: فعال")
        self.chk_session_warning.setCheckable(True)
        self.chk_session_warning.setChecked(True)
        self.chk_session_warning.setFixedHeight(30)
        self.chk_session_warning.toggled.connect(self.toggle_session_warning)
        self.update_warning_button_style()
        btn_layout.addWidget(self.chk_session_warning)
        
        self.btn_test = QPushButton("🔍 تست: نمایش نوبت‌های مرتبط")
        self.btn_test.setFixedHeight(30)
        self.btn_test.setStyleSheet("background-color: #8b5cf6; color: white;")
        btn_layout.addWidget(self.btn_test)
        
        btn_layout.addStretch()
        form_layout.addLayout(btn_layout)
        
        main_layout.addWidget(form_group)
        
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("🔍 جستجو:"))
        self.search_entry = QLineEdit()
        self.search_entry.setPlaceholderText("جستجو در مراجعین...")
        search_layout.addWidget(self.search_entry)
        search_layout.addStretch()
        main_layout.addLayout(search_layout)
        
        self.table = QTableWidget()
        self.table.setColumnCount(8)
        self.table.setHorizontalHeaderLabels(["نام", "کد ملی", "تلفن", "جنسیت", "نوع", "تعداد جلسات", "وضعیت", "توضیحات"])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        main_layout.addWidget(self.table)
        
        self.btn_save.clicked.connect(self.add_patient)
        self.btn_update.clicked.connect(self.update_patient)
        self.btn_delete.clicked.connect(self.delete_patient)
        self.btn_clear.clicked.connect(self.clear_form)
        self.btn_block_toggle.clicked.connect(self.toggle_block_patient)
        self.btn_test.clicked.connect(self.show_related_appointments)
        self.search_entry.textChanged.connect(self.search_table)
        self.table.itemSelectionChanged.connect(self.on_select_row)
    
    def show_related_appointments(self):
        if not self.selected_patient_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک مرجع را انتخاب کنید")
            return
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if not patient:
            return
        appointments = self.session.query(Appointment).filter(
            (Appointment.nat_id == patient.nat_id) |
            (Appointment.patient2_nat_id == patient.nat_id) |
            ((Appointment.patient_name == patient.name) & (Appointment.nat_id.is_(None))) |
            ((Appointment.patient2_name == patient.name) & (Appointment.patient2_nat_id.is_(None)))
        ).all()
        if not appointments:
            QMessageBox.information(self, "نتیجه تست", f"هیچ نوبتی برای مرجع {patient.name} یافت نشد")
            return
        text = f"🔍 نوبت‌های مرتبط با مرجع: {patient.name} (کد ملی: {patient.nat_id or 'ندارد'})\n"
        text += "=" * 60 + "\n"
        for app in appointments:
            text += f"شناسه: {app.id} | تاریخ: {app.date} | ساعت: {app.time}\n"
            text += f"   نقش: {'مراجع اصلی' if app.nat_id == patient.nat_id or app.patient_name == patient.name else 'همسر'}\n"
            text += f"   نام در نوبت: {app.patient_name if app.nat_id == patient.nat_id or app.patient_name == patient.name else app.patient2_name}\n"
            text += f"   کد ملی در نوبت: {app.nat_id if app.nat_id == patient.nat_id else app.patient2_nat_id}\n"
            text += f"   وضعیت: {app.status}\n"
            text += "-" * 40 + "\n"
        text += f"تعداد کل: {len(appointments)} نوبت"
        dialog = QDialog(self)
        dialog.setWindowTitle("گزارش تست - نوبت‌های مرتبط")
        dialog.resize(700, 500)
        layout = QVBoxLayout(dialog)
        text_edit = QTextEdit()
        text_edit.setPlainText(text)
        text_edit.setReadOnly(True)
        layout.addWidget(text_edit)
        btn_close = QPushButton("بستن")
        btn_close.clicked.connect(dialog.accept)
        layout.addWidget(btn_close)
        dialog.exec()
    
    def update_warning_button_style(self):
        if self.chk_session_warning.isChecked():
            self.chk_session_warning.setText("✅ هشدار تعداد جلسات: فعال")
            self.chk_session_warning.setStyleSheet("QPushButton:checked { background-color: #10b981; color: white; } QPushButton:!checked { background-color: #ef4444; color: white; }")
        else:
            self.chk_session_warning.setText("⚠️ هشدار تعداد جلسات: غیرفعال")
            self.chk_session_warning.setStyleSheet("QPushButton:checked { background-color: #10b981; color: white; } QPushButton:!checked { background-color: #ef4444; color: white; }")
    
    def toggle_session_warning(self, checked):
        self.session_warning_enabled = checked
        self.update_warning_button_style()
        self.load_patients()
        if self.parent and hasattr(self.parent, 'dashboard_tab'):
            self.parent.dashboard_tab.load_appointments()
            self.parent.dashboard_tab.session.expire_all()
    
    def get_session_color(self, session_count):
        if not self.session_warning_enabled:
            return None
        if session_count == 3:
            return QColor("#f97316")
        if session_count > 3:
            return QColor("#ef4444")
        return None
    
    def show_context_menu(self, position):
        if self.selected_patient_id is None:
            return
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if not patient:
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
        action_edit = QAction("✏️ ویرایش مراجع", self)
        action_edit.triggered.connect(self.update_patient)
        menu.addAction(action_edit)
        if patient.is_blocked == 1:
            action_unblock = QAction("🔓 فعال کردن مراجع", self)
            action_unblock.triggered.connect(lambda: self.set_block_status(False))
            menu.addAction(action_unblock)
        else:
            action_block = QAction("🚫 مسدود کردن مراجع", self)
            action_block.triggered.connect(lambda: self.set_block_status(True))
            menu.addAction(action_block)
        menu.addSeparator()
        action_delete = QAction("🗑️ حذف مراجع", self)
        action_delete.triggered.connect(self.delete_patient)
        menu.addAction(action_delete)
        menu.exec(self.table.viewport().mapToGlobal(position))
    
    def is_patient_blocked(self, nat_id):
        if not nat_id:
            return False
        patient = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
        return patient.is_blocked == 1 if patient else False
    
    def set_block_status(self, block):
        if not self.selected_patient_id:
            return
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if not patient:
            return
        if block:
            msg = QMessageBox.question(self, "تایید مسدودسازی",
                f"آیا از مسدود کردن مراجع «{patient.name}» اطمینان دارید؟\n\n⚠️ پس از مسدودسازی:\n• امکان ثبت نوبت جدید وجود نخواهد داشت\n• تمام نوبت‌های فعال به 'مسدود' تغییر می‌یابند",
                QMessageBox.Yes | QMessageBox.No)
        else:
            msg = QMessageBox.question(self, "تایید فعالسازی",
                f"آیا از فعال کردن مجدد مراجع «{patient.name}» اطمینان دارید؟\n\n✅ نوبت‌های مسدود به 'فعال' بازمی‌گردند.",
                QMessageBox.Yes | QMessageBox.No)
        if msg == QMessageBox.Yes:
            try:
                patient.is_blocked = 1 if block else 0
                self.session.commit()
                if block:
                    apps = self.session.query(Appointment).filter(
                        (Appointment.nat_id == patient.nat_id) | (Appointment.patient2_nat_id == patient.nat_id),
                        Appointment.status == "فعال"
                    ).all()
                    for app in apps:
                        app.status = "مسدود"
                    self.session.commit()
                    QMessageBox.information(self, "موفق", f"مراجع {patient.name} مسدود شد.\n{len(apps)} نوبت مسدود گردید.")
                else:
                    apps = self.session.query(Appointment).filter(
                        (Appointment.nat_id == patient.nat_id) | (Appointment.patient2_nat_id == patient.nat_id),
                        Appointment.status == "مسدود"
                    ).all()
                    for app in apps:
                        app.status = "فعال"
                    self.session.commit()
                    QMessageBox.information(self, "موفق", f"مراجع {patient.name} فعال شد.\n{len(apps)} نوبت فعال گردید.")
                self.load_patients()
                if self.parent and hasattr(self.parent, 'dashboard_tab'):
                    self.parent.dashboard_tab.load_appointments()
                    self.parent.dashboard_tab.session.expire_all()
                self.data_changed.emit()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, "خطا", f"خطا: {str(e)}")
    
    def toggle_block_patient(self):
        if not self.selected_patient_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک مراجع را انتخاب کنید")
            return
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if not patient:
            return
        self.set_block_status(patient.is_blocked != 1)
    
    def load_patients(self):
        self.table.setRowCount(0)
        patients = self.session.query(Patient).order_by(Patient.id).all()
        
        session_counts = {}
        apps = self.session.query(Appointment).filter(
            Appointment.status != "کنسل استاد",
            Appointment.status != "کنسل مراجع",
            Appointment.status != "مسدود"
        ).all()
        for app in apps:
            if app.nat_id:
                session_counts[app.nat_id] = session_counts.get(app.nat_id, 0) + 1
            if app.patient2_nat_id:
                session_counts[app.patient2_nat_id] = session_counts.get(app.patient2_nat_id, 0) + 1
        
        for i, pat in enumerate(patients):
            self.table.insertRow(i)
            session_count = session_counts.get(pat.nat_id, 0)
            color = self.get_session_color(session_count)
            
            self.table.setItem(i, 0, QTableWidgetItem(pat.name or ""))
            self.table.setItem(i, 1, QTableWidgetItem(pat.nat_id or ""))
            self.table.setItem(i, 2, QTableWidgetItem(pat.phone or ""))
            self.table.setItem(i, 3, QTableWidgetItem(pat.gender or ""))
            self.table.setItem(i, 4, QTableWidgetItem(pat.type or ""))
            session_item = QTableWidgetItem(str(session_count))
            if color:
                session_item.setBackground(color)
            self.table.setItem(i, 5, session_item)
            status_text = "🔴 مسدود" if pat.is_blocked == 1 else "🟢 فعال"
            status_item = QTableWidgetItem(status_text)
            if pat.is_blocked == 1:
                status_item.setBackground(QColor("#fecaca"))
                status_item.setForeground(QColor("#991b1b"))
            else:
                status_item.setBackground(QColor("#dcfce7"))
                status_item.setForeground(QColor("#166534"))
            self.table.setItem(i, 6, status_item)
            self.table.setItem(i, 7, QTableWidgetItem(pat.desc or ""))
            self.table.item(i, 0).setData(Qt.UserRole, pat.id)
    
    def check_duplicate_patient(self, name, nat_id, phone, exclude_id=None):
        if nat_id:
            existing = self.session.query(Patient).filter(Patient.nat_id == nat_id).first()
            if existing and existing.id != exclude_id:
                return f"کد ملی {nat_id} قبلاً برای '{existing.name}' ثبت شده است"
        if phone:
            existing = self.session.query(Patient).filter(Patient.phone == phone).first()
            if existing and existing.id != exclude_id:
                return f"شماره تلفن {phone} قبلاً برای '{existing.name}' ثبت شده است"
        return None
    
    def add_patient(self):
        if not self.le_pat_name.text().strip():
            QMessageBox.warning(self, "خطا", "لطفاً نام مراجع را وارد کنید")
            return
        
        nat_id = self.le_pat_nat_id.text().strip()
        if nat_id and (len(nat_id) != 10 or not nat_id.isdigit()):
            QMessageBox.warning(self, "خطا", "کد ملی باید ۱۰ رقم باشد")
            return
        
        phone = self.le_pat_phone.text().strip()
        if phone and len(phone) != 11:
            QMessageBox.warning(self, "خطا", "شماره تلفن باید ۱۱ رقم باشد")
            return
        
        duplicate_error = self.check_duplicate_patient(self.le_pat_name.text().strip(), nat_id, phone)
        if duplicate_error:
            QMessageBox.warning(self, "خطا", duplicate_error)
            return
        
        patient = Patient()
        patient.name = self.le_pat_name.text().strip()
        patient.nat_id = nat_id if nat_id else None
        patient.phone = phone if phone else None
        patient.gender = self.cb_pat_gender.currentText()
        patient.type = self.cb_pat_type.currentText()
        patient.desc = self.le_pat_desc.text().strip()
        patient.is_blocked = 1 if self.cb_block_status.currentText() == "مسدود" else 0
        
        try:
            self.session.add(patient)
            self.session.commit()
            QMessageBox.information(self, "موفق", f"مراجع {patient.name} با موفقیت ثبت شد")
            self.load_patients()
            self.clear_form()
            if self.parent and hasattr(self.parent, 'dashboard_tab'):
                self.parent.dashboard_tab.update_patient_lists()
                self.data_changed.emit()
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ثبت مراجع:\n{str(e)}")
    
    def update_patient(self):
        if not self.selected_patient_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک مراجع را از جدول انتخاب کنید")
            return
        
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if not patient:
            QMessageBox.warning(self, "خطا", "مراجع یافت نشد")
            return
        
        old_nat_id = patient.nat_id
        old_name = patient.name
        old_phone = patient.phone
        old_gender = patient.gender
        old_block_status = patient.is_blocked
        
        new_nat_id = self.le_pat_nat_id.text().strip()
        new_name = self.le_pat_name.text().strip()
        new_phone = self.le_pat_phone.text().strip()
        new_gender = self.cb_pat_gender.currentText()
        new_type = self.cb_pat_type.currentText()
        new_desc = self.le_pat_desc.text().strip()
        new_block_status = 1 if self.cb_block_status.currentText() == "مسدود" else 0
        
        if new_nat_id and (len(new_nat_id) != 10 or not new_nat_id.isdigit()):
            QMessageBox.warning(self, "خطا", "کد ملی باید ۱۰ رقم باشد")
            return
        
        if new_phone and len(new_phone) != 11:
            QMessageBox.warning(self, "خطا", "شماره تلفن باید ۱۱ رقم باشد")
            return
        
        duplicate_error = self.check_duplicate_patient(new_name, new_nat_id, new_phone, exclude_id=self.selected_patient_id)
        if duplicate_error:
            QMessageBox.warning(self, "خطا", duplicate_error)
            return
        
        patient.name = new_name
        patient.nat_id = new_nat_id if new_nat_id else None
        patient.phone = new_phone if new_phone else None
        patient.gender = new_gender
        patient.type = new_type
        patient.desc = new_desc
        patient.is_blocked = new_block_status
        
        try:
            self.session.commit()
            
            update_count = 0
            
            # بروزرسانی نوبت‌های مراجع اصلی
            main_appointments = self.session.query(Appointment).filter(
                (Appointment.nat_id == old_nat_id) |
                ((Appointment.patient_name == old_name) & (Appointment.nat_id.is_(None)))
            ).all()
            for app in main_appointments:
                app.patient_name = new_name
                app.nat_id = new_nat_id if new_nat_id else None
                app.phone = new_phone if new_phone else None
                app.gender = new_gender
                update_count += 1
            
            # بروزرسانی نوبت‌های همسر (با جستجوی پیشرفته‌تر)
            spouse_appointments = self.session.query(Appointment).filter(
                (Appointment.patient2_nat_id == old_nat_id) |
                ((Appointment.patient2_name == old_name) & (Appointment.patient2_nat_id.is_(None)))
            ).all()
            for app in spouse_appointments:
                app.patient2_name = new_name
                app.patient2_nat_id = new_nat_id if new_nat_id else None
                app.patient2_phone = new_phone if new_phone else None
                update_count += 1
            
            # تغییر وضعیت مسدود بودن
            if old_block_status != new_block_status:
                all_related = self.session.query(Appointment).filter(
                    (Appointment.nat_id == new_nat_id) | (Appointment.patient2_nat_id == new_nat_id) |
                    ((Appointment.patient_name == new_name) & (Appointment.nat_id.is_(None))) |
                    ((Appointment.patient2_name == new_name) & (Appointment.patient2_nat_id.is_(None)))
                ).all()
                for app in all_related:
                    if new_block_status == 1:
                        if app.status == "فعال":
                            app.status = "مسدود"
                            update_count += 1
                    else:
                        if app.status == "مسدود":
                            app.status = "فعال"
                            update_count += 1
                self.session.commit()
            
            self.session.commit()
            
            QMessageBox.information(self, "موفق", 
                f"اطلاعات مراجع با موفقیت ویرایش شد\n{update_count} نوبت مربوطه بروزرسانی گردید")
            
            self.load_patients()
            self.clear_form()
            
            if self.parent and hasattr(self.parent, 'dashboard_tab'):
                self.parent.dashboard_tab.load_appointments()
                self.parent.dashboard_tab.session.expire_all()
                self.parent.dashboard_tab.update_patient_lists()
                self.data_changed.emit()
                
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ویرایش:\n{str(e)}")
    
    def delete_patient(self):
        if not self.selected_patient_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک مراجع را انتخاب کنید")
            return
        
        patient = self.session.query(Patient).get(self.selected_patient_id)
        if patient:
            appointments = self.session.query(Appointment).filter(
                (Appointment.nat_id == patient.nat_id) | (Appointment.patient2_nat_id == patient.nat_id)
            ).first()
            
            if appointments:
                reply = QMessageBox.question(self, "تایید حذف",
                    f"مراجع {patient.name} دارای نوبت‌های ثبت شده است.\nآیا از حذف اطمینان دارید؟",
                    QMessageBox.Yes | QMessageBox.No)
                if reply != QMessageBox.Yes:
                    return
            
            reply = QMessageBox.question(self, "تایید حذف", f"آیا از حذف مراجع {patient.name} اطمینان دارید؟",
                                        QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                try:
                    self.session.delete(patient)
                    self.session.commit()
                    QMessageBox.information(self, "موفق", "مراجع با موفقیت حذف شد")
                    self.load_patients()
                    self.clear_form()
                    if self.parent and hasattr(self.parent, 'dashboard_tab'):
                        self.parent.dashboard_tab.update_patient_lists()
                        self.data_changed.emit()
                except Exception as e:
                    self.session.rollback()
                    QMessageBox.critical(self, "خطا", f"خطا در حذف:\n{str(e)}")
    
    def clear_form(self):
        self.selected_patient_id = None
        self.le_pat_name.clear()
        self.le_pat_nat_id.clear()
        self.le_pat_phone.clear()
        self.le_pat_desc.clear()
        self.cb_pat_gender.setCurrentIndex(0)
        self.cb_pat_type.setCurrentIndex(0)
        self.cb_block_status.setCurrentIndex(0)
    
    def on_select_row(self):
        rows = self.table.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_patient_id = self.table.item(row, 0).data(Qt.UserRole)
            patient = self.session.query(Patient).get(self.selected_patient_id)
            if patient:
                self.le_pat_name.setText(patient.name or "")
                self.le_pat_nat_id.setText(patient.nat_id or "")
                self.le_pat_phone.setText(patient.phone or "")
                self.cb_pat_gender.setCurrentText(patient.gender or "")
                self.cb_pat_type.setCurrentText(patient.type or "")
                self.cb_block_status.setCurrentText("مسدود" if patient.is_blocked == 1 else "فعال")
                self.le_pat_desc.setText(patient.desc or "")
    
    def search_table(self, text):
        for row in range(self.table.rowCount()):
            hide = True
            for col in range(self.table.columnCount()):
                item = self.table.item(row, col)
                if item and text.lower() in item.text().lower():
                    hide = False
                    break
            self.table.setRowHidden(row, hide)
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
