/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Shield, Clock, DollarSign, Percent, 
  MessageSquare, Lock, Activity, Save, RefreshCw, 
  Sun, Moon, Layout, AlertCircle, Check, Info,
  Upload, Type, Image as ImageIcon, Trash2, Key, Users
} from 'lucide-react';
import NumberInput from './NumberInput';
import { StorageHelper } from '../utils/storage';
import { SystemSettings } from '../types';

interface SettingsTabProps {
  currentUser: { username: string; role: string; name: string };
  onDataChanged: () => void;
}

export default function SettingsTab({ currentUser, onDataChanged }: SettingsTabProps) {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageHelper.getSystemSettings());
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'branding' | 'fonts'>('general');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  // Load latest settings on mount
  useEffect(() => {
    setSettings(StorageHelper.getSystemSettings());
  }, []);

  const handleSave = (newSettings: SystemSettings) => {
    setLoading(true);
    setTimeout(() => {
      // Clean default fallback structure for editPermissions
      const payload: SystemSettings = {
        ...newSettings,
        editPermissions: {
          secretary_can_edit_appointments: newSettings.editPermissions?.secretary_can_edit_appointments ?? true,
          secretary_can_edit_patients: newSettings.editPermissions?.secretary_can_edit_patients ?? true,
          secretary_can_delete: newSettings.editPermissions?.secretary_can_delete ?? false,
          supervisor_can_edit_finance: newSettings.editPermissions?.supervisor_can_edit_finance ?? true,
          supervisor_can_delete: newSettings.editPermissions?.supervisor_can_delete ?? true,
          supervisor_can_edit_doctors: newSettings.editPermissions?.supervisor_can_edit_doctors ?? true,
        }
      };

      StorageHelper.saveSystemSettings(payload);
      setSettings(payload);
      setLoading(false);
      setSaveSuccess(true);
      StorageHelper.logActivity(
        currentUser.username, 
        'بروزرسانی تنظیمات', 
        `تنظیمات جامع مدیریتی، دسترسی‌های زنده و قلم بصری سامانه توسط ${currentUser.name} تغییر یافت.`
      );
      onDataChanged();
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 600);
  };

  const togglePermission = (role: 'supervisor' | 'secretary', tabId: string) => {
    const list = settings.allowedTabs[role] || [];
    const isAllowed = list.includes(tabId);
    let newList: string[];
    if (isAllowed) {
      newList = list.filter(id => id !== tabId);
    } else {
      newList = [...list, tabId];
    }
    setSettings(prev => ({
      ...prev,
      allowedTabs: {
        ...prev.allowedTabs,
        [role]: newList
      }
    }));
  };

  const handleToggleEditPermission = (key: keyof Required<SystemSettings>['editPermissions']) => {
    const defaultPerms = {
      secretary_can_edit_appointments: true,
      secretary_can_edit_patients: true,
      secretary_can_delete: false,
      supervisor_can_edit_finance: true,
      supervisor_can_delete: true,
      supervisor_can_edit_doctors: true,
    };
    
    const currentPerms = settings.editPermissions || defaultPerms;
    const updatedPerms = {
      ...currentPerms,
      [key]: !currentPerms[key]
    };

    setSettings(prev => ({
      ...prev,
      editPermissions: updatedPerms
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert('⚠️ فایل بسیار بزرگ است. لطفاً تصویری با اندازه کمتر از ۱.۵ مگابایت انتخاب کنید مینی‌مال شود.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({
        ...prev,
        clinicLogo: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({
      ...prev,
      clinicLogo: ''
    }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'woff2' && ext !== 'ttf' && ext !== 'woff') {
      alert('⚠️ پسوند نامعتبر: لطفاً فقط فایل فونت با قالب استاندارد وب (.ttf, .woff2, .woff) انتخاب کنید.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('⚠️ حجم فونت بسیار زیاد است (محدودیت ۳ مگابایت).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({
        ...prev,
        uploadedFontData: reader.result as string,
        uploadedFontName: file.name.split('.')[0] || 'CustomUploadedFont',
        activeFontFamily: 'custom'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFontFile = () => {
    setSettings(prev => ({
      ...prev,
      uploadedFontData: '',
      uploadedFontName: '',
      activeFontFamily: 'Vazirmatn'
    }));
    if (fontInputRef.current) fontInputRef.current.value = '';
  };

  const handleResetDefaults = () => {
    if (window.confirm('⚠️ هشدار جدی: آیا مطمئن هستید که می‌خواهید تمام تنظیمات، دسترسی‌ها، تم بصری و فونت‌های آپلود شده را به حالت اولیه بازنشانی کنید؟')) {
      const defaultSettings: SystemSettings = {
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
      handleSave(defaultSettings);
    }
  };

  const allSystemTabs = [
    { id: 'booking', label: 'نوبت‌دهی و پذیرش', desc: 'ثبت، هماهنگی و تغییر زمان نوبت مشاوره‌ها' },
    { id: 'stats', label: 'داشبورد آماری', desc: 'نمودار پرداختی‌ها، گزارش زنده مالی روز کانون' },
    { id: 'patients', label: 'پرونده مراجعین', desc: 'مشخصات، سوابق درمان، مانده بدهی و شارژ کیف پول' },
    { id: 'shiftsSubjects', label: 'شیفت‌ها و موضوعات مشاوره', desc: 'ساعات دوره‌ها، تخصص مشاوران، اتاق مشاوره زوجین' },
    { id: 'finance', label: 'امور مالی کلینیک', desc: 'هزینه‌ها، درآمدهای متفرقه، کارانه و ثبت تسویه مشاوران' },
    { id: 'reports', label: 'گزارش‌گیری جامع', desc: 'گرفتن بیلان، فاکتورها، خروجی اکسل و دفاتر کل' },
    { id: 'doctors', label: 'لیست اساتید و مشاوران', desc: 'پروفایل همکاران، درصد مشارکت و روزهای اشتغال' },
    { id: 'sms', label: 'پنل مدیریت پیامک', desc: 'تعیین پترن و ساختار متون ارسالی اتوماتیک مراجعین' },
    { id: 'management', label: 'مدیریت کادر و امنیت', desc: 'تعریف یوزر، عزل موقت پرسنل، گالری گزارش لاگ امنیتی' },
  ];

  const defaultPerms = {
    secretary_can_edit_appointments: true,
    secretary_can_edit_patients: true,
    secretary_can_delete: false,
    supervisor_can_edit_finance: true,
    supervisor_can_delete: true,
    supervisor_can_edit_doctors: true,
  };

  const activePermissions = settings.editPermissions || defaultPerms;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Welcome Title Banner */}
      <div className="bg-gradient-to-l from-indigo-950 via-slate-900 to-slate-850 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-x-12 -translate-y-12 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-400 animate-[spin_12s_linear_infinite]" />
              <span>پنل تنظیمات و مهندسی جامع سیستم</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              کنترل مراجع حاکمیتی کلینیک: دسترسی‌ها، تفویض عملیات حذف/ویرایش منشی و ناظر، تم تاریک روزانه، لوگو هدر و بارگذاری قلم‌های وب.
            </p>
          </div>
          <button 
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-900/30 self-start md:self-auto"
            title="بازنشانی تمام پارامترها به کارخانه"
          >
            <RefreshCw className="h-4 w-4" />
            <span>بازنشانی به مقادیر پیش‌فرض</span>
          </button>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Tabs Selectors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-2 h-fit text-right">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            <span>۱. تنظیمات عمومی کلینیک</span>
          </button>
          
          <button
            onClick={() => setActiveTab('permissions')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Shield className="h-4.5 w-4.5 shrink-0" />
            <span>۲. دسترسی و اختیارات پرسنل</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon className="h-4.5 w-4.5 shrink-0" />
            <span>۳. قالب بصری دیزاین و لوگو</span>
          </button>

          <button
            onClick={() => setActiveTab('fonts')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'fonts'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Type className="h-4.5 w-4.5 shrink-0" />
            <span>۴. فونت‌های آفلاین و سیستم</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            <div className="flex items-center gap-1 mb-1 font-bold text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5" />
              <span>پاسخ‌گویی آنی سیستم</span>
            </div>
            تغییرات شما در پورتال به محض ذخیره نهایی در همین ثانیه روی کامپیوتر منشی و اساتید بدون بارگذاری مجدد آپدیت می‌گردند.
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 space-y-6">
          
          {/* SUCCESS STATUS DIALOG */}
          {saveSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-850 text-emerald-850 dark:text-emerald-450 rounded-xl p-4 flex items-center gap-3 text-right">
              <Check className="h-5 w-5 shrink-0 bg-emerald-600 dark:bg-emerald-700 text-white rounded-full p-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-extrabold block text-emerald-800 dark:text-emerald-300">پیکربندی سیستم با موفقیت به صندوق ارسال شد!</span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px]">تغییرات دپارتمان اداری، فونت اختصاصی منتخب، عکس آرم و مجوزهای عملیاتی با موفقیت بازنویسی شد.</span>
              </div>
            </div>
          )}

          {/* TAB 1: GENERAL SYSTEM SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-5 text-right">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-blue-600" />
                  <span>تنظیمات هویت و مشخصات اداری کلینیک</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">تغییر اطلاعات نمایش هدرها، مبالغ تراکنش‌های پایه و کنترل زمان خودکار سامانه.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clinic Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">نام هدر و برند کلینیک</label>
                  <input
                    type="text"
                    value={settings.clinicName}
                    onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-105 focus:outline-none focus:border-blue-500 font-bold transition-all"
                    placeholder="نمونه: مرکز مشاوره فاطمی"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">عنوان اصلی که در بالای منوی کناری سایدبار و در فیش چاپی مراجع قرار می‌گیرد.</span>
                </div>

                {/* Clinic Slogan Description Header */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">شعار و زیرعنوان مرکز</label>
                  <input
                    type="text"
                    value={settings.clinicSlogan}
                    onChange={(e) => setSettings({ ...settings, clinicSlogan: e.target.value })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-105 focus:outline-none focus:border-blue-500 font-bold transition-all"
                    placeholder="نمونه: حرم مطهر حضرت معصومه س"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">متن کمکی که با تناژ رنگی سبز-زمردی در هدر مینیاتوری نمایش داده می‌شود.</span>
                </div>

                {/* Default Session Duration (minutes) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                    مدت زمان پیش‌فرض هر جلسه (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultSessionDuration}
                    onChange={(e) => setSettings({ ...settings, defaultSessionDuration: Number(e.target.value) })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                    min="10"
                    max="240"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">زمان تخمین زده شده برای انجام مشاوره‌های فردی جهت جلوگیری از تلاقی نوبت‌ها.</span>
                </div>

                {/* Default Session Price Fee (Rials) */}
                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                    حق مشاوره پیش‌فرض جلسات (تومان)
                  </label>
                  <NumberInput
                    value={settings.defaultSessionFee}
                    onChangeValue={(val) => setSettings({ ...settings, defaultSessionFee: val })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                    step="50000"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">هزینه پایه کلاس پیش‌فرض در برگه پذیرش نوبت که منشی فوراً برای مودی ثبت می‌کند.</span>
                </div>

                {/* Max Discount Limit allowed for secretary */}
                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                    سقف تخفیف مجاز برای منشی (تومان)
                  </label>
                  <NumberInput
                    value={settings.maxDiscountCap}
                    onChangeValue={(val) => setSettings({ ...settings, maxDiscountCap: val })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">حداکثر سقف مجاز کسر فاکتور مراجعین در پنل توسط منشی مراجع.</span>
                </div>

                {/* Auto Screen Lock Idle (minutes) */}
                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                    مدت عدم فعالیت تا قفل خودکار صفحه (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={settings.screenAutoLockTimeout}
                    onChange={(e) => setSettings({ ...settings, screenAutoLockTimeout: Number(e.target.value) })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                    placeholder="۰ به معنی غیرفعال"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">حفاظت حریم خصوصی مراجعین: در صورت رها شدن سیستم، مانیتور فوراً قفل می‌شود.</span>
                </div>

                {/* Tax rate percentage */}
                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">ارزش افزوده پیش‌فرض صندوق (%)</label>
                  <input
                    type="number"
                    value={settings.taxPct}
                    onChange={(e) => setSettings({ ...settings, taxPct: Number(e.target.value) })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                    min="0"
                    max="100"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">میزان مالیat بر ارزش افزوده خدمات که روی قیمت خالص مراجع فیش محاسبه می‌گردد.</span>
                </div>

                {/* Phone Numbers display */}
                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">تلفن‌های تماس کانون</label>
                  <input
                    type="text"
                    value={settings.phoneNumbers}
                    onChange={(e) => setSettings({ ...settings, phoneNumbers: e.target.value })}
                    className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold font-mono text-center text-slate-850 dark:text-slate-105 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">شماره تلفن چاپ شده در سربرگ فاکتور و پیام‌های خوشامدگویی مراجعین.</span>
                </div>
              </div>

              {/* Text Slogan in receipts bill */}
              <div>
                <label className="block text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                  متن یادداشت ته برگ فیش صندوق
                </label>
                <textarea
                  value={settings.receiptSlogan}
                  onChange={(e) => setSettings({ ...settings, receiptSlogan: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-850 dark:text-slate-105 focus:outline-none resize-none leading-relaxed transition-all"
                />
                <span className="text-[10px] text-slate-400 block mt-1">ذیل فاکتور حرارتی به عنوان تبرک، تذکر و هماهنگی‌های بعدی چاپ می‌شود.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-250/50 dark:border-slate-800 border-dashed rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.quickSmsEnabled}
                    onChange={(e) => setSettings({ ...settings, quickSmsEnabled: e.target.checked })}
                    className="h-4.5 w-4.5 text-blue-600 rounded-lg cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">ارسال اتوماتیک پیامک شورت‌کات</span>
                    <span className="block text-[10px] text-slate-400 leading-normal mt-0.5">ثبت نوبت مشاوره بلافاصله پیام اطلاع‌یابی ارسال می‌کنه.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-250/50 dark:border-slate-800 border-dashed rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoLogBackup}
                    onChange={(e) => setSettings({ ...settings, autoLogBackup: e.target.checked })}
                    className="h-4.5 w-4.5 text-blue-600 rounded-lg cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">ذخیره نسخه پشتیبان موازی کادر</span>
                    <span className="block text-[10px] text-slate-400 leading-normal mt-0.5">بک‌آپ فشرده محرمانه در پایان هر روز فعالیت روی دیسک کلینیک.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE TAB VISIBILITY & ACTION LIMITATION PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-6 text-right">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-indigo-600" />
                  <span>سطوح دسترسی، مدیریت زیرتب‌ها و اختیارات پرسنل</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  به صورت لایو مشخص کنید پرسنل شما (ناظر فنی/منشی دفتری) مجاز به دیدن کدام زیرتب‌ها و انجام کدام عملیات حساس (پذیرش نهایی، ویرایش مالی یا حذف مراجعین) می‌باشند.
                </p>
              </div>

              {/* 1. SECTOR OF ACTION PERMISSIONS */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-850 dark:to-slate-850/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                  <Key className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">بسته اختیارات حاکمیتی و تفریط عملیات (حذف/ویرایش)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* secretary can edit appointments */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">امکان ویرایش نوبت‌ها توسط منشی</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">اگر لغو شود، منشی امکان تغییر ساعت، موضوع و هزینه نوبت‌های ثبت‌شده قبلی را ندارد.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.secretary_can_edit_appointments}
                      onChange={() => handleToggleEditPermission('secretary_can_edit_appointments')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>

                  {/* secretary can edit patients */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">ویرایش پرونده مراجعین توسط منشی</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">منشی حق اصلاح مشخصات، نام درمانجو و کدملی‌های اشتباه را خواهد داشت.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.secretary_can_edit_patients}
                      onChange={() => handleToggleEditPermission('secretary_can_edit_patients')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>

                  {/* secretary can delete records */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">اجازه حذف نوبت و پرونده توسط منشی</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">مسئولیت سنگین: کادر رزرویشن می‌تواند با تاییدیه خود به طور کامل رکوردی را عزل کند.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.secretary_can_delete}
                      onChange={() => handleToggleEditPermission('secretary_can_delete')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>

                  {/* supervisor can edit finance */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">ثبت و اصلاح درآمد/هزینه مالی توسط ناظر</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">دسترسی ناظر کلینیک به تغییر فیش‌های تسویه‌حساب پزشکان و ویرایش هزینه‌های جاری.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.supervisor_can_edit_finance}
                      onChange={() => handleToggleEditPermission('supervisor_can_edit_finance')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>

                  {/* supervisor can delete records */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">امکان حذف پرونده‌ها و گزارش‌ها توسط ناظر</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">سطح دسترسی لازم جهت پاک کردن تصادقی فاکتورها توسط کامپیوتر ناظر فنی کادر.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.supervisor_can_delete}
                      onChange={() => handleToggleEditPermission('supervisor_can_delete')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>

                  {/* supervisor can edit doctor configs */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-2xs transition-all">
                    <span className="text-xs text-slate-700 dark:text-slate-350 pr-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-bold mb-0.5">اصلاح جزئیات سهم و نام اساتید توسط ناظر</strong>
                      <span className="block text-[10px] text-slate-400 leading-relaxed">تفویض امکان تغییر درصد شراکت اساتید یا ویرایش اطلاعات تخصصی پزشکان به ناظر.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activePermissions.supervisor_can_edit_doctors}
                      onChange={() => handleToggleEditPermission('supervisor_can_edit_doctors')}
                      className="h-4.5 w-4.5 text-indigo-600 rounded-md shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 2. DIRECT TAB VISIBILITY (SUBTABS & TABS SECT) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Users className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">تب‌های سایدبار و نمای کلی زیرتب‌ها برای پرسنل</span>
                </div>

                {/* ROLE 1: SECRETARY (منشی) */}
                <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-750 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">رزرویشن اداری / منشی</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">گزینه‌های فعال در منوی عمودی برای نقش منشی رزرویشن</p>
                    </div>
                    <span className="text-[10px] text-slate-505 font-bold font-mono bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2.5 py-1 rounded-md">
                      تعداد تب‌های فعال: {(settings.allowedTabs?.secretary || []).length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allSystemTabs.map(tab => {
                      const list = settings.allowedTabs?.secretary || [];
                      const isAllowed = list.includes(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => togglePermission('secretary', tab.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900 shadow-3xs'
                              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex-1 space-y-1 pl-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{tab.label}</span>
                            <span className="text-[10px] text-slate-400 leading-normal block">{tab.desc}</span>
                          </div>
                          <div className={`h-5 w-5 rounded-md flex items-center justify-center border shrink-0 ${
                            isAllowed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800'
                          }`}>
                            {isAllowed && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ROLE 2: SUPERVISOR (ناظر) */}
                <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-750 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">ناظر فنی / مدیر داخلی</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">گزینه‌های فعال در سایدبار اصلی برای اکانت‌های سطح ناظر دپارتمان</p>
                    </div>
                    <span className="text-[10px] text-slate-505 font-bold font-mono bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2.5 py-1 rounded-md">
                      تعداد تب‌های فعال: {(settings.allowedTabs?.supervisor || []).length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                    {allSystemTabs.map(tab => {
                      const list = settings.allowedTabs?.supervisor || [];
                      const isAllowed = list.includes(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => togglePermission('supervisor', tab.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900 shadow-3xs'
                              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex-1 space-y-1 pl-2 font-sans">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{tab.label}</span>
                            <span className="text-[10px] text-slate-400 leading-normal block">{tab.desc}</span>
                          </div>
                          <div className={`h-5 w-5 rounded-md flex items-center justify-center border shrink-0 ${
                            isAllowed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800'
                          }`}>
                            {isAllowed && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Security and Warning Board */}
                <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-850 rounded-xl p-3.5 flex gap-2.5 text-right font-sans">
                  <AlertCircle className="h-5 w-5 text-amber-650 dark:text-amber-450 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-xs font-extrabold text-amber-900 dark:text-amber-300">سیاست مربیگری و تندیس مودی:</span>
                    <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed font-sans">
                      تغییر اختیارات تفصیلی منشی و ناظر بلافاصله به صورت زنده در پورتال آن‌ها اعمال می‌شود. برای نمونه در صورتی که «امکان ابطال نوبت‌ها توسط منشی» لغو شده باشد، به محض کلیک روی دکمه لغو با پیغام هشدار رسمی مواجه شده و عملیات متوقف می‌شود تا حریم مالی حفظ گردد.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: GRAPHIC BRANDING, AUTO LOGO AND THEME */}
          {activeTab === 'branding' && (
            <div className="space-y-6 text-right">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <ImageIcon className="h-4.5 w-4.5 text-teal-600" />
                  <span>برندینگ مستقل، تغییر تصویر و لوگوی کلینیک</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">آپلود و به روزرسانی آرم اختصاصی مرکز مشاوره به همراه سوئیچ پالت رنگی تیره/روشن.</p>
              </div>

              {/* A. LOGO CONFIGURATION */}
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-205/65 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 font-sans">
                <span className="block text-xs font-black text-slate-850 dark:text-slate-105">بارگذاری تصویر و آرم دیجیتال کلینیک</span>
                
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Current Logo Render Screen */}
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-2 relative shrink-0">
                    {settings.clinicLogo ? (
                      <img 
                        src={settings.clinicLogo} 
                        alt="پیش‌نمایش لوگو" 
                        className="h-full w-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="text-center space-y-1">
                        <ImageIcon className="h-7 w-7 text-slate-350 mx-auto" />
                        <span className="text-[9px] text-slate-400 block font-bold">لوگوی پیش‌فرض</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-right">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-250">تنظیم لوگوی سفارشی کلینیک</span>
                    <p className="text-[10px] text-slate-400 leading-normal max-w-md">
                      فایل خود را با قالب‌های استاندارد (PNG، JPG یا SVG) لود کرده تا در کادر سایدبار و صفحه ورود اصلی سامانه به صورت آنی جایگزین شود. فرمت‌های با پس‌زمینه شفاف پیشنهاد می‌شوند.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 font-sans">
                      <input 
                        type="file" 
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>انتخاب عکس لوگو از سیستم</span>
                      </button>

                      {settings.clinicLogo && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف و بازگشت به پیش‌فرض</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* B. THEME SWITCHER */}
              <div className="space-y-4">
                <span className="block text-xs font-black text-slate-800 dark:text-slate-200">مدیریت لایو پوسته رنگی سامانه</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Theme */}
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isDarkMode: false })}
                    className={`p-4 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden cursor-pointer flex flex-col justify-between h-32 ${
                      !settings.isDarkMode
                        ? 'bg-white border-blue-600 ring-4 ring-blue-50 dark:ring-0'
                        : 'bg-slate-50 dark:bg-slate-850 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-full flex items-start justify-between font-sans">
                      <div>
                        <span className="block text-xs font-black text-slate-800 dark:text-slate-200">پوسته استاندارد روز (روشن)</span>
                        <span className="block text-[10px] text-slate-400 mt-1 leading-normal">تم و بک‌گراند کاملاً سپید با حاشیه‌های ظریف خاکستری</span>
                      </div>
                      <Sun className={`h-6 w-6 shrink-0 ${!settings.isDarkMode ? 'text-amber-500' : 'text-slate-400'}`} />
                    </div>
                    {!settings.isDarkMode && (
                      <span className="bg-blue-605 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full self-start border border-blue-200 bg-blue-50">تم فعال کادر</span>
                    )}
                  </button>

                  {/* Dark Theme */}
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isDarkMode: true })}
                    className={`p-4 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden cursor-pointer flex flex-col justify-between h-32 ${
                      settings.isDarkMode
                        ? 'bg-slate-900 border-indigo-500 ring-4 ring-indigo-950/30'
                        : 'bg-slate-50 dark:bg-slate-850 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-full flex items-start justify-between">
                      <div>
                        <span className="block text-xs font-black text-slate-800 dark:text-slate-200">پوسته تاریک نیمه‌شب (رویال)</span>
                        <span className="block text-[10px] text-slate-400 mt-1 leading-normal">بک‌گراند سرمه‌ای عمیق ضد خستگی در محیط‌های تاریک</span>
                      </div>
                      <Moon className={`h-6 w-6 shrink-0 ${settings.isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`} />
                    </div>
                    {settings.isDarkMode && (
                      <span className="bg-indigo-650 text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-full self-start border border-indigo-900 bg-indigo-950/55">تم فعال کادر</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Default Sidebar Collapsed state radio */}
              <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 text-right font-sans">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">حالت پیش‌فرض قرارگیری منوی سمت راست (سایدبار)</span>
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="defaultSidebarCollapsed"
                      checked={settings.defaultSidebarCollapsed === true}
                      onChange={() => setSettings({ ...settings, defaultSidebarCollapsed: true })}
                      className="text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">بسته مینی‌مال (فقط نمایش آیکون‌ها برای افزایش دید صفحه)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="defaultSidebarCollapsed"
                      checked={settings.defaultSidebarCollapsed === false}
                      onChange={() => setSettings({ ...settings, defaultSidebarCollapsed: false })}
                      className="text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">باز و گسترده (کل منو با تمامی نام‌ها و گروه عنوان‌ها)</span>
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2.5">تعیین‌کننده لایوت اولیه مراجعینی است که برای اولین بار به سایت لاگین می‌کنند یا صفحه را باز می‌کنند.</span>
              </div>

            </div>
          )}

          {/* TAB 4: OFFLINE SYSTEM FONTS AND CLIENT LOAD DIRECTLY */}
          {activeTab === 'fonts' && (
            <div className="space-y-6 text-right">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 font-sans">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Type className="h-4.5 w-4.5 text-blue-600" />
                  <span>مدیریت قلم‌ها و بهینه‌سازی فونت فارسی کمال آفلاین</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">تغییر زنده استایل متنی کادر اداری و امکان آپلود مستقیم فایل‌ فونت سیستم.</p>
              </div>

              {/* AVAILABLE OFFLINE FONTS SELECT BOX */}
              <div className="space-y-4">
                <span className="block text-xs font-black text-slate-850 dark:text-slate-205">۱. فونت‌های اصیل فارسی کارگذاری شده در سامانه (مستقل از اینترنت)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'Vazirmatn', label: 'وزیرمتن (Vazirmatn)', desc: 'فونت مینی‌مال مدرن، خوانایی استثنائی در اعداد مهندسی' },
                    { id: 'Shabnam', label: 'شبنم (Shabnam)', desc: 'قلم فانتزی با وقار، لبه‌های نیمه تیز در جلب کار مراجع' },
                    { id: 'Yekan', label: 'یکان‌بخش (Yekan)', desc: 'قلم رسمی هندسی، بسیار لوکس، مناسب عناوین هدر' },
                    { id: 'Estedad', label: 'استعداد (Estedad)', desc: 'فونت زاویه‌دار شکیل، ساخت یافته، متمایز جهت فاکتور' },
                    { id: 'Sahel', label: 'ساحل (Sahel)', desc: 'قلم مینیاتوری پرکنتراست، زیبا، آرامش‌بخش اتاق درمان' },
                    { id: 'System', label: 'فونت سیستم پورتال (Tahoma)', desc: 'فونت استاندارد وب بین‌المللی سبک وب‌های ساده تاهوما' }
                  ].map(font => {
                    const isSelected = settings.activeFontFamily === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, activeFontFamily: font.id }))}
                        className={`p-3.5 border-2 rounding-xl text-right transition-all duration-300 rounded-xl relative cursor-pointer flex flex-col justify-between h-28 ${
                          isSelected
                            ? 'bg-blue-50/20 dark:bg-blue-950/20 border-blue-600 ring-2 ring-blue-105'
                            : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">{font.label}</span>
                          <span className="block text-[10px] text-slate-400 leading-normal">{font.desc}</span>
                        </div>
                        {isSelected && (
                          <span className="bg-blue-600 text-white rounded-full p-0.5 self-end"><Check className="h-3 w-3" /></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPLOAD CUSTOM FONT FILE FROM OS */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/30 dark:from-slate-850 dark:to-slate-850/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                  <Upload className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-850 dark:text-slate-200">۲. آپلود مستقیم فایل قلم فارسی مراجع از سیستم شما (.ttf or .woff2)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Custom state indicators */}
                  <div className="h-20 w-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 relative shrink-0">
                    <div className="text-center">
                      <Type className={`h-7 w-7 mx-auto ${settings.activeFontFamily === 'custom' ? 'text-indigo-600 animate-bounce' : 'text-slate-350'}`} />
                      <span className="text-[8px] text-slate-400 block font-bold leading-normal mt-1 truncate max-w-[70px]">
                        {settings.uploadedFontName ? settings.uploadedFontName : 'هیچ فایلی'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-right font-sans">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">افزودن و بارگذاری فونت‌های اختصاصی کلینیک</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                      اگر مایلید از فونت‌های ارزنده دیگر ایران همانند (ایران‌سنس، ایران‌یکان، کلمه یا دانا) استفاده کنید، کافیست فایل نسخه تحت وب مناسب سیستم با قالب <strong>.woff2</strong> یا <strong>.ttf</strong> را انتخاب نمایید. سیستم دیتای فونت را به صورت بیس۶۴ موازی کادر برداشته و در پورتال لایو مپ می‌کند.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <input 
                        type="file" 
                        ref={fontInputRef}
                        onChange={handleFontUpload}
                        accept=".ttf,.woff2,.woff"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fontInputRef.current?.click()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>آپلود فایل فونت جدید (.woff2 / .ttf)</span>
                      </button>

                      {(settings.uploadedFontData || settings.activeFontFamily === 'custom') && (
                        <button
                          type="button"
                          onClick={handleRemoveFontFile}
                          className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-slate-750 dark:text-slate-350 hover:text-red-750 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف قلم سفارشی و رهاسازی</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {settings.activeFontFamily === 'custom' && settings.uploadedFontName && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900 rounded-xl p-3 text-right">
                    <span className="block text-xs text-emerald-850 dark:text-emerald-400 font-bold">
                      🎉 قلم سفارشی «{settings.uploadedFontName}» با موفقیت فعال و مبدل گردید.
                    </span>
                    <span className="block text-[9px] text-slate-400 leading-normal mt-0.5">
                      در سرتاسر هدرها، بدنه وب، فاکتورها و مبالغ تراکنش‌ها، مپ به صورت خودکار با پسوند بیس۶۴ ایمن مهار گشته است.
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-right font-sans">
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              بروزرسانی نهایی: {loading ? 'در حال تلفیق کادر امنیتی...' : 'تمامی پارامترهای فرم با گارد اعتبارسنجی معتبر هستند.'}
            </span>
            <button
              onClick={() => handleSave(settings)}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-605 hover:bg-blue-700 disabled:bg-blue-400 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>ذخیره نهایی کل تغییرات پیکربندی مرکز</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
