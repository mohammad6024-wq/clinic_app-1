/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: number;
  username: string;
  password?: string;
  password_hash?: string;
  name: string;
  role: 'admin' | 'secretary' | 'supervisor' | 'super_admin';
  phone: string;
  nat_id: string;
  spec?: string;
  gender: string;
  desc?: string;
  created_at: string;
  is_active: number; // 1 for true, 0 for false
  last_login_at?: string;
  failed_login_count?: number;
}

export interface Doctor {
  id: number;
  name: string;
  spec: string;
  phone: string;
  desc?: string;
  working_days: string;
  gender: string;
  nat_id?: string;
  image?: string;
}

export interface Patient {
  id: number;
  name: string;
  nat_id: string; // unique
  type: string; // e.g., عادی, بیمه, VIP
  phone: string;
  gender: string;
  balance: number; // Patient total debt/credit balance
  wallet_balance: number; // Electronic wallet credit
  desc?: string;
  is_blocked: number; // 1 for true, 0 for false
}

export interface Appointment {
  id: number;
  date: string; // Jalali Date (e.g., "1405/03/27")
  time: string; // "14:30"
  shift: string;
  doctor: string;
  patient_name: string;
  nat_id: string;
  phone: string;
  gender: string;
  type: string; // regular/insurance/etc.
  subject: string;
  patient2_name?: string;
  patient2_nat_id?: string;
  patient2_phone?: string;
  desc?: string;
  status: 'فعال' | 'انجام شده' | 'کنسل مراجع' | 'کنسل استاد';
  ref_type?: string;
  ref_model?: string; // default "مرکز به استاد"
  doc_share_pct: number; // default 70
  cost: number;
  discount: number;
  final_cost: number;
  is_free: number; // 0 or 1
  payment_status: 'بدهکار' | 'تسویه شده' | 'رایگان';
  payment_method?: string; // نقدی, کارتخوان, کیف پول
  remark?: string;
  is_settled: number; // Doctor payout settlement status
}

export interface Shift {
  id: number;
  name: string; // e.g., صبح, عصر, شب
  time_range: string; // e.g., "08:00 - 13:30"
}

export interface Subject {
  id: number;
  name: string;
  is_couple: number; // 0 or 1
}

export interface DoctorAttendance {
  id: number;
  doctor_name: string;
  date: string;
  status: 'حاضر' | 'غایب';
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  username: string;
  action_type: string;
  description: string;
  is_hidden: number;
}

export interface SmsSetting {
  id: number;
  api_key: string;
  sender_number: string;
  patient_template?: string;
  doctor_single_template?: string;
  doctor_bulk_template?: string;
  booking_template?: string;
  reminder_template?: string;
  cancel_template?: string;
}

export interface Expense {
  id: number;
  date: string;
  amount: number;
  description: string;
}

export interface PatientTransaction {
  id: number;
  patient_nat_id: string;
  date: string;
  time: string;
  amount: number;
  trans_type: 'شارژ کیف پول' | 'پرداخت نوبت' | 'برگشت وجه';
  description: string;
}

export interface DoctorSettlementLog {
  id: number;
  doctor: string;
  amount: number;
  start_date: string;
  end_date: string;
  settled_at: string;
  appointment_count: number;
  description?: string;
  appointment_ids?: number[];
}

export interface SystemSettings {
  clinicName: string;
  clinicSlogan: string;
  defaultSessionDuration: number; // in minutes
  maxDiscountCap: number; // in Rials / Tomans
  screenAutoLockTimeout: number; // in minutes (0 means disabled)
  isDarkMode: boolean; // active theme
  allowedTabs: {
    supervisor: string[];
    secretary: string[];
  };
  defaultSessionFee: number;
  taxPct: number;
  receiptSlogan: string;
  phoneNumbers: string;
  quickSmsEnabled: boolean;
  autoLogBackup: boolean;
  defaultSidebarCollapsed: boolean; // default collapsed sidebar state setting
  
  // Advanced features added
  clinicLogo?: string; // Base64 representation of custom clinic logo image
  activeFontFamily?: string; // 'Vazirmatn' | 'Shabnam' | 'Yekan' | 'Estedad' | 'Sahel' | 'System' | 'custom'
  uploadedFontData?: string; // Base64 data of custom font uploaded
  uploadedFontName?: string; // e.g. "MyCustomFont"
  
  editPermissions?: {
    secretary_can_edit_appointments: boolean;
    secretary_can_edit_patients: boolean;
    secretary_can_delete: boolean;
    supervisor_can_edit_finance: boolean;
    supervisor_can_delete: boolean;
    supervisor_can_edit_doctors: boolean;
  };
}



