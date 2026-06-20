/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, PatientTransaction } from '../types';
import { StorageHelper } from '../utils/storage';
import { getCurrentJalaliDate, getCurrentJalaliTime } from '../utils/jalali';
import { Plus, Edit3, Trash2, Search, Slash, ShieldCheck, ShieldAlert, History, CreditCard } from 'lucide-react';
import NumberInput from './NumberInput';

interface PatientsTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

export default function PatientsTab({ currentUser, onDataChanged }: PatientsTabProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionWarningEnabled, setSessionWarningEnabled] = useState<boolean>(true);
  
  // Patient Form Fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientNatId, setPatientNatId] = useState('');
  const [patientType, setPatientType] = useState('عادی');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientGender, setPatientGender] = useState('زن');
  const [patientDesc, setPatientDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Wallet Recharge Modal Fields
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargingPatient, setRechargingPatient] = useState<Patient | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(100000);
  const [rechargeDesc, setRechargeDesc] = useState('شـارژ الکترونیکی حساب به صورت کـارت به کـارت');

  // Transaction Ledger view
  const [ledgerPatient, setLedgerPatient] = useState<Patient | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<PatientTransaction[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = () => {
    setPatients(StorageHelper.getPatients());
    setSessionWarningEnabled(StorageHelper.getSessionWarningEnabled());
  };

  const handleOpenAddModal = () => {
    setEditingPatient(null);
    setPatientName('');
    setPatientNatId('');
    setPatientType('عادی');
    setPatientPhone('');
    setPatientGender('زن');
    setPatientDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (patient: Patient) => {
    const settings = StorageHelper.getSystemSettings();
    const isAllowed = currentUser.role === 'admin' || currentUser.role === 'super_admin' || 
                      (currentUser.role === 'secretary' && (settings.editPermissions?.secretary_can_edit_patients ?? true)) ||
                      currentUser.role === 'supervisor';
    if (!isAllowed) {
      setDeleteConfirm({
        message: '⚠️ محدودیت دسترسی سیستم: مدیر ارشد کلینیک، امکان ویرایش مشخصات و اطلاعات پرونده مراجعین را برای نقش شما غیرفعال و عزل نموده است.',
        onConfirm: () => setDeleteConfirm(null)
      });
      return;
    }
    setEditingPatient(patient);
    setPatientName(patient.name);
    setPatientNatId(patient.nat_id);
    setPatientType(patient.type);
    setPatientPhone(patient.phone);
    setPatientGender(patient.gender);
    setPatientDesc(patient.desc || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeletePatient = (id: number, name: string) => {
    const settings = StorageHelper.getSystemSettings();
    const isAllowed = currentUser.role === 'admin' || currentUser.role === 'super_admin' || 
                      (currentUser.role === 'secretary' && (settings.editPermissions?.secretary_can_delete ?? false)) ||
                      (currentUser.role === 'supervisor' && (settings.editPermissions?.supervisor_can_delete ?? true));
    if (!isAllowed) {
      setDeleteConfirm({
        message: '⚠️ عدم جواز دسترسی مدیریتی: حذف دائم پرونده مراجعین محترم برای حساب کاربری شما مسدود می‌باشد. تفویض این اختیار صرفاً توسط سوپرادمین مرکز انجام‌پذیر است.',
        onConfirm: () => setDeleteConfirm(null)
      });
      return;
    }
    setDeleteConfirm({
      message: `⚠️ هشدار امنیتی: آیا مایل به حذف کامل پرونده مراجع محترم "${name}" هستید؟ این عمل غیر قابل بازگشت است.`,
      onConfirm: () => {
        const list = StorageHelper.getPatients();
        const updated = list.filter(p => p.id !== id);
        StorageHelper.savePatients(updated);
        setPatients(updated);

        StorageHelper.logActivity(
          currentUser.username,
          'حذف پرونده مراجع',
          `پرونده مراجع ${name} توسط مدیر سیستم حذف گردید`
        );
        onDataChanged();
      }
    });
  };

  const toggleBlockStatus = (patient: Patient) => {
    const nextBlockStatus = patient.is_blocked === 1 ? 0 : 1;
    const statusLabel = nextBlockStatus === 1 ? 'لیست سیاه (مسدود)' : 'مجاز (رفع بلاک)';
    
    setDeleteConfirm({
      message: `آیا مایل به تغییر وضعیت مراجع "${patient.name}" به "${statusLabel}" می‌باشید؟`,
      onConfirm: () => {
        const list = StorageHelper.getPatients();
        const updated = list.map(p => {
          if (p.id === patient.id) {
            return { ...p, is_blocked: nextBlockStatus };
          }
          return p;
        });

        StorageHelper.savePatients(updated);
        setPatients(updated);

        StorageHelper.logActivity(
          currentUser.username,
          nextBlockStatus === 1 ? 'مسدودسازی مراجع' : 'رفع انسداد مراجع',
          `وضعیت مراجع ${patient.name} به علت مسائل انضباطی تغییر یافت: "${statusLabel}"`
        );
        onDataChanged();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = patientName.trim();
    if (!cleanName || !patientNatId.trim() || !patientPhone.trim()) {
      setFormError('لطفاً فیلدهای الزامی نام، کدملی و تلفن همراه را پر کنید.');
      return;
    }

    const cleanNatId = patientNatId.trim();
    const cleanPhone = patientPhone.trim();

    if (!/^\d{10}$/.test(cleanNatId)) {
      setFormError('⚠️ کدملی نامعتبر است: کد ملی مراجع باید شامل دقیقاً ۱۰ رقم عددی باشد.');
      return;
    }

    if (!/^0\d{10}$/.test(cleanPhone)) {
      setFormError('⚠️ شماره همراه نامعتبر است: شماره تلفن همراه مراجع باید دقیقاً ۱۱ رقم بوده و با ۰ شروع شود (به عنوان مثال: 09121234567).');
      return;
    }

    const list = StorageHelper.getPatients();

    if (editingPatient) {
      // Edit: Check duplication of national ID and phone across OTHER patients
      const duplicateNatId = list.find(p => p.id !== editingPatient.id && p.nat_id === cleanNatId);
      const duplicatePhone = list.find(p => p.id !== editingPatient.id && p.phone === cleanPhone);

      if (duplicateNatId) {
        setFormError(`⚠️ تداخل کد ملی: این کد ملی متعلق به مراجع دیگری به نام «${duplicateNatId.name}» می‌باشد و امکان ثبت کدملی تکراری وجود ندارد.`);
        return;
      }
      if (duplicatePhone) {
        setFormError(`⚠️ تداخل شماره همراه: این شماره قبلاً برای مراجع دیگری به نام «${duplicatePhone.name}» ثبت گردیده است.`);
        return;
      }

      const updated = list.map(p => {
        if (p.id === editingPatient.id) {
          return {
            ...p,
            name: cleanName,
            nat_id: cleanNatId,
            type: patientType,
            phone: cleanPhone,
            gender: patientGender,
            desc: patientDesc.trim()
          };
        }
        return p;
      });
      StorageHelper.savePatients(updated);
      setPatients(updated);

      // Bidirectional sync: Update all appointments (matching this patient's old or current national ID)
      const allApps = StorageHelper.getAppointments();
      const normCompare = (a: string, b: string) => 
        a.replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').trim() === 
        b.replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').trim();

      const updatedApps = allApps.map(app => {
        let updatedApp = { ...app };
        let isUpdated = false;

        if (normCompare(app.nat_id, editingPatient.nat_id)) {
          updatedApp.patient_name = cleanName;
          updatedApp.nat_id = cleanNatId;
          updatedApp.phone = cleanPhone;
          updatedApp.gender = patientGender;
          updatedApp.type = patientType;
          isUpdated = true;
        }

        if (app.patient2_nat_id && normCompare(app.patient2_nat_id, editingPatient.nat_id)) {
          updatedApp.patient2_name = cleanName;
          updatedApp.patient2_nat_id = cleanNatId;
          updatedApp.patient2_phone = cleanPhone;
          isUpdated = true;
        }

        return updatedApp;
      });

      StorageHelper.saveAppointments(updatedApps);

      StorageHelper.logActivity(
        currentUser.username,
        'ویرایش پرونده مراجع',
        `پرونده مراجع ${cleanName} به کدملی ${cleanNatId} اصلاح گردید و تمامی نوبت‌های مرتبط به‌روزرسانی شدند.`
      );
    } else {
      // Add: Check duplication across ALL patients
      const duplicateNatId = list.find(p => p.nat_id === cleanNatId);
      const duplicatePhone = list.find(p => p.phone === cleanPhone);

      if (duplicateNatId) {
        setFormError(`⚠️ خطا: مراجعی با نام «${duplicateNatId.name}» قبلاً با این کدملی (${cleanNatId}) در سیستم ثبت شده است.`);
        return;
      }
      if (duplicatePhone) {
        setFormError(`⚠️ خطا: این شماره همراه قبلاً برای مراجع دیگری به نام «${duplicatePhone.name}» ثبت گردیده است و مجاز به استفاده مجدد نیست.`);
        return;
      }

      const newPatient: Patient = {
        id: list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1,
        name: cleanName,
        nat_id: cleanNatId,
        type: patientType,
        phone: cleanPhone,
        gender: patientGender,
        balance: 0,
        wallet_balance: 0,
        desc: patientDesc.trim(),
        is_blocked: 0
      };
      const updated = [...list, newPatient];
      StorageHelper.savePatients(updated);
      setPatients(updated);

      StorageHelper.logActivity(
        currentUser.username,
        'ثبت پرونده مراجع',
        `مراجع جدید محترم ${cleanName} با شماره تلفن ${cleanPhone} پرونده‌دار شد`
      );
    }

    setIsModalOpen(false);
    onDataChanged();
  };

  // Open ledger log histories
  const handleOpenLedger = (patient: Patient) => {
    setLedgerPatient(patient);
    const trans = StorageHelper.getPatientTransactions().filter(t => t.patient_nat_id === patient.nat_id);
    setLedgerTransactions(trans);
  };

  // Process electronic deposit wallet recharge
  const handleProcessRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargingPatient) return;

    const list = StorageHelper.getPatients();
    const updated = list.map(p => {
      if (p.id === rechargingPatient.id) {
        return {
          ...p,
          wallet_balance: p.wallet_balance + rechargeAmount
        };
      }
      return p;
    });

    StorageHelper.savePatients(updated);
    setPatients(updated);

    // Save transaction
    const trans = StorageHelper.getPatientTransactions();
    trans.unshift({
      id: trans.length > 0 ? Math.max(...trans.map(t => t.id)) + 1 : 1,
      patient_nat_id: rechargingPatient.nat_id,
      date: getCurrentJalaliDate(),
      time: getCurrentJalaliTime(),
      amount: rechargeAmount,
      trans_type: 'شارژ کیف پول',
      description: rechargeDesc
    });
    StorageHelper.savePatientTransactions(trans);

    StorageHelper.logActivity(
      currentUser.username,
      'شارژ الکترونیکی مراجع',
      `ولب الکترونیکی حساب ${rechargingPatient.name} بمبلغ ${rechargeAmount.toLocaleString('fa-IR')} تومان شارژ گردید`
    );

    setIsRechargeModalOpen(false);
    setRechargingPatient(null);
    onDataChanged();
  };

  // Search filter patients
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nat_id.includes(searchQuery) ||
    p.phone.includes(searchQuery)
  );

  const pNatMatch = patientNatId.trim().length === 10
    ? patients.find(p => (!editingPatient || p.id !== editingPatient.id) && p.nat_id === patientNatId.trim())
    : null;

  const pPhoneMatch = patientPhone.trim().length === 11
    ? patients.find(p => (!editingPatient || p.id !== editingPatient.id) && p.phone === patientPhone.trim())
    : null;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Control panel and query filter Row */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        
        {/* Simple search bar query input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی مراجعین بر اساس نام، کدملی، شماره..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Warning threshold trigger */}
          <button
            onClick={() => {
              const nextVal = !sessionWarningEnabled;
              StorageHelper.saveSessionWarningEnabled(nextVal);
              setSessionWarningEnabled(nextVal);
              StorageHelper.logActivity(
                currentUser.username,
                'تغییر تنظیمات هشدار',
                `وضعیت هشدار تعداد جلسات به «${nextVal ? 'فعال' : 'غیرفعال'}» تغییر داده شد.`
              );
              onDataChanged();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border ${
              sessionWarningEnabled 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600' 
                : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
            }`}
          >
            <span>{sessionWarningEnabled ? '✅ هشدار تعداد جلسات: فعال' : '⚠️ هشدار تعداد جلسات: غیرفعال'}</span>
          </button>

          {/* Add Patient triggers */}
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 font-bold text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm hover:shadow transition-all justify-center cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>ایجاد پرونده مراجع جدید</span>
          </button>
        </div>
      </div>

      {/* Main ledger table views of patients lists */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
              <tr>
                <th className="p-4">نام مراجع (جنسیت)</th>
                <th className="p-4">کد ملی</th>
                <th className="p-4">شماره تماس</th>
                <th className="p-4">نوع مراجع (پذیرش)</th>
                <th className="p-4">دفتـر بدهی مالی</th>
                <th className="p-4">شـارژ کیف پول</th>
                <th className="p-4 text-center">خدمات فرعی حساب</th>
                <th className="p-4 text-center">عملیات پرونده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">مراجع پرونده‌داری درج نشده یا منطبق نیست.</td>
                </tr>
              ) : (
                filteredPatients.map(p => {
                  const isBlocked = p.is_blocked === 1;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isBlocked ? 'bg-red-50/10' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${isBlocked ? 'bg-red-500 shadow' : 'bg-emerald-500'}`} />
                          <div className="font-semibold">{p.name}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.gender}</div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-600">{p.nat_id}</td>
                      <td className="p-4 font-mono text-slate-500">{p.phone}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{p.type}</span>
                      </td>
                      <td className="p-4 font-bold text-red-600">{(p.balance || 0).toLocaleString('fa-IR')} تومان</td>
                      <td className="p-4 font-extrabold text-emerald-600">{(p.wallet_balance || 0).toLocaleString('fa-IR')} تومان</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Recharge patient wallet */}
                          <button
                            onClick={() => {
                              setRechargingPatient(p);
                              setRechargeAmount(100000);
                              setRechargeDesc('شارژ الکترونیکی حساب به صورت کـارت به کـارت');
                              setIsRechargeModalOpen(true);
                            }}
                            title="شارژ اعتبار کیف پول"
                            className="p-1.5 bg-slate-100 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>

                          {/* Inspect patient log ledger transactions history */}
                          <button
                            onClick={() => handleOpenLedger(p)}
                            title="دفتر کل تراکنش‌ها"
                            className="p-1.5 bg-slate-100 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          {/* Toggle blacklists blockage trigger */}
                          <button
                            onClick={() => toggleBlockStatus(p)}
                            title={isBlocked ? 'خارج کردن از لیست سیاه' : 'افزودن به لیست سیاه (بلاکی)'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBlocked ? 'bg-red-100 text-red-600 hover:bg-red-50' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                            }`}
                          >
                            {isBlocked ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </button>

                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
                            title="ویرایش بیمار"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePatient(p.id, p.name)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                            title="حذف پرونده"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Add/Edit Form Dialogue */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center">
              <h4 className="font-bold text-xs">{editingPatient ? `ویرایش پرونده مراجع: ${editingPatient.name}` : 'ایجاد پرونده مراجع جدید'}</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3.5 flex items-start gap-2 shadow-sm font-semibold animate-shake">
                  <span className="text-sm">⚠️</span>
                  <span className="flex-1 leading-relaxed">{formError}</span>
                </div>
              )}
              
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">نام و نام خانوادگی مراجع</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="مثال: علی صبوری"
                />
              </div>

              {/* National ID & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد ملی مراجع (یکتا)</label>
                  <input
                    type="text"
                    required
                    value={patientNatId}
                    onChange={(e) => setPatientNatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0023456789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">شماره تلفن همراه</label>
                  <input
                    type="text"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0912XXXXXXX"
                  />
                </div>
              </div>

              {/* Real-time duplicate warnings */}
              {pNatMatch && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl p-3 flex items-start gap-2 font-semibold animate-in fade-in slide-in-from-top-1">
                  <span className="text-sm">⚠️</span>
                  <p className="flex-1 leading-relaxed text-slate-700">
                    کد ملی وارد شده قبلاً برای پرونده مراجع <span className="text-blue-700 font-extrabold">«{pNatMatch.name}»</span> ثبت گردیده است. از پذیرش مجدد ثبت تکراری خودداری نمایید.
                  </p>
                </div>
              )}

              {pPhoneMatch && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl p-3 flex items-start gap-2 font-semibold animate-in fade-in slide-in-from-top-1">
                  <span className="text-sm">📞</span>
                  <p className="flex-1 leading-relaxed text-slate-700">
                    شماره همراه وارد شده قبلاً متعلق به پرونده مراجع گرامی <span className="text-blue-700 font-extrabold">«{pPhoneMatch.name}»</span> می‌باشد.
                  </p>
                </div>
              )}

              {/* Type Category & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نوع مراجع (پذیرش)</label>
                  <select
                    value={patientType}
                    onChange={(e) => setPatientType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="عادی">عادی (آزاد)</option>
                    <option value="بیمه تامین اجتماعی">بیمه تامین اجتماعی</option>
                    <option value="خدمات درمانی">بیمه نیروهای مسلح / خدمات</option>
                    <option value="VIP">VIP (ویژه)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">جنسیت مراجع</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="زن">زن</option>
                    <option value="مرد">مرد</option>
                  </select>
                </div>
              </div>

              {/* Note Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">شرح حال کوتاه یا یادداشت پذیرش</label>
                <textarea
                  value={patientDesc}
                  onChange={(e) => setPatientDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="دارای بیماری زمینه‌ای، ارجاعی از مشاور محلی..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 shadow-md"
                >
                  ثبت کلی اطلاعات پرونده
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl py-3"
                >
                  انصراف
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Wallet Recharge / Deposit Credit Modal Dialogue */}
      {isRechargeModalOpen && rechargingPatient && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsRechargeModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-emerald-50 text-emerald-800 flex justify-between items-center">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <CreditCard className="h-5 w-5" />
                <span>شارژ الکترونیکی حساب {rechargingPatient.name}</span>
              </h4>
              <button onClick={() => setIsRechargeModalOpen(false)} className="text-slate-400 hover:text-slate-300 text-lg">&times;</button>
            </div>

            <form onSubmit={handleProcessRecharge} className="p-5 space-y-4">
              <div className="bg-emerald-50/50 p-3 rounded-xl text-[10px] text-emerald-800 font-bold">
                موجودی انباشته فعلی مراجع: {(rechargingPatient.wallet_balance || 0).toLocaleString('fa-IR')} تومان
              </div>

              {/* Recharge Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">مبلغ شارژ (تومان)</label>
                <NumberInput
                  required
                  value={rechargeAmount}
                  onChangeValue={setRechargeAmount}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-extrabold text-slate-850 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">توضیحات واریزی</label>
                <input
                  type="text"
                  required
                  value={rechargeDesc}
                  onChange={(e) => setRechargeDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-3 shadow-sm"
                >
                  تایید افزایش موجودی
                </button>
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="w-1/3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs py-3"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Logs Drawer / Dialog */}
      {ledgerPatient && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLedgerPatient(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center">
              <h4 className="font-bold text-xs">دفتر معین تراکنش‌ها: {ledgerPatient.name}</h4>
              <button onClick={() => setLedgerPatient(null)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3.5">
              {ledgerTransactions.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-10">هیچ سابقه تراکنشی برای مراجع گرامی وجود ندارد.</p>
              ) : (
                ledgerTransactions.map((tr) => (
                  <div key={tr.id} className="border border-slate-100 p-3.5 rounded-xl space-y-1 bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${
                        tr.trans_type === 'شارژ کیف پول' ? 'text-emerald-600' : 'text-blue-600'
                      }`}>
                        {tr.trans_type}
                      </span>
                      <span className="font-mono text-slate-400 font-semibold">{tr.date} {tr.time}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] text-slate-500">{tr.description}</span>
                      <span className="font-extrabold text-xs text-slate-800">
                        {tr.trans_type === 'شارژ کیف پول' ? '+' : '-'} {tr.amount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-50 text-left">
              <button
                type="button"
                onClick={() => setLedgerPatient(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl px-5 py-2"
              >
                بستن دفتر معین
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer" 
          dir="rtl"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl max-w-sm w-full text-right space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="bg-red-50 p-2 text-red-600 rounded-xl">
                <Trash2 className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-sm">تایید عملیات مراجعین</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{deleteConfirm.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl px-4 py-2 flex-1 cursor-pointer"
              >
                بله، اعمال شود
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-xl px-4 py-2 flex-1 cursor-pointer"
              >
                انصراف و لغو
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
