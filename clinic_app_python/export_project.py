import os
import sqlite3
from pathlib import Path

def should_skip(filepath):
    """فایل‌ها و پوشه‌هایی که نباید خروجی بگیریم"""
    skip_dirs = ['__pycache__', '.git', 'venv', 'env', '.idea', '.vscode', 'backups']
    skip_files = ['project_export.txt', 'export_project.py', 'clinic_data.db', '*.pyc', '*.pyo']
    skip_ext = ['.pyc', '.so', '.dll', '.exe', '.zip', '.rar', '.db-shm', '.db-wal']
    
    for skip in skip_dirs:
        if skip in filepath.parts:
            return True
    
    for ext in skip_ext:
        if filepath.suffix == ext:
            return True
    
    for pattern in skip_files:
        if pattern.startswith('*'):
            if filepath.suffix == pattern[1:]:
                return True
        elif filepath.name == pattern:
            return True
    
    return False

def get_file_content(filepath):
    """خواندن محتوای فایل با کدگذاری مناسب"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='cp1256') as f:
                return f.read()
        except:
            return "[BINARY FILE - CONTENT NOT SHOWN]"
    except Exception as e:
        return f"[ERROR READING FILE: {e}]"

def export_project(output_file="project_export.txt"):
    project_root = Path.cwd()
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("=" * 80 + "\n")
        out.write(f"EXPORTED PROJECT: {project_root.name}\n")
        out.write(f"Path: {project_root}\n")
        out.write(f"Export Date: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.write("=" * 80 + "\n\n")
        
        # ========== 1. ساختار پوشه‌ها ==========
        out.write("=" * 80 + "\n")
        out.write("FOLDER STRUCTURE\n")
        out.write("=" * 80 + "\n")
        
        for root, dirs, files in os.walk(project_root):
            root_path = Path(root)
            if should_skip(root_path):
                continue
            level = len(root_path.relative_to(project_root).parts)
            indent = "  " * level
            out.write(f"{indent}📁 {root_path.name}/\n")
            
            # فایل‌های متنی را نمایش بده
            for file in sorted(files):
                file_path = root_path / file
                if should_skip(file_path):
                    continue
                # نمایش فقط فایل‌های متنی
                if file.endswith(('.py', '.txt', '.qss', '.md', '.json', '.yml', '.yaml', '.html', '.css', '.js')):
                    out.write(f"{indent}  📄 {file}\n")
                else:
                    out.write(f"{indent}  📦 {file}\n")
        
        # ========== 2. محتوای فایل‌ها ==========
        out.write("\n" + "=" * 80 + "\n")
        out.write("FILE CONTENTS\n")
        out.write("=" * 80 + "\n\n")
        
        for root, dirs, files in os.walk(project_root):
            root_path = Path(root)
            if should_skip(root_path):
                continue
            
            # اول فایل‌های .py و .qss و .txt را خروجی بگیر
            for file in sorted(files):
                file_path = root_path / file
                if should_skip(file_path):
                    continue
                
                # فقط فایل‌های متنی
                if file.endswith(('.py', '.qss', '.txt', '.md', '.json', '.yml', '.yaml')):
                    content = get_file_content(file_path)
                    out.write("\n" + "=" * 80 + "\n")
                    out.write(f"FILE: {file_path.relative_to(project_root)}\n")
                    out.write("=" * 80 + "\n")
                    out.write(content)
                    if not content.endswith('\n'):
                        out.write("\n")
        
        # ========== 3. اطلاعات دیتابیس ==========
        out.write("\n" + "=" * 80 + "\n")
        out.write("DATABASE INFO\n")
        out.write("=" * 80 + "\n")
        
        db_files = list(project_root.glob("*.db"))
        for db_file in db_files:
            out.write(f"\n📀 Database: {db_file.name}\n")
            try:
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                tables = cursor.fetchall()
                
                for table in tables:
                    table_name = table[0]
                    out.write(f"\n  📋 Table: {table_name}\n")
                    
                    # ستون‌ها
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    for col in columns:
                        out.write(f"     - {col[1]} ({col[2]})\n")
                    
                    # تعداد رکوردها
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    out.write(f"     📊 Row count: {count}\n")
                
                conn.close()
            except Exception as e:
                out.write(f"  Error reading db: {e}\n")
        
        # ========== 4. آمار نهایی ==========
        out.write("\n" + "=" * 80 + "\n")
        out.write("EXPORT SUMMARY\n")
        out.write("=" * 80 + "\n")
        
        py_count = 0
        qss_count = 0
        txt_count = 0
        db_count = 0
        
        for root, dirs, files in os.walk(project_root):
            for file in files:
                if file.endswith('.py'):
                    py_count += 1
                elif file.endswith('.qss'):
                    qss_count += 1
                elif file.endswith('.txt'):
                    txt_count += 1
                elif file.endswith('.db'):
                    db_count += 1
        
        out.write(f"\n📊 تعداد فایل‌های Python: {py_count}\n")
        out.write(f"🎨 تعداد فایل‌های QSS: {qss_count}\n")
        out.write(f"📝 تعداد فایل‌های متنی: {txt_count}\n")
        out.write(f"🗄️ تعداد فایل‌های دیتابیس: {db_count}\n")
        
        out.write("\n" + "=" * 80 + "\n")
        out.write("EXPORT COMPLETED\n")
        out.write("=" * 80 + "\n")
    
    print(f"✅ Project exported to: {output_file}")
    print(f"📊 File size: {os.path.getsize(output_file):,} bytes")

if __name__ == "__main__":
    export_project()
