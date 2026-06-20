/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, PatientTransaction, Doctor, Appointment, DoctorSettlementLog } from '../types';
import { StorageHelper } from '../utils/storage';
import { exportToExcelHTML } from '../utils/exportExcel';
import { exportToPDF } from '../utils/exportPdf';
import { motion } from 'motion/react';
import JalaliDatePicker from './JalaliDatePicker';
import NumberInput from './NumberInput';
import { getCurrentJalaliDate, getCurrentJalaliDateTimeString } from '../utils/jalali';
import { Plus, Trash2, TrendingDown, ClipboardList, Wallet, Sparkles, Filter, CheckCircle2, Edit2, Bell, X, Calendar, Printer, GripHorizontal } from 'lucide-react';

interface FinanceTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

export default function FinanceTab({ currentUser, onDataChanged }: FinanceTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<PatientTransaction[]>([]);
  const [doctorSettlements, setDoctorSettlements] = useState<DoctorSettlementLog[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState<number>(100000);
  const [expenseDesc, setExpenseDesc] = useState('');

  // Payout/Settlement calculator fields
  const [calcDoctor, setCalcDoctor] = useState('');
  const [calcStartDate, setCalcStartDate] = useState('1405/01/01');
  const [calcEndDate, setCalcEndDate] = useState(getCurrentJalaliDate());

  // Calculated results
  const [payoutLogsCalculated, setPayoutLogsCalculated] = useState<Appointment[]>([]);
  const [accumulatedSum, setAccumulatedSum] = useState<number>(0);
  const [doctorCutShare, setDoctorCutShare] = useState<number>(0);
  const [clinicCutShare, setClinicCutShare] = useState<number>(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    settle: DoctorSettlementLog;
  } | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  // Edit settlement state fields
  const [isEditSettleModalOpen, setIsEditSettleModalOpen] = useState(false);
  const [editingSettle, setEditingSettle] = useState<DoctorSettlementLog | null>(null);
  const [editSettleAmount, setEditSettleAmount] = useState<number>(0);
  const [editSettleStartDate, setEditSettleStartDate] = useState('');
  const [editSettleEndDate, setEditSettleEndDate] = useState('');
  const [editSettleDesc, setEditSettleDesc] = useState('');

  // Custom settlement description during calculation stage
  const [customCalcDescription, setCustomCalcDescription] = useState('');

  // Archive filters
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilterMonth, setArchiveFilterMonth] = useState('');
  const [archiveFilterYear, setArchiveFilterYear] = useState('');
  const [archiveFilterStartDate, setArchiveFilterStartDate] = useState('');
  const [archiveFilterEndDate, setArchiveFilterEndDate] = useState('');

  const [deleteSettlementConfirm, setDeleteSettlementConfirm] = useState<{ id: number; doctor: string; amount: number; step: 1 | 2 } | null>(null);
  const [notificationPreview, setNotificationPreview] = useState<{ msg: string } | null>(null);

  // Detailed settlement invoice slip modal for printing
  const [slipSettle, setSlipSettle] = useState<DoctorSettlementLog | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setExpenses(StorageHelper.getExpenses());
    setTransactions(StorageHelper.getPatientTransactions());
    setDoctorSettlements(StorageHelper.getDoctorSettlements());
    setDoctors(StorageHelper.getDoctors());
    setAppointments(StorageHelper.getAppointments());
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی ثبت مخارج مالی ساختمان می‌باشد.');
      return;
    }
    if (!expenseAmount || !expenseDesc.trim()) return;

    const list = StorageHelper.getExpenses();
    const newExp: Expense = {
      id: list.length > 0 ? Math.max(...list.map(ex => ex.id)) + 1 : 1,
      date: getCurrentJalaliDate(),
      amount: expenseAmount,
      description: expenseDesc.trim()
    };
    const updated = [...list, newExp];
    StorageHelper.saveExpenses(updated);
    setExpenses(updated);

    StorageHelper.logActivity(
      currentUser.username,
      'ثبت هزینه جاری',
      `هزینه جدید کسر از صندوق کلینیک بمبلغ ${expenseAmount.toLocaleString('fa-IR')} تومان بابت "${expenseDesc}" ثبت شد`
    );

    setExpenseDesc('');
    setExpenseAmount(100000);
    onDataChanged();
  };

  const handleDeleteExpense = (id: number, desc: string) => {
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی اصلاح مخارج می‌باشد.');
      return;
    }
    setDeleteConfirm({
      message: `آیا مایل به مرجوع کردن فیش هزینه بابت "${desc}" هستید؟`,
      onConfirm: () => {
        const list = StorageHelper.getExpenses();
        const updated = list.filter(ex => ex.id !== id);
        StorageHelper.saveExpenses(updated);
        setExpenses(updated);

        StorageHelper.logActivity(
          currentUser.username,
          'حذف فیش هزینه',
          `فیش هزینه بابت "${desc}" توسط مدیریت ابطال گردید`
        );
        onDataChanged();
      }
    });
  };

  // Perform doctor settlement calculation over the selected interval
  const handleCalculateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcDoctor) {
      alert('لطفاً نام استاد مشاور را انتخاب کنید.');
      return;
    }

    const unSettledSessions = appointments.filter(app => 
      app.doctor === calcDoctor &&
      app.status === 'انجام شده' &&
      app.is_settled === 0 &&
      app.date >= calcStartDate &&
      app.date <= calcEndDate
    );

    setPayoutLogsCalculated(unSettledSessions);

    const totalSessionsBaseCost = unSettledSessions.reduce((sum, app) => sum + app.final_cost, 0);
    setAccumulatedSum(totalSessionsBaseCost);

    // Calculate doctor cut share
    // The share percentage is in the appointment: doc_share_pct
    let totalDocCut = 0;
    unSettledSessions.forEach(app => {
      totalDocCut += (app.final_cost * (app.doc_share_pct || 70)) / 100;
    });

    setDoctorCutShare(totalDocCut);
    setClinicCutShare(totalSessionsBaseCost - totalDocCut);
  };

  // Process and finalize doctor settlement payment payload
  const handleFinalizeSettlement = () => {
    if (payoutLogsCalculated.length === 0) return;
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی غیرمجاز: تنها مدیران کلینیک امکان تأیید و تسویه مالی حساب‌ها مراجع را دارند.');
      return;
    }

    setDeleteConfirm({
      message: `آیا مطمئن هستید که می‌خواهید تسویه حساب دوره‌ای استاد "${calcDoctor}" را به مبلغ ${doctorCutShare.toLocaleString('fa-IR')} تومان نهایی و پرداخت کنید؟`,
      onConfirm: () => {
        // 1. Mark matching appointments as settled (is_settled = 1)
        const allApps = StorageHelper.getAppointments();
        const settledIds = payoutLogsCalculated.map(app => app.id);
        const updatedApps = allApps.map(app => {
          if (settledIds.includes(app.id)) {
            return { ...app, is_settled: 1 };
          }
          return app;
        });
        StorageHelper.saveAppointments(updatedApps);
        setAppointments(updatedApps);

        // 2. Add settlement log entry reference
        const allSettlements = StorageHelper.getDoctorSettlements();
        const baseAmount = doctorCutShare;
        const grossCalculated = accumulatedSum;
        const clinicShare = clinicCutShare;
        
        const newLog: DoctorSettlementLog = {
          id: allSettlements.length > 0 ? Math.max(...allSettlements.map(s => s.id)) + 1 : 1,
          doctor: calcDoctor,
          amount: baseAmount,
          start_date: calcStartDate,
          end_date: calcEndDate,
          settled_at: getCurrentJalaliDateTimeString(),
          appointment_count: payoutLogsCalculated.length,
          description: customCalcDescription.trim() || `تسویه حساب دوره‌ای کارکرد استاد به مبلغ پرداختی خالص ${baseAmount.toLocaleString('fa-IR')} تومان (سهم کلینیک: ${clinicShare.toLocaleString('fa-IR')} تومان از مجموع کارکرد کل ناخالص ${grossCalculated.toLocaleString('fa-IR')} تومان بابت ${payoutLogsCalculated.length} جلسه)`,
          appointment_ids: settledIds
        };

        const updatedSettlements = [newLog, ...allSettlements];
        StorageHelper.saveDoctorSettlements(updatedSettlements);
        setDoctorSettlements(updatedSettlements);

        // Log system activity
        StorageHelper.logActivity(
          currentUser.username,
          'تسویه حساب پزشک',
          `تسویه کارکرد دوره‌ای استاد ${calcDoctor} به مبلغ ${baseAmount.toLocaleString('fa-IR')} تومان بابت ${payoutLogsCalculated.length} جلسه مشاوره انجام شد`
        );

        // Clear calc view
        setPayoutLogsCalculated([]);
        setAccumulatedSum(0);
        setDoctorCutShare(0);
        setClinicCutShare(0);
        setCustomCalcDescription('');
        onDataChanged();
        loadData();
      }
    });
  };

  const handleStartEditSettlement = (settle: DoctorSettlementLog) => {
    setEditingSettle(settle);
    setEditSettleAmount(settle.amount);
    setEditSettleStartDate(settle.start_date);
    setEditSettleEndDate(settle.end_date);
    setEditSettleDesc(settle.description);
    setIsEditSettleModalOpen(true);
  };

  const handleSaveEditSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettle) return;
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی ویرایش اسناد مالی می‌باشد.');
      return;
    }

    const list = StorageHelper.getDoctorSettlements();
    const updated = list.map(item => {
      if (item.id === editingSettle.id) {
        return {
          ...item,
          amount: editSettleAmount,
          start_date: editSettleStartDate,
          end_date: editSettleEndDate,
          description: editSettleDesc,
        };
      }
      return item;
    });
    StorageHelper.saveDoctorSettlements(updated);
    setDoctorSettlements(updated);
    setIsEditSettleModalOpen(false);
    setEditingSettle(null);

    StorageHelper.logActivity(
      currentUser.username,
      'ویرایش تسویه حساب',
      `سند محاسباتی تسویه حساب شماره #${editingSettle.id} مربوط به استاد ${editingSettle.doctor} ویرایش گردید`
    );
    onDataChanged();
    loadData();
  };

  const handleDeleteSettlement = (id: number, doctor: string, amount: number) => {
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی ابطال اسناد تسویه حساب می‌باشد.');
      return;
    }
    setDeleteSettlementConfirm({ id, doctor, amount, step: 1 });
  };

  const executeDeleteSettlement = () => {
    if (!deleteSettlementConfirm) return;
    const { id, doctor, amount } = deleteSettlementConfirm;

    const list = StorageHelper.getDoctorSettlements();
    const settleToDelete = list.find(s => s.id === id);
    if (!settleToDelete) {
      setDeleteSettlementConfirm(null);
      return;
    }

    // Revert associated appointments to unsettled
    const allApps = StorageHelper.getAppointments();
    const updatedApps = allApps.map(app => {
      // Use appointment_ids if available, otherwise fallback to matching logic
      if (settleToDelete.appointment_ids && settleToDelete.appointment_ids.includes(app.id)) {
        return { ...app, is_settled: 0 };
      } else if (!settleToDelete.appointment_ids && app.doctor === settleToDelete.doctor && app.date >= settleToDelete.start_date && app.date <= settleToDelete.end_date && app.is_settled === 1) {
        return { ...app, is_settled: 0 };
      }
      return app;
    });
    StorageHelper.saveAppointments(updatedApps);
    setAppointments(updatedApps);

    // Delete settlement itself
    const updated = list.filter(item => item.id !== id);
    StorageHelper.saveDoctorSettlements(updated);
    setDoctorSettlements(updated);

    StorageHelper.logActivity(
      currentUser.username,
      'ابطال تسویه حساب پزشک',
      `رسید تسویه حساب شماره #${id} استاد ${doctor} به مبلغ ${amount.toLocaleString('fa-IR')} تومان حذف گردید`
    );
    
    setDeleteSettlementConfirm(null);
    onDataChanged();
    loadData();
  };

  const handleSendSettlementNotification = (settle: DoctorSettlementLog, templateType: 'simple' | 'detailed' = 'simple') => {
    const priceTomans = Math.floor(settle.amount / 10);
    let msg = '';

    if (templateType === 'simple') {
      msg = `استاد گرامی جناب آقای/سرکار خانم دکتر ${settle.doctor}

سلام علیکم

نیکوترین تحیات دپارتمان مالی کلینیک فاطمی تقدیم حضور شریف؛ بدین‌وسیله به استحضار عالی می‌رساند، فیش مأخذ حق‌الزحمه مستمر شما بابت بازه ${settle.start_date} تا ${settle.end_date} برای تعداد ${settle.appointment_count} جلسه اتمام یافته مراجعین، به مبلغ خالص ${priceTomans.toLocaleString('fa-IR')} تومان ثبت تسویه مالی گردید.

شرح امور مالی: ${settle.description}

سپاس از همراهی بی‌شائبه شما
مدیریت کلینیک روان‌شناسی خانواده فاطمی`;
    } else {
      let grossToman = Math.floor((settle.amount / 0.70) / 10);
      let clinicToman = Math.max(0, grossToman - priceTomans);
      
      const settledApps = appointments.filter(a => settle.appointment_ids ? settle.appointment_ids.includes(a.id) : (a.doctor === settle.doctor && a.date >= settle.start_date && a.date <= settle.end_date && a.is_settled === 1));
      
      let sessionsList = '\n=== صورت‌جلسه تفصیلی نوبت‌ها ===\n';
      settledApps.forEach((app, idx) => {
        const docCut = app.final_cost * ((app.doc_share_pct || 70) / 100);
        const clinicCut = app.final_cost - docCut;
        sessionsList += `${idx + 1}. ${app.date} | ${app.patient_name}\n`;
        sessionsList += `موضوع: ${app.subject} | نوع ارجاع: ${app.ref_type || 'مستقیم'}\n`;
        sessionsList += `سهم مرکز: ${(clinicCut / 10).toLocaleString('fa-IR')} تومان | سهم استاد: ${(docCut / 10).toLocaleString('fa-IR')} تومان\n\n`;
      });

      msg = `📋 گزارش مالی و جزئیات تسویه‌حساب اساتید
کلینیک روان‌شناسی و مشاوره خانواده فاطمی

استاد ارجمند جناب آقای/سرکار خانم دکتر ${settle.doctor}
سلام علیکم و رحمت‌الله

احتراماً گزارش تفصیلی فیش کارکرد مستمر دوره‌ای حضرتعالی تقدیم حضور می‌گردد:

🗓 بازه محاسباتی: از ${settle.start_date} تا ${settle.end_date}
👥 کل جلسات پایان‌یافته مراجعین: ${settle.appointment_count} جلسه
💰 کل مبالغ دریافتی ناخالص دوره: ${grossToman.toLocaleString('fa-IR')} تومان
🏢 سهم مرکز کلینیک: ${clinicToman.toLocaleString('fa-IR')} تومان
👨‍🏫 حق‌السهم خالص پرداختی استاد: ${priceTomans.toLocaleString('fa-IR')} تومان

شرح فیش: ${settle.description}
${sessionsList}
صمیمانه از همراهی صادقانه و مساعی چشمگیر درمانی شما سپاسگزاریم.
مدیریت امور مالی کلینیک خانواده فاطمی`;
    }

    setNotificationPreview({ msg });
  };

  // Filtered settlements calculation
  const filteredSettlements = doctorSettlements.filter(settle => {
    // 1. Search query (matches doctor name or description)
    const matchesSearch = 
      settle.doctor.toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
      (settle.description || '').toLowerCase().includes(archiveSearchQuery.toLowerCase());

    // 2. Full calendar date range
    let matchesStartDate = true;
    let matchesEndDate = true;
    const settledDay = settle.settled_at && settle.settled_at.includes(' ') ? settle.settled_at.split(' ')[0] : (settle.settled_at || settle.start_date);
    
    if (archiveFilterStartDate) {
      matchesStartDate = (settledDay >= archiveFilterStartDate) || (settle.start_date >= archiveFilterStartDate);
    }
    if (archiveFilterEndDate) {
      matchesEndDate = (settledDay <= archiveFilterEndDate) || (settle.end_date <= archiveFilterEndDate);
    }

    // 3. Month & Year exact parsing
    let matchesYear = true;
    let matchesMonth = true;
    
    // formats like "1405/03/12"
    const parts = settledDay.split('/');
    if (parts.length >= 2) {
      const yr = parts[0]; // e.g. "1405"
      const mn = parts[1]; // e.g. "03"
      if (archiveFilterYear && yr !== archiveFilterYear) {
        matchesYear = false;
      }
      if (archiveFilterMonth && mn !== archiveFilterMonth) {
        matchesMonth = false;
      }
    }

    return matchesSearch && matchesStartDate && matchesEndDate && matchesYear && matchesMonth;
  });

  const handleExportExcel = () => {
    const headers = ["کد فیش", "تاریخ تسویه", "استاد ذینفع", "بازه محاسباتی مستمر", "تعداد جلسات تسویه شده", "مبلغ خالص دریافتی (تومان)", "توضیحات کلی"];
    const rows = filteredSettlements.map(s => [
      s.id,
      s.settled_at || '',
      s.doctor,
      `از ${s.start_date} تا ${s.end_date}`,
      s.appointment_count,
      s.amount.toLocaleString('fa-IR'),
      s.description || ''
    ]);
    exportToExcelHTML(`بایگانی_تسویه_اساتید_کلینیک_${getCurrentJalaliDate()}`, "بایگانی تسویه حساب اساتید", headers, rows);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Finance Top Rows: Expenses Form vs Doctor Payout calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box 1: Clinic Expenses Declares */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <span>ثبت هزینه‌های جاری و بهای تمام شده صندوق</span>
          </h3>

          {currentUser.role !== 'secretary' && (
            <form onSubmit={handleAddExpense} className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="col-span-2">
                <input
                  type="text"
                  required
                  placeholder="شرح و بابت هزینه (اجاره، لایت، آب، نظافت...)"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full text-right"
                />
              </div>
              <div className="col-span-1">
                <NumberInput
                  required
                  value={expenseAmount}
                  onChangeValue={setExpenseAmount}
                  className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full text-center font-bold"
                />
              </div>
              <div className="col-span-3 pt-1">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg py-2.5 flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>ثبت سند هزینه نقدی دفتری</span>
                </button>
              </div>
            </form>
          )}

          {/* Expenses tables */}
          <div className="max-h-48 overflow-y-auto space-y-2 border-t border-slate-50 pt-2">
            {expenses.map(ex => (
              <div key={ex.id} className="border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-800">{ex.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ex.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-red-650">{ex.amount.toLocaleString('fa-IR')} تومان</span>
                  {currentUser.role !== 'secretary' && (
                    <button
                      onClick={() => handleDeleteExpense(ex.id, ex.description)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Box 2: Doctor Payout calculator form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
            <Wallet className="h-5 w-5 text-blue-500" />
            <span>سیستم محاسبه‌گر تسویه دوره‌ای اساتید مشاور</span>
          </h3>

          <form onSubmit={handleCalculateSettlement} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-right">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">انتخاب استاد مشاور *</label>
              <input
                list="finance-doctors"
                required
                placeholder="انتخاب یا جستجوی استاد..."
                value={calcDoctor}
                onChange={(e) => setCalcDoctor(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
              />
              <datalist id="finance-doctors">
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">از تاریخ جلالی *</label>
              <JalaliDatePicker value={calcStartDate} onChange={setCalcStartDate} label="" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">تا تاریخ جلالی *</label>
              <JalaliDatePicker value={calcEndDate} onChange={setCalcEndDate} label="" />
            </div>
            <div className="md:col-span-3 pt-1">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg py-2.5 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <ClipboardList className="h-4.5 w-4.5" />
                <span>محاسبه کارکرد مستمر استاد در بازه انتخابی</span>
              </button>
            </div>
          </form>

          {/* Calculator results summary */}
          {calcDoctor && (
            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">کارکرد دوره‌ای استاد:</span>
                <span className="text-blue-700 font-bold">{calcDoctor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">تعداد جلسات اتمام یافته بدهکار:</span>
                <span className="font-mono font-bold text-slate-650">{payoutLogsCalculated.length} جلسه مشاور</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">کل درآمد حاصله در دوره:</span>
                <span className="font-mono font-bold">{accumulatedSum.toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-dashed border-blue-100 pt-1.5">
                <span className="text-emerald-700">حق‌السهم خالص استاد:</span>
                <span className="text-emerald-600 text-sm font-extrabold">{doctorCutShare.toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>سهم خالص مرکز (۳۰٪): {clinicCutShare.toLocaleString('fa-IR')} تومان</span>
                <span>(بر پایه مأخذهای درصد قرارداد)</span>
              </div>

              {payoutLogsCalculated.length > 0 ? (
                <div className="space-y-2 border-t border-blue-100/50 pt-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">شرح و توضیحات اختصاصی برای فیش (اختیاری):</label>
                    <textarea
                      placeholder="امور مالی بابت کارمزد مستمر، شماره فیش انتقال پایا یا شماره چک..."
                      value={customCalcDescription}
                      onChange={(e) => setCustomCalcDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-right focus:outline-none"
                    />
                  </div>
                  
                  {currentUser.role !== 'secretary' ? (
                    <button
                      type="button"
                      onClick={handleFinalizeSettlement}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg py-2.5 flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>تأیید نهایی و ارسال گزارش به بخش آرشیو رسیدها</span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-red-500 text-center font-bold">⚠️ نقش منشی فاقد دسترسی ثبت سند تسویه است.</p>
                  )}
                  
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    💡 با تأیید نهایی، آمار این {payoutLogsCalculated.length} جلسه به وضعیت تسویه‌شده تغییر یافته و سند آن به آرشیو پایین صفحه فرستاده می‌شود.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center mt-1">
                  هیچ جلسه اتمام‌یافته تسویه‌نشده‌ای برای این استاد در بازه انتخابی یافت نگردید.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Finance settlements log histories and audit records */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-4">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs">آرشیو رسید تسویه‌حساب‌های دوره‌ای اساتید کلینیک</h4>
            <p className="text-[10px] text-slate-400 mt-1">بایگانی تراکنش‌های پرداخت دوره‌ای اساتید با قابلیت جستجوی هوشمند و فیلترهای تقویمی</p>
          </div>
          <div className="flex bg-slate-105 p-1 rounded-xl gap-2 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="خروجی فایل اکسل از فیش‌های مالی فیلتر شده"
            >
              <span>خروجی Excel حرفه‌ای</span>
            </button>
            {(archiveSearchQuery || archiveFilterMonth || archiveFilterYear || archiveFilterStartDate || archiveFilterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setArchiveSearchQuery('');
                  setArchiveFilterMonth('');
                  setArchiveFilterYear('');
                  setArchiveFilterStartDate('');
                  setArchiveFilterEndDate('');
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Searching */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500">جستجوی آنی (مشاور / شرح...)</label>
            <input
              type="text"
              placeholder="جستجو کنید..."
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-300"
            />
          </div>

          {/* Month filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500">فیلتر ماه تسویه</label>
            <select
              value={archiveFilterMonth}
              onChange={(e) => setArchiveFilterMonth(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="">همه ماه‌ها</option>
              <option value="01">فروردین</option>
              <option value="02">اردیبهشت</option>
              <option value="03">خرداد</option>
              <option value="04">تیر</option>
              <option value="05">مرداد</option>
              <option value="06">شهریور</option>
              <option value="07">مهر</option>
              <option value="08">آبان</option>
              <option value="09">آذر</option>
              <option value="10">دی</option>
              <option value="11">بهمن</option>
              <option value="12">اسفند</option>
            </select>
          </div>

          {/* Year filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500">فیلتر سال تسویه</label>
            <select
              value={archiveFilterYear}
              onChange={(e) => setArchiveFilterYear(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="">همه سال‌ها</option>
              <option value="1403">1403</option>
              <option value="1404">1404</option>
              <option value="1405">1405</option>
              <option value="1406">1406</option>
            </select>
          </div>

          {/* Date Picker Start */}
          <div className="flex flex-col justify-end">
            <JalaliDatePicker 
              value={archiveFilterStartDate} 
              onChange={setArchiveFilterStartDate} 
              label="از تاریخ (تقویم کامل)" 
            />
          </div>

          {/* Date Picker End */}
          <div className="flex flex-col justify-end">
            <JalaliDatePicker 
              value={archiveFilterEndDate} 
              onChange={setArchiveFilterEndDate} 
              label="تا تاریخ (تقویم کامل)" 
            />
          </div>
        </div>
        
        {filteredSettlements.length === 0 ? (
          <p className="text-center text-slate-400 py-10">رسید تراکنش تسویه‌ای منطبق با فیلترها در آرشیو یافت نگردید.</p>
        ) : (
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3">تاریخ پرداخت</th>
                  <th className="p-3">استاد ذینفع</th>
                  <th className="p-3">بازه محاسباتی مستمر</th>
                  <th className="p-3">تعداد جلسات تسویه‌شده</th>
                  <th className="p-3">مبلغ پرداختی خالص</th>
                  <th className="p-3">بابت شرح تسویه</th>
                  <th className="p-3 text-center">عملیات چاپ و اطلاع‌رسانی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSettlements.map(settle => (
                  <tr 
                    key={settle.id} 
                    className="hover:bg-slate-50/50 cursor-pointer select-none"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Viewport boundary check to make context menu position precise
                      const menuWidth = 200;
                      const menuHeight = 160;
                      let posX = e.clientX;
                      let posY = e.clientY;
                      
                      if (posX + menuWidth > window.innerWidth) {
                        posX = window.innerWidth - menuWidth - 20;
                      }
                      if (posY + menuHeight > window.innerHeight) {
                        posY = window.innerHeight - menuHeight - 20;
                      }

                      setContextMenu({
                        x: posX,
                        y: posY,
                        settle: settle
                      });
                    }}
                  >
                    <td className="p-3 font-mono text-slate-400 font-semibold">{settle.settled_at}</td>
                    <td className="p-3 font-bold text-slate-800">{settle.doctor}</td>
                    <td className="p-3 font-mono text-slate-500">از {settle.start_date} تا {settle.end_date}</td>
                    <td className="p-3 font-bold font-mono text-blue-600 text-center">{settle.appointment_count} جلسه</td>
                    <td className="p-3 font-extrabold text-emerald-600 ">{settle.amount.toLocaleString('fa-IR')} تومان</td>
                    <td className="p-3 text-[10px] text-slate-400">{settle.description}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Print PDF slip button */}
                        <button
                          onClick={() => setSlipSettle(settle)}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                          title="چاپ فیش تسویه"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        
                        {/* Notify Simple */}
                        <button
                          onClick={() => handleSendSettlementNotification(settle, 'simple')}
                          className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
                          title="اطلاعرسانی کلی"
                        >
                          <Bell className="h-4 w-4" />
                        </button>

                        {/* Notify Detailed */}
                        <button
                          onClick={() => handleSendSettlementNotification(settle, 'detailed')}
                          className="p-1 hover:bg-amber-50 text-amber-600 rounded"
                          title="اطلاعرسانی با جزئیات"
                        >
                          <Sparkles className="h-4 w-4 text-amber-550" />
                        </button>

                        {currentUser.role !== 'secretary' && (
                          <>
                            <button
                              onClick={() => handleStartEditSettlement(settle)}
                              className="p-1 hover:bg-blue-50 text-blue-620 rounded"
                              title="ویرایش این سند"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSettlement(settle.id, settle.doctor, settle.amount)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded"
                              title="ابطال این تسویه"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <h4 className="font-extrabold text-slate-800 text-sm">تایید تراکنش نهایی مالی</h4>
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
                بله، اطمینان دارم و ثبت شود
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

      {/* Edit settlement modal */}
      {isEditSettleModalOpen && editingSettle && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => {
            setIsEditSettleModalOpen(false);
            setEditingSettle(null);
          }}
        >
          <form 
            onSubmit={handleSaveEditSettlement}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <Edit2 className="h-4.5 w-4.5" />
                <span>ویرایش فیش مالی {editingSettle.doctor}</span>
              </h4>
              <button 
                type="button" 
                onClick={() => {
                  setIsEditSettleModalOpen(false);
                  setEditingSettle(null);
                }} 
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ تسویه خالص (تومان) *</label>
                <NumberInput
                  required
                  value={editSettleAmount}
                  onChangeValue={setEditSettleAmount}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-center font-bold text-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">از تاریخ جلالی *</label>
                  <JalaliDatePicker value={editSettleStartDate} onChange={setEditSettleStartDate} label="" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">تا تاریخ جلالی *</label>
                  <JalaliDatePicker value={editSettleEndDate} onChange={setEditSettleEndDate} label="" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">شرح و بابت تسویه *</label>
                <textarea
                  required
                  rows={3}
                  value={editSettleDesc}
                  onChange={(e) => setEditSettleDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-right leading-relaxed"
                  placeholder="توضیحات فیش تسویه حساب..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
              <button
                type="submit"
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 cursor-pointer shadow-xs"
              >
                ذخیره تغییرات فیش
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditSettleModalOpen(false);
                  setEditingSettle(null);
                }}
                className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl py-3 cursor-pointer"
              >
                لغو
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Right Click Context Menu for Settlements */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-transparent cursor-default" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              setContextMenu(null); 
            }}
          />
          <div 
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x 
            }}
            className="fixed z-50 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 w-52 text-right text-xs text-slate-700 animate-in fade-in zoom-in-95"
            dir="rtl"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-400 text-[10px] bg-slate-50 flex items-center justify-between">
              <span>تسویه: {contextMenu.settle.doctor}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">#{contextMenu.settle.id}</span>
            </div>
            <div className="py-0.5 space-y-0.5">
              <button
                onClick={() => {
                  setSlipSettle(contextMenu.settle);
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-slate-50 text-slate-800 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="h-3.5 w-3.5 text-blue-500" />
                <span>چاپ فیش تسویه</span>
              </button>

              <button
                onClick={() => {
                  handleSendSettlementNotification(contextMenu.settle, 'simple');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Bell className="h-3.5 w-3.5 text-emerald-500" />
                <span>اطلاعرسانی کلی</span>
              </button>

              <button
                onClick={() => {
                  handleSendSettlementNotification(contextMenu.settle, 'detailed');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-amber-50 text-amber-700 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>اطلاعرسانی با جزئیات</span>
              </button>

              {currentUser.role !== 'secretary' && (
                <>
                  <div className="border-t border-slate-100 my-0.5" />
                  <button
                    onClick={() => {
                      handleStartEditSettlement(contextMenu.settle);
                      setContextMenu(null);
                    }}
                    className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-blue-50 text-blue-600 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>ویرایش فیش مالی</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDeleteSettlement(contextMenu.settle.id, contextMenu.settle.doctor, contextMenu.settle.amount);
                      setContextMenu(null);
                    }}
                    className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-red-50 text-red-600 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف/ابطال تسویه</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detailed Printable Settlement Slip Modal (PDF simulator) */}
      {slipSettle && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer print:p-0 print:bg-white print:block"
          onClick={() => setSlipSettle(null)}
        >
          <motion.div 
            id="printable-area"
            drag
            dragConstraints={{ left: -300, right: 300, top: -150, bottom: 150 }}
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-2xl w-full text-right cursor-default select-text flex flex-col max-h-[90vh] print:border-0 print:shadow-none print:max-w-full print:block print:h-auto print:max-h-none overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Drag Handle */}
            <div className="drag-handle flex justify-between items-center bg-slate-50 border-b border-slate-150 p-4 cursor-move print:hidden shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <GripHorizontal className="h-5 w-5" />
                <span className="text-xs font-bold">جابجایی پنجره فیش</span>
              </div>
              <button 
                onClick={() => setSlipSettle(null)}
                className="text-slate-400 hover:text-red-500 hover:bg-slate-200 p-1 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content inside modal */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible">
            {/* Slip Header */}
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 text-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-xl font-black text-xs print:bg-black">K.F</div>
                <div>
                  <h2 className="font-extrabold text-sm">رسید رسمی تسویه‌حساب دوره‌ای اساتید</h2>
                  <p className="text-[10px] text-slate-400 font-bold">دپارتمان حسابداری کلینیک خانواده فاطمی</p>
                </div>
              </div>
              <div className="text-left space-y-1 text-[10px] font-mono font-bold text-slate-500">
                <div>شماره فیش مالی: <span className="text-slate-900 font-bold">#{slipSettle.id}</span></div>
                <div>تاریخ صدور: <span className="text-slate-900 font-bold">{slipSettle.settled_at || 'ثبت دستی'}</span></div>
                <div>محاسب: <span className="text-slate-900 font-bold">سیستم مکانیزه کلینیک</span></div>
              </div>
            </div>

            {/* Slip Content Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border">
                <span className="block text-[9px] text-slate-400 font-bold mb-1 col-span-1">استاد مشاور ذینفع:</span>
                <span className="font-black text-slate-800">{slipSettle.doctor}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border">
                <span className="block text-[9px] text-slate-400 font-bold mb-1 col-span-1">بازه زمانی مستمر کارکرد:</span>
                <span className="font-mono font-bold text-slate-700">از {slipSettle.start_date} تا {slipSettle.end_date}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border">
                <span className="block text-[9px] text-slate-400 font-bold mb-1 col-span-1">تعداد جلسات پایان‌یافته:</span>
                <span className="font-bold text-blue-600">{slipSettle.appointment_count} جلسه مشاوره</span>
              </div>
            </div>

            {/* Detailed financial table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">عنوان عامل محاسباتی</th>
                    <th className="p-3 text-center">درصد سهم</th>
                    <th className="p-3 text-left">مبلغ محاسباتی (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  <tr>
                    <td className="p-3 font-bold text-slate-800">کل درآمد ناخالص حاصل از جلسات مراجعین</td>
                    <td className="p-3 text-center font-mono">100٪</td>
                    <td className="p-3 text-left font-mono font-bold text-slate-800">
                      {((slipSettle.amount / 0.70) || (slipSettle.amount * 1.4)).toLocaleString('fa-IR')} تومان
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-500">حق‌السهم و کمیسیون مدیریت کلینیک</td>
                    <td className="p-3 text-center font-mono text-slate-400">30٪</td>
                    <td className="p-3 text-left font-mono text-slate-500">
                      {(((slipSettle.amount / 0.70) * 0.3) || (slipSettle.amount * 0.4)).toLocaleString('fa-IR')} + تومان
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 text-emerald-800 font-bold">
                    <td className="p-3 text-emerald-950 font-black">حاصل پرداختی خالص و حق‌السهم استاد (واریزی)</td>
                    <td className="p-3 text-center font-mono">70٪</td>
                    <td className="p-3 text-left font-mono font-black text-emerald-600">
                      {slipSettle.amount.toLocaleString('fa-IR')} تومان
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Detailed Table of Sessions */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">صورت‌جلسه تفصیلی نوبت‌های تسویه‌شده</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="border border-slate-200 p-2 font-bold">ردیف</th>
                      <th className="border border-slate-200 p-2 font-bold">تاریخ</th>
                      <th className="border border-slate-200 p-2 font-bold">نام مراجع</th>
                      <th className="border border-slate-200 p-2 font-bold">موضوع مشاوره</th>
                      <th className="border border-slate-200 p-2 font-bold">ارجاع</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">مبلغ کل (تومان)</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">سهم کلینیک</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">سهم استاد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                        const settledApps = appointments.filter(a => slipSettle.appointment_ids ? slipSettle.appointment_ids.includes(a.id) : (a.doctor === slipSettle.doctor && a.date >= slipSettle.start_date && a.date <= slipSettle.end_date && a.is_settled === 1));
                        return settledApps.map((app, idx) => {
                          const docCut = app.final_cost * ((app.doc_share_pct || 70) / 100);
                          const clinicCut = app.final_cost - docCut;
                          return (
                            <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                              <td className="border border-slate-200 p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="border border-slate-200 p-2 font-mono text-slate-600">{app.date}</td>
                              <td className="border border-slate-200 p-2 font-bold">{app.patient_name}</td>
                              <td className="border border-slate-200 p-2 text-slate-700">{app.subject}</td>
                              <td className="border border-slate-200 p-2 text-slate-500">{app.ref_type || 'مستقیم'}</td>
                              <td className="border border-slate-200 p-2 font-mono text-center">{app.final_cost.toLocaleString('fa-IR')}</td>
                              <td className="border border-slate-200 p-2 font-mono text-center text-slate-500">{clinicCut.toLocaleString('fa-IR')}</td>
                              <td className="border border-slate-200 p-2 font-mono text-center font-bold text-emerald-600">{docCut.toLocaleString('fa-IR')}</td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Description card */}
            <div className="bg-slate-50/70 p-4 border border-slate-100 rounded-xl text-xs space-y-1">
              <span className="block text-[9px] text-slate-400 font-bold">بابت شرح سند مالی:</span>
              <p className="text-slate-600 leading-relaxed font-mono">{slipSettle.description}</p>
            </div>

            {/* Signatures area */}
            <div className="grid grid-cols-2 gap-6 pt-10 text-xs">
              <div className="space-y-16 text-center">
                <span className="font-bold text-slate-500">امضا و تایید بخش امور مالی کلینیک</span>
                <div className="text-[10px] text-slate-400">مهر کلینیک روان‌شناسی خانواده فاطمی</div>
              </div>
              <div className="space-y-16 text-center">
                <span className="font-bold text-slate-500">امضا و تایید دریافت کننده (استاد مشاور)</span>
                <div className="text-[10px] text-slate-400">تاریخ امضای فیش: .............................</div>
              </div>
            </div>

            {/* Print and Close controls */}
            <div className="flex gap-2 border-t border-slate-100 pt-5 print:hidden">
              <button
                type="button"
                onClick={() => {
                  exportToPDF('printable-area', `فیش_تسویه_${slipSettle.doctor}_${getCurrentJalaliDate()}`);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>چاپ فیش تسویه</span>
              </button>
              <button
                type="button"
                onClick={() => setSlipSettle(null)}
                className="w-1/3 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl cursor-pointer text-center transition-colors"
              >
                بستن پنجره رسید
              </button>
            </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dynamic Toasts Container */}
      <div className="fixed bottom-5 left-5 z-[200] space-y-2 pointer-events-none print:hidden">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="bg-slate-900 border border-slate-800 text-white text-xs font-bold p-4 rounded-xl shadow-xl pointer-events-auto max-w-sm animate-fade-in-up"
          >
            <p className="whitespace-pre-line leading-relaxed">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Delete Settlement Modal */}
      {deleteSettlementConfirm && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 max-w-md w-full p-6 text-right relative animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 mb-4 border-b border-red-50 pb-3">
              <div className="p-3 bg-red-100 rounded-full animate-pulse">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">
                {deleteSettlementConfirm.step === 1 ? 'هشدار مهم ابطال سند' : 'هشدار نهایی'}
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 font-medium leading-loose text-justify">
              {deleteSettlementConfirm.step === 1 ? (
                <>آیا از ابطال دائم سند تسویه‌حساب دوره‌ای استاد <strong>{deleteSettlementConfirm.doctor}</strong> به مبلغ <strong className="font-mono">{deleteSettlementConfirm.amount.toLocaleString('fa-IR')}</strong> تومان اطمینان کامل دارید؟<br/><br/>
                <span className="text-red-500 font-bold block">توجه: حذف این سند باعث می‌شود تمام نوبت‌های مرتبط با آن مجدداً به حالت «تسویه نشده» برگردند تا بتوانید آنها را مجدداً ارزیابی و تسویه نمایید.</span></>
              ) : (
                <span className="text-red-600 font-bold">با انجام این کار سوابق پرداختی در این سند برای همیشه پاک شده و قابل بازیابی نخواهد بود. آیا کاملا مطمئن هستید که می‌خواهید سند باطل شده و نوبت‌های استاد آزاد گردد؟</span>
              )}
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                onClick={() => setDeleteSettlementConfirm(null)}
              >
                انصراف و لغو ابطال
              </button>
              {deleteSettlementConfirm.step === 1 ? (
                <button
                  type="button"
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                  onClick={() => setDeleteSettlementConfirm(prev => prev ? { ...prev, step: 2 } : null)}
                >
                  بله، ادامه مراحل ابطال
                </button>
              ) : (
                <button
                  type="button"
                  className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all animate-pulse"
                  onClick={executeDeleteSettlement}
                >
                  بله، سند را باطل کن
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Preview Modal */}
      {notificationPreview && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full flex flex-col max-h-[90vh] animate-scale-up">
            <div className="flex justify-between items-center bg-slate-50 border-b border-slate-150 p-4 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Bell className="h-5 w-5 text-emerald-500" />
                <span>پیش‌نمایش پیام اطلاع‌رسانی</span>
              </div>
              <button 
                onClick={() => setNotificationPreview(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-700 select-all border-b border-slate-100 bg-slate-50/50">
              {notificationPreview.msg}
            </div>
            
            <div className="p-4 bg-white rounded-b-2xl flex gap-3 shrink-0">
              <button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  try {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(notificationPreview.msg);
                    } else {
                       const fallbackInput = document.createElement("textarea");
                       fallbackInput.value = notificationPreview.msg;
                       document.body.appendChild(fallbackInput);
                       fallbackInput.select();
                       document.execCommand("copy");
                       document.body.removeChild(fallbackInput);
                    }
                    const newToast = {
                      id: Date.now(),
                      message: `📋 پیام با موفقیت به کلیپ‌بورد کپی شد.\nاکنون می‌توانید آن را در شبکه‌های اجتماعی پیست کنید.`
                    };
                    setToasts(prev => [newToast, ...prev]);
                    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 5000);
                  } catch (e) {}
                  setNotificationPreview(null);
                }}
              >
                <ClipboardList className="h-4 w-4" />
                <span>کپی در کلیپ‌بورد</span>
              </button>
              <button
                type="button"
                className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0"
                onClick={() => setNotificationPreview(null)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
