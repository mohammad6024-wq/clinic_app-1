from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QTableWidget, QTableWidgetItem, QCheckBox, QFrame,
    QMessageBox, QHeaderView, QAbstractItemView, QGroupBox
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import Doctor, Appointment

class DoctorsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.selected_doctor_id = None
        self.readonly_mode = False
        self.setup_ui()
        self.load_doctors()

    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        
        form_group = QGroupBox("اطلاعات استاد")
        form_layout = QVBoxLayout(form_group)
        
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("نام استاد:"))
        self.le_doc_name = QLineEdit()
        self.le_doc_name.setMinimumWidth(150)
        row1.addWidget(self.le_doc_name)
        
        row1.addWidget(QLabel("تخصص:"))
        self.le_doc_spec = QLineEdit()
        self.le_doc_spec.setMinimumWidth(150)
        row1.addWidget(self.le_doc_spec)
        
        row1.addWidget(QLabel("تلفن:"))
        self.le_doc_phone = QLineEdit()
        self.le_doc_phone.setMinimumWidth(120)
        row1.addWidget(self.le_doc_phone)
        
        row1.addWidget(QLabel("جنسیت:"))
        self.cb_doc_gender = QComboBox()
        self.cb_doc_gender.addItems(["", "مرد", "زن"])
        self.cb_doc_gender.setMinimumWidth(80)
        row1.addWidget(self.cb_doc_gender)
        form_layout.addLayout(row1)
        
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("روزهای حضور:"))
        self.days_frame = QFrame()
        days_layout = QHBoxLayout(self.days_frame)
        days_layout.setContentsMargins(0, 0, 0, 0)
        
        self.doc_days_vars = {}
        weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
        for day in weekdays:
            cb = QCheckBox(day)
            days_layout.addWidget(cb)
            self.doc_days_vars[day] = cb
        
        row2.addWidget(self.days_frame)
        form_layout.addLayout(row2)
        
        row3 = QHBoxLayout()
        row3.addWidget(QLabel("توضیحات:"))
        self.le_doc_desc = QLineEdit()
        self.le_doc_desc.setMinimumWidth(400)
        row3.addWidget(self.le_doc_desc)
        form_layout.addLayout(row3)
        
        btn_layout = QHBoxLayout()
        self.btn_save = QPushButton("ثبت استاد")
        self.btn_save.setProperty("success", True)
        self.btn_update = QPushButton("ویرایش")
        self.btn_update.setProperty("secondary", True)
        self.btn_delete = QPushButton("حذف")
        self.btn_delete.setProperty("danger", True)
        self.btn_clear = QPushButton("پاک کردن فرم")
        self.btn_clear.setProperty("secondary", True)
        self.btn_batch = QPushButton("ویرایش گروهی")
        self.btn_batch.setProperty("secondary", True)
        
        for btn in [self.btn_save, self.btn_update, self.btn_delete, self.btn_clear, self.btn_batch]:
            btn_layout.addWidget(btn)
        form_layout.addLayout(btn_layout)
        
        main_layout.addWidget(form_group)
        
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("🔍 جستجو:"))
        self.search_entry = QLineEdit()
        self.search_entry.setPlaceholderText("جستجو در اساتید...")
        search_layout.addWidget(self.search_entry)
        search_layout.addStretch()
        main_layout.addLayout(search_layout)
        
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["نام", "تخصص", "تلفن", "جنسیت", "روزهای حضور", "توضیحات"])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        main_layout.addWidget(self.table)
        
        self.btn_save.clicked.connect(self.add_doctor)
        self.btn_update.clicked.connect(self.update_doctor)
        self.btn_delete.clicked.connect(self.delete_doctor)
        self.btn_clear.clicked.connect(self.clear_form)
        self.btn_batch.clicked.connect(self.batch_update)
        self.search_entry.textChanged.connect(self.search_table)
        self.table.itemSelectionChanged.connect(self.on_select_row)
    
    def set_readonly_mode(self, readonly=True):
        """تنظیم حالت فقط خواندنی برای منشی"""
        self.readonly_mode = readonly
        if readonly:
            self.btn_save.setEnabled(False)
            self.btn_update.setEnabled(False)
            self.btn_delete.setEnabled(False)
            self.btn_batch.setEnabled(False)
            self.btn_save.setToolTip("شما مجوز ثبت استاد جدید را ندارید")
            self.btn_update.setToolTip("شما مجوز ویرایش استاد را ندارید")
            self.btn_delete.setToolTip("شما مجوز حذف استاد را ندارید")
            self.btn_batch.setToolTip("شما مجوز ویرایش گروهی را ندارید")
        else:
            self.btn_save.setEnabled(True)
            self.btn_update.setEnabled(True)
            self.btn_delete.setEnabled(True)
            self.btn_batch.setEnabled(True)
    
    def load_doctors(self):
        self.table.setRowCount(0)
        doctors = self.session.query(Doctor).order_by(Doctor.id).all()
        for i, doc in enumerate(doctors):
            self.table.insertRow(i)
            self.table.setItem(i, 0, QTableWidgetItem(doc.name or ""))
            self.table.setItem(i, 1, QTableWidgetItem(doc.spec or ""))
            self.table.setItem(i, 2, QTableWidgetItem(doc.phone or ""))
            self.table.setItem(i, 3, QTableWidgetItem(doc.gender or ""))
            self.table.setItem(i, 4, QTableWidgetItem(doc.working_days or ""))
            self.table.setItem(i, 5, QTableWidgetItem(doc.desc or ""))
            self.table.item(i, 0).setData(Qt.UserRole, doc.id)
    
    def add_doctor(self):
        if self.readonly_mode:
            QMessageBox.warning(self, "خطا", "شما مجوز ثبت استاد جدید را ندارید")
            return
        if not self.le_doc_name.text().strip():
            QMessageBox.warning(self, "خطا", "لطفاً نام استاد را وارد کنید")
            return
        
        selected_days = [day for day, cb in self.doc_days_vars.items() if cb.isChecked()]
        working_days = ",".join(selected_days) if selected_days else "همه روزه"
        
        doctor = Doctor()
        doctor.name = self.le_doc_name.text().strip()
        doctor.spec = self.le_doc_spec.text().strip()
        doctor.phone = self.le_doc_phone.text().strip()
        doctor.gender = self.cb_doc_gender.currentText()
        doctor.working_days = working_days
        doctor.desc = self.le_doc_desc.text().strip()
        
        try:
            self.session.add(doctor)
            self.session.commit()
            QMessageBox.information(self, "موفق", f"استاد {doctor.name} با موفقیت ثبت شد")
            self.load_doctors()
            self.clear_form()
            if self.parent and hasattr(self.parent, 'dashboard_tab'):
                self.parent.dashboard_tab.load_doctors_combo()
                self.parent.dashboard_tab.update_attendance_panel()
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ثبت استاد:\n{str(e)}")
    
    def update_doctor(self):
        if self.readonly_mode:
            QMessageBox.warning(self, "خطا", "شما مجوز ویرایش استاد را ندارید")
            return
        if not self.selected_doctor_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک استاد را از جدول انتخاب کنید")
            return
        
        doctor = self.session.query(Doctor).get(self.selected_doctor_id)
        if doctor:
            doctor.name = self.le_doc_name.text().strip()
            doctor.spec = self.le_doc_spec.text().strip()
            doctor.phone = self.le_doc_phone.text().strip()
            doctor.gender = self.cb_doc_gender.currentText()
            selected_days = [day for day, cb in self.doc_days_vars.items() if cb.isChecked()]
            doctor.working_days = ",".join(selected_days) if selected_days else "همه روزه"
            doctor.desc = self.le_doc_desc.text().strip()
            
            try:
                self.session.commit()
                QMessageBox.information(self, "موفق", "اطلاعات استاد با موفقیت ویرایش شد")
                self.load_doctors()
                self.clear_form()
                if self.parent and hasattr(self.parent, 'dashboard_tab'):
                    self.parent.dashboard_tab.load_doctors_combo()
                    self.parent.dashboard_tab.update_attendance_panel()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, "خطا", f"خطا در ویرایش:\n{str(e)}")
    
    def delete_doctor(self):
        if self.readonly_mode:
            QMessageBox.warning(self, "خطا", "شما مجوز حذف استاد را ندارید")
            return
        if not self.selected_doctor_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک استاد را انتخاب کنید")
            return
        
        doctor = self.session.query(Doctor).get(self.selected_doctor_id)
        if doctor:
            appointments = self.session.query(Appointment).filter(Appointment.doctor == doctor.name).first()
            if appointments:
                reply = QMessageBox.question(self, "تایید حذف",
                    f"استاد {doctor.name} دارای نوبت‌های ثبت شده است.\nآیا از حذف اطمینان دارید؟",
                    QMessageBox.Yes | QMessageBox.No)
                if reply != QMessageBox.Yes:
                    return
            
            reply = QMessageBox.question(self, "تایید حذف", f"آیا از حذف استاد {doctor.name} اطمینان دارید؟",
                                        QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                try:
                    self.session.delete(doctor)
                    self.session.commit()
                    QMessageBox.information(self, "موفق", "استاد با موفقیت حذف شد")
                    self.load_doctors()
                    self.clear_form()
                    if self.parent and hasattr(self.parent, 'dashboard_tab'):
                        self.parent.dashboard_tab.load_doctors_combo()
                        self.parent.dashboard_tab.update_attendance_panel()
                except Exception as e:
                    self.session.rollback()
                    QMessageBox.critical(self, "خطا", f"خطا در حذف:\n{str(e)}")
    
    def batch_update(self):
        if self.readonly_mode:
            QMessageBox.warning(self, "خطا", "شما مجوز ویرایش گروهی را ندارید")
            return
        selected_rows = self.table.selectedItems()
        if not selected_rows:
            QMessageBox.warning(self, "خطا", "لطفاً حداقل یک استاد را انتخاب کنید")
            return
        
        row_set = set()
        for item in selected_rows:
            row_set.add(item.row())
        
        doctor_ids = []
        for row in row_set:
            doctor_id = self.table.item(row, 0).data(Qt.UserRole)
            doctor_ids.append(doctor_id)
        
        updates = {}
        if self.cb_doc_gender.currentText():
            updates['gender'] = self.cb_doc_gender.currentText()
        
        selected_days = [day for day, cb in self.doc_days_vars.items() if cb.isChecked()]
        if selected_days:
            updates['working_days'] = ",".join(selected_days)
        
        if not updates:
            QMessageBox.warning(self, "خطا", "لطفاً فیلدهایی که می‌خواهید تغییر دهید را پر کنید")
            return
        
        reply = QMessageBox.question(self, "تایید ویرایش گروهی",
            f"آیا از اعمال تغییرات روی {len(doctor_ids)} استاد اطمینان دارید؟",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            try:
                for doc_id in doctor_ids:
                    doctor = self.session.query(Doctor).get(doc_id)
                    if doctor:
                        if 'gender' in updates:
                            doctor.gender = updates['gender']
                        if 'working_days' in updates:
                            doctor.working_days = updates['working_days']
                self.session.commit()
                QMessageBox.information(self, "موفق", "ویرایش گروهی با موفقیت انجام شد")
                self.load_doctors()
                self.clear_form()
                if self.parent and hasattr(self.parent, 'dashboard_tab'):
                    self.parent.dashboard_tab.update_attendance_panel()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, "خطا", f"خطا در ویرایش گروهی:\n{str(e)}")
    
    def clear_form(self):
        self.selected_doctor_id = None
        self.le_doc_name.clear()
        self.le_doc_spec.clear()
        self.le_doc_phone.clear()
        self.le_doc_desc.clear()
        self.cb_doc_gender.setCurrentIndex(0)
        for cb in self.doc_days_vars.values():
            cb.setChecked(False)
    
    def on_select_row(self):
        rows = self.table.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_doctor_id = self.table.item(row, 0).data(Qt.UserRole)
            doctor = self.session.query(Doctor).get(self.selected_doctor_id)
            if doctor:
                self.le_doc_name.setText(doctor.name or "")
                self.le_doc_spec.setText(doctor.spec or "")
                self.le_doc_phone.setText(doctor.phone or "")
                self.cb_doc_gender.setCurrentText(doctor.gender or "")
                self.le_doc_desc.setText(doctor.desc or "")
                
                working_days = doctor.working_days or ""
                for day, cb in self.doc_days_vars.items():
                    cb.setChecked(day in working_days)
    
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
