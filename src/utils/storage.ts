/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Doctor, Patient, Appointment, Shift, Subject, ActivityLog, SmsSetting, Expense, PatientTransaction, DoctorSettlementLog, DoctorAttendance, SystemSettings } from '../types';
import { getCurrentJalaliDate, getCurrentJalaliTime } from './jalali';

// Standard storage keys
const KEYS = {
  USERS: 'clinic_users',
  DOCTORS: 'clinic_doctors',
  PATIENTS: 'clinic_patients',
  APPOINTMENTS: 'clinic_appointments',
  SHIFTS: 'clinic_shifts',
  SUBJECTS: 'clinic_subjects',
  ACTIVITY_LOGS: 'clinic_activity_logs',
  SMS_SETTINGS: 'clinic_sms_settings',
  EXPENSES: 'clinic_expenses',
  PATIENT_TRANSACTIONS: 'clinic_patient_transactions',
  DOCTOR_SETTLEMENTS: 'clinic_doctor_settlements',
  DOCTOR_ATTENDANCE: 'clinic_doctor_attendance',
  SESSION_WARNING: 'clinic_session_warning_enabled',
  SYSTEM_SETTINGS: 'clinic_system_settings_v1',
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  clinicName: 'مرکز مشاوره فاطمی',
  clinicSlogan: 'سامانه مرکز مشاوره',
  defaultSessionDuration: 45,
  maxDiscountCap: 150000,
  screenAutoLockTimeout: 10,
  isDarkMode: false,
  allowedTabs: {
    supervisor: ['booking', 'stats', 'patients', 'shiftsSubjects', 'finance', 'reports', 'doctors', 'sms', 'management'],
    secretary: ['booking', 'patients', 'doctors']
  },
  defaultSessionFee: 500000,
  taxPct: 9,
  receiptSlogan: 'خدمت به زائرین و مجاورین کریمه اهل بیت (س) افتخار ماست.',
  phoneNumbers: '۰۲۵-۳۷۷۴۱۵۵',
  quickSmsEnabled: true,
  autoLogBackup: true,
  defaultSidebarCollapsed: true,
  
  // Advanced features default values
  clinicLogo: '',
  activeFontFamily: 'Vazirmatn',
  uploadedFontData: '',
  uploadedFontName: '',
  editPermissions: {
    secretary_can_edit_appointments: true,
    secretary_can_edit_patients: true,
    secretary_can_delete: false,
    supervisor_can_edit_finance: true,
    supervisor_can_delete: true,
    supervisor_can_edit_doctors: true,
  }
};

// Seed Users
const DEFAULT_USERS: User[] = [
  {
    id: 1,
    username: 'admin',
    name: 'آقای دکتر حسینی (مدیر)',
    role: 'admin',
    phone: '09121111111',
    nat_id: '0012345678',
    gender: 'مرد',
    created_at: '1405/01/01',
    is_active: 1,
    password: 'admin'
  },
  {
    id: 2,
    username: 'reception',
    name: 'خانم علوی (منشی رزرویشن)',
    role: 'secretary',
    phone: '09122222222',
    nat_id: '0022345678',
    gender: 'زن',
    created_at: '1405/01/10',
    is_active: 1,
    password: '123'
  },
  {
    id: 3,
    username: 'supervisor',
    name: 'آقای کریمی (ناظر فنی)',
    role: 'supervisor',
    phone: '09123333333',
    nat_id: '0032345678',
    gender: 'مرد',
    created_at: '1405/01/15',
    is_active: 1,
    password: '123'
  }
];

// Seed Doctors
const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 1,
    name: 'دکتر مهران علوی',
    spec: 'روانشناس بالینی (CBT)',
    phone: '09124444444',
    desc: 'متخصص درمان‌های شناختی رفتاری و اضطراب',
    working_days: 'همه روزه',
    gender: 'مرد',
  },
  {
    id: 2,
    name: 'دکتر سارا مهدوی',
    spec: 'روانشناس کودک و نوجوان',
    phone: '09125555555',
    desc: 'متخصص اختلالات یادگیری، بیش‌فعالی و بازی‌درمانی',
    working_days: 'روزهای زوج',
    gender: 'زن',
  },
  {
    id: 3,
    name: 'دکتر علیرضا صدری',
    spec: 'روانپزشک و متخصص اعصاب',
    phone: '09126666666',
    desc: 'متخصص دارودرمانی و روان‌پزشکی بزرگسالان',
    working_days: 'روزهای فرد',
    gender: 'مرد',
  }
];

// Seed Patients
const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 1,
    name: 'محمد حسینی',
    nat_id: '0081234567',
    type: 'عادی',
    phone: '09127777777',
    gender: 'مرد',
    balance: 0,
    wallet_balance: 150000,
    desc: 'بیمار همیشگی کلینیک، خوش‌قول',
    is_blocked: 0,
  },
  {
    id: 2,
    name: 'زهرا کریمی',
    nat_id: '0077654321',
    type: 'بیمه تامین اجتماعی',
    phone: '09128888888',
    gender: 'زن',
    balance: 120000, // Patient owes 120k
    wallet_balance: 0,
    desc: 'نیاز به هماهنگی مجدد قبل از نوبت',
    is_blocked: 0,
  },
  {
    id: 3,
    name: 'علی اکبری',
    nat_id: '1289998888',
    type: 'VIP',
    phone: '09351111111',
    gender: 'مرد',
    balance: 0,
    wallet_balance: 500000,
    desc: 'ارجاعی از دکتر مهران علوی',
    is_blocked: 0,
  }
];

// Seed Shifts
const DEFAULT_SHIFTS: Shift[] = [
  { id: 1, name: 'صبح', time_range: '08:00 - 13:30' },
  { id: 2, name: 'عصر', time_range: '14:00 - 20:30' },
  { id: 3, name: 'شب', time_range: '20:30 - Midnight' }
];

// Seed Subjects
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 1, name: 'مشاوره خانواده', is_couple: 1 },
  { id: 2, name: 'روان‌درمانی فردی', is_couple: 0 },
  { id: 3, name: 'بازی‌درمانی کودک', is_couple: 0 },
  { id: 4, name: 'زوج‌درمانی', is_couple: 1 }
];

// Seed SMS Settings
const DEFAULT_SMS_SETTINGS: SmsSetting = {
  id: 1,
  api_key: 'Kavenegar_MOCK_API_KEY_123456_CLINIC',
  sender_number: '3000500600',
  patient_template: 'مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% ساعت %time% تایید شد.',
  doctor_single_template: 'استاد گرامی %doctor%، نوبت جدید برای مراجع %patient%در تاریخ %date% ساعت %time% ثبت گردید.',
  doctor_bulk_template: 'استاد گرامی %doctor%، خلاصه شیفت شما در تاریخ %date% با موفقیت نهایی گردید.'
};

// Seed Clinic Expenses
const DEFAULT_EXPENSES: Expense[] = [
  { id: 1, date: '1405/03/10', amount: 3500000, description: 'پرداخت بهای خدمات اینترنت یکساله کلینیک' },
  { id: 2, date: '1405/03/15', amount: 1200000, description: 'خرید تجهیزات دفتری و لوازم تحریر اتاق اساتید' },
  { id: 3, date: '1405/03/20', amount: 20000000, description: 'پرداخت اجاره ماهانه فرعی ساختمان آرامش' }
];

// Seed Appointments
const getInitialAppointments = (todayDate: string): Appointment[] => {
  return [
    {
      id: 1,
      date: todayDate,
      time: '09:30',
      shift: 'صبح',
      doctor: 'دکتر مهران علوی',
      patient_name: 'محمد حسینی',
      nat_id: '0081234567',
      phone: '09127777777',
      gender: 'مرد',
      type: 'عادی',
      subject: 'روان‌درمانی فردی',
      desc: 'جلسه چهارم درمانی - تمرکز بر اضطراب کار',
      status: 'فعال',
      ref_type: 'تلفنی',
      ref_model: 'مرکز به استاد',
      doc_share_pct: 70,
      cost: 450000,
      discount: 50000,
      final_cost: 400000,
      is_free: 0,
      payment_status: 'تسویه شده',
      payment_method: 'کیف پول',
      is_settled: 0,
    },
    {
      id: 2,
      date: todayDate,
      time: '15:00',
      shift: 'عصر',
      doctor: 'دکتر سارا مهدوی',
      patient_name: 'زهرا کریمی',
      nat_id: '0077654321',
      phone: '09128888888',
      gender: 'زن',
      type: 'بیمه تامین اجتماعی',
      subject: 'بازی‌درمانی کودک',
      desc: 'پرخاشگری کودک ۷ ساله',
      status: 'فعال',
      ref_type: 'حضوری',
      ref_model: 'مرکز به استاد',
      doc_share_pct: 60,
      cost: 350000,
      discount: 0,
      final_cost: 350000,
      is_free: 0,
      payment_status: 'بدهکار',
      is_settled: 0,
    },
    {
      id: 3,
      date: todayDate,
      time: '17:30',
      shift: 'عصر',
      doctor: 'دکتر علیرضا صدری',
      patient_name: 'علی اکبری',
      nat_id: '1289998888',
      phone: '09351111111',
      gender: 'مرد',
      type: 'VIP',
      subject: 'زوج‌درمانی',
      patient2_name: 'نفیسه صادقی',
      patient2_nat_id: '0054321098',
      patient2_phone: '09129990000',
      desc: 'جلسه اول روانپزشکی زوجین',
      status: 'فعال',
      ref_type: 'تلفنی',
      ref_model: 'استاد به مرکز',
      doc_share_pct: 80,
      cost: 600000,
      discount: 100000,
      final_cost: 500000,
      is_free: 0,
      payment_status: 'تسویه شده',
      payment_method: 'کارتخوان',
      is_settled: 0,
    }
  ];
};

// Seed Patient Transactions
const DEFAULT_TRANSACTIONS: PatientTransaction[] = [
  {
    id: 1,
    patient_nat_id: '0081234567',
    date: '1405/03/15',
    time: '10:00',
    amount: 150000,
    trans_type: 'شارژ کیف پول',
    description: 'افزایش اعتبار کیف پول الکترونیکی بیمار به صورت نقدی'
  },
  {
    id: 2,
    patient_nat_id: '1289998888',
    date: '1405/03/20',
    time: '18:45',
    amount: 500000,
    trans_type: 'شارژ کیف پول',
    description: 'شارژ آنلاین کیف پول مراجع VIP'
  }
];

// Seed Activity Logs
const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: 1,
    timestamp: '1405/03/24 08:30:00',
    username: 'سیستم',
    action_type: 'شروع بکار سیستم',
    description: 'سامانه مدیریت کلینیک روانشناسی آرامش با موفقیت لود گردید',
    is_hidden: 0
  },
  {
    id: 2,
    timestamp: '1405/03/25 14:15:32',
    username: 'admin',
    action_type: 'تعریف پزشک',
    description: 'استاد جدید جناب دکتر علیرضا صدری به لیست روانپزشکان کلینیک پیوست',
    is_hidden: 0
  },
  {
    id: 3,
    timestamp: '1405/03/26 11:10:05',
    username: 'reception',
    action_type: 'ثبت مراجعه‌کننده',
    description: 'پرونده مراجع محترم محمد حسینی با کدملی 0081234567 با موفقیت ایجاد گردید',
    is_hidden: 0
  }
];

// Helper to push data to Express SQLite API
export const syncToDatabase = async (table: string, data: any) => {
  try {
    await fetch('/api/sync-table', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data })
    });
  } catch (err) {
    console.warn(`[Sync Warning] Failed to sync ${table} to SQL DB, keeping local:`, err);
  }
};

// Helper to pull data from Express SQLite API on boot
export const syncFromDatabase = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/get-all-data');
    if (!res.ok) throw new Error('API server returned error state');
    const dbData = await res.json();
    
    if (dbData.users) localStorage.setItem(KEYS.USERS, JSON.stringify(dbData.users));
    if (dbData.doctors) localStorage.setItem(KEYS.DOCTORS, JSON.stringify(dbData.doctors));
    if (dbData.patients) localStorage.setItem(KEYS.PATIENTS, JSON.stringify(dbData.patients));
    if (dbData.appointments) localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(dbData.appointments));
    if (dbData.shifts) localStorage.setItem(KEYS.SHIFTS, JSON.stringify(dbData.shifts));
    if (dbData.subjects) localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(dbData.subjects));
    if (dbData.expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(dbData.expenses));
    if (dbData.patient_transactions) localStorage.setItem(KEYS.PATIENT_TRANSACTIONS, JSON.stringify(dbData.patient_transactions));
    if (dbData.activity_logs) localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(dbData.activity_logs));
    if (dbData.doctor_settlement_logs) localStorage.setItem(KEYS.DOCTOR_SETTLEMENTS, JSON.stringify(dbData.doctor_settlement_logs));
    if (dbData.sms_settings) localStorage.setItem(KEYS.SMS_SETTINGS, JSON.stringify(dbData.sms_settings));
    if (dbData.doctor_attendance) localStorage.setItem(KEYS.DOCTOR_ATTENDANCE, JSON.stringify(dbData.doctor_attendance));
    if (dbData.system_settings) localStorage.setItem(KEYS.SYSTEM_SETTINGS, JSON.stringify(dbData.system_settings));
    
    return true;
  } catch (err) {
    console.warn('[Sync Warning] Server DB not accessible, continuing with localStorage:', err);
    return false;
  }
};

// Initialize Storage Wrapper
export const initStorage = () => {
  const today = getCurrentJalaliDate();
  
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(KEYS.DOCTORS)) {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
  }
  if (!localStorage.getItem(KEYS.PATIENTS)) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(DEFAULT_PATIENTS));
  }
  if (!localStorage.getItem(KEYS.SHIFTS)) {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(DEFAULT_SHIFTS));
  }
  if (!localStorage.getItem(KEYS.SUBJECTS)) {
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
  }
  if (!localStorage.getItem(KEYS.SMS_SETTINGS)) {
    localStorage.setItem(KEYS.SMS_SETTINGS, JSON.stringify(DEFAULT_SMS_SETTINGS));
  }
  if (!localStorage.getItem(KEYS.EXPENSES)) {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
  }
  if (!localStorage.getItem(KEYS.APPOINTMENTS)) {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(getInitialAppointments(today)));
  }
  if (!localStorage.getItem(KEYS.PATIENT_TRANSACTIONS)) {
    localStorage.setItem(KEYS.PATIENT_TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
  }
  if (!localStorage.getItem(KEYS.ACTIVITY_LOGS)) {
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(DEFAULT_LOGS));
  }
  if (!localStorage.getItem(KEYS.DOCTOR_SETTLEMENTS)) {
    localStorage.setItem(KEYS.DOCTOR_SETTLEMENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.DOCTOR_ATTENDANCE)) {
    localStorage.setItem(KEYS.DOCTOR_ATTENDANCE, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SYSTEM_SETTINGS)) {
    localStorage.setItem(KEYS.SYSTEM_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
  }
  
  // Perform background load of database data to overwrite our storage cleanly
  syncFromDatabase().catch(err => console.debug('Initial database sync finished.', err));
};

// State Getters and Setters
export const StorageHelper = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  saveUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    syncToDatabase('users', users);
  },

  getDoctors: (): Doctor[] => JSON.parse(localStorage.getItem(KEYS.DOCTORS) || '[]'),
  saveDoctors: (doctors: Doctor[]) => {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
    syncToDatabase('doctors', doctors);
  },

  getPatients: (): Patient[] => JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]'),
  savePatients: (patients: Patient[]) => {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
    syncToDatabase('patients', patients);
  },

  getAppointments: (): Appointment[] => JSON.parse(localStorage.getItem(KEYS.APPOINTMENTS) || '[]'),
  saveAppointments: (appointments: Appointment[]) => {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    syncToDatabase('appointments', appointments);
  },

  getShifts: (): Shift[] => JSON.parse(localStorage.getItem(KEYS.SHIFTS) || '[]'),
  saveShifts: (shifts: Shift[]) => {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
    syncToDatabase('shifts', shifts);
  },

  getSubjects: (): Subject[] => JSON.parse(localStorage.getItem(KEYS.SUBJECTS) || '[]'),
  saveSubjects: (subjects: Subject[]) => {
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
    syncToDatabase('subjects', subjects);
  },

  getExpenses: (): Expense[] => JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]'),
  saveExpenses: (expenses: Expense[]) => {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    syncToDatabase('expenses', expenses);
  },

  getPatientTransactions: (): PatientTransaction[] => JSON.parse(localStorage.getItem(KEYS.PATIENT_TRANSACTIONS) || '[]'),
  savePatientTransactions: (trans: PatientTransaction[]) => {
    localStorage.setItem(KEYS.PATIENT_TRANSACTIONS, JSON.stringify(trans));
    syncToDatabase('patient_transactions', trans);
  },

  getDoctorSettlements: (): DoctorSettlementLog[] => JSON.parse(localStorage.getItem(KEYS.DOCTOR_SETTLEMENTS) || '[]'),
  saveDoctorSettlements: (settlements: DoctorSettlementLog[]) => {
    localStorage.setItem(KEYS.DOCTOR_SETTLEMENTS, JSON.stringify(settlements));
    syncToDatabase('doctor_settlement_logs', settlements);
  },

  getDoctorAttendance: (): DoctorAttendance[] => JSON.parse(localStorage.getItem(KEYS.DOCTOR_ATTENDANCE) || '[]'),
  saveDoctorAttendance: (attendance: DoctorAttendance[]) => {
    localStorage.setItem(KEYS.DOCTOR_ATTENDANCE, JSON.stringify(attendance));
    syncToDatabase('doctor_attendance', attendance);
  },

  getSmsSettings: (): SmsSetting => JSON.parse(localStorage.getItem(KEYS.SMS_SETTINGS) || JSON.stringify(DEFAULT_SMS_SETTINGS)),
  saveSmsSettings: (settings: SmsSetting) => {
    localStorage.setItem(KEYS.SMS_SETTINGS, JSON.stringify(settings));
    syncToDatabase('sms_settings', [settings]);
  },

  getActivityLogs: (): ActivityLog[] => JSON.parse(localStorage.getItem(KEYS.ACTIVITY_LOGS) || '[]'),
  saveActivityLogs: (logs: ActivityLog[]) => {
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
    syncToDatabase('activity_logs', logs);
  },

  getSessionWarningEnabled: (): boolean => {
    const val = localStorage.getItem(KEYS.SESSION_WARNING);
    return val === null ? true : val === 'true';
  },
  saveSessionWarningEnabled: (enabled: boolean) => {
    localStorage.setItem(KEYS.SESSION_WARNING, enabled ? 'true' : 'false');
  },

  getSystemSettings: (): SystemSettings => {
    try {
      const stored = localStorage.getItem(KEYS.SYSTEM_SETTINGS);
      if (!stored) return DEFAULT_SYSTEM_SETTINGS;
      const parsed = JSON.parse(stored);
      
      // Ensure allowedTabs is fully parsed if saved as string JSON
      if (parsed.allowedTabs && typeof parsed.allowedTabs === 'string') {
        try {
          parsed.allowedTabs = JSON.parse(parsed.allowedTabs);
        } catch (_) {}
      }
      
      // Also check editPermissions if it was stringified
      if (parsed.editPermissions && typeof parsed.editPermissions === 'string') {
        try {
          parsed.editPermissions = JSON.parse(parsed.editPermissions);
        } catch (_) {}
      }

      // Ensure fallbacks for any missing attributes
      return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },
  saveSystemSettings: (settings: SystemSettings) => {
    localStorage.setItem(KEYS.SYSTEM_SETTINGS, JSON.stringify(settings));
    // Also sync if support table is available
    syncToDatabase('system_settings', [settings]);
  },
  
  logActivity: (username: string, actionType: string, description: string) => {
    const logs = StorageHelper.getActivityLogs();
    const today = getCurrentJalaliDate();
    const time = getCurrentJalaliTime();
    const newLog: ActivityLog = {
      id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
      timestamp: `${today} ${time}:00`,
      username: username || 'مهمان',
      action_type: actionType,
      description,
      is_hidden: 0
    };
    logs.unshift(newLog); // Put new logs first
    StorageHelper.saveActivityLogs(logs);
  }
};
