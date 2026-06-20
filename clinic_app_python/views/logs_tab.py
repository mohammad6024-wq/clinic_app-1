from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QLineEdit,
    QPushButton, QTableWidget, QTableWidgetItem, QMessageBox, QHeaderView, QAbstractItemView
)
from PySide6.QtCore import Qt
from database.engine import SessionLocal
from database.models import ActivityLog

class LogsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.session = SessionLocal()
        self.setup_ui()
        self.load_logs()
    
    def set_readonly_mode(self, readonly=True):
        """تنظیم حالت فقط خواندنی برای لاگ‌ها (مدیر)"""
        if readonly:
            self.btn_delete.setEnabled(False)
            self.btn_delete.setToolTip("شما مجوز حذف لاگ‌ها را ندارید")
        else:
            self.btn_delete.setEnabled(True)
    
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        
        filter_frame = QHBoxLayout()
        
        filter_frame.addWidget(QLabel("کاربر:"))
        self.filter_user = QComboBox()
        self.filter_user.addItem("همه")
        filter_frame.addWidget(self.filter_user)
        
        filter_frame.addWidget(QLabel("عملیات:"))
        self.filter_action = QComboBox()
        self.filter_action.addItem("همه")
        filter_frame.addWidget(self.filter_action)
        
        filter_frame.addWidget(QLabel("تاریخ:"))
        self.filter_date = QLineEdit()
        self.filter_date.setPlaceholderText("مثال: 1403/01/15")
        self.filter_date.setMinimumWidth(100)
        filter_frame.addWidget(self.filter_date)
        
        self.btn_filter = QPushButton("اعمال فیلتر")
        self.btn_filter.setStyleSheet("background-color: #3b82f6; color: white;")
        filter_frame.addWidget(self.btn_filter)
        
        self.btn_refresh = QPushButton("🔄 بروزرسانی")
        filter_frame.addWidget(self.btn_refresh)
        
        self.btn_delete = QPushButton("🗑️ حذف انتخاب شده‌ها")
        self.btn_delete.setStyleSheet("background-color: #ef4444; color: white;")
        filter_frame.addWidget(self.btn_delete)
        
        filter_frame.addStretch()
        main_layout.addLayout(filter_frame)
        
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["شناسه", "زمان", "کاربر", "عملیات", "جزئیات"])
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setAlternatingRowColors(True)
        main_layout.addWidget(self.table)
        
        self.btn_filter.clicked.connect(self.load_logs)
        self.btn_refresh.clicked.connect(self.refresh_filters)
        self.btn_delete.clicked.connect(self.delete_selected_logs)
        
        self.load_filter_options()
    
    def load_filter_options(self):
        try:
            users = self.session.query(ActivityLog.username).distinct().all()
            self.filter_user.clear()
            self.filter_user.addItem("همه")
            for user in users:
                if user[0]:
                    self.filter_user.addItem(user[0])
            
            actions = self.session.query(ActivityLog.action_type).distinct().all()
            self.filter_action.clear()
            self.filter_action.addItem("همه")
            for action in actions:
                if action[0]:
                    self.filter_action.addItem(action[0])
        except:
            pass
    
    def refresh_filters(self):
        self.filter_user.setCurrentIndex(0)
        self.filter_action.setCurrentIndex(0)
        self.filter_date.clear()
        self.load_logs()
    
    def load_logs(self):
        self.table.setRowCount(0)
        
        try:
            query = self.session.query(ActivityLog).order_by(ActivityLog.id.desc())
            
            if self.filter_user.currentText() != "همه":
                query = query.filter(ActivityLog.username == self.filter_user.currentText())
            
            if self.filter_action.currentText() != "همه":
                query = query.filter(ActivityLog.action_type == self.filter_action.currentText())
            
            if self.filter_date.text().strip():
                date_filter = self.filter_date.text().strip()
                query = query.filter(ActivityLog.timestamp.like(f"{date_filter}%"))
            
            logs = query.limit(500).all()
            
            for i, log in enumerate(logs):
                self.table.insertRow(i)
                self.table.setItem(i, 0, QTableWidgetItem(str(log.id)))
                self.table.setItem(i, 1, QTableWidgetItem(log.timestamp or ""))
                self.table.setItem(i, 2, QTableWidgetItem(log.username or ""))
                self.table.setItem(i, 3, QTableWidgetItem(log.action_type or ""))
                self.table.setItem(i, 4, QTableWidgetItem(log.description or ""))
                self.table.item(i, 0).setData(Qt.UserRole, log.id)
        except Exception as e:
            print(f"Error loading logs: {e}")
    
    def delete_selected_logs(self):
        selected = self.table.selectedItems()
        if not selected:
            QMessageBox.warning(self, "خطا", "لطفاً حداقل یک رکورد را انتخاب کنید")
            return
        
        row_set = set()
        for item in selected:
            row_set.add(item.row())
        
        log_ids = []
        for row in row_set:
            log_id = self.table.item(row, 0).data(Qt.UserRole)
            log_ids.append(log_id)
        
        reply = QMessageBox.question(self, "تایید حذف",
            f"آیا از حذف {len(log_ids)} رکورد اطمینان دارید؟",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            try:
                for log_id in log_ids:
                    log = self.session.query(ActivityLog).get(log_id)
                    if log:
                        self.session.delete(log)
                self.session.commit()
                QMessageBox.information(self, "موفق", f"{len(log_ids)} رکورد با موفقیت حذف شد")
                self.load_logs()
                self.load_filter_options()
            except Exception as e:
                self.session.rollback()
                QMessageBox.critical(self, "خطا", f"خطا در حذف:\n{str(e)}")
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
