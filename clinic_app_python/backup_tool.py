#!/usr/bin/env python3
"""
ابزار پشتیبان‌گیری و بازیابی دیتابیس
استفاده: python backup_tool.py [backup|restore|list]
"""

import sqlite3
import shutil
import os
import sys
import datetime
from pathlib import Path

DB_PATH = "clinic_data.db"
BACKUP_DIR = "backups"

def ensure_backup_dir():
    """ایجاد پوشه backups اگر وجود ندارد"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"✅ پوشه {BACKUP_DIR} ایجاد شد")

def get_backup_filename():
    """ایجاد نام فایل پشتیبان با تاریخ و زمان"""
    now = datetime.datetime.now()
    return f"backup_{now.strftime('%Y%m%d_%H%M%S')}.db"

def backup():
    """گرفتن پشتیبان از دیتابیس فعلی"""
    ensure_backup_dir()
    
    if not os.path.exists(DB_PATH):
        print(f"❌ فایل دیتابیس {DB_PATH} یافت نشد!")
        return False
    
    backup_name = get_backup_filename()
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    
    try:
        shutil.copy2(DB_PATH, backup_path)
        print(f"✅ پشتیبان با موفقیت گرفته شد: {backup_path}")
        
        # نمایش حجم فایل
        size = os.path.getsize(backup_path)
        if size < 1024:
            print(f"   حجم: {size} bytes")
        elif size < 1024 * 1024:
            print(f"   حجم: {size / 1024:.2f} KB")
        else:
            print(f"   حجم: {size / (1024*1024):.2f} MB")
        
        return True
    except Exception as e:
        print(f"❌ خطا در گرفتن پشتیبان: {e}")
        return False

def restore(backup_name=None):
    """بازیابی دیتابیس از یک فایل پشتیبان"""
    ensure_backup_dir()
    
    if not backup_name:
        # نمایش لیست پشتیبان‌ها
        list_backups()
        print("\nلطفاً نام فایل پشتیبان را وارد کنید (فقط نام فایل):")
        backup_name = input("> ").strip()
    
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    
    if not os.path.exists(backup_path):
        print(f"❌ فایل پشتیبان {backup_path} یافت نشد!")
        return False
    
    # گرفتن یک پشتیبان خودکار قبل از بازیابی
    auto_backup = get_backup_filename()
    auto_backup_path = os.path.join(BACKUP_DIR, f"before_restore_{auto_backup}")
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, auto_backup_path)
        print(f"ℹ پشتیبان خودکار از دیتابیس فعلی گرفته شد: {auto_backup_path}")
    
    try:
        shutil.copy2(backup_path, DB_PATH)
        print(f"✅ دیتابیس با موفقیت از {backup_name} بازیابی شد")
        return True
    except Exception as e:
        print(f"❌ خطا در بازیابی: {e}")
        return False

def list_backups():
    """نمایش لیست پشتیبان‌های موجود"""
    ensure_backup_dir()
    
    backups = list(Path(BACKUP_DIR).glob("backup_*.db"))
    if not backups:
        print("ℹ هیچ پشتیبان‌ای یافت نشد")
        return
    
    print("\n📁 لیست پشتیبان‌های موجود:")
    print("-" * 60)
    for i, backup in enumerate(sorted(backups, reverse=True), 1):
        # استخراج تاریخ از نام فایل
        name = backup.name
        date_str = name.replace("backup_", "").replace(".db", "")
        size = backup.stat().st_size
        size_str = f"{size / 1024:.1f} KB" if size < 1024*1024 else f"{size / (1024*1024):.1f} MB"
        print(f"  {i}. {name} ({size_str})")
    print("-" * 60)

def show_db_info():
    """نمایش اطلاعات دیتابیس"""
    if not os.path.exists(DB_PATH):
        print("❌ دیتابیس وجود ندارد")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    print("\n📊 اطلاعات دیتابیس:")
    print("=" * 50)
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  📋 {table_name}: {count} رکورد")
    
    conn.close()
    
    size = os.path.getsize(DB_PATH)
    if size < 1024:
        size_str = f"{size} bytes"
    elif size < 1024*1024:
        size_str = f"{size / 1024:.2f} KB"
    else:
        size_str = f"{size / (1024*1024):.2f} MB"
    print("=" * 50)
    print(f"  💾 حجم کل: {size_str}")
    print("=" * 50)

def main():
    print("\n" + "="*50)
    print("   ابزار مدیریت پشتیبان کلینیک")
    print("="*50 + "\n")
    
    if len(sys.argv) < 2:
        print("استفاده:")
        print("  python backup_tool.py backup    - گرفتن پشتیبان")
        print("  python backup_tool.py restore   - بازیابی از پشتیبان")
        print("  python backup_tool.py list      - نمایش لیست پشتیبان‌ها")
        print("  python backup_tool.py info      - اطلاعات دیتابیس")
        return
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        backup()
    elif command == "restore":
        restore()
    elif command == "list":
        list_backups()
    elif command == "info":
        show_db_info()
    else:
        print(f"❌ دستور نامعتبر: {command}")

if __name__ == "__main__":
    main()
