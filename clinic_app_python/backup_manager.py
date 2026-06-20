#!/usr/bin/env python3
"""
مدیریت خودکار بکاپ‌گیری از دیتابیس
فقط یک بار در روز بکاپ گرفته می‌شود
"""

import os
import shutil
import datetime
import jdatetime
from pathlib import Path

DB_PATH = "clinic_data.db"
BACKUP_DIR = "Backups"
LAST_BACKUP_FILE = ".last_backup"

def get_last_backup_date():
    """دریافت تاریخ آخرین بکاپ"""
    if os.path.exists(LAST_BACKUP_FILE):
        with open(LAST_BACKUP_FILE, 'r', encoding='utf-8') as f:
            try:
                return jdatetime.datetime.strptime(f.read().strip(), "%Y/%m/%d").date()
            except:
                return None
    return None

def save_last_backup_date():
    """ذخیره تاریخ آخرین بکاپ"""
    today = jdatetime.date.today()
    with open(LAST_BACKUP_FILE, 'w', encoding='utf-8') as f:
        f.write(today.strftime("%Y/%m/%d"))

def ensure_backup_dir():
    """ایجاد پوشه Backups اگر وجود ندارد"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        return True
    return False

def get_backup_filename():
    """ایجاد نام فایل پشتیبان با تاریخ و ساعت شمسی"""
    now = jdatetime.datetime.now()
    return f"backup_{now.strftime('%Y_%m_%d_%H_%M_%S')}.db"

def create_backup():
    """گرفتن بکاپ از دیتابیس"""
    ensure_backup_dir()
    
    if not os.path.exists(DB_PATH):
        print(f"⚠️ فایل دیتابیس {DB_PATH} یافت نشد!")
        return False
    
    backup_name = get_backup_filename()
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    
    try:
        shutil.copy2(DB_PATH, backup_path)
        size = os.path.getsize(backup_path)
        size_str = f"{size / 1024:.1f} KB" if size < 1024*1024 else f"{size / (1024*1024):.1f} MB"
        print(f"✅ بکاپ گرفته شد: {backup_name} ({size_str})")
        return True
    except Exception as e:
        print(f"❌ خطا در گرفتن بکاپ: {e}")
        return False

def delete_old_backups(days=30):
    """حذف بکاپ‌های قدیمی‌تر از تعداد روز مشخص شده"""
    if not os.path.exists(BACKUP_DIR):
        return
    
    now = jdatetime.datetime.now()
    deleted_count = 0
    
    for filename in os.listdir(BACKUP_DIR):
        if filename.startswith("backup_") and filename.endswith(".db"):
            filepath = os.path.join(BACKUP_DIR, filename)
            try:
                parts = filename.replace("backup_", "").replace(".db", "").split("_")
                if len(parts) >= 3:
                    year = int(parts[0])
                    month = int(parts[1])
                    day = int(parts[2])
                    file_date = jdatetime.date(year, month, day)
                    days_diff = (now.date() - file_date).days
                    
                    if days_diff > days:
                        os.remove(filepath)
                        deleted_count += 1
            except Exception as e:
                pass
    
    if deleted_count > 0:
        print(f"✅ {deleted_count} بکاپ قدیمی‌تر از {days} روز حذف شد")

def list_backups():
    """نمایش لیست بکاپ‌های موجود"""
    if not os.path.exists(BACKUP_DIR):
        return
    
    backups = list(Path(BACKUP_DIR).glob("backup_*.db"))
    if not backups:
        return
    
    print(f"\n📋 لیست بکاپ‌های موجود (آخرین 5 عدد):")
    print("-" * 60)
    for backup in sorted(backups, reverse=True)[:5]:
        size = backup.stat().st_size
        size_str = f"{size / 1024:.1f} KB" if size < 1024*1024 else f"{size / (1024*1024):.1f} MB"
        print(f"   📄 {backup.name} ({size_str})")
    print("-" * 60)

def run_backup():
    """اجرای کامل عملیات بکاپ (فقط در صورت نیاز)"""
    last_backup = get_last_backup_date()
    today = jdatetime.date.today()
    
    # اگر امروز بکاپ گرفته شده، نیازی به بکاپ جدید نیست
    if last_backup == today:
        print("ℹ️ امروز قبلاً بکاپ گرفته شده است. (بکاپ روزانه)")
        return
    
    print("\n" + "=" * 50)
    print("   📦 سیستم بکاپ خودکار")
    print("=" * 50)
    
    # حذف بکاپ‌های قدیمی
    delete_old_backups(30)
    
    # گرفتن بکاپ جدید
    create_backup()
    
    # ذخیره تاریخ آخرین بکاپ
    save_last_backup_date()
    
    # نمایش بکاپ‌های موجود
    list_backups()
    
    print("=" * 50)

if __name__ == "__main__":
    run_backup()
