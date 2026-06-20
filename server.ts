/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));

const DATA_DIR = process.env.CLINIC_DATA_DIR || process.cwd();
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) {}
}

const DB_FILE = path.join(DATA_DIR, 'clinic_data.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'Backups');

// Live in-memory database
let memoryDB: any = null;

// Write logs/exceptions to file for diagnosing startup hangs
const LOG_FILE = path.join(DATA_DIR, 'startup_error.log');
const logDiagnostic = (msg: string) => {
  const time = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`, 'utf8');
  } catch (_) {}
  console.log(msg);
};

// Initial clean log
try {
  fs.writeFileSync(LOG_FILE, `--- Startup Diagnostic Logging Started ---\n`, 'utf8');
} catch (_) {}

process.on('uncaughtException', (err) => {
  logDiagnostic(`UNCAUGHT EXCEPTION: ${err.message}\nStack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logDiagnostic(`UNHANDLED REJECTION: ${reason}`);
});

logDiagnostic('Loading module dependencies and initializing pure JS JSON database server...');

import initSqlJs from 'sql.js';

let sqlEnginePromise: any = null;
async function getSqlEngine() {
  if (!sqlEnginePromise) {
    sqlEnginePromise = initSqlJs();
  }
  return sqlEnginePromise;
}

// Load database or seed it
async function loadOrSeedDatabase() {
  const sqliteFile = path.join(DATA_DIR, 'clinic_data.db');
  logDiagnostic(`Checking SQLite DB presence at path: ${sqliteFile}`);
  
  if (fs.existsSync(sqliteFile)) {
    try {
      logDiagnostic('Loading database from uploaded SQLite file (clinic_data.db)...');
      const SQL = await getSqlEngine();
      const filebuffer = fs.readFileSync(sqliteFile);
      const db = new SQL.Database(filebuffer);
      
      const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = tablesRes[0] ? tablesRes[0].values.map((v: any) => v[0]) : [];
      logDiagnostic(`Found SQLite tables in file: ${JSON.stringify(tables)}`);
      
      if (tables.includes('users')) {
        try {
          db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
          logDiagnostic('Successfully ran migration to add is_active column to users table');
        } catch (e: any) {
          // ignore column already exists
        }
      }
      
      const readTable = (tableName: string): any[] => {
        try {
          if (!tables.includes(tableName)) {
            logDiagnostic(`Table ${tableName} does not exist in SQLite DB, returning empty.`);
            return [];
          }
          const pragmaRes = db.exec(`PRAGMA table_info(${tableName})`);
          const columns = pragmaRes[0] ? pragmaRes[0].values.map((v: any) => v[1]) : [];
          
          const rowsRes = db.exec(`SELECT * FROM ${tableName}`);
          const rows: any[] = [];
          if (rowsRes[0]) {
            for (const val of rowsRes[0].values) {
              const rowObj: any = {};
              for (let i = 0; i < columns.length; i++) {
                rowObj[columns[i]] = val[i];
              }
              rows.push(rowObj);
            }
          }
          return rows;
        } catch (err: any) {
          logDiagnostic(`Error reading table ${tableName}: ${err.message}`);
          return [];
        }
      };

      memoryDB = {
        users: readTable('users'),
        doctors: readTable('doctors'),
        patients: readTable('patients'),
        appointments: readTable('appointments'),
        shifts: readTable('shifts'),
        subjects: readTable('subjects'),
        expenses: readTable('clinic_expenses'), // map from 'clinic_expenses'
        patient_transactions: readTable('patient_transactions'),
        doctor_settlement_logs: readTable('doctor_settlement_logs'),
        activity_logs: readTable('activity_logs'),
        sms_settings: null,
        system_settings: null,
        doctor_attendance: readTable('doctor_attendance'),
        doctor_presence: readTable('doctor_presence') || []
      };

      const smsRows = readTable('sms_settings');
      if (smsRows && smsRows.length > 0) {
        memoryDB.sms_settings = smsRows[0];
      } else {
        memoryDB.sms_settings = null;
      }

      const systemRows = readTable('system_settings');
      if (systemRows && systemRows.length > 0) {
        const sys = systemRows[0];
        memoryDB.system_settings = {
          ...sys,
          isDarkMode: sys.isDarkMode === 1 || sys.isDarkMode === true,
          quickSmsEnabled: sys.quickSmsEnabled === 1 || sys.quickSmsEnabled === true,
          autoLogBackup: sys.autoLogBackup === 1 || sys.autoLogBackup === true,
          defaultSidebarCollapsed: sys.defaultSidebarCollapsed === 1 || sys.defaultSidebarCollapsed === true,
        };
      } else {
        memoryDB.system_settings = null;
      }

      db.close();
      logDiagnostic(`SQLite database fully integrated! Loaded: ${memoryDB.users.length} users, ${memoryDB.doctors.length} doctors, ${memoryDB.patients.length} patients, ${memoryDB.appointments.length} appointments, ${memoryDB.expenses.length} expenses.`);

      if (memoryDB.users.length === 0) {
        logDiagnostic('SQLite database tables are empty. Seeding default clinic data immediately...');
        const todayStr = '1405/03/27';
        memoryDB = {
          users: [
            { id: 1, username: 'admin', password: 'admin', name: 'آقای دکتر حسینی (مدیر)', role: 'admin', phone: '09121111111', nat_id: '0012345678', gender: 'مرد', created_at: '1405/01/01', is_active: 1 },
            { id: 2, username: 'reception', password: '123', name: 'خانم علوی (منشی رزرویشن)', role: 'secretary', phone: '09122222222', nat_id: '0022345678', gender: 'زن', created_at: '1405/01/10', is_active: 1 },
            { id: 3, username: 'supervisor', password: '123', name: 'آقای کریمی (سوپروایزر کلینیک)', role: 'supervisor', phone: '09123333333', nat_id: '0032345678', gender: 'مرد', created_at: '1405/01/15', is_active: 1 }
          ],
          doctors: [
            { id: 1, name: 'دکتر مهران علوی', spec: 'روانشناس بالینی (CBT)', phone: '09124444444', desc: 'متخصص درمان‌های شناختی رفتاری و اضطراب', working_days: 'همه روزه', gender: 'مرد' },
            { id: 2, name: 'دکتر سارا مهدوی', spec: 'روانشناس کودک و نوجوان', phone: '09125555555', desc: 'متخصص اختلالات یادگیری، بیش‌فعالی و بازی‌درمانی', working_days: 'روزهای زوج', gender: 'زن' },
            { id: 3, name: 'دکتر علیرضا صدری', spec: 'روانپزشک و متخصص اعصاب', phone: '09126666666', desc: 'متخصص دارودرمانی و روان‌پزشکی بزرگسالان', working_days: 'روزهای فرد', gender: 'مرد' }
          ],
          patients: [
            { id: 1, name: 'محمد حسینی', nat_id: '0081234567', type: 'عادی', phone: '09127777777', gender: 'مرد', balance: 0, wallet_balance: 150000, desc: 'بیمار همیشگی کلینیک، خوش‌قول', is_blocked: 0 },
            { id: 2, name: 'زهرا کریمی', nat_id: '0077654321', type: 'بیمه تامین اجتماعی', phone: '09128888888', gender: 'زن', balance: 120000, wallet_balance: 0, desc: 'نیاز به هماهنگی مجدد قبل از نوبت', is_blocked: 0 },
            { id: 3, name: 'علی اکبری', nat_id: '1289998888', type: 'VIP', phone: '09351111111', gender: 'مرد', balance: 0, wallet_balance: 500000, desc: 'ارجاعی از دکتر مهران علوی', is_blocked: 0 }
          ],
          shifts: [
            { id: 1, name: 'صبح', time_range: '08:00 - 13:30' },
            { id: 2, name: 'عصر', time_range: '14:00 - 20:30' },
            { id: 3, name: 'شب', time_range: '20:30 - Midnight' }
          ],
          subjects: [
            { id: 1, name: 'مشاوره خانواده', is_couple: 1 },
            { id: 2, name: 'روان‌درمانی فردی', is_couple: 0 },
            { id: 3, name: 'بازی‌درمانی کودک', is_couple: 0 },
            { id: 4, name: 'زوج‌درمانی', is_couple: 1 }
          ],
          sms_settings: {
            id: 1,
            api_key: 'Kavenegar_MOCK_API_KEY_123456_CLINIC',
            sender_number: '3000500600',
            booking_template: 'مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% ساعت %time% تایید شد.',
            reminder_template: 'مراجعه‌کننده گرامی %patient%، یادآوری نوبت شما با %doctor% برای فردا در تاریخ %date% ساعت %time% ثبت گردیده است.',
            cancel_template: 'مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% لغو گردید.',
            patient_template: 'مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% ساعت %time% تایید شد.',
            doctor_single_template: 'استاد گرامی %doctor%، نوبت جدید برای مراجع %patient%در تاریخ %date% ساعت %time% ثبت گردید.',
            doctor_bulk_template: 'استاد گرامی %doctor%، خلاصه شیفت شما در تاریخ %date% با موفقیت نهایی گردید.'
          },
          expenses: [
            { id: 1, date: '1405/03/10', amount: 3500000, description: 'پرداخت بهای خدمات اینترنت یکساله کلینیک' },
            { id: 2, date: '1405/03/15', amount: 1200000, description: 'خرید تجهیزات دفتری و لوازم تحریر اتاق اساتید' },
            { id: 3, date: '1405/03/20', amount: 20000000, description: 'پرداخت اجاره ماهانه فرعی ساختمان آرامش' }
          ],
          appointments: [
            { id: 1, date: todayStr, time: '09:30', shift: 'صبح', doctor: 'دکتر مهران علوی', patient_name: 'محمد حسینی', nat_id: '0081234567', phone: '09127777777', gender: 'مرد', type: 'عادی', subject: 'روان‌درمانی فردی', desc: 'جلسه چهارم درمانی - تمرکز بر اضطراب کار', status: 'فعال', ref_type: 'تلفنی', ref_model: 'مرکز به استاد', doc_share_pct: 70, cost: 450000, discount: 50000, final_cost: 400000, is_free: 0, payment_status: 'تسویه شده', payment_method: 'کیف پول', is_settled: 0 },
            { id: 2, date: todayStr, time: '15:00', shift: 'عصر', doctor: 'دکتر سارا مهدوی', patient_name: 'زهرا کریمی', nat_id: '0077654321', phone: '09128888888', gender: 'زن', type: 'بیمه تامین اجتماعی', subject: 'بازی‌درمانی کودک', desc: 'پرخاشگری کودک ۷ ساله', status: 'فعال', ref_type: 'حضوری', ref_model: 'مرکز به استاد', doc_share_pct: 60, cost: 350000, discount: 0, final_cost: 350000, is_free: 0, payment_status: 'بدهکار', is_settled: 0 },
            { id: 3, date: todayStr, time: '17:30', shift: 'عصر', doctor: 'دکتر علیرضا صدری', patient_name: 'علی اکبری', nat_id: '1289998888', phone: '09351111111', gender: 'مرد', type: 'VIP', subject: 'زوج‌درمانی', patient2_name: 'نفیسه صادقی', patient2_nat_id: '0054321098', patient2_phone: '09129990000', desc: 'جلسه اول روانپزشکی زوجین', status: 'فعال', ref_type: 'تلفنی', ref_model: 'استاد به مرکز', doc_share_pct: 80, cost: 600000, discount: 100000, final_cost: 500000, is_free: 0, payment_status: 'تسویه شده', payment_method: 'کارتخوان', is_settled: 0 }
          ],
          patient_transactions: [
            { id: 1, patient_nat_id: '0081234567', date: '1405/03/15', time: '10:00', amount: 150000, trans_type: 'شارژ کیف پول', description: 'افزایش اعتبار کیف پول الکترونیکی بیمار به صورت نقدی' },
            { id: 2, patient_nat_id: '1289998888', date: '1405/03/20', time: '18:45', amount: 500000, trans_type: 'شارژ کیف پول', description: 'شارژ آنلاین کیف پول مراجع VIP' }
          ],
          activity_logs: [
            { id: 1, timestamp: '1405/03/24 08:30:00', username: 'سیستم', action_type: 'شروع بکار سیستم', description: 'سامانه مدیریت مرکز مشاوره فاطمی با موفقیت لود گردید', is_hidden: 0 },
            { id: 2, timestamp: '1405/03/25 14:15:32', username: 'admin', action_type: 'تعریف پزشک', description: 'استاد جدید جناب دکتر علیرضا صدری به لیست روانپزشکان کلینیک پیوست', is_hidden: 0 },
            { id: 3, timestamp: '1405/03/26 11:10:05', username: 'reception', action_type: 'ثبت مراجعه‌کننده', description: 'پرونده مراجع محترم محمد حسینی با کدملی 0081234567 با موفقیت ایجاد گردید', is_hidden: 0 }
          ],
          doctor_settlement_logs: [],
          doctor_attendance: [],
          system_settings: {
            clinicName: 'مرکز مشاوره فاطمی',
            clinicSlogan: 'سامانه مرکز مشاوره',
            defaultSessionDuration: 45,
            maxDiscountCap: 150000,
            screenAutoLockTimeout: 10,
            isDarkMode: 0,
            allowedTabs: JSON.stringify({
              supervisor: ['booking', 'stats', 'patients', 'shiftsSubjects', 'finance', 'reports', 'doctors', 'sms', 'management'],
              secretary: ['booking', 'patients', 'doctors']
            }),
            defaultSessionFee: 500000,
            taxPct: 9,
            receiptSlogan: 'خدمت به زائرین و مجاورین کریمه اهل بیت (س) افتخار ماست.',
            phoneNumbers: '۰۲۵-۳۷۷۴۱۵۵',
            quickSmsEnabled: 1,
            autoLogBackup: 1,
            defaultSidebarCollapsed: 1
          }
        };
        await saveDatabase();
      } else {
        // Save backing JSON backup
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8');
      }
      return;
    } catch (err: any) {
      logDiagnostic(`SQLite loading failed, falling back to JSON schema: ${err.message}`);
    }
  }

  logDiagnostic(`Loading JSON database file from path: ${DB_FILE}`);
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      memoryDB = JSON.parse(content);
      logDiagnostic('Successfully loaded existing JSON database.');
      return;
    } catch (err: any) {
      logDiagnostic(`Error reading database file, seeding instead: ${err.message}`);
    }
  }

  // Seed default DB structure if absolutely empty
  logDiagnostic('Database file not found or corrupted. Seeding default clinic data...');
  const today = '1405/03/27'; // generic default today in Jalali

  memoryDB = {
    users: [
      { id: 1, username: 'admin', password: 'admin', name: 'آقای دکتر حسینی (مدیر)', role: 'admin', phone: '09121111111', nat_id: '0012345678', gender: 'مرد', created_at: '1405/01/01', is_active: 1 },
      { id: 2, username: 'reception', password: '123', name: 'خانم علوی (منشی رزرویشن)', role: 'secretary', phone: '09122222222', nat_id: '0022345678', gender: 'زن', created_at: '1405/01/10', is_active: 1 },
      { id: 3, username: 'supervisor', password: '123', name: 'آقای کریمی (سوپروایزر کلینیک)', role: 'supervisor', phone: '09123333333', nat_id: '0032345678', gender: 'مرد', created_at: '1405/01/15', is_active: 1 }
    ],
    doctors: [
      { id: 1, name: 'دکتر مهران علوی', spec: 'روانشناس بالینی (CBT)', phone: '09124444444', desc: 'متخصص درمان‌های شناختی رفتاری و اضطراب', working_days: 'همه روزه', gender: 'مرد' },
      { id: 2, name: 'دکتر سارا مهدوی', spec: 'روانشناس کودک و نوجوان', phone: '09125555555', desc: 'متخصص اختلالات یادگیری، بیش‌فعالی و بازی‌درمانی', working_days: 'روزهای زوج', gender: 'زن' },
      { id: 3, name: 'دکتر علیرضا صدری', spec: 'روانپزشک و متخصص اعصاب', phone: '09126666666', desc: 'متخصص دارودرمانی و روان‌پزشکی بزرگسالان', working_days: 'روزهای فرد', gender: 'مرد' }
    ],
    patients: [
      { id: 1, name: 'محمد حسینی', nat_id: '0081234567', type: 'عادی', phone: '09127777777', gender: 'مرد', balance: 0, wallet_balance: 150000, desc: 'بیمار همیشگی کلینیک، خوش‌قول', is_blocked: 0 },
      { id: 2, name: 'زهرا کریمی', nat_id: '0077654321', type: 'بیمه تامین اجتماعی', phone: '09128888888', gender: 'زن', balance: 120000, wallet_balance: 0, desc: 'نیاز به هماهنگی مجدد قبل از نوبت', is_blocked: 0 },
      { id: 3, name: 'علی اکبری', nat_id: '1289998888', type: 'VIP', phone: '09351111111', gender: 'مرد', balance: 0, wallet_balance: 500000, desc: 'ارجاعی از دکتر مهران علوی', is_blocked: 0 }
    ],
    shifts: [
      { id: 1, name: 'صبح', time_range: '08:00 - 13:30' },
      { id: 2, name: 'عصر', time_range: '14:00 - 20:30' },
      { id: 3, name: 'شب', time_range: '20:30 - Midnight' }
    ],
    subjects: [
      { id: 1, name: 'مشاوره خانواده', is_couple: 1 },
      { id: 2, name: 'روان‌درمانی فردی', is_couple: 0 },
      { id: 3, name: 'بازی‌درمانی کودک', is_couple: 0 },
      { id: 4, name: 'زوج‌درمانی', is_couple: 1 }
    ],
    sms_settings: {
      id: 1,
      api_key: 'Kavenegar_MOCK_API_KEY_123456_CLINIC',
      sender_number: '3000500600',
      patient_template: 'مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% ساعت %time% تایید شد.',
      doctor_single_template: 'استاد گرامی %doctor%، نوبت جدید برای مراجع %patient%در تاریخ %date% ساعت %time% ثبت گردید.',
      doctor_bulk_template: 'استاد گرامی %doctor%، خلاصه شیفت شما در تاریخ %date% با موفقیت نهایی گردید.'
    },
    expenses: [
      { id: 1, date: '1405/03/10', amount: 3500000, description: 'پرداخت بهای خدمات اینترنت یکساله کلینیک' },
      { id: 2, date: '1405/03/15', amount: 1200000, description: 'خرید تجهیزات دفتری و لوازم تحریر اتاق اساتید' },
      { id: 3, date: '1405/03/20', amount: 20000000, description: 'پرداخت اجاره ماهانه فرعی ساختمان آرامش' }
    ],
    appointments: [
      { id: 1, date: today, time: '09:30', shift: 'صبح', doctor: 'دکتر مهران علوی', patient_name: 'محمد حسینی', nat_id: '0081234567', phone: '09127777777', gender: 'مرد', type: 'عادی', subject: 'روان‌درمانی فردی', desc: 'جلسه چهارم درمانی - تمرکز بر اضطراب کار', status: 'فعال', ref_type: 'تلفنی', ref_model: 'مرکز به استاد', doc_share_pct: 70, cost: 450000, discount: 50000, final_cost: 400000, is_free: 0, payment_status: 'تسویه شده', payment_method: 'کیف پول', is_settled: 0 },
      { id: 2, date: today, time: '15:00', shift: 'عصر', doctor: 'دکتر سارا مهدوی', patient_name: 'زهرا کریمی', nat_id: '0077654321', phone: '09128888888', gender: 'زن', type: 'بیمه تامین اجتماعی', subject: 'بازی‌درمانی کودک', desc: 'پرخاشگری کودک ۷ ساله', status: 'فعال', ref_type: 'حضوری', ref_model: 'مرکز به استاد', doc_share_pct: 60, cost: 350000, discount: 0, final_cost: 350000, is_free: 0, payment_status: 'بدهکار', is_settled: 0 },
      { id: 3, date: today, time: '17:30', shift: 'عصر', doctor: 'دکتر علیرضا صدری', patient_name: 'علی اکبری', nat_id: '1289998888', phone: '09351111111', gender: 'مرد', type: 'VIP', subject: 'زوج‌درمانی', patient2_name: 'نفیسه صادقی', patient2_nat_id: '0054321098', patient2_phone: '09129990000', desc: 'جلسه اول روانپزشکی زوجین', status: 'فعال', ref_type: 'تلفنی', ref_model: 'استاد به مرکز', doc_share_pct: 80, cost: 600000, discount: 100000, final_cost: 500000, is_free: 0, payment_status: 'تسویه شده', payment_method: 'کارتخوان', is_settled: 0 }
    ],
    patient_transactions: [
      { id: 1, patient_nat_id: '0081234567', date: '1405/03/15', time: '10:00', amount: 150000, trans_type: 'شارژ کیف پول', description: 'افزایش اعتبار کیف پول الکترونیکی بیمار به صورت نقدی' },
      { id: 2, patient_nat_id: '1289998888', date: '1405/03/20', time: '18:45', amount: 500000, trans_type: 'شارژ کیف پول', description: 'شارژ آنلاین کیف پول مراجع VIP' }
    ],
    activity_logs: [
      { id: 1, timestamp: '1405/03/24 08:30:00', username: 'سیستم', action_type: 'شروع بکار سیستم', description: 'سامانه مدیریت مرکز مشاوره فاطمی با موفقیت لود گردید', is_hidden: 0 },
      { id: 2, timestamp: '1405/03/25 14:15:32', username: 'admin', action_type: 'تعریف پزشک', description: 'استاد جدید جناب دکتر علیرضا صدری به لیست روانپزشکان کلینیک پیوست', is_hidden: 0 },
      { id: 3, timestamp: '1405/03/26 11:10:05', username: 'reception', action_type: 'ثبت مراجعه‌کننده', description: 'پرونده مراجع محترم محمد حسینی با کدملی 0081234567 با موفقیت ایجاد گردید', is_hidden: 0 }
    ],
    doctor_settlement_logs: [],
    doctor_attendance: [],
    system_settings: {
      clinicName: 'مرکز مشاوره فاطمی',
      clinicSlogan: 'سامانه مرکز مشاوره',
      defaultSessionDuration: 45,
      maxDiscountCap: 150000,
      screenAutoLockTimeout: 10,
      isDarkMode: 0,
      allowedTabs: JSON.stringify({
        supervisor: ['booking', 'stats', 'patients', 'shiftsSubjects', 'finance', 'reports', 'doctors', 'sms', 'management'],
        secretary: ['booking', 'patients', 'doctors']
      }),
      defaultSessionFee: 500000,
      taxPct: 9,
      receiptSlogan: 'خدمت به زائرین و مجاورین کریمه اهل بیت (س) افتخار ماست.',
      phoneNumbers: '۰۲۵-۳۷۷۴۱۵۵',
      quickSmsEnabled: 1,
      autoLogBackup: 1,
      defaultSidebarCollapsed: 1
    }
  };

  await saveDatabase();
}

async function saveDatabase() {
  try {
    // 1. Write JSON fallback file
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8');
    logDiagnostic('[Database] Success: Saved JSON backing storage.');
    
    // 2. Write SQLite file using sql.js in-memory database creation and export
    const SQL = await getSqlEngine();
    const db = new SQL.Database();
    
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, name TEXT, role TEXT, phone TEXT, nat_id TEXT, spec TEXT, gender TEXT, desc TEXT, created_at TEXT, is_active INTEGER DEFAULT 1)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, spec TEXT, phone TEXT, desc TEXT, working_day TEXT DEFAULT 'همه روزه', gender TEXT DEFAULT 'نامشخص', working_days TEXT DEFAULT 'همه روزه')`);
    db.run(`CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nat_id TEXT UNIQUE, type TEXT, phone TEXT, gender TEXT DEFAULT 'نامشخص', desc TEXT, balance REAL DEFAULT 0, wallet_balance INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, time TEXT, shift TEXT, doctor TEXT, patient_name TEXT, nat_id TEXT, type TEXT, desc TEXT, status TEXT DEFAULT 'فعال', phone TEXT DEFAULT '', gender TEXT, subject TEXT, patient2_name TEXT, patient2_nat_id TEXT, patient2_phone TEXT, ref_type TEXT, ref_model TEXT, doc_share_pct REAL DEFAULT 70, cost TEXT, discount TEXT, final_cost TEXT, is_free TEXT, payment_status TEXT, payment_method TEXT, remark TEXT, is_settled INTEGER DEFAULT 0, pay_status TEXT DEFAULT 'بدهکار', doc_share TEXT DEFAULT '50%', center_share TEXT DEFAULT '50%')`);
    db.run(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, time_range TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, is_couple INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS sms_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, api_key TEXT, sender_number TEXT, patient_template TEXT, doctor_single_template TEXT, doctor_bulk_template TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, clinicName TEXT, clinicSlogan TEXT, defaultSessionDuration INTEGER, maxDiscountCap INTEGER, screenAutoLockTimeout INTEGER, isDarkMode INTEGER, allowedTabs TEXT, defaultSessionFee INTEGER, taxPct INTEGER, receiptSlogan TEXT, phoneNumbers TEXT, quickSmsEnabled INTEGER, autoLogBackup INTEGER, defaultSidebarCollapsed INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS clinic_expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER, date TEXT, description TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS patient_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_nat_id TEXT, date TEXT, time TEXT, amount REAL, trans_type TEXT, description TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, username TEXT, action_type TEXT, description TEXT, is_hidden INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctor_attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, doctor_name TEXT, date TEXT, status TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctor_presence (id INTEGER PRIMARY KEY AUTOINCREMENT, doctor_name TEXT, target_date TEXT, status TEXT, new_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS doctor_settlement_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, doctor TEXT, amount INTEGER, start_date TEXT, end_date TEXT, settled_at TEXT, appointment_count INTEGER)`);

    const insertRows = (tableName: string, rows: any[], columns: string[]) => {
      if (!rows || rows.length === 0) return;
      const placeholders = columns.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
      for (const row of rows) {
        const vals = columns.map(c => {
          const val = row[c];
          if (val === undefined || val === null) return null;
          return typeof val === 'boolean' ? (val ? 1 : 0) : val;
        });
        try {
          stmt.run(vals);
        } catch (e: any) {
          // Ignore unique constraints duplication warnings
        }
      }
      stmt.free();
    };

    insertRows('users', memoryDB.users || [], ['id', 'username', 'password', 'name', 'role', 'phone', 'nat_id', 'spec', 'gender', 'desc', 'created_at', 'is_active']);
    insertRows('doctors', memoryDB.doctors || [], ['id', 'name', 'spec', 'phone', 'desc', 'working_day', 'gender', 'working_days']);
    insertRows('patients', memoryDB.patients || [], ['id', 'name', 'nat_id', 'type', 'phone', 'gender', 'desc', 'balance', 'wallet_balance']);
    insertRows('appointments', memoryDB.appointments || [], ['id', 'date', 'time', 'shift', 'doctor', 'patient_name', 'nat_id', 'type', 'desc', 'status', 'phone', 'gender', 'subject', 'patient2_name', 'patient2_nat_id', 'patient2_phone', 'ref_type', 'ref_model', 'doc_share_pct', 'cost', 'discount', 'final_cost', 'is_free', 'payment_status', 'payment_method', 'remark', 'is_settled', 'pay_status', 'doc_share', 'center_share']);
    insertRows('shifts', memoryDB.shifts || [], ['id', 'name', 'time_range']);
    insertRows('subjects', memoryDB.subjects || [], ['id', 'name', 'is_couple']);
    
    const smsArray = memoryDB.sms_settings ? [memoryDB.sms_settings] : [];
    insertRows('sms_settings', smsArray, ['id', 'api_key', 'sender_number', 'patient_template', 'doctor_single_template', 'doctor_bulk_template']);
    
    const systemArray = memoryDB.system_settings ? [memoryDB.system_settings] : [];
    const finalSystemArray = systemArray.map(item => ({
      ...item,
      allowedTabs: typeof item.allowedTabs === 'object' ? JSON.stringify(item.allowedTabs) : item.allowedTabs,
      isDarkMode: item.isDarkMode ? 1 : 0,
      quickSmsEnabled: item.quickSmsEnabled ? 1 : 0,
      autoLogBackup: item.autoLogBackup ? 1 : 0,
      defaultSidebarCollapsed: item.defaultSidebarCollapsed ? 1 : 0,
    }));
    insertRows('system_settings', finalSystemArray, ['clinicName', 'clinicSlogan', 'defaultSessionDuration', 'maxDiscountCap', 'screenAutoLockTimeout', 'isDarkMode', 'allowedTabs', 'defaultSessionFee', 'taxPct', 'receiptSlogan', 'phoneNumbers', 'quickSmsEnabled', 'autoLogBackup', 'defaultSidebarCollapsed']);

    insertRows('clinic_expenses', memoryDB.expenses || [], ['id', 'amount', 'date', 'description']);
    insertRows('patient_transactions', memoryDB.patient_transactions || [], ['id', 'patient_nat_id', 'date', 'time', 'amount', 'trans_type', 'description']);
    insertRows('activity_logs', memoryDB.activity_logs || [], ['id', 'timestamp', 'username', 'action_type', 'description', 'is_hidden']);
    insertRows('doctor_attendance', memoryDB.doctor_attendance || [], ['id', 'doctor_name', 'date', 'status']);
    insertRows('doctor_presence', memoryDB.doctor_presence || [], ['id', 'doctor_name', 'target_date', 'status', 'new_date']);
    insertRows('doctor_settlement_logs', memoryDB.doctor_settlement_logs || [], ['id', 'doctor', 'amount', 'start_date', 'end_date', 'settled_at', 'appointment_count']);

    const binary = db.export();
    fs.writeFileSync(path.join(DATA_DIR, 'clinic_data.db'), Buffer.from(binary));
    db.close();

    logDiagnostic('[Database] Success: Synchronized with SQLite database.');
    performBackupIfNeeded();
  } catch (err: any) {
    logDiagnostic(`[Database SQLite Save Error] Failed to write file: ${err.message}`);
  }
}

// Backup check logic
function performBackupIfNeeded() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const lastBackupFile = path.join(BACKUPS_DIR, '.last_backup');
    let shouldBackup = false;

    if (!fs.existsSync(lastBackupFile)) {
      shouldBackup = true;
    } else {
      const content = fs.readFileSync(lastBackupFile, 'utf8').trim();
      const lastBackupTime = parseInt(content, 10);
      const now = Date.now();
      if (isNaN(lastBackupTime) || now - lastBackupTime >= 86400000) {
        shouldBackup = true;
      }
    }

    const sqliteFile = path.join(DATA_DIR, 'clinic_data.db');
    if (shouldBackup && fs.existsSync(sqliteFile)) {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${d.getFullYear()}_${pad(d.getMonth() + 1)}_${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`;
      const backupFileName = `clinic_data_backup_${timestamp}.db`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFileName);
      
      fs.copyFileSync(sqliteFile, backupFilePath);
      fs.writeFileSync(lastBackupFile, Date.now().toString(), 'utf8');
      logDiagnostic(`[Database Backup] Success: Backed up database to ${backupFilePath}`);

      // Clean up backups older than 30 days
      try {
        const files = fs.readdirSync(BACKUPS_DIR);
        const nowMs = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        for (const file of files) {
          if (file.startsWith('clinic_data_backup_')) {
            const filePath = path.join(BACKUPS_DIR, file);
            const stats = fs.statSync(filePath);
            if (nowMs - stats.mtimeMs > thirtyDaysMs) {
              fs.unlinkSync(filePath);
              logDiagnostic(`[Database Backup Cleanup] Deleted old backup: ${file}`);
            }
          }
        }
      } catch (cleanErr: any) {
        logDiagnostic(`--- Old backup cleanup failed: ${cleanErr.message}`);
      }
    }
  } catch (err: any) {
    logDiagnostic(`--- Automatically backup failed: ${err.message}`);
  }
}

// REST API Endpoints
app.get('/api/get-all-data', async (req, res) => {
  logDiagnostic('[API] GET /api/get-all-data requested');
  if (!memoryDB) {
    await loadOrSeedDatabase();
  }

  // sms_settings handles differently
  const result = {
    users: memoryDB.users || [],
    doctors: memoryDB.doctors || [],
    patients: memoryDB.patients || [],
    appointments: memoryDB.appointments || [],
    shifts: memoryDB.shifts || [],
    subjects: memoryDB.subjects || [],
    expenses: memoryDB.expenses || [],
    patient_transactions: memoryDB.patient_transactions || [],
    doctor_settlement_logs: memoryDB.doctor_settlement_logs || [],
    activity_logs: memoryDB.activity_logs || [],
    sms_settings: memoryDB.sms_settings || null,
    system_settings: memoryDB.system_settings || null,
    doctor_attendance: memoryDB.doctor_attendance || []
  };

  res.json(result);
});

app.post('/api/sync-table', async (req, res) => {
  const { table, data } = req.body;
  logDiagnostic(`[API] POST /api/sync-table requested for table: "${table}"`);
  
  if (!table) {
    return res.status(400).json({ error: 'Missing table name parameter' });
  }

  if (!memoryDB) {
    await loadOrSeedDatabase();
  }

  // Map incoming table names
  const TABLE_MAP: Record<string, string> = {
    'users': 'users',
    'doctors': 'doctors',
    'patients': 'patients',
    'appointments': 'appointments',
    'shifts': 'shifts',
    'subjects': 'subjects',
    'expenses': 'expenses',
    'patient_transactions': 'patient_transactions',
    'doctor_settlement_logs': 'doctor_settlement_logs',
    'activity_logs': 'activity_logs',
    'sms_settings': 'sms_settings',
    'system_settings': 'system_settings',
    'doctor_attendance': 'doctor_attendance'
  };

  const internalKey = TABLE_MAP[table];
  if (!internalKey) {
    return res.status(400).json({ error: `Table "${table}" is invalid or unmapped` });
  }

  try {
    const rows = Array.isArray(data) ? data : (data ? [data] : []);
    
    if (internalKey === 'sms_settings') {
      memoryDB.sms_settings = rows.length > 0 ? rows[0] : null;
    } else if (internalKey === 'system_settings') {
      memoryDB.system_settings = rows.length > 0 ? rows[0] : null;
    } else {
      memoryDB[internalKey] = rows;
    }

    await saveDatabase();
    res.json({ success: true, count: rows.length });
  } catch (err: any) {
    logDiagnostic(`Error synchronizing json memory database for table "${table}": ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Start listening and configuring Vite
async function startServer() {
  logDiagnostic('startServer() called. Initializing database schema and seed data...');
  try {
    await loadOrSeedDatabase();
    logDiagnostic('Database initialized successfully.');
    performBackupIfNeeded();
  } catch (dbErr: any) {
    logDiagnostic(`Database initialization failed! Error: ${dbErr.message}\nStack: ${dbErr.stack}`);
  }

  logDiagnostic(`Configuring Vite middleware/static serving. NODE_ENV = ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== 'production') {
    logDiagnostic('Setting up Vite dev server middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    logDiagnostic('Vite middleware successfully registered.');
  } else {
    logDiagnostic('Setting up production static folder serving for Vite...');
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    logDiagnostic(`Static folder configured at: ${distPath}`);
  }

  logDiagnostic(`Binding server to port ${PORT} and host 0.0.0.0...`);
  app.listen(PORT, '0.0.0.0', () => {
    logDiagnostic(`Clinic Management System server active on http://localhost:${PORT}`);
  });
}

startServer();
