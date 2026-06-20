"""
پنجره صدور قبض - فقط قابلیت چاپ
"""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QFrame, QMessageBox, QScrollArea, QWidget
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QDesktopServices
from PySide6.QtCore import QUrl
from database.engine import SessionLocal
from database.models import Appointment
import jdatetime
import os
import tempfile

def safe_int(value):
    try:
        if value is None:
            return 0
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            value = value.replace(",", "").strip()
            if '.' in value:
                return int(float(value))
            return int(value) if value else 0
        return 0
    except:
        return 0

class ReceiptDialog(QDialog):
    def __init__(self, appointment, parent=None):
        super().__init__(parent)
        self.appointment = appointment
        self.session = SessionLocal()
        
        self.setWindowTitle(f"قبض نوبت - {appointment.patient_name}")
        self.setModal(True)
        self.setFixedSize(480, 580)
        self.setLayoutDirection(Qt.RightToLeft)
        
        self.setup_ui()
        self.load_receipt_data()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(10, 10, 10, 10)
        
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(8)
        
        self.btn_print = QPushButton("🖨️ چاپ")
        self.btn_print.setStyleSheet("""
            QPushButton {
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-weight: bold;
                font-size: 12px;
            }
            QPushButton:hover { background: #2563eb; }
        """)
        self.btn_print.clicked.connect(self.print_receipt)
        btn_layout.addWidget(self.btn_print)
        
        self.btn_close = QPushButton("✖️ بستن")
        self.btn_close.setStyleSheet("""
            QPushButton {
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-weight: bold;
                font-size: 12px;
            }
            QPushButton:hover { background: #dc2626; }
        """)
        self.btn_close.clicked.connect(self.accept)
        btn_layout.addWidget(self.btn_close)
        
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.receipt_widget = QWidget()
        self.receipt_widget.setStyleSheet("background: white;")
        self.receipt_layout = QVBoxLayout(self.receipt_widget)
        self.receipt_layout.setSpacing(8)
        self.receipt_layout.setContentsMargins(15, 15, 15, 15)
        
        scroll.setWidget(self.receipt_widget)
        layout.addWidget(scroll)
    
    def load_receipt_data(self):
        for i in reversed(range(self.receipt_layout.count())):
            item = self.receipt_layout.itemAt(i)
            if item.widget():
                item.widget().deleteLater()
        
        header = QFrame()
        header.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #1e3a5f, stop:1 #2563eb);
                border-radius: 10px;
                margin-bottom: 10px;
            }
        """)
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(15, 12, 15, 12)
        
        title = QLabel("مرکز مشاوره آرامش")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: white;")
        header_layout.addWidget(title)
        
        subtitle = QLabel("قبض نوبت مشاوره")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("font-size: 11px; color: #cbd5e1;")
        header_layout.addWidget(subtitle)
        
        self.receipt_layout.addWidget(header)
        
        info_frame = QFrame()
        info_frame.setStyleSheet("QFrame { background: #f8fafc; border-radius: 8px; margin-bottom: 10px; }")
        info_layout = QVBoxLayout(info_frame)
        info_layout.setSpacing(6)
        
        row_top = QHBoxLayout()
        lbl_no = QLabel(f"شماره قبض: {self.appointment.id:06d}")
        lbl_no.setStyleSheet("font-size: 10px; color: #64748b;")
        row_top.addWidget(lbl_no)
        row_top.addStretch()
        lbl_date = QLabel(f"تاریخ: {jdatetime.datetime.now().strftime('%Y/%m/%d')}")
        lbl_date.setStyleSheet("font-size: 10px; color: #64748b;")
        row_top.addWidget(lbl_date)
        info_layout.addLayout(row_top)
        
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet("background-color: #e2e8f0; max-height: 1px;")
        info_layout.addWidget(line)
        
        self.add_info_row(info_layout, "نام مراجع:", self.appointment.patient_name or "-")
        
        if self.appointment.patient2_name:
            self.add_info_row(info_layout, "نام همسر:", self.appointment.patient2_name)
        
        self.add_info_row(info_layout, "استاد:", self.appointment.doctor or "-")
        self.add_info_row(info_layout, "تاریخ نوبت:", self.appointment.date or "-")
        self.add_info_row(info_layout, "ساعت نوبت:", self.appointment.time or "-")
        self.add_info_row(info_layout, "نوع نوبت:", self.appointment.type or "-")
        self.add_info_row(info_layout, "موضوع:", self.appointment.subject or "-")
        
        line2 = QFrame()
        line2.setFrameShape(QFrame.HLine)
        line2.setStyleSheet("background-color: #e2e8f0; max-height: 1px; margin: 5px 0;")
        info_layout.addWidget(line2)
        
        # بررسی وضعیت پرداخت
        is_free = self.appointment.is_free
        if is_free == 1 or is_free == True:
            status_text = "رایگان"
            status_color = "#10b981"
            cost_text = "0 تومان"
        else:
            status_text = "پرداختی"
            status_color = "#ef4444"
            final_cost = safe_int(self.appointment.final_cost)
            cost_text = f"{final_cost:,} تومان"
        
        row_cost = QHBoxLayout()
        lbl_cost = QLabel("مبلغ:")
        lbl_cost.setStyleSheet("font-size: 12px; font-weight: bold; color: #1e293b;")
        row_cost.addWidget(lbl_cost)
        row_cost.addStretch()
        val_cost = QLabel(cost_text)
        val_cost.setStyleSheet(f"font-size: 13px; font-weight: bold; color: {status_color};")
        row_cost.addWidget(val_cost)
        info_layout.addLayout(row_cost)
        
        row_status = QHBoxLayout()
        lbl_status = QLabel("وضعیت:")
        lbl_status.setStyleSheet("font-size: 11px; color: #64748b;")
        row_status.addWidget(lbl_status)
        row_status.addStretch()
        val_status = QLabel(status_text)
        val_status.setStyleSheet(f"font-size: 11px; color: {status_color};")
        row_status.addWidget(val_status)
        info_layout.addLayout(row_status)
        
        self.receipt_layout.addWidget(info_frame)
        
        footer = QFrame()
        footer.setStyleSheet("QFrame { background: #f1f5f9; border-radius: 8px; margin-top: 10px; }")
        footer_layout = QVBoxLayout(footer)
        footer_layout.setSpacing(4)
        
        thanks = QLabel("🙏 با تشکر از اعتماد شما")
        thanks.setAlignment(Qt.AlignCenter)
        thanks.setStyleSheet("font-size: 11px; font-weight: bold; color: #1e3a5f;")
        footer_layout.addWidget(thanks)
        
        note = QLabel("📌 لطفاً ۱۵ دقیقه قبل از ساعت مقرر حضور داشته باشید")
        note.setAlignment(Qt.AlignCenter)
        note.setStyleSheet("font-size: 9px; color: #64748b;")
        footer_layout.addWidget(note)
        
        self.receipt_layout.addWidget(footer)
        self.receipt_layout.addStretch()
    
    def add_info_row(self, layout, label, value):
        row = QHBoxLayout()
        lbl = QLabel(label)
        lbl.setStyleSheet("font-size: 11px; font-weight: bold; color: #334155;")
        lbl.setFixedWidth(85)
        row.addWidget(lbl)
        
        val = QLabel(value)
        val.setStyleSheet("font-size: 11px; color: #1e293b;")
        row.addWidget(val)
        row.addStretch()
        layout.addLayout(row)
    
    def generate_html(self):
        has_spouse = bool(self.appointment.patient2_name)
        spouse_html = f'<div class="info-row"><span class="info-label">نام همسر:</span><span class="info-value">{self.appointment.patient2_name}</span></div>' if has_spouse else ''
        
        is_free = self.appointment.is_free
        if is_free == 1 or is_free == True:
            status_text = "رایگان"
            status_color = "#10b981"
            cost_text = "0 تومان"
        else:
            status_text = "پرداختی"
            status_color = "#ef4444"
            final_cost = safe_int(self.appointment.final_cost)
            cost_text = f"{final_cost:,} تومان"
        
        html = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head><meta charset="UTF-8"><title>قبض نوبت - {self.appointment.patient_name}</title>
        <style>
            body {{ font-family: Tahoma, sans-serif; margin: 0; padding: 15px; background: white; }}
            .header {{ background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 12px; text-align: center; border-radius: 10px; margin-bottom: 15px; }}
            .header h2 {{ margin: 0; font-size: 16px; }}
            .info {{ background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 15px; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }}
            .info-label {{ font-weight: bold; width: 85px; font-size: 11px; }}
            .info-value {{ flex: 1; text-align: left; font-size: 11px; }}
            .cost-row {{ display: flex; justify-content: space-between; padding: 8px 0; margin-top: 8px; border-top: 2px solid #cbd5e1; }}
            .cost-value {{ font-weight: bold; font-size: 13px; color: {status_color}; }}
            .footer {{ text-align: center; padding: 10px; background: #f1f5f9; border-radius: 8px; margin-top: 15px; }}
            @media print {{ body {{ padding: 0; }} }}
        </style>
        </head>
        <body>
            <div class="header"><h2>🏢 مرکز مشاوره آرامش</h2><p>قبض نوبت مشاوره</p></div>
            <div class="info">
                <div class="info-row"><span class="info-label">شماره قبض:</span><span class="info-value">{self.appointment.id:06d}</span></div>
                <div class="info-row"><span class="info-label">تاریخ صدور:</span><span class="info-value">{jdatetime.datetime.now().strftime('%Y/%m/%d')}</span></div>
                <div class="info-row"><span class="info-label">نام مراجع:</span><span class="info-value">{self.appointment.patient_name or '-'}</span></div>
                {spouse_html}
                <div class="info-row"><span class="info-label">استاد:</span><span class="info-value">{self.appointment.doctor or '-'}</span></div>
                <div class="info-row"><span class="info-label">تاریخ نوبت:</span><span class="info-value">{self.appointment.date or '-'}</span></div>
                <div class="info-row"><span class="info-label">ساعت نوبت:</span><span class="info-value">{self.appointment.time or '-'}</span></div>
                <div class="info-row"><span class="info-label">نوع نوبت:</span><span class="info-value">{self.appointment.type or '-'}</span></div>
                <div class="info-row"><span class="info-label">موضوع:</span><span class="info-value">{self.appointment.subject or '-'}</span></div>
                <div class="cost-row"><span class="info-label">مبلغ:</span><span class="cost-value">{cost_text}</span></div>
                <div class="info-row"><span class="info-label">وضعیت:</span><span class="info-value" style="color:{status_color}">{status_text}</span></div>
            </div>
            <div class="footer"><p>🙏 با تشکر از اعتماد شما</p><p>☎️ ۰۲۱-۱۲۳۴۵۶۷۸</p></div>
        </body>
        </html>
        """
        return html
    
    def print_receipt(self):
        html = self.generate_html()
        temp_file = os.path.join(tempfile.gettempdir(), f"receipt_{self.appointment.id}.html")
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(html)
        QDesktopServices.openUrl(QUrl.fromLocalFile(temp_file))
    
    def __del__(self):
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass