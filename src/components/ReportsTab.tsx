/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Appointment, Doctor, Patient, User } from '../types';
import { StorageHelper } from '../utils/storage';
import JalaliDatePicker from './JalaliDatePicker';
import { getCurrentJalaliDate } from '../utils/jalali';
import { exportToPDF } from '../utils/exportPdf';
import { FileText, Printer, Search, Calendar, CreditCard, DollarSign, Award, Users, RefreshCw } from 'lucide-react';

export default function ReportsTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filtering criteria
  const [startDate, setStartDate] = useState('1405/01/01');
  const [endDate, setEndDate] = useState(getCurrentJalaliDate());
  const [filterDocId, setFilterDocId] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterQuery, setFilterQuery] = useState(''); // Search by Patient Name, ID, or National ID
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterRefModel, setFilterRefModel] = useState('');

  // Selected item invoice popup print
  const [invoiceItem, setInvoiceItem] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAllReportData();
  }, []);

  const loadAllReportData = () => {
    setAppointments(StorageHelper.getAppointments());
    setDoctors(StorageHelper.getDoctors());
    setPatients(StorageHelper.getPatients());
    setUsers(StorageHelper.getUsers());
  };

  const getPatientDetails = (natId: string) => {
    const list = StorageHelper.getPatients();
    return list.find(p => p.nat_id === natId);
  };

  const getDoctorDetails = (name: string) => {
    const list = StorageHelper.getDoctors();
    return list.find(d => d.name === name);
  };

  // Filter appointments with high granularity
  const filteredAppointments = appointments.filter(app => {
    // 1. Date Range filtering
    if (app.date < startDate || app.date > endDate) return false;

    // 2. Doctor matching (by ID)
    if (filterDocId) {
      const doc = getDoctorDetails(app.doctor);
      if (!doc || doc.id.toString() !== filterDocId) return false;
    }

    // 3. Subject matching
    if (filterSubject && app.subject !== filterSubject) return false;

    // 4. Payment method matching
    if (filterPaymentMethod && (app.payment_method || 'کارتخوان') !== filterPaymentMethod) return false;

    // 5. Status matching
    if (filterStatus && app.status !== filterStatus) return false;

    // 6. Registered Operator matching
    if (filterOperator && (app.created_by || 'admin') !== filterOperator) return false;

    // 6.5. Referral Mode matching
    if (filterRefModel && (app.ref_model || 'ارجاع به استاد') !== filterRefModel) return false;

    // 7. General search query (Patient Name, Patient National ID, or Appointment ID)
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      const patientIdMatch = getPatientDetails(app.nat_id);
      const isIdMatch = patientIdMatch && patientIdMatch.id.toString() === q;
      
      const match = 
        app.patient_name.toLowerCase().includes(q) ||
        app.nat_id.toLowerCase().includes(q) ||
        app.id.toString() === q ||
        isIdMatch;
        
      if (!match) return false;
    }

    return true;
  });

  // Unique subjects for filtering
  const uniqueSubjects = Array.from(new Set(appointments.map(a => a.subject).filter(Boolean)));

  // Aggregate stats calculations
  const totalCount = filteredAppointments.length;
  const completedCount = filteredAppointments.filter(a => a.status === 'انجام شده').length;
  const activeCount = filteredAppointments.filter(a => a.status === 'فعال').length;
  const cancelledPatientCount = filteredAppointments.filter(a => a.status === 'کنسل مراجع').length;
  const cancelledDocCount = filteredAppointments.filter(a => a.status === 'کنسل استاد').length;

  const totalBaseCost = filteredAppointments
    .filter(a => a.status === 'انجام شده' || a.status === 'فعال')
    .reduce((sum, a) => sum + (a.cost || 0), 0);

  const totalDiscount = filteredAppointments
    .filter(a => a.status === 'انجام شده' || a.status === 'فعال')
    .reduce((sum, a) => sum + (a.discount || 0), 0);

  const totalFinalRevenue = filteredAppointments
    .filter(a => a.status === 'انجام شده' || a.status === 'فعال')
    .reduce((sum, a) => sum + (a.final_cost || 0), 0);

  const posPayments = filteredAppointments
    .filter(a => (a.status === 'انجام شده' || a.status === 'فعال') && (a.payment_method === 'کارتخوان' || !a.payment_method))
    .reduce((sum, a) => sum + (a.final_cost || 0), 0);

  const cashPayments = filteredAppointments
    .filter(a => (a.status === 'انجام شده' || a.status === 'فعال') && a.payment_method === 'نقدی')
    .reduce((sum, a) => sum + (a.final_cost || 0), 0);

  const charityPayments = filteredAppointments
    .filter(a => (a.status === 'انجام شده' || a.status === 'فعال') && a.payment_method === 'رایگان (خیریه)')
    .reduce((sum, a) => sum + (a.final_cost || 0), 0);

  const totalDocShare = filteredAppointments
    .filter(a => a.status === 'انجام شده' || a.status === 'فعال')
    .reduce((sum, a) => sum + ((a.final_cost * (a.doc_share_pct !== undefined ? a.doc_share_pct : 70)) / 100), 0);

  const totalClinicShare = totalFinalRevenue - totalDocShare;

  return (
    <div id="reports-printable-area" className="space-y-6 text-right font-sans relative" dir="rtl">
      
      {/* 1. Header controls & title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span>گزارش‌گیری تخصصی و ممیزی مالی نوبت‌ها</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">
            مشاهده، دسته‌بندی و چاپ گزارش‌های تفصیلی پرونده مراجعین، پزشکان، تراکنش‌های صندوق و منبع ارجاعی
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={loadAllReportData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => {
              exportToPDF('reports-printable-area', `گزارش_دوره_کلینیک_${getCurrentJalaliDate()}`);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-sm justify-center w-full md:w-auto cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>چاپ گزارش دوره</span>
          </button>
        </div>
      </div>

      {/* 2. Granular filters interface */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-700 text-xs flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-blue-500" />
          <span>پیکربندی پارامترهای فیلتر مراجعین و اساتید</span>
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Jalali pickers */}
          <div>
            <JalaliDatePicker value={startDate} onChange={setStartDate} label="از تاریخ جلالی" />
          </div>

          <div>
            <JalaliDatePicker value={endDate} onChange={setEndDate} label="تا تاریخ جلالی" />
          </div>

          {/* Quick Find */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">جستجوی آزاد مراجع</label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="نام مراجع، پرونده، کدملی، کد نوبت..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">وضعیت نوبت جلسه</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="فعال">فعال (در انتظار)</option>
              <option value="انجام شده">انجام شده (پایان یافته)</option>
              <option value="کنسل مراجع">کنسل توسط مراجع</option>
              <option value="کنسل استاد">کنسل توسط استاد مشاور</option>
            </select>
          </div>

          {/* Doctor selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">استاد مشاور</label>
            <select
              value={filterDocId}
              onChange={(e) => setFilterDocId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">همه اساتید درمان‌گر</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>استاد {d.name} (ID: #{d.id})</option>
              ))}
            </select>
          </div>

          {/* Subject selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">موضوع درمانی</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">همه موضوعات و گرایش‌ها</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Payment method selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">روش پرداخت صندوق</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">همه روش‌های پرداخت</option>
              <option value="کارتخوان">کارتخوان (POS)</option>
              <option value="نقدی">پرداخت نقدی</option>
              <option value="رایگان (خیریه)">رایگان (بخشایش خیریه)</option>
              <option value="تخفیف کارت">تخفیف کارت یا معرف نامه</option>
            </select>
          </div>

          {/* Referral Mode selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع انتساب ارجاع همکار</label>
            <select
              value={filterRefModel}
              onChange={(e) => setFilterRefModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold text-blue-700"
            >
              <option value="">همه موارد (بدون فیلتر)</option>
              <option value="ارجاع به استاد">ارجاع به استاد</option>
              <option value="ارجاع از استاد">ارجاع از استاد</option>
            </select>
          </div>

          {/* Operator selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">کنشگر رزرویشن (اپراتور)</label>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">همه کاربران ثبت‌کننده</option>
              {users.map(u => (
                <option key={u.id} value={u.username}>{u.name} ({u.username})</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 3. High detail statistics review cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total stats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">رکوردهای منطبق با فیلتر</span>
            <div className="text-xl font-bold text-slate-800">{totalCount} نوبت</div>
            <span className="text-[9px] text-emerald-600 block">
              {completedCount} انجام‌شده | {activeCount} رزرو فعال
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Base invoice value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">ارزش ناخالص پایه</span>
            <div className="text-lg font-bold text-slate-800">{(totalBaseCost).toLocaleString('fa-IR')} تومان</div>
            <span className="text-[9px] text-slate-400 block border-t pt-1">کل تعرفه پیش از تخفیف‌ها</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        {/* Discounts summary */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">کل تخفیف ضمیمه خدمات</span>
            <div className="text-lg font-bold text-red-600">{(totalDiscount).toLocaleString('fa-IR')} تومان</div>
            <span className="text-[9px] text-red-500 block border-t border-red-50 pt-1">
              {totalBaseCost > 0 ? ((totalDiscount / totalBaseCost) * 100).toFixed(1) : 0}% نرخ میانگین معافیت
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Revenue net balance */}
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-indigo-200 font-extrabold block">درآمد ناخالص صندوق (دریافتی)</span>
            <div className="text-lg font-black">{(totalFinalRevenue).toLocaleString('fa-IR')} تومان</div>
            <span className="text-[9px] text-indigo-100 block">
              تومان کارتخوان: {posPayments.toLocaleString('fa-IR')} | نقدی: {cashPayments.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-inner">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 3.1 Doctor & Clinic Share Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Doctor Share summary */}
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-100 font-extrabold block">حق‌السهم خالص پرداختی کل اساتید (۷۰٪ الی ۸۰٪)</span>
            <div className="text-lg font-black">{(totalDocShare).toLocaleString('fa-IR')} تومان</div>
            <span className="text-[9px] text-emerald-100 block">
              مجموع سهم کارکرد پزشکان منطبق با فیلترها
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        {/* Clinic Share summary */}
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-rose-100 font-extrabold block">خالص سهم مرکز و دپارتمان کلینیک (۲۰٪ الی ۳۰٪)</span>
            <div className="text-lg font-black">{(totalClinicShare).toLocaleString('fa-IR')} تومان</div>
            <span className="text-[9px] text-rose-100 block">
              خالص دریافتی مرکز پس از کسر کارمزد همکاران
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 4. Granular table listing layout */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 text-xs">
          <div className="font-extrabold text-slate-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <span>ليست ردیف‌های گزارش مراجعین ({filteredAppointments.length} نوبت یافته شده)</span>
          </div>
          <div className="text-[10px] bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">
            ترتیب زمانی نزولی مرتب شده است
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3 text-center">کد نوبت</th>
                <th className="p-3">پرونده مراجع سابقه</th>
                <th className="p-3">استاد مشاور معالج</th>
                <th className="p-3">تاریخ و ساعت نوبت</th>
                <th className="p-3">موضوع جلسه و درمان</th>
                <th className="p-3 text-center">تعرفه اصلی</th>
                <th className="p-3 text-center">تخفیف صادر شده</th>
                <th className="p-3 text-center text-indigo-700">مبلغ دریافتی نهایی</th>
                <th className="p-3 text-center">روش ثبت پرداخت</th>
                <th className="p-3 text-center">کاربر ثبت‌کننده</th>
                <th className="p-3">وضعیت نوبت</th>
                <th className="p-3 text-center">عملیات فاکتور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400 font-bold">
                    هیچ رکوردی منطبق با فیلترهای بالا یافت نشد. بازه زمانی یا کلمات جستجو را تغییر دهید.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(app => {
                  const pat = getPatientDetails(app.nat_id);
                  const doc = getDoctorDetails(app.doctor);
                  
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Appointment ID */}
                      <td className="p-3 text-center font-mono font-black text-slate-800">
                        #{app.id}
                      </td>

                      {/* Patient granular details */}
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{app.patient_name}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5" dir="ltr">
                          پرونده: #{pat?.id || 'قدیمی'} | کدملی: {app.nat_id}
                        </div>
                      </td>

                      {/* Doctor granular details */}
                      <td className="p-3 font-semibold text-slate-800">
                        <div>استاد {app.doctor}</div>
                        <div className="text-[9px] text-slate-400 font-mono">کد شناسایی: #{doc?.id || '1'}</div>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-700">{app.date}</div>
                        <div className="text-[9px] text-slate-400 font-mono">ساعت: {app.time}</div>
                      </td>

                      {/* Subject */}
                      <td className="p-3 font-medium text-slate-600">
                        <div>{app.subject}</div>
                        <div className="text-[9px] text-blue-600 font-bold mt-1">
                          {app.ref_model || 'ارجاع به استاد'} | سهم مشاور: {app.doc_share_pct !== undefined ? app.doc_share_pct : 70}٪
                        </div>
                      </td>

                      {/* Financial values */}
                      <td className="p-3 text-center font-mono text-slate-700 font-semibold">
                        {(app.cost || 0).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-rose-500 font-black">
                        {app.discount > 0 ? `-${app.discount.toLocaleString('fa-IR')}` : '۰'}
                      </td>
                      <td className="p-3 text-center font-mono text-indigo-700 font-bold bg-indigo-50/10">
                        {(app.final_cost || 0).toLocaleString('fa-IR')}
                      </td>

                      {/* Payment method */}
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {app.payment_method || 'کارتخوان'}
                        </span>
                      </td>

                      {/* Registered operator */}
                      <td className="p-3 text-center font-medium">
                        <span className="bg-slate-50 border border-slate-150 text-slate-600 text-[9px] px-2 py-0.5 rounded font-mono">
                          {app.created_by || 'admin'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block border ${
                          app.status === 'انجام شده' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          app.status === 'فعال' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                          app.status === 'کنسل مراجع' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          app.status === 'کنسل استاد' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {app.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setInvoiceItem(app)}
                          className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-all cursor-pointer inline-flex items-center"
                          title="مشاهده جزئیات فیش صورت‌حساب"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Invoice Detailed Preview Popup print */}
      {invoiceItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setInvoiceItem(null)}
        >
          <div 
            id="report-invoice-printable"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 text-right relative cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInvoiceItem(null)}
              className="absolute left-4 top-4 text-slate-350 hover:text-slate-600 text-lg font-bold print:hidden"
            >
              &times;
            </button>

            {/* Print Header template */}
            <div className="text-center pb-4 border-b border-slate-150 space-y-1">
              <h4 className="font-black text-sm text-slate-800">سند حسابداری مراجع مرکز مشاوره فاطمی</h4>
              <p className="text-[10px] text-emerald-700 font-bold">(حرم مطهر حضرت معصومه س)</p>
              <p className="text-[9px] text-indigo-600 font-mono bg-indigo-50 inline-block px-3 py-0.5 rounded-full mt-1">
                کد رهگیری مالی نوبت: #110{invoiceItem.id}
              </p>
            </div>

            {/* Body of facts */}
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between">
                <span className="text-slate-400">تاریخ سررسید نوبت:</span>
                <span className="font-mono font-bold text-slate-800">{invoiceItem.date} {invoiceItem.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">شناسه پرونده و مراجع:</span>
                <span className="font-bold text-slate-800">{invoiceItem.patient_name} (کدملی: {invoiceItem.nat_id})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">روانشناس معالج و مشاور:</span>
                <span className="font-bold text-slate-800">استاد {invoiceItem.doctor}</span>
              </div>

              {/* Cost break calculation details */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">هزینه ناخالص جلسه درمانی:</span>
                  <span className="font-mono text-slate-700">{(invoiceItem.cost || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between text-[11px] text-rose-600 font-extrabold border-b border-dashed pb-1.5">
                  <span>کسر تخفیف خدمات:</span>
                  <span className="font-mono">-{ (invoiceItem.discount || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between font-black text-xs text-indigo-700 pt-1">
                  <span>هزینه خالص نهایی پرداخت:</span>
                  <span className="font-mono">{(invoiceItem.final_cost || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>

              {/* Status footer elements */}
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>پیگیری: {invoiceItem.id}</span>
                <span>متد پرداخت: {invoiceItem.payment_method || 'کارتخوان'}</span>
                <span>ثبت با اپراتور: {invoiceItem.created_by || 'admin'}</span>
              </div>
            </div>

            {/* Actions list */}
            <div className="pt-4 border-t flex gap-2 print:hidden">
              <button
                onClick={() => exportToPDF('report-invoice-printable', `فاکتور_${invoiceItem.id}`)}
                className="w-full bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>پرینت فاکتور رول فیش</span>
              </button>
              <button
                onClick={() => setInvoiceItem(null)}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs py-2.5 transition-colors cursor-pointer"
              >
                انصراف و بستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
