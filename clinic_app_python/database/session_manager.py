"""
مدیریت مرکزی Session برای کل برنامه
جلوگیری از ایجاد Sessionهای متعدد و مدیریت خودکار بستن آنها
"""

from contextlib import contextmanager
from database.engine import SessionLocal

class SessionManager:
    """مدیریت مرکزی Session‌های دیتابیس"""
    _instance = None
    _session = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_session(self):
        """دریافت Session (همان یک نمونه در کل برنامه)"""
        if self._session is None:
            self._session = SessionLocal()
        return self._session
    
    def close_session(self):
        """بستن Session در صورت وجود"""
        if self._session:
            self._session.close()
            self._session = None
    
    def refresh_session(self):
        """بازنشانی Session (برای مواقع خاص)"""
        self.close_session()
        return self.get_session()

@contextmanager
def get_db_session():
    """Context manager برای استفاده خودکار از Session"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# نمونه گلوبال برای استفاده در سراسر برنامه
db_session = SessionManager()

# تابع کمکی برای استفاده آسان
def get_session():
    return db_session.get_session()

def close_all_sessions():
    db_session.close_session()
