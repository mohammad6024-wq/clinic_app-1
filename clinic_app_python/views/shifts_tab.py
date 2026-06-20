from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QTableWidget, QTableWidgetItem, QFrame, QMessageBox,
    QHeaderView, QAbstractItemView, QGroupBox
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import Shift, Subject

class ShiftsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.selected_shift_id = None
        self.selected_subject_id = None
        self.setup_ui()
        self.load_shifts()
        self.load_subjects()
    
    def setup_ui(self):
        main_layout = QHBoxLayout(self)
        
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        shift_group = QGroupBox("مدیریت شیفت‌ها")
        shift_layout = QVBoxLayout(shift_group)
        
        form_frame = QFrame()
        form_layout = QHBoxLayout(form_frame)
        form_layout.addWidget(QLabel("نام شیفت:"))
        self.le_shift_name = QLineEdit()
        self.le_shift_name.setPlaceholderText("مثال: شیفت صبح")
        form_layout.addWidget(self.le_shift_name)
        form_layout.addWidget(QLabel("بازه زمانی:"))
        self.le_shift_time = QLineEdit()
        self.le_shift_time.setPlaceholderText("مثال: 8-14")
        form_layout.addWidget(self.le_shift_time)
        self.btn_add_shift = QPushButton("ثبت شیفت")
        form_layout.addWidget(self.btn_add_shift)
        self.btn_edit_shift = QPushButton("ویرایش")
        self.btn_edit_shift.setProperty("secondary", True)
        form_layout.addWidget(self.btn_edit_shift)
        self.btn_clear_shift = QPushButton("پاکسازی")
        form_layout.addWidget(self.btn_clear_shift)
        shift_layout.addWidget(form_frame)
        
        self.table_shifts = QTableWidget()
        self.table_shifts.setColumnCount(3)
        self.table_shifts.setHorizontalHeaderLabels(["نام شیفت", "بازه زمانی", "شناسه"])
        self.table_shifts.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table_shifts.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table_shifts.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table_shifts.setAlternatingRowColors(True)
        shift_layout.addWidget(self.table_shifts)
        
        btn_shift_layout = QHBoxLayout()
        self.btn_delete_shift = QPushButton("حذف شیفت انتخاب شده")
        self.btn_delete_shift.setProperty("danger", True)
        btn_shift_layout.addWidget(self.btn_delete_shift)
        shift_layout.addLayout(btn_shift_layout)
        
        left_layout.addWidget(shift_group)
        
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        
        subject_group = QGroupBox("مدیریت موضوعات مشاوره")
        subject_layout = QVBoxLayout(subject_group)
        
        subj_form = QHBoxLayout()
        subj_form.addWidget(QLabel("نام موضوع:"))
        self.le_subject_name = QLineEdit()
        self.le_subject_name.setPlaceholderText("مثال: زوج درمانی")
        subj_form.addWidget(self.le_subject_name)
        subj_form.addWidget(QLabel("نوع:"))
        self.cb_subject_type = QComboBox()
        self.cb_subject_type.addItems(["تک نفره", "دونفره (زوج)"])
        subj_form.addWidget(self.cb_subject_type)
        self.btn_add_subject = QPushButton("ثبت موضوع")
        subj_form.addWidget(self.btn_add_subject)
        self.btn_edit_subject = QPushButton("ویرایش")
        self.btn_edit_subject.setProperty("secondary", True)
        subj_form.addWidget(self.btn_edit_subject)
        self.btn_clear_subject = QPushButton("پاکسازی")
        subj_form.addWidget(self.btn_clear_subject)
        subject_layout.addLayout(subj_form)
        
        self.table_subjects = QTableWidget()
        self.table_subjects.setColumnCount(3)
        self.table_subjects.setHorizontalHeaderLabels(["نام موضوع", "نوع", "شناسه"])
        self.table_subjects.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table_subjects.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table_subjects.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table_subjects.setAlternatingRowColors(True)
        subject_layout.addWidget(self.table_subjects)
        
        btn_subj_layout = QHBoxLayout()
        self.btn_delete_subject = QPushButton("حذف موضوع انتخاب شده")
        self.btn_delete_subject.setProperty("danger", True)
        btn_subj_layout.addWidget(self.btn_delete_subject)
        subject_layout.addLayout(btn_subj_layout)
        
        right_layout.addWidget(subject_group)
        
        main_layout.addWidget(left_widget, 1)
        main_layout.addWidget(right_widget, 1)
        
        self.btn_add_shift.clicked.connect(self.add_shift)
        self.btn_edit_shift.clicked.connect(self.edit_shift)
        self.btn_clear_shift.clicked.connect(self.clear_shift_form)
        self.btn_delete_shift.clicked.connect(self.delete_shift)
        self.table_shifts.itemSelectionChanged.connect(self.on_shift_select)
        
        self.btn_add_subject.clicked.connect(self.add_subject)
        self.btn_edit_subject.clicked.connect(self.edit_subject)
        self.btn_clear_subject.clicked.connect(self.clear_subject_form)
        self.btn_delete_subject.clicked.connect(self.delete_subject)
        self.table_subjects.itemSelectionChanged.connect(self.on_subject_select)
    
    def set_subjects_readonly(self, readonly=True):
        """تنظیم حالت فقط خواندنی برای موضوعات (منشی)"""
        if readonly:
            self.btn_add_subject.setEnabled(False)
            self.btn_edit_subject.setEnabled(False)
            self.btn_delete_subject.setEnabled(False)
            self.btn_add_subject.setToolTip("شما مجوز اضافه کردن موضوع را ندارید")
            self.btn_edit_subject.setToolTip("شما مجوز ویرایش موضوع را ندارید")
            self.btn_delete_subject.setToolTip("شما مجوز حذف موضوع را ندارید")
        else:
            self.btn_add_subject.setEnabled(True)
            self.btn_edit_subject.setEnabled(True)
            self.btn_delete_subject.setEnabled(True)
    
    def load_shifts(self):
        self.table_shifts.setRowCount(0)
        shifts = self.session.query(Shift).all()
        for i, shift in enumerate(shifts):
            self.table_shifts.insertRow(i)
            self.table_shifts.setItem(i, 0, QTableWidgetItem(shift.name or ""))
            self.table_shifts.setItem(i, 1, QTableWidgetItem(shift.time_range or ""))
            self.table_shifts.setItem(i, 2, QTableWidgetItem(str(shift.id)))
            self.table_shifts.item(i, 2).setData(Qt.UserRole, shift.id)
    
    def add_shift(self):
        name = self.le_shift_name.text().strip()
        time_range = self.le_shift_time.text().strip()
        if not name or not time_range:
            QMessageBox.warning(self, "خطا", "لطفاً نام شیفت و بازه زمانی را وارد کنید")
            return
        existing = self.session.query(Shift).filter(Shift.name == name).first()
        if existing:
            QMessageBox.warning(self, "خطا", "این نام شیفت قبلاً ثبت شده است")
            return
        shift = Shift(name=name, time_range=time_range)
        self.session.add(shift)
        self.session.commit()
        self.load_shifts()
        self.clear_shift_form()
        QMessageBox.information(self, "موفق", "شیفت با موفقیت ثبت شد")
    
    def edit_shift(self):
        if not self.selected_shift_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک شیفت را انتخاب کنید")
            return
        name = self.le_shift_name.text().strip()
        time_range = self.le_shift_time.text().strip()
        if not name or not time_range:
            QMessageBox.warning(self, "خطا", "لطفاً نام شیفت و بازه زمانی را وارد کنید")
            return
        shift = self.session.query(Shift).get(self.selected_shift_id)
        if shift:
            shift.name = name
            shift.time_range = time_range
            self.session.commit()
            self.load_shifts()
            self.clear_shift_form()
            QMessageBox.information(self, "موفق", "شیفت با موفقیت ویرایش شد")
    
    def delete_shift(self):
        if not self.selected_shift_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک شیفت را انتخاب کنید")
            return
        if QMessageBox.question(self, "تایید", "آیا از حذف این شیفت اطمینان دارید؟") == QMessageBox.Yes:
            shift = self.session.query(Shift).get(self.selected_shift_id)
            if shift:
                self.session.delete(shift)
                self.session.commit()
                self.load_shifts()
                self.clear_shift_form()
    
    def on_shift_select(self):
        rows = self.table_shifts.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_shift_id = int(self.table_shifts.item(row, 2).data(Qt.UserRole))
            self.le_shift_name.setText(self.table_shifts.item(row, 0).text())
            self.le_shift_time.setText(self.table_shifts.item(row, 1).text())
    
    def clear_shift_form(self):
        self.selected_shift_id = None
        self.le_shift_name.clear()
        self.le_shift_time.clear()
    
    def load_subjects(self):
        self.table_subjects.setRowCount(0)
        subjects = self.session.query(Subject).all()
        for i, subj in enumerate(subjects):
            self.table_subjects.insertRow(i)
            self.table_subjects.setItem(i, 0, QTableWidgetItem(subj.name or ""))
            subj_type = "دونفره (زوج)" if subj.is_couple == 1 else "تک نفره"
            self.table_subjects.setItem(i, 1, QTableWidgetItem(subj_type))
            self.table_subjects.setItem(i, 2, QTableWidgetItem(str(subj.id)))
            self.table_subjects.item(i, 2).setData(Qt.UserRole, subj.id)
    
    def add_subject(self):
        name = self.le_subject_name.text().strip()
        if not name:
            QMessageBox.warning(self, "خطا", "لطفاً نام موضوع را وارد کنید")
            return
        is_couple = 1 if self.cb_subject_type.currentText() == "دونفره (زوج)" else 0
        existing = self.session.query(Subject).filter(Subject.name == name).first()
        if existing:
            QMessageBox.warning(self, "خطا", "این نام موضوع قبلاً ثبت شده است")
            return
        subject = Subject(name=name, is_couple=is_couple)
        self.session.add(subject)
        self.session.commit()
        self.load_subjects()
        self.clear_subject_form()
        if self.parent and hasattr(self.parent, 'dashboard_tab'):
            self.parent.dashboard_tab.load_subjects_to_combo()
        QMessageBox.information(self, "موفق", "موضوع با موفقیت ثبت شد")
    
    def edit_subject(self):
        if not self.selected_subject_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک موضوع را انتخاب کنید")
            return
        name = self.le_subject_name.text().strip()
        if not name:
            QMessageBox.warning(self, "خطا", "لطفاً نام موضوع را وارد کنید")
            return
        is_couple = 1 if self.cb_subject_type.currentText() == "دونفره (زوج)" else 0
        subject = self.session.query(Subject).get(self.selected_subject_id)
        if subject:
            subject.name = name
            subject.is_couple = is_couple
            self.session.commit()
            self.load_subjects()
            self.clear_subject_form()
            if self.parent and hasattr(self.parent, 'dashboard_tab'):
                self.parent.dashboard_tab.load_subjects_to_combo()
                current_subject = self.parent.dashboard_tab.cb_subject.currentText()
                self.parent.dashboard_tab.toggle_patient2(current_subject)
            QMessageBox.information(self, "موفق", "موضوع با موفقیت ویرایش شد")
    
    def delete_subject(self):
        if not self.selected_subject_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک موضوع را انتخاب کنید")
            return
        if QMessageBox.question(self, "تایید", "آیا از حذف این موضوع اطمینان دارید؟") == QMessageBox.Yes:
            subject = self.session.query(Subject).get(self.selected_subject_id)
            if subject:
                self.session.delete(subject)
                self.session.commit()
                self.load_subjects()
                self.clear_subject_form()
                if self.parent and hasattr(self.parent, 'dashboard_tab'):
                    self.parent.dashboard_tab.load_subjects_to_combo()
    
    def on_subject_select(self):
        rows = self.table_subjects.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_subject_id = int(self.table_subjects.item(row, 2).data(Qt.UserRole))
            self.le_subject_name.setText(self.table_subjects.item(row, 0).text())
            subj_type = self.table_subjects.item(row, 1).text()
            self.cb_subject_type.setCurrentText(subj_type)
    
    def clear_subject_form(self):
        self.selected_subject_id = None
        self.le_subject_name.clear()
        self.cb_subject_type.setCurrentIndex(0)
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
