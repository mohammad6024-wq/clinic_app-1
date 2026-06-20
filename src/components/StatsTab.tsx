/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Appointment, Doctor, Patient, Expense, User } from '../types';
import { StorageHelper } from '../utils/storage';
import { exportToExcelHTML } from '../utils/exportExcel';
import { exportToPDF } from '../utils/exportPdf';
import { motion } from 'motion/react';
import JalaliDatePicker from './JalaliDatePicker';
import { 
  getCurrentJalaliDate, 
  getJalaliWeekdayIndex, 
  addDaysJalali, 
  getJalaliMonthDaysCount, 
  parseJalali 
} from '../utils/jalali';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  FileText, 
  PieChart, 
  Search, 
  X, 
  Download, 
  Printer, 
  Filter, 
  ArrowLeft, 
  Percent,
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Heart,
  User as UserIcon,
  HelpCircle,
  SlidersHorizontal
} from 'lucide-react';

export default function StatsTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Interactive Popup Sheets State (Core financial reports)
  const [activeReportType, setActiveReportType] = useState<'revenue' | 'expenses' | 'profit' | 'patients' | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportDocFilter, setReportDocFilter] = useState('');
  
  // Persian date filter states
  const [startDate, setStartDate] = useState('1405/01/01');
  const [endDate, setEndDate] = useState('1405/12/29');

  // Interactive Live Tiles Popup States
  const [activeTileType, setActiveTileType] = useState<
    'today' | 'week' | 'month' | 'completed' | 'cancelled' | 'referred' | 'couple' | 'patients' | 'doctors' | 'users' | 'advanced' | null
  >(null);
  const [tileSearchQuery, setTileSearchQuery] = useState('');
  const [tileDocFilter, setTileDocFilter] = useState('');
  const [tileStatusFilter, setTileStatusFilter] = useState('');
  const [tileSubjectFilter, setTileSubjectFilter] = useState('');
  const [tileFromDate, setTileFromDate] = useState('1405/01/01');
  const [tileToDate, setTileToDate] = useState('1405/12/29');

  useEffect(() => {
    loadAllStatsData();
  }, []);

  const loadAllStatsData = () => {
    setAppointments(StorageHelper.getAppointments());
    setDoctors(StorageHelper.getDoctors());
    setPatients(StorageHelper.getPatients());
    setExpenses(StorageHelper.getExpenses());
    setUsers(StorageHelper.getUsers());
  };

  const handleRefresh = () => {
    loadAllStatsData();
  };

  // Compute live stats counts
  const todayStr = getCurrentJalaliDate();

  // 1. Today's appointments count
  const todayCount = appointments.filter(a => a.date === todayStr).length;

  // 2. Weekly appointments count
  const todayIdx = getJalaliWeekdayIndex(todayStr);
  const startWeekDateStr = addDaysJalali(todayStr, -todayIdx);
  const endWeekDateStr = addDaysJalali(todayStr, 6 - todayIdx);
  const weekCount = appointments.filter(a => a.date >= startWeekDateStr && a.date <= endWeekDateStr).length;

  // 3. Monthly appointments count
  const parsedToday = parseJalali(todayStr);
  const padNum = (n: number) => n.toString().padStart(2, '0');
  const startMonthDateStr = `${parsedToday.jy}/${padNum(parsedToday.jm)}/01`;
  const endMonthDateStr = `${parsedToday.jy}/${padNum(parsedToday.jm)}/${padNum(getJalaliMonthDaysCount(parsedToday.jy, parsedToday.jm))}`;
  const monthCount = appointments.filter(a => a.date >= startMonthDateStr && a.date <= endMonthDateStr).length;

  // 4. Completed appointments
  const completedCount = appointments.filter(a => a.status === 'انجام شده').length;

  // 5. Cancelled appointments
  const cancelledCount = appointments.filter(a => a.status === 'کنسل مراجع' || a.status === 'کنسل استاد').length;

  // 6. Referred appointments
  const referredCount = appointments.filter(a => 
    (a.ref_type && a.ref_type !== 'عادی' && a.ref_type !== 'مستقیم') || 
    (a.ref_model && a.ref_model !== 'مرکز')
  ).length;

  // 7. Couple appointments
  const coupleCount = appointments.filter(a => !!a.patient2_name).length;

  // 8. Patients count
  const patientsCount = patients.length;

  // 9. Doctors count
  const doctorsCount = doctors.length;

  // 10. Active users count
  const activeUsersCount = users.filter(u => u.is_active === 1).length;

  // 11. Advanced filter total datasets
  const advancedFilterCount = appointments.length;

  // Core financial metrics calculations
  const totalInvoicedRevenue = appointments
    .filter(a => a.status === 'انجام شده' || a.status === 'فعال')
    .reduce((sum, a) => sum + a.final_cost, 0);

  const totalClinicExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarningsProfit = totalInvoicedRevenue - totalClinicExpenses;

  // 1. Doctor loads (number of appointments)
  const doctorLoads: { [key: string]: number } = {};
  appointments.forEach(a => {
    if (a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد') {
      doctorLoads[a.doctor] = (doctorLoads[a.doctor] || 0) + 1;
    }
  });

  // 2. Specialty representation
  const specialtyBreakdown: { [key: string]: number } = {};
  appointments.forEach(a => {
    if (a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد') {
      specialtyBreakdown[a.subject] = (specialtyBreakdown[a.subject] || 0) + 1;
    }
  });

  // 3. Shift representation
  const shiftBreakdown: { [key: string]: number } = {};
  appointments.forEach(a => {
    if (a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد') {
      shiftBreakdown[a.shift] = (shiftBreakdown[a.shift] || 0) + 1;
    }
  });

  // Export to Excel with styling
  const handleExportCSV = (filename: string, headers: string[], rows: any[][], title?: string) => {
    exportToExcelHTML(filename, title || 'گزارش کلینیک فاطمی', headers, rows);
  };

  // Trigger printer
  const handlePrint = () => {
    // Determine which modal is open to print
    const elementId = activeTileType ? 'tile-print-zone' : (activeReportType ? 'print-zone' : null);
    if (elementId) {
      exportToPDF(elementId, `گزارش_کلینیک_فاطمی_${getCurrentJalaliDate()}`);
    }
  };

  // Tile Selection Click Handler
  const handleTileClick = (type: typeof activeTileType) => {
    const today = getCurrentJalaliDate();
    let fromDate = '1405/01/01';
    let toDate = '1405/12/29';
    let docFilter = '';
    let statusFilter = '';
    let subjectFilter = '';

    if (type === 'today') {
      fromDate = today;
      toDate = today;
    } else if (type === 'week') {
      const todayIndex = getJalaliWeekdayIndex(today);
      fromDate = addDaysJalali(today, -todayIndex);
      toDate = addDaysJalali(today, 6 - todayIndex);
    } else if (type === 'month') {
      const { jy, jm } = parseJalali(today);
      const pad = (n: number) => n.toString().padStart(2, '0');
      fromDate = `${jy}/${pad(jm)}/01`;
      toDate = `${jy}/${pad(jm)}/${pad(getJalaliMonthDaysCount(jy, jm))}`;
    } else if (type === 'completed') {
      statusFilter = 'انجام شده';
    } else if (type === 'cancelled') {
      statusFilter = 'کنسل مراجع'; // handled specially in filter (will find both m مراجعه and s استاد)
    }

    setTileFromDate(fromDate);
    setTileToDate(toDate);
    setTileSearchQuery('');
    setTileDocFilter(docFilter);
    setTileStatusFilter(statusFilter);
    setTileSubjectFilter(subjectFilter);
    setActiveTileType(type);
  };

  // Helper to render responsive colored gradient tiles
  const renderTileCard = (
    id: typeof activeTileType,
    title: string,
    count: number,
    gradients: string,
    icon: React.ReactNode
  ) => {
    return (
      <button
        key={id}
        onClick={() => handleTileClick(id)}
        className={`relative overflow-hidden p-4 rounded-xl text-white shadow-sm hover:shadow-md hover:scale-[1.015] active:scale-[0.985] transition-all cursor-pointer text-right w-full bg-gradient-to-tr ${gradients} min-h-[90px] flex flex-col justify-between`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs sm:text-[13px] font-bold text-white/95 leading-tight">{title}</span>
          <div className="relative p-2 bg-white/20 rounded-lg text-white shrink-0">
            {icon}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] opacity-80 font-sans font-medium">مشاهده گزارش</span>
          <div className="text-2xl font-black tracking-tight font-mono self-end">
            {count.toLocaleString('fa-IR')}
          </div>
        </div>
      </button>
    );
  };

  // Filter listings based on card type in interactive modal
  const filteredApps = appointments.filter(app => {
    if (app.date < tileFromDate || app.date > tileToDate) return false;
    if (tileDocFilter && app.doctor !== tileDocFilter) return false;
    if (tileSubjectFilter && app.subject !== tileSubjectFilter) return false;
    
    if (tileStatusFilter) {
      if (tileStatusFilter === 'کنسل مراجع') {
        // Show both cancelled statuses
        if (app.status !== 'کنسل مراجع' && app.status !== 'کنسل استاد') return false;
      } else {
        if (app.status !== tileStatusFilter) return false;
      }
    }

    if (activeTileType === 'referred') {
      const isReferredRefType = app.ref_type && app.ref_type !== 'عادی' && app.ref_type !== 'مستقیم';
      const isReferredRefModel = app.ref_model && app.ref_model !== 'مرکز';
      if (!isReferredRefType && !isReferredRefModel) return false;
    }

    if (activeTileType === 'couple') {
      if (!app.patient2_name) return false;
    }

    if (tileSearchQuery.trim()) {
      const q = tileSearchQuery.trim().toLowerCase();
      const matches = 
        app.patient_name.toLowerCase().includes(q) || 
        app.doctor.toLowerCase().includes(q) || 
        app.nat_id.includes(q) || 
        app.phone.includes(q) || 
        (app.patient2_name && app.patient2_name.toLowerCase().includes(q)) ||
        app.subject.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  const filteredPatients = patients.filter(p => {
    if (tileSearchQuery.trim()) {
      const q = tileSearchQuery.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || p.nat_id.includes(q) || p.phone.includes(q);
    }
    return true;
  });

  const filteredDoctors = doctors.filter(d => {
    if (tileSearchQuery.trim()) {
      const q = tileSearchQuery.trim().toLowerCase();
      return d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q) || d.phone.includes(q);
    }
    return true;
  });

  const filteredUsers = users.filter(u => {
    if (u.is_active !== 1) return false;
    if (tileSearchQuery.trim()) {
      const q = tileSearchQuery.trim().toLowerCase();
      return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate totals inside filtered apps
  const tileAppsTotalCost = filteredApps.reduce((s, a) => s + (a.cost || 0), 0);
  const tileAppsTotalDiscount = filteredApps.reduce((s, a) => s + (a.discount || 0), 0);
  const tileAppsTotalFinalStr = filteredApps.reduce((s, a) => s + (a.final_cost || 0), 0);

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      
      {/* 📊 داشبورد آماری مرکز مشاوره - MAIN GRAPHICS BOARD */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Header Ribbon */}
        <div className="text-center pb-2 border-b border-slate-50">
          <h2 className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <span>داشبورد آماری مرکز مشاوره</span>
            <span role="img" aria-label="chart">📊</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">سامانه رصد زنده نوبت‌ها، مراجعین، اساتید و پرونده‌های درمانی کلینیک فاطمی</p>
        </div>

        {/* 11 Live Active Gradient Grid elements mapped accurately from mock attachment */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {renderTileCard('today', 'نوبت‌های امروز', todayCount, 'from-blue-400 via-blue-500 to-indigo-500', <Calendar className="h-5 w-5" />)}
          {renderTileCard('week', 'نوبت‌های هفته جاری', weekCount, 'from-teal-400 via-teal-500 to-emerald-500', <CalendarDays className="h-5 w-5" />)}
          {renderTileCard('month', 'نوبت‌های ماه جاری', monthCount, 'from-indigo-400 via-purple-500 to-teal-450', <Calendar className="h-5 w-5" />)}
          
          {renderTileCard('completed', 'نوبت‌های انجام شده', completedCount, 'from-emerald-400 via-green-500 to-emerald-500', <CheckCircle2 className="h-5 w-5" />)}
          {renderTileCard('cancelled', 'نوبت‌های لغو شده', cancelledCount, 'from-rose-500 via-red-600 to-indigo-700', <XCircle className="h-5 w-5" />)}
          {renderTileCard('referred', 'نوبت‌های ارجاعی', referredCount, 'from-orange-400 via-orange-500 to-purple-600', <RefreshCw className="h-5 w-5" />)}
          
          {renderTileCard('couple', 'نوبت‌های زوجی', coupleCount, 'from-pink-500 via-purple-600 to-blue-500', <Heart className="h-5 w-5 fill-white/20" />)}
          {renderTileCard('doctors', 'لیست اساتید', doctorsCount, 'from-cyan-400 via-sky-550 to-blue-500', <Award className="h-5 w-5" />)}
          {renderTileCard('patients', 'لیست مراجعین', patientsCount, 'from-lime-500 via-green-500 to-purple-500', <Users className="h-5 w-5" />)}
          
          {renderTileCard('users', 'کاربران فعال', activeUsersCount, 'from-purple-500 via-indigo-650 to-cyan-400', <UserIcon className="h-5 w-5" />)}
          {renderTileCard('advanced', 'فیلتر پیشرفته', advancedFilterCount, 'from-rose-500 via-pink-600 to-indigo-900', <Search className="h-5 w-5" />)}
        </div>
        
        {/* Update and Refresh widget button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>بروزرسانی</span>
          </button>
        </div>

      </div>

      {/* 💵 FINANCIAL CLINIC GENERAL OVERVIEW STATS (RETAINED FOR UTILITY) */}
      <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex flex-col gap-4">
        <h3 className="text-xs font-extrabold text-slate-500 border-b border-slate-100 pb-2">پایشگر مالی کلان کلینیک</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Total Revenue */}
          <button
            onClick={() => {
              setReportSearchQuery('');
              setReportDocFilter('');
              setActiveReportType('revenue');
            }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer text-right w-full"
          >
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center">
                <span>کل درآمد حاصل از نوبت‌ها</span>
                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">جزییات 🖲️</span>
              </div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                {totalInvoicedRevenue.toLocaleString('fa-IR')} تومان
              </div>
            </div>
          </button>

          {/* Expenses */}
          <button
            onClick={() => {
              setReportSearchQuery('');
              setActiveReportType('expenses');
            }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-red-300 hover:shadow-xs transition-all cursor-pointer text-right w-full"
          >
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center">
                <span>هزینه‌های جاری کلینیک</span>
                <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black">جزییات 🖲️</span>
              </div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                {totalClinicExpenses.toLocaleString('fa-IR')} تومان
              </div>
            </div>
          </button>

          {/* Net Profit Margin */}
          <button
            onClick={() => {
              setReportSearchQuery('');
              setActiveReportType('profit');
            }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer text-right w-full"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center">
                <span>تفاضل سود خالص مرکز</span>
                <span className="text-[8px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">بیلان 🖲️</span>
              </div>
              <div className={`text-sm font-extrabold mt-0.5 font-mono ${netEarningsProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netEarningsProfit.toLocaleString('fa-IR')} تومان
              </div>
            </div>
          </button>

          {/* Total Patients */}
          <button
            onClick={() => {
              setReportSearchQuery('');
              setActiveReportType('patients');
            }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer text-right w-full"
          >
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center">
                <span>کل مراجعین ثبت‌شده</span>
                <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">دفترچه 🖲️</span>
              </div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                {patientsCount.toLocaleString('fa-IR')} مراجع
              </div>
            </div>
          </button>

        </div>
      </div>

      {/* Analytics Visual Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Doctor appointment workloads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-50 pb-3">
            <Award className="h-4 w-4 text-blue-500" />
            <span>بار کاری بیمار الکترونیکی اساتید</span>
          </h4>
          <div className="space-y-3.5">
            {doctors.length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-[11px]">اساتید یافت نشد</p>
            ) : (
              doctors.map(d => {
                const count = doctorLoads[d.name] || 0;
                const percentage = appointments.length > 0 ? Math.min(100, Math.ceil((count / appointments.length) * 100)) : 0;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{d.name}</span>
                      <span className="font-bold font-mono text-slate-500">{count} جلسه ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Subjects Specialty representations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-50 pb-3">
            <PieChart className="h-4 w-4 text-purple-500" />
            <span>نیازسنجی بر اساس موضوعات مشاوره</span>
          </h4>
          <div className="space-y-3.5">
            {Object.keys(specialtyBreakdown).length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-[11px]">موضوعی ثبت نشده</p>
            ) : (
              Object.keys(specialtyBreakdown).map(k => {
                const count = specialtyBreakdown[k];
                const percentage = appointments.length > 0 ? Math.min(100, Math.ceil((count / appointments.length) * 100)) : 0;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{k}</span>
                      <span className="font-bold font-mono text-slate-500">{count} جلسه ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Shift distributions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-50 pb-3">
            <Briefcase className="h-4 w-4 text-amber-500" />
            <span>پراکندگی نوبت‌ها بر حسب شیفت حضور</span>
          </h4>
          <div className="space-y-3.5">
            {Object.keys(shiftBreakdown).length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-[11px]">داده نوبت‌ها خالی است</p>
            ) : (
              Object.keys(shiftBreakdown).map(k => {
                const count = shiftBreakdown[k];
                const percentage = appointments.length > 0 ? Math.min(100, Math.ceil((count / appointments.length) * 100)) : 0;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">شیفت {k}</span>
                      <span className="font-bold font-mono text-slate-500">{count} جلسه ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* List doctor list cards */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 text-xs">اساتید فعال روانشناسی مرکز مشاوره فاطمی</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {doctors.map(d => (
            <div key={d.id} className="border border-slate-100 p-4 rounded-xl space-y-2 hover:border-blue-100 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 font-black text-center flex items-center justify-center text-sm">
                  {d.gender === 'مرد' ? '👨' : '👩'}
                </div>
                <div>
                  <div className="font-extrabold text-slate-800 text-xs">{d.name}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{d.spec}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between bg-slate-50 py-1.5 px-2.5 rounded-lg font-mono">
                <span>تلفن همراه: {d.phone}</span>
                <span className="font-sans">پذیرش: {d.working_days}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 🔮 1. INTERACTIVE LIVE TILES CLICK MODAL popup 🔮 */}
      {/* ========================================== */}
      {activeTileType && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveTileType(null)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            dragConstraints={{ left: -400, right: 400, top: -250, bottom: 250 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col text-right cursor-default"
            dir="rtl"
            id="tile-print-zone"
          >
            
            {/* Modal Print Header (Only visible when printing) */}
            <div className="hidden print:block text-center space-y-1 mb-6 text-slate-800">
              <h2 className="text-lg font-extrabold">مرکز مشاوره فاطمی (حرم مطهر حضرت معصومه س)</h2>
              <p className="text-xs">
                {activeTileType === 'today' && 'گزارش نوبت‌های امروز'}
                {activeTileType === 'week' && 'گزارش نوبت‌های هفته جاری'}
                {activeTileType === 'month' && 'گزارش نوبت‌های ماه جاری'}
                {activeTileType === 'completed' && 'گزارش جلسات انجام شده'}
                {activeTileType === 'cancelled' && 'گزارش جلسات لغو شده'}
                {activeTileType === 'referred' && 'گزارش ارجاعی مراجعین'}
                {activeTileType === 'couple' && 'گزارش نوبت‌های زوجی'}
                {activeTileType === 'patients' && 'دفتر مراجعین ثبت شده'}
                {activeTileType === 'doctors' && 'لیست اساتید مرکز'}
                {activeTileType === 'users' && 'لیست کاربران فعال سیستم'}
                {activeTileType === 'advanced' && 'فیلتر و پایش پیشرفته نوبت‌ها'}
              </p>
              <p className="text-[10px] font-mono">بازه فیلتر: {tileFromDate} الی {tileToDate}</p>
              <hr className="border-slate-300 mt-4" />
            </div>

            {/* Modal Header */}
            <div className="drag-handle cursor-move select-none p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl p-2 bg-blue-100 rounded-xl">
                  {activeTileType === 'today' && '📅'}
                  {activeTileType === 'week' && '📆'}
                  {activeTileType === 'month' && '📅'}
                  {activeTileType === 'completed' && '✅'}
                  {activeTileType === 'cancelled' && '❌'}
                  {activeTileType === 'referred' && '🔄'}
                  {activeTileType === 'couple' && '💖'}
                  {activeTileType === 'patients' && '👥'}
                  {activeTileType === 'doctors' && '🎓'}
                  {activeTileType === 'users' && '👤'}
                  {activeTileType === 'advanced' && '🔍'}
                </span>
                <div>
                  <h3 className="font-black text-sm text-slate-800">
                    {activeTileType === 'today' && 'جزئیات نوبت‌های امروز'}
                    {activeTileType === 'week' && 'جزئیات نوبت‌های هفته جاری'}
                    {activeTileType === 'month' && 'جزئیات نوبت‌های ماه جاری'}
                    {activeTileType === 'completed' && 'آرشیو جلسات انجام شده'}
                    {activeTileType === 'cancelled' && 'آرشیو جلسات لغو شده'}
                    {activeTileType === 'referred' && 'جزئیات نوبت‌های ارجاعی'}
                    {activeTileType === 'couple' && 'جزئیات نوبت‌های زوجی'}
                    {activeTileType === 'patients' && 'سامانه مراجعین ثبت شده'}
                    {activeTileType === 'doctors' && 'لیست اساتید و مشاوران مرکز'}
                    {activeTileType === 'users' && 'لیست کاربران فعال سیستم'}
                    {activeTileType === 'advanced' && 'سامانه فیلتر پیشرفته نوبت‌ها'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">پایش دقیق اطلاعات، فیلترینگ زنده، خروجی چاپی PDF و فایل اکسل</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTileType(null)} 
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filtering bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search Text */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={tileSearchQuery}
                    onChange={(e) => setTileSearchQuery(e.target.value)}
                    placeholder="جستجو بر اساس نام، کدملی، شماره همراه..."
                    className="pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-800 w-56 font-sans"
                  />
                </div>

                {/* Show Date filters on appointments views */}
                {!['patients', 'doctors', 'users'].includes(activeTileType) && (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <div className="flex items-center gap-1 w-32">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">از:</span>
                      <JalaliDatePicker value={tileFromDate} onChange={setTileFromDate} />
                    </div>
                    <div className="flex items-center gap-1 w-32">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">تا:</span>
                      <JalaliDatePicker value={tileToDate} onChange={setTileToDate} />
                    </div>
                  </div>
                )}

                {/* Additional filters for appointments */}
                {!['patients', 'doctors', 'users'].includes(activeTileType) && (
                  <>
                    {/* Doctor Selector */}
                    <select
                      value={tileDocFilter}
                      onChange={(e) => setTileDocFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700"
                    >
                      <option value="">همه اساتید</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>

                    {/* Subject Selector */}
                    <select
                      value={tileSubjectFilter}
                      onChange={(e) => setTileSubjectFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700"
                    >
                      <option value="">همه موضوعات</option>
                      {Array.from(new Set(appointments.map(a => a.subject).filter(Boolean))).map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>

                    {/* Status Selector - Only show if not pre-locked */}
                    {!['completed', 'cancelled'].includes(activeTileType) && (
                      <select
                        value={tileStatusFilter}
                        onChange={(e) => setTileStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700"
                      >
                        <option value="">همه وضعیت‌ها</option>
                        <option value="فعال">فعال</option>
                        <option value="انجام شده">انجام شده</option>
                        <option value="کنسل مراجع">کنسل مراجع</option>
                        <option value="کنسل استاد">کنسل استاد</option>
                      </select>
                    )}
                  </>
                )}

              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (activeTileType === 'patients') {
                      const headers = ['کد پرونده', 'نام مراجع', 'کدملی مراجع', 'شماره تماس', 'نوع حساب بیمه', 'اعتبار کیف پول (تومان)', 'مبلغ بدهی (تومان)'];
                      const rows = filteredPatients.map(p => [p.id, p.name, p.nat_id, p.phone, p.type, p.wallet_balance, p.balance]);
                      handleExportCSV('Clinic_Patients_Directory', headers, rows);
                    } else if (activeTileType === 'doctors') {
                      const headers = ['کد استاد', 'نام مشاور', 'تخصص رسمی', 'شماره تماس', 'کد ملی', 'جنسیت', 'روزهای حضور'];
                      const rows = filteredDoctors.map(d => [d.id, d.name, d.spec, d.phone, d.nat_id || '', d.gender, d.working_days]);
                      handleExportCSV('Clinic_Doctors_Directory', headers, rows);
                    } else if (activeTileType === 'users') {
                      const headers = ['کد کاربری', 'نام و نام‌خانوادگی', 'نام کاربری', 'نقش سیستمی', 'تلفن همراه', 'کد ملی', 'وضعیت کاربر'];
                      const rows = filteredUsers.map(u => [u.id, u.name, u.username, u.role, u.phone, u.nat_id, u.is_active === 1 ? 'فعال' : 'غیرفعال']);
                      handleExportCSV('System_Users_List', headers, rows);
                    } else {
                      const headers = ['کد نوبت', 'تاریخ حضور', 'ساعت نوبت', 'نام مراجع', 'کد ملی مراجع', 'روانشناس مشاور', 'موضوع نشست', 'مبلغ پرداختی (تومان)', 'وضعیت مالی', 'وضعیت نوبت'];
                      const rows = filteredApps.map(a => [a.id, a.date, a.time, a.patient_name, a.nat_id, a.doctor, a.subject, a.final_cost, a.payment_status, a.status]);
                      handleExportCSV(`Clinic_Appointments_${activeTileType}`, headers, rows);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>خروجی اکسل (CSV)</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>چاپ PDF رسمی</span>
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 p-5 overflow-y-auto overflow-x-auto min-h-[300px]">
              
              {/* Table rendering based on selection */}
              {activeTileType === 'patients' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold font-sans">تعداد کل رکوردها: {filteredPatients.length} مراجع پرونده الکترونیکی یافت شد</p>
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">کد پرونده</th>
                        <th className="p-3">نام مراجع</th>
                        <th className="p-3">کد ملی مراجع</th>
                        <th className="p-3">شماره همراه</th>
                        <th className="p-3">نوع حساب بیمه</th>
                        <th className="p-3 text-emerald-600">اعتبار کیف پول</th>
                        <th className="p-3 text-rose-600">میزان بدهی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredPatients.map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50/50 ${p.is_blocked === 1 ? 'bg-red-50/40 text-red-900 font-bold' : ''}`}>
                          <td className="p-3 font-mono font-bold text-slate-400">{p.id}</td>
                          <td className="p-3 font-black text-slate-800">{p.name} {p.is_blocked === 1 && '🚨 مسدود/لیست سیاه'}</td>
                          <td className="p-3 font-mono">{p.nat_id}</td>
                          <td className="p-3 font-mono">{p.phone}</td>
                          <td className="p-3 font-semibold">{p.type}</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">{p.wallet_balance.toLocaleString('fa-IR')} تومان</td>
                          <td className="p-3 font-mono text-rose-550 font-bold">{p.balance.toLocaleString('fa-IR')} تومان</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTileType === 'doctors' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold font-sans">تعداد اساتید روانشناسی کلینیک: {filteredDoctors.length} نفر</p>
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">شناسه استاد</th>
                        <th className="p-3">جنسیت</th>
                        <th className="p-3">نام استاد مشاور</th>
                        <th className="p-3">تخصص اصلی</th>
                        <th className="p-3">تلفن همراه</th>
                        <th className="p-3">روزهای پذیرش در مرکز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredDoctors.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 font-bold">{d.id}</td>
                          <td className="p-3 text-lg">{d.gender === 'مرد' ? '👨' : '👩'}</td>
                          <td className="p-3 font-black text-slate-800">{d.name}</td>
                          <td className="p-3 text-blue-600 font-black">{d.spec}</td>
                          <td className="p-3 font-mono">{d.phone}</td>
                          <td className="p-3 text-slate-650">{d.working_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTileType === 'users' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold font-sans">کاربران فعال سیستمی: {filteredUsers.length} نفر</p>
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">شناسه</th>
                        <th className="p-3">نام و نام‌خانوادگی</th>
                        <th className="p-3">نام کاربری</th>
                        <th className="p-3">نقش کاربری</th>
                        <th className="p-3">تلفن همراه</th>
                        <th className="p-3">کد ملی</th>
                        <th className="p-3">وضعیت حساب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-755">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 font-bold">{u.id}</td>
                          <td className="p-3 font-black text-slate-800">{u.name}</td>
                          <td className="p-3 font-mono text-indigo-600 font-semibold">{u.username}</td>
                          <td className="p-3 font-bold">
                            <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-sans">
                              {u.role === 'admin' ? 'مدیر کلینیک' : u.role === 'supervisor' ? 'سوپروایزر' : 'منشی صندلی'}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{u.phone}</td>
                          <td className="p-3 font-mono">{u.nat_id}</td>
                          <td className="p-3 font-black text-emerald-600">فعال</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // appointments views rendering
                <div className="space-y-4 font-sans">
                  <div className="flex flex-wrap justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-100 gap-3">
                    <p className="text-xs text-slate-500 font-bold">تعداد کل نوبت‌های منطبق: {filteredApps.length} نشست مشاوره</p>
                    <div className="flex flex-wrap gap-4 font-mono text-[11px] text-slate-700">
                      <span>مجموع خام هزینه: <b className="text-slate-850">{tileAppsTotalCost.toLocaleString('fa-IR')}</b> تومان</span>
                      <span>تخفیف: <b className="text-rose-600">{tileAppsTotalDiscount.toLocaleString('fa-IR')}</b> تومان</span>
                      <span>سهم دریافتی خالص: <b className="text-emerald-700 text-xs font-black">{tileAppsTotalFinalStr.toLocaleString('fa-IR')} تومان</b></span>
                    </div>
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">کد نوبت</th>
                        <th className="p-3">تاریخ و ساعت حضور</th>
                        <th className="p-3">نام بیمار مراجع (کدملی)</th>
                        <th className="p-3">استاد روانشناس</th>
                        <th className="p-3">موضوع نشست مشاوره</th>
                        <th className="p-3">منبع ارجاعی / مدل مالی</th>
                        <th className="p-3 text-emerald-600">هزینه نهایی</th>
                        <th className="p-3 text-center">وضعیت نوبت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredApps.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400 font-bold">{a.id}</td>
                          <td className="p-3 font-mono">{a.date} <span className="text-[10px] text-slate-400 block font-sans mt-0.5">ساعت {a.time} (شیفت {a.shift})</span></td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800">{a.patient_name}</span>
                            {a.patient2_name && <span className="text-purple-650 font-black block text-[10px] mt-0.5">همراه: {a.patient2_name}</span>}
                            <span className="text-[10px] text-slate-400 block font-mono">کدملی: {a.nat_id}</span>
                          </td>
                          <td className="p-3 text-slate-700 font-bold">{a.doctor}</td>
                          <td className="p-3 font-semibold text-slate-600">{a.subject}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">{a.ref_type || 'عادی'} / {a.ref_model || 'مرکز'}</td>
                          <td className="p-3 font-mono font-black text-blue-600">{(a.final_cost || 0).toLocaleString('fa-IR')} تومان</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black ${
                              a.status === 'فعال' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              a.status === 'انجام شده' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Modal Signature Blocks (Only visible when printing) */}
            <div className="hidden print:block border-t border-slate-200 mt-12 pt-8 text-xs">
              <div className="grid grid-cols-3 text-center">
                <div>امضاء مسئول حسابداری مرکز</div>
                <div>امضاء سوپروایزر کلینیک</div>
                <div>امضاء مدیریت محترم دفتر فاطمی</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end print:hidden">
              <button
                onClick={() => setActiveTileType(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl px-4 py-2 cursor-pointer transition-colors"
              >
                بستن و بازگشت به داشبورد
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🔮 2. CORE FINANCIAL popup REPORTS (RETAINED FROM PREVIOUS SYSTEM) 🔮 */}
      {/* ========================================== */}
      {activeReportType && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveReportType(null)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            dragConstraints={{ left: -400, right: 400, top: -250, bottom: 250 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col text-right cursor-default"
            dir="rtl"
            id="print-zone"
          >
            
            {/* Modal Print Header (Only visible when printing) */}
            <div className="hidden print:block text-center space-y-1 mb-6 text-slate-800">
              <h2 className="text-lg font-extrabold">مرکز مشاوره فاطمی (حرم مطهر حضرت معصومه س)</h2>
              <p className="text-xs">گزارش مالی دفتری کلینیک بین تاریخ‌های {startDate} الی {endDate}</p>
              <hr className="border-slate-300 mt-4" />
            </div>

            {/* Modal Header */}
            <div className="drag-handle cursor-move select-none p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-lg p-2 bg-slate-100 rounded-xl">
                  {activeReportType === 'revenue' && '💰'}
                  {activeReportType === 'expenses' && '💸'}
                  {activeReportType === 'profit' && '📊'}
                  {activeReportType === 'patients' && '📁'}
                </span>
                <div>
                  <h3 className="font-black text-sm text-slate-800">
                    {activeReportType === 'revenue' && 'دفتر جزئیات درآمدهای کلینیک'}
                    {activeReportType === 'expenses' && 'دفتر جزئیات مخارج جاری کلینیک'}
                    {activeReportType === 'profit' && 'بیلان سود و تقسیم درآمد اساتید'}
                    {activeReportType === 'patients' && 'سامانه پرونده‌های الکترونیکی مراجعین'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">پایش دقیق تراکنش‌های مالی، اکسل و امکانات جستجوی بلادرنگ فوق حرفه‌ای</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveReportType(null)} 
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modals Filtering Bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search Text */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    placeholder="جستجو بر اساس نام، کدملی، تلفن یا شرح..."
                    className="pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-800 w-60 font-sans"
                  />
                </div>

                {/* Date range inputs */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">از:</span>
                    <JalaliDatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">تا:</span>
                    <JalaliDatePicker value={endDate} onChange={setEndDate} />
                  </div>
                </div>

                {/* Additional Doctor filter for Revenue */}
                {activeReportType === 'revenue' && (
                  <select
                    value={reportDocFilter}
                    onChange={(e) => setReportDocFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700"
                  >
                    <option value="">همه اساتید</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons: Export and Print */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (activeReportType === 'revenue') {
                      const headers = ['کد نوبت', 'تاریخ', 'ساعت', 'نام مراجع', 'کد ملی', 'روانشناس', 'موضوع', 'کل هزینه', 'تخفیف', 'پرداختی', 'وضعیت پرداختی', 'روش تسویه'];
                      const rows = appointments
                        .filter(a => a.date >= startDate && a.date <= endDate)
                        .map(a => [a.id, a.date, a.time, a.patient_name, a.nat_id, a.doctor, a.subject, a.cost, a.discount, a.final_cost, a.payment_status, a.payment_method]);
                      handleExportCSV('Clinic_Revenue_Report_' + startDate.replace(/\//g,'-'), headers, rows);
                    } else if (activeReportType === 'expenses') {
                      const headers = ['کد هزینه', 'تاریخ فاکتور', 'شرح هزینه', 'مبلغ هزینه (تومان)'];
                      const rows = expenses
                        .filter(e => e.date >= startDate && e.date <= endDate)
                        .map(e => [e.id, e.date, e.description, e.amount]);
                      handleExportCSV('Clinic_Expenses_Report_' + startDate.replace(/\//g,'-'), headers, rows);
                    } else if (activeReportType === 'profit') {
                      const headers = ['نام استاد روانشناسی', 'تعداد جلسات انجام شده', 'جمع فروش تعرفه پایه (تومان)', 'سهم پورسانت استاد (تومان)', 'سهم خالص مرکز (تومان)'];
                      const docShareDetails = doctors.map(d => {
                        const docApps = appointments.filter(a => a.doctor === d.name && (a.status === 'انجام شده' || a.status === 'فعال'));
                        const totalBase = docApps.reduce((sum, a) => sum + a.cost, 0);
                        const sharePct = d.name === 'دکتر علیرضا صدری' ? 0.8 : 0.7;
                        const totalDocEarn = docApps.reduce((sum, a) => sum + (a.final_cost * sharePct), 0);
                        const centerEarn = docApps.reduce((sum, a) => sum + (a.final_cost * (1 - sharePct)), 0);
                        return [d.name, docApps.length, totalBase, totalDocEarn, centerEarn];
                      });
                      handleExportCSV('Clinic_Profit_and_Settlement_Ledger_' + startDate.replace(/\//g,'-'), headers, docShareDetails);
                    } else if (activeReportType === 'patients') {
                      const headers = ['کد پرونده', 'نام مراجع', 'کدملی مراجع', 'شماره تماس', 'جنسیت', 'نوع حساب بیمه', 'اعتبار کیف پول (تومان)', 'مبلغ بدهی (تومان)'];
                      const rows = patients.map(p => [p.id, p.name, p.nat_id, p.phone, p.gender, p.type, p.wallet_balance, p.balance]);
                      handleExportCSV('Patients_Full_Directory_' + startDate.replace(/\//g,'-'), headers, rows);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>خروجی اکسل حرفه‌ای (CSV)</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>چاپ PDF رسمی</span>
                </button>
              </div>
            </div>

            {/* Scrollable grid list */}
            <div className="flex-1 p-5 overflow-y-auto overflow-x-auto">
              
              {/* Report 1: Revenue Table */}
              {activeReportType === 'revenue' && (() => {
                const list = appointments.filter(app => {
                  const matchesDate = app.date >= startDate && app.date <= endDate;
                  const matchesDoc = !reportDocFilter || app.doctor === reportDocFilter;
                  const matchesSearch = !reportSearchQuery || 
                    app.patient_name.toLowerCase().includes(reportSearchQuery.toLowerCase()) || 
                    app.doctor.toLowerCase().includes(reportSearchQuery.toLowerCase()) || 
                    app.nat_id.includes(reportSearchQuery) || 
                    app.subject.toLowerCase().includes(reportSearchQuery.toLowerCase());
                  return matchesDate && matchesDoc && matchesSearch;
                });

                const sumCost = list.reduce((sum, a) => sum + (a.cost || 0), 0);
                const sumDiscount = list.reduce((sum, a) => sum + (a.discount || 0), 0);
                const sumFinal = list.reduce((sum, a) => sum + (a.final_cost || 0), 0);

                return (
                  <div className="space-y-4 font-sans text-right">
                    <div className="flex justify-between items-center bg-zinc-50 p-3.5 rounded-xl border border-zinc-100 print:bg-transparent">
                      <p className="text-xs text-slate-500 font-bold">تعداد کل رکوردها: {list.length} نوبت منطبق یافت شد</p>
                      <div className="flex gap-4 text-xs font-mono">
                        <span className="text-slate-600 font-sans">مجموع تعرفه: <b className="text-slate-800">{sumCost.toLocaleString('fa-IR')}</b></span>
                        <span className="text-rose-600 font-sans">تخفیف کلی: <b>{sumDiscount.toLocaleString('fa-IR')}</b></span>
                        <span className="text-emerald-700 font-sans">کارکرد نهایی: <b>{sumFinal.toLocaleString('fa-IR')} تومان</b></span>
                      </div>
                    </div>

                    <table className="w-full text-right text-xs border border-slate-100">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
                        <tr>
                          <th className="p-3">شناسه نوبت</th>
                          <th className="p-3">تاریخ حضور</th>
                          <th className="p-3">نام مراجع (کدملی)</th>
                          <th className="p-3">استاد روانشناس</th>
                          <th className="p-3">موضوع نشست</th>
                          <th className="p-3">هزینه پایه</th>
                          <th className="p-3">تخفیف</th>
                          <th className="p-3">مبلغ پرداختی</th>
                          <th className="p-3">وضعیت مالی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                        {list.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-500">{a.id}</td>
                            <td className="p-3 font-mono">{a.date} - {a.time}</td>
                            <td className="p-3 font-bold">{a.patient_name} <span className="text-[10px] text-slate-400 font-mono block">کدملی: {a.nat_id}</span></td>
                            <td className="p-3 text-slate-800 font-semibold">{a.doctor}</td>
                            <td className="p-3">{a.subject}</td>
                            <td className="p-3 font-mono">{(a.cost || 0).toLocaleString('fa-IR')}</td>
                            <td className="p-3 font-mono text-rose-500">{(a.discount || 0).toLocaleString('fa-IR')}</td>
                            <td className="p-3 font-mono font-extrabold text-blue-600">{(a.final_cost || 0).toLocaleString('fa-IR')} تومان</td>
                            <td className="p-3 font-bold text-slate-500">{a.payment_status} ({a.payment_method || 'کیف پول'})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Report 2: Expenses Table */}
              {activeReportType === 'expenses' && (() => {
                const list = expenses.filter(exp => {
                  const matchesDate = exp.date >= startDate && exp.date <= endDate;
                  const matchesSearch = !reportSearchQuery ||
                    exp.description.toLowerCase().includes(reportSearchQuery.toLowerCase());
                  return matchesDate && matchesSearch;
                });

                const totalExp = list.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/50">
                      <p className="text-xs text-rose-900 font-bold">تعداد اقلام هزینه شده: {list.length} فاکتور یافت شد</p>
                      <p className="text-xs text-rose-800 font-extrabold">جمع کل هزینه‌های جاری: {totalExp.toLocaleString('fa-IR')} تومان</p>
                    </div>

                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-3">کد فاکتور</th>
                          <th className="p-3">تاریخ فاکتور</th>
                          <th className="p-3">ردیف هزینه دفتری و شرح خرید کالا</th>
                          <th className="p-3">مبلغ کل فاکتور (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {list.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-400">{e.id}</td>
                            <td className="p-3 font-mono">{e.date}</td>
                            <td className="p-3 font-bold text-slate-800">{e.description}</td>
                            <td className="p-3 font-mono font-extrabold text-red-600">{(e.amount).toLocaleString('fa-IR')} تومان</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Report 3: Profit & Loss Statement */}
              {activeReportType === 'profit' && (() => {
                const activeApps = appointments.filter(a => (a.status === 'انجام شده' || a.status === 'فعال') && a.date >= startDate && a.date <= endDate);
                const grossCostTotal = activeApps.reduce((sum, a) => sum + a.cost, 0);
                const discountTotal = activeApps.reduce((sum, a) => sum + a.discount, 0);
                const netSales = activeApps.reduce((sum, a) => sum + a.final_cost, 0);

                let totalDocPay = 0;
                let totalCenterRetained = 0;

                doctors.forEach(d => {
                  const docApps = activeApps.filter(app => app.doctor === d.name);
                  const defaultPct = d.name === 'دکتر علیرضا صدری' ? 80 : 70;
                  docApps.forEach(a => {
                    const pct = a.doc_share_pct !== undefined ? a.doc_share_pct : defaultPct;
                    const docEarn = (a.final_cost * pct) / 100;
                    const clEarn = a.final_cost - docEarn;
                    totalDocPay += docEarn;
                    totalCenterRetained += clEarn;
                  });
                });

                const rangeExpenses = expenses
                  .filter(e => e.date >= startDate && e.date <= endDate)
                  .reduce((sum, e) => sum + e.amount, 0);

                const finalProfit = totalCenterRetained - rangeExpenses;

                return (
                  <div className="space-y-6 text-right" dir="rtl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Box 1: Sales */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold">بخش درآمدها</p>
                          <p className="text-xs font-black text-slate-700 mt-1">ناخالص دریافتی مرکز</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-extrabold text-slate-800 font-mono">{netSales.toLocaleString('fa-IR')} تومان</p>
                          <p className="text-[9px] text-zinc-400 font-medium">پایه: {grossCostTotal.toLocaleString('fa-IR')} - تخفیف: {discountTotal.toLocaleString('fa-IR')}</p>
                        </div>
                      </div>

                      {/* Box 2: Splittings */}
                      <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/55 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-amber-600 font-bold font-sans">سهم اساتید روانشناسی</p>
                          <p className="text-xs font-black text-amber-800 mt-1">کل پورسانت پرداختنی</p>
                        </div>
                        <div className="text-left font-mono">
                          <p className="text-sm font-extrabold text-amber-700">{totalDocPay.toLocaleString('fa-IR')} تومان</p>
                          <p className="text-[9px] text-amber-500 font-medium font-sans">سهم باقیمانده مرکز: {totalCenterRetained.toLocaleString('fa-IR')} تومان</p>
                        </div>
                      </div>

                      {/* Box 3: Final profit */}
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold">دفتر بیلان نهایی</p>
                          <p className="text-xs font-black text-emerald-800 mt-1">سود خالص خالص مرکز</p>
                        </div>
                        <div className="text-left font-mono">
                          <p className="text-sm font-extrabold text-emerald-700">{finalProfit.toLocaleString('fa-IR')} تومان</p>
                          <p className="text-[9px] text-slate-400 font-sans">پس از کسر مخارج جاری ({rangeExpenses.toLocaleString('fa-IR')} تومان)</p>
                        </div>
                      </div>

                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-800">تسهیم کارمزد و پورسانت پزشک با جزئیات (به صورت تفکیک شده)</h4>
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
                          <tr>
                            <th className="p-3">پزشک/استاد مشاور</th>
                            <th className="p-3">تعداد جلسات</th>
                            <th className="p-3">پورسانت توافقی</th>
                            <th className="p-3">مبلغ ناخالص فروش</th>
                            <th className="p-3 text-amber-700">سهم دریافتی استاد (تومان)</th>
                            <th className="p-3 font-semibold text-slate-800">سهم باقیمانده مرکز (تومان)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {doctors.map(d => {
                            const docApps = activeApps.filter(app => app.doctor === d.name);
                            const defaultPct = d.name === 'دکتر علیرضا صدری' ? 80 : 70;
                            const totalBase = docApps.reduce((sum, a) => sum + (a.final_cost || 0), 0);
                            const totalDocEarn = docApps.reduce((sum, a) => {
                              const pct = a.doc_share_pct !== undefined ? a.doc_share_pct : defaultPct;
                              return sum + ((a.final_cost || 0) * pct) / 100;
                            }, 0);
                            const centerEarn = totalBase - totalDocEarn;

                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-800">{d.name}</td>
                                <td className="p-3 font-mono">{docApps.length} جلسه</td>
                                <td className="p-3 font-mono font-bold text-blue-600">%{defaultPct}</td>
                                <td className="p-3 font-mono">{totalBase.toLocaleString('fa-IR')}</td>
                                <td className="p-3 font-mono font-black text-amber-700">{totalDocEarn.toLocaleString('fa-IR')} تومان</td>
                                <td className="p-3 font-mono font-black text-slate-700">{centerEarn.toLocaleString('fa-IR')} تومان</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Report 4: Patients Full Directory */}
              {activeReportType === 'patients' && (() => {
                const list = patients.filter(p => {
                  const query = reportSearchQuery.toLowerCase();
                  return !reportSearchQuery ||
                    p.name.toLowerCase().includes(query) ||
                    p.nat_id.includes(query) ||
                    p.phone.includes(query) ||
                    (p.desc && p.desc.toLowerCase().includes(query));
                });

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 font-bold text-right">کل پرونده‌های ثبت‌شده مراجعین در سیستم: {list.length} پرونده تطبیقی</p>
                    </div>

                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-3">کد پرونده</th>
                          <th className="p-3">نام بیمار</th>
                          <th className="p-3">شماره ملی</th>
                          <th className="p-3">تلفن همراه</th>
                          <th className="p-3">وضعیت حساب بیمه‌ای</th>
                          <th className="p-3">اعتبار کیف پول (تومان)</th>
                          <th className="p-3">میزان بدهکاری</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {list.map(p => (
                          <tr key={p.id} className={`hover:bg-slate-50/50 ${p.is_blocked === 1 ? 'bg-red-50/40 text-red-900' : ''}`}>
                            <td className="p-3 font-mono text-slate-400 font-bold">{p.id}</td>
                            <td className="p-3">
                              <span className="font-extrabold text-slate-800">{p.name}</span>
                              {p.is_blocked === 1 && <span className="bg-red-500 text-white font-bold rounded px-1.5 py-0.5 text-[8px] mr-2">لیست سیاه/مسدود</span>}
                            </td>
                            <td className="p-3 font-mono">{p.nat_id}</td>
                            <td className="p-3 font-mono">{p.phone}</td>
                            <td className="p-3 font-semibold">{p.type}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{(p.wallet_balance || 0).toLocaleString('fa-IR')} تومان</td>
                            <td className="p-3 font-mono font-bold text-rose-600">{(p.balance || 0).toLocaleString('fa-IR')} تومان</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>

            {/* Modal Print Footer / Signatures */}
            <div className="hidden print:block border-t border-slate-200 mt-12 pt-8 text-xs">
              <div className="grid grid-cols-3 text-center">
                <div>امضاء مسئول حسابداری مرکز</div>
                <div>امضاء سوپروایزر کلینیک</div>
                <div>امضاء مدیریت محترم مرکز آرامش</div>
              </div>
            </div>

            {/* Modal Screen Footer */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end print:hidden">
              <button
                onClick={() => setActiveReportType(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl px-4 py-2 cursor-pointer transition-colors"
              >
                بستن و بازگشت به داشبورد
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
