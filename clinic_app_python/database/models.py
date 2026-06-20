from sqlalchemy import Column, Integer, String, Float, Text
from database.engine import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String)
    password_hash = Column(String)
    name = Column(String)
    role = Column(String)
    phone = Column(String)
    nat_id = Column(String)
    spec = Column(String)
    gender = Column(String)
    desc = Column(Text)
    created_at = Column(String)
    is_active = Column(Integer, default=1)
    deleted_at = Column(String)
    failed_login_count = Column(Integer, default=0)
    last_login_at = Column(String)

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    spec = Column(String)
    phone = Column(String)
    desc = Column(Text)
    working_days = Column(String, default="همه روزه")
    gender = Column(String)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    nat_id = Column(String, unique=True)
    type = Column(String)
    phone = Column(String)
    gender = Column(String)
    balance = Column(Float, default=0)
    wallet_balance = Column(Float, default=0)
    desc = Column(Text)
    is_blocked = Column(Integer, default=0)   # اضافه شده

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True)
    date = Column(String)
    time = Column(String)
    shift = Column(String)
    doctor = Column(String)
    patient_name = Column(String)
    nat_id = Column(String)
    phone = Column(String)
    gender = Column(String)
    type = Column(String)
    subject = Column(String)
    patient2_name = Column(String)
    patient2_nat_id = Column(String)
    patient2_phone = Column(String)
    desc = Column(Text)
    status = Column(String, default="فعال")
    ref_type = Column(String)
    ref_model = Column(String, default="مرکز به استاد")
    doc_share_pct = Column(Float, default=70)
    doc_share = Column(String, default="50%")
    center_share = Column(String, default="50%")
    cost = Column(Float, default=0)
    discount = Column(Float, default=0)
    final_cost = Column(Float, default=0)
    is_free = Column(Integer, default=0)
    payment_status = Column(String, default="بدهکار")
    pay_status = Column(String, default="بدهکار")
    payment_method = Column(String)
    remark = Column(Text)
    is_settled = Column(Integer, default=0)

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    time_range = Column(String)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    is_couple = Column(Integer, default=0)

class DoctorAttendance(Base):
    __tablename__ = "doctor_attendance"
    id = Column(Integer, primary_key=True)
    doctor_name = Column(String)
    date = Column(String)
    status = Column(String)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(String)
    username = Column(String)
    action_type = Column(String)
    description = Column(Text)
    is_hidden = Column(Integer, default=0)

class SmsSetting(Base):
    __tablename__ = "sms_settings"
    id = Column(Integer, primary_key=True)
    api_key = Column(String)
    sender_number = Column(String)
    patient_template = Column(Text)
    doctor_single_template = Column(Text)
    doctor_bulk_template = Column(Text)

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    date = Column(String)
    amount = Column(Float)
    description = Column(Text)

class ClinicExpense(Base):
    __tablename__ = "clinic_expenses"
    id = Column(Integer, primary_key=True)
    amount = Column(Float)
    date = Column(String)
    description = Column(Text)

class PatientTransaction(Base):
    __tablename__ = "patient_transactions"
    id = Column(Integer, primary_key=True)
    patient_nat_id = Column(String)
    date = Column(String)
    time = Column(String)
    amount = Column(Float)
    trans_type = Column(String)
    description = Column(Text)

class DoctorSettlementLog(Base):
    __tablename__ = "doctor_settlement_logs"
    id = Column(Integer, primary_key=True)
    doctor = Column(String)
    amount = Column(Float)
    start_date = Column(String)
    end_date = Column(String)
    settled_at = Column(String)
    appointment_count = Column(Integer, default=0)
    description = Column(Text)