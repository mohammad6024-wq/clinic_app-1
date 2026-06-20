from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QComboBox,
    QPushButton, QTableWidget, QTableWidgetItem, QGroupBox, QMessageBox,
    QHeaderView, QAbstractItemView
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import User
import jdatetime

class UsersTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.selected_user_id = None
        self.admin_restricted = False
        self.setup_ui()
        self.load_users()
    
    def set_admin_restricted_mode(self, restricted=True):
        """تنظیم حالت محدود برای مدیر (نمی‌تواند مدیر یا مدیر ارشد بسازد)"""
        self.admin_restricted = restricted
        if restricted:
            self.cb_role.clear()
            self.cb_role.addItem("منشی")
            self.cb_role.setEnabled(True)
            self.cb_role.setToolTip("شما فقط می‌توانید کاربر با نقش منشی ایجاد کنید")
            self.btn_save.setToolTip("شما فقط می‌توانید کاربر با نقش منشی ایجاد کنید")
    
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        
        form_group = QGroupBox("اطلاعات کاربر")
        form_layout = QVBoxLayout(form_group)
        
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("نام کاربری:"))
        self.le_username = QLineEdit()
        self.le_username.setMinimumWidth(120)
        row1.addWidget(self.le_username)
        
        row1.addWidget(QLabel("رمز عبور:"))
        self.le_password = QLineEdit()
        self.le_password.setEchoMode(QLineEdit.Password)
        self.le_password.setMinimumWidth(120)
        row1.addWidget(self.le_password)
        
        row1.addWidget(QLabel("تکرار رمز:"))
        self.le_password_confirm = QLineEdit()
        self.le_password_confirm.setEchoMode(QLineEdit.Password)
        self.le_password_confirm.setMinimumWidth(120)
        row1.addWidget(self.le_password_confirm)
        
        row1.addWidget(QLabel("نام کامل:"))
        self.le_fullname = QLineEdit()
        self.le_fullname.setMinimumWidth(120)
        row1.addWidget(self.le_fullname)
        
        row1.addWidget(QLabel("نقش:"))
        self.cb_role = QComboBox()
        self.cb_role.addItems(["منشی", "مدیر", "مدیر ارشد"])
        self.cb_role.setMinimumWidth(100)
        row1.addWidget(self.cb_role)
        form_layout.addLayout(row1)
        
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("تلفن:"))
        self.le_phone = QLineEdit()
        self.le_phone.setMinimumWidth(100)
        row2.addWidget(self.le_phone)
        
        row2.addWidget(QLabel("کد ملی:"))
        self.le_nat_id = QLineEdit()
        self.le_nat_id.setMinimumWidth(100)
        row2.addWidget(self.le_nat_id)
        
        row2.addWidget(QLabel("تخصص:"))
        self.le_spec = QLineEdit()
        self.le_spec.setMinimumWidth(100)
        row2.addWidget(self.le_spec)
        
        row2.addWidget(QLabel("جنسیت:"))
        self.cb_gender = QComboBox()
        self.cb_gender.addItems(["", "مرد", "زن"])
        self.cb_gender.setMinimumWidth(80)
        row2.addWidget(self.cb_gender)
        
        row2.addWidget(QLabel("وضعیت:"))
        self.cb_status = QComboBox()
        self.cb_status.addItems(["فعال", "غیرفعال"])
        self.cb_status.setMinimumWidth(80)
        row2.addWidget(self.cb_status)
        form_layout.addLayout(row2)
        
        row3 = QHBoxLayout()
        row3.addWidget(QLabel("توضیحات:"))
        self.le_desc = QLineEdit()
        self.le_desc.setMinimumWidth(400)
        row3.addWidget(self.le_desc)
        form_layout.addLayout(row3)
        
        btn_layout = QHBoxLayout()
        self.btn_save = QPushButton("ثبت کاربر جدید")
        self.btn_update = QPushButton("ویرایش کاربر")
        self.btn_delete = QPushButton("غیرفعال‌سازی")
        self.btn_clear = QPushButton("پاک کردن فرم")
        
        self.btn_save.setStyleSheet("background-color: #10b981; color: white;")
        self.btn_update.setStyleSheet("background-color: #3b82f6; color: white;")
        self.btn_delete.setStyleSheet("background-color: #ef4444; color: white;")
        
        btn_layout.addWidget(self.btn_save)
        btn_layout.addWidget(self.btn_update)
        btn_layout.addWidget(self.btn_delete)
        btn_layout.addWidget(self.btn_clear)
        btn_layout.addStretch()
        form_layout.addLayout(btn_layout)
        
        main_layout.addWidget(form_group)
        
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("🔍 جستجو:"))
        self.search_entry = QLineEdit()
        self.search_entry.setPlaceholderText("جستجو در کاربران...")
        search_layout.addWidget(self.search_entry)
        search_layout.addStretch()
        main_layout.addLayout(search_layout)
        
        self.table = QTableWidget()
        self.table.setColumnCount(9)
        self.table.setHorizontalHeaderLabels([
            "ردیف", "نام کاربری", "نام کامل", "نقش", "تلفن", "کد ملی", "تخصص", "جنسیت", "وضعیت"
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        main_layout.addWidget(self.table)
        
        self.btn_save.clicked.connect(self.add_user)
        self.btn_update.clicked.connect(self.update_user)
        self.btn_delete.clicked.connect(self.toggle_user_status)
        self.btn_clear.clicked.connect(self.clear_form)
        self.search_entry.textChanged.connect(self.search_table)
        self.table.itemSelectionChanged.connect(self.on_select_row)
    
    def load_users(self):
        self.table.setRowCount(0)
        users = self.session.query(User).order_by(User.id).all()
        
        for i, user in enumerate(users):
            self.table.insertRow(i)
            self.table.setItem(i, 0, QTableWidgetItem(str(i+1)))
            self.table.setItem(i, 1, QTableWidgetItem(user.username or ""))
            self.table.setItem(i, 2, QTableWidgetItem(user.name or ""))
            
            role_text = self.role_db_to_fa(user.role)
            self.table.setItem(i, 3, QTableWidgetItem(role_text))
            
            self.table.setItem(i, 4, QTableWidgetItem(user.phone or ""))
            self.table.setItem(i, 5, QTableWidgetItem(user.nat_id or ""))
            self.table.setItem(i, 6, QTableWidgetItem(user.spec or ""))
            self.table.setItem(i, 7, QTableWidgetItem(user.gender or ""))
            
            status_text = "فعال" if user.is_active else "غیرفعال"
            status_item = QTableWidgetItem(status_text)
            if not user.is_active:
                status_item.setBackground(Qt.red)
                status_item.setForeground(Qt.white)
            self.table.setItem(i, 8, status_item)
            
            self.table.item(i, 0).setData(Qt.UserRole, user.id)
    
    def role_db_to_fa(self, role):
        if role == "super_admin":
            return "مدیر ارشد"
        elif role == "admin":
            return "مدیر"
        return "منشی"
    
    def role_fa_to_db(self, role_fa):
        if role_fa == "مدیر ارشد":
            return "super_admin"
        elif role_fa == "مدیر":
            return "admin"
        return "secretary"
    
    def add_user(self):
        username = self.le_username.text().strip()
        password = self.le_password.text().strip()
        password_confirm = self.le_password_confirm.text().strip()
        fullname = self.le_fullname.text().strip()
        
        if not username or not password:
            QMessageBox.warning(self, "خطا", "نام کاربری و رمز عبور الزامی است")
            return
        
        if password != password_confirm:
            QMessageBox.warning(self, "خطا", "رمز عبور و تکرار آن مطابقت ندارند")
            return
        
        existing = self.session.query(User).filter(User.username == username).first()
        if existing:
            QMessageBox.warning(self, "خطا", "این نام کاربری قبلاً ثبت شده است")
            return
        
        user = User()
        user.username = username
        user.password = password
        user.name = fullname
        user.role = self.role_fa_to_db(self.cb_role.currentText())
        user.phone = self.le_phone.text().strip()
        user.nat_id = self.le_nat_id.text().strip()
        user.spec = self.le_spec.text().strip()
        user.gender = self.cb_gender.currentText()
        user.desc = self.le_desc.text().strip()
        user.is_active = 1 if self.cb_status.currentText() == "فعال" else 0
        user.created_at = jdatetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")
        
        try:
            self.session.add(user)
            self.session.commit()
            QMessageBox.information(self, "موفق", f"کاربر {username} با موفقیت ثبت شد")
            self.load_users()
            self.clear_form()
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ثبت کاربر:\n{str(e)}")
    
    def update_user(self):
        if not self.selected_user_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک کاربر را انتخاب کنید")
            return
        
        user = self.session.query(User).get(self.selected_user_id)
        if not user:
            QMessageBox.warning(self, "خطا", "کاربر یافت نشد")
            return
        
        username = self.le_username.text().strip()
        if not username:
            QMessageBox.warning(self, "خطا", "نام کاربری نمی‌تواند خالی باشد")
            return
        
        existing = self.session.query(User).filter(
            User.username == username,
            User.id != self.selected_user_id
        ).first()
        if existing:
            QMessageBox.warning(self, "خطا", "این نام کاربری قبلاً ثبت شده است")
            return
        
        user.username = username
        
        if self.le_password.text().strip():
            if self.le_password.text() != self.le_password_confirm.text():
                QMessageBox.warning(self, "خطا", "رمز عبور و تکرار آن مطابقت ندارند")
                return
            user.password = self.le_password.text()
        
        user.name = self.le_fullname.text().strip()
        user.role = self.role_fa_to_db(self.cb_role.currentText())
        user.phone = self.le_phone.text().strip()
        user.nat_id = self.le_nat_id.text().strip()
        user.spec = self.le_spec.text().strip()
        user.gender = self.cb_gender.currentText()
        user.desc = self.le_desc.text().strip()
        user.is_active = 1 if self.cb_status.currentText() == "فعال" else 0
        
        try:
            self.session.commit()
            QMessageBox.information(self, "موفق", "اطلاعات کاربر با موفقیت ویرایش شد")
            self.load_users()
            self.clear_form()
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "خطا", f"خطا در ویرایش کاربر:\n{str(e)}")
    
    def toggle_user_status(self):
        if not self.selected_user_id:
            QMessageBox.warning(self, "خطا", "لطفاً یک کاربر را انتخاب کنید")
            return
        
        user = self.session.query(User).get(self.selected_user_id)
        if not user:
            QMessageBox.warning(self, "خطا", "کاربر یافت نشد")
            return
        
        if self.parent and hasattr(self.parent, 'current_user') and user.username == self.parent.current_user:
            QMessageBox.warning(self, "خطا", "نمی‌توانید حساب کاربری خود را غیرفعال کنید")
            return
        
        action = "غیرفعال" if user.is_active else "فعال"
        reply = QMessageBox.question(self, "تایید", f"آیا از {action} کردن کاربر {user.username} اطمینان دارید؟",
                                     QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            try:
                user.is_active = 0 if user.is_active else 1
                self.session.commit()
                QMessageBox.information(self, "موفق", f"کاربر {user.username} {action} شد")
                self.load_users()
                self.clear_form()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, "خطا", f"خطا در تغییر وضعیت:\n{str(e)}")
    
    def clear_form(self):
        self.selected_user_id = None
        self.le_username.clear()
        self.le_password.clear()
        self.le_password_confirm.clear()
        self.le_fullname.clear()
        self.le_phone.clear()
        self.le_nat_id.clear()
        self.le_spec.clear()
        self.le_desc.clear()
        self.cb_role.setCurrentIndex(0)
        self.cb_gender.setCurrentIndex(0)
        self.cb_status.setCurrentIndex(0)
    
    def on_select_row(self):
        rows = self.table.selectedItems()
        if rows:
            row = rows[0].row()
            self.selected_user_id = self.table.item(row, 0).data(Qt.UserRole)
            user = self.session.query(User).get(self.selected_user_id)
            if user:
                self.le_username.setText(user.username or "")
                self.le_password.clear()
                self.le_password_confirm.clear()
                self.le_fullname.setText(user.name or "")
                self.cb_role.setCurrentText(self.role_db_to_fa(user.role))
                self.le_phone.setText(user.phone or "")
                self.le_nat_id.setText(user.nat_id or "")
                self.le_spec.setText(user.spec or "")
                self.cb_gender.setCurrentText(user.gender or "")
                self.cb_status.setCurrentText("فعال" if user.is_active else "غیرفعال")
                self.le_desc.setText(user.desc or "")
    
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
