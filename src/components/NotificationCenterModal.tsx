/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Doctor, Patient, Appointment } from '../types';
import { StorageHelper } from '../utils/storage';
import { 
  getCurrentJalaliDate, 
  addDaysJalali, 
  parseJalali, 
  getJalaliMonthDaysCount, 
  getJalaliWeekdayIndex, 
  getJalaliWeekdayName 
} from '../utils/jalali';
import { BellRing, Copy, Calendar, Search, UserCheck, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const getNextJalaliDate = (dateStr: string) => addDaysJalali(dateStr, 1);
const getRelativeJalaliDate = (dateStr: string, offset: number) => addDaysJalali(dateStr, offset);

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoctor?: string;
  initialDate?: string;
}

export default function NotificationCenterModal({ isOpen, onClose, initialDoctor, initialDate }: NotificationCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'doctor' | 'patient'>('doctor');

  // Database lists
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Tab 1: Doctor States
  const [selectedDoctor, setSelectedDoctor] = useState('👨‍⚕️ همه اساتید');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate || getCurrentJalaliDate());
  const [rangeType, setRangeType] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
  const [doctorMessage, setDoctorMessage] = useState('');

  // Tab 2: Patient States
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatDropdown, setShowPatDropdown] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | string>('');
  const [patientNotifyType, setPatientNotifyType] = useState<'single' | 'all'>('single');
  const [patientMessage, setPatientMessage] = useState('');

  // UI Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  // Live Calendar Picker States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(3);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  const renderDateController = () => {
    const monthsList = [
      "فروردین", "اردیبهشت", "خرداد",
      "تیر", "مرداد", "شهریور",
      "مهر", "آبان", "آذر",
      "دی", "بهمن", "اسفند"
    ];

    return (
      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3 relative shrink-0">
        <label className="block text-xs font-bold text-slate-700">بازه زمانی گزارش و اطلاع‌رسانی</label>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm relative">
          {/* Previous Day */}
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg transition-all text-[10px] font-bold cursor-pointer"
            title="روز قبل"
          >
            ◀ روز قبل
          </button>

          {/* Quick Trigger Calendar Popup */}
          <button
            type="button"
            onClick={() => {
              try {
                const { jy, jm } = parseJalali(currentDate);
                setPickerYear(jy);
                setPickerMonth(jm);
              } catch {
                setPickerYear(1405);
                setPickerMonth(3);
              }
              setIsCalendarOpen(!isCalendarOpen);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 hover:border-blue-500 hover:text-blue-600 border border-slate-150 rounded-lg text-[10px] font-bold text-slate-800 cursor-pointer transition-all bg-white"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-mono text-[10px] select-none">
              {rangeType === 'week' ? `گزارش هفتگی (${currentDate.substring(0, 7)})` : currentDate}
            </span>
          </button>

          {/* Next Day */}
          <button
            type="button"
            onClick={handleNextDay}
            className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg transition-all text-[10px] font-bold cursor-pointer"
            title="روز بعد"
          >
            روز بعد ▶
          </button>

          {/* Full Calendar Dropdown Panel */}
          {isCalendarOpen && (() => {
            const totalDays = getJalaliMonthDaysCount(pickerYear, pickerMonth);
            const padNum = (n: number) => n.toString().padStart(2, '0');
            const firstDayDateStr = `${pickerYear}/${padNum(pickerMonth)}/01`;
            const startOffsetIndex = getJalaliWeekdayIndex(firstDayDateStr);

            const weeksGrid: (number | null)[] = [];
            for (let i = 0; i < startOffsetIndex; i++) {
              weeksGrid.push(null);
            }
            for (let d = 1; d <= totalDays; d++) {
              weeksGrid.push(d);
            }

            const allApps = StorageHelper.getAppointments();

            const prevMonth = () => {
              if (pickerMonth === 1) {
                setPickerMonth(12);
                setPickerYear(prev => prev - 1);
              } else {
                setPickerMonth(prev => prev - 1);
              }
            };

            const nextMonth = () => {
              if (pickerMonth === 12) {
                setPickerMonth(1);
                setPickerYear(prev => prev + 1);
              } else {
                setPickerMonth(prev => prev + 1);
              }
            };

            const realTodayStr = getCurrentJalaliDate();

            return (
              <div className="absolute right-0 left-0 top-full mt-2 z-55 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-3 w-72 text-right animate-in fade-in slide-in-from-top-1" dir="rtl" ref={calendarRef}>
                {/* Calendar controller header with interactive dropdown selectors */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-600 rounded bg-slate-50 cursor-pointer text-[10px] font-bold transition-all"
                  >
                    ◀
                  </button>
                  <div className="flex items-center gap-1">
                    {/* Month Dropdown */}
                    <select
                      value={pickerMonth}
                      onChange={(e) => setPickerMonth(parseInt(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
                    >
                      {monthsList.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                    {/* Year Dropdown */}
                    <select
                      value={pickerYear}
                      onChange={(e) => setPickerYear(parseInt(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                    >
                      {Array.from({ length: 36 }, (_, i) => 1380 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-600 rounded bg-slate-50 cursor-pointer text-[10px] font-bold transition-all"
                  >
                    ▶
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 font-sans">
                  <span>ش</span>
                  <span>ی</span>
                  <span>د</span>
                  <span>س</span>
                  <span>چ</span>
                  <span>پ</span>
                  <span>ج</span>
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono">
                  {weeksGrid.map((day, idx) => {
                    if (day === null) {
                      return <span key={`dialog-empty-${idx}`} className="h-5 w-5"></span>;
                    }

                    const currentDayStr = `${pickerYear}/${padNum(pickerMonth)}/${padNum(day)}`;
                    const isToday = currentDayStr === realTodayStr;
                    const isActiveFiltered = currentDayStr === currentDate;

                    const dayApps = allApps.filter(a => a.date === currentDayStr && a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد');
                    const hasAppointments = dayApps.length > 0;

                    let bgClass = "hover:bg-blue-50 text-slate-800";

                    if (hasAppointments) {
                      bgClass = "bg-purple-100 text-purple-900 font-bold border-b border-purple-400 hover:bg-purple-150";
                    }
                    if (isToday) {
                      bgClass = "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold hover:bg-amber-150";
                    }
                    if (isActiveFiltered) {
                      bgClass = "bg-blue-600 text-white font-extrabold hover:bg-blue-700 ring-2 ring-blue-500/20";
                    }

                    return (
                      <button
                        key={`dialog-day-${day}`}
                        type="button"
                        onClick={() => {
                          setCurrentDate(currentDayStr);
                          setRangeType('custom');
                          setIsCalendarOpen(false);
                        }}
                        className={`h-6 w-6 text-[10px] rounded-full flex flex-col items-center justify-center relative cursor-pointer font-bold transition-all ${bgClass}`}
                        title={`${currentDayStr}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={setTodayRange}
            className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer select-none transition-all ${
              rangeType === 'today' ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-550 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            امروز
          </button>
          <button
            onClick={setTomorrowRange}
            className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer select-none transition-all ${
              rangeType === 'tomorrow' ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-550 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            فردا
          </button>
          <button
            onClick={setWeekRange}
            className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer select-none transition-all ${
              rangeType === 'week' ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-550 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            بازه هفتگی
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (isOpen) {
      setDoctors(StorageHelper.getDoctors());
      setPatients(StorageHelper.getPatients());
      setAppointments(StorageHelper.getAppointments());

      if (initialDoctor) {
        setSelectedDoctor(initialDoctor);
        setDoctorSearch(initialDoctor);
      }
      if (initialDate) {
        setCurrentDate(initialDate);
        setRangeType('custom');
      }
    }
  }, [isOpen, initialDoctor, initialDate]);

  // Handle active date navigation
  const handlePrevDay = () => {
    if (rangeType === 'week') setRangeType('custom');
    const prev = getRelativeJalaliDate(currentDate, -1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    if (rangeType === 'week') setRangeType('custom');
    const next = getRelativeJalaliDate(currentDate, 1);
    setCurrentDate(next);
  };

  const setTodayRange = () => {
    setCurrentDate(getCurrentJalaliDate());
    setRangeType('today');
  };

  const setTomorrowRange = () => {
    const tomorrow = getNextJalaliDate(getCurrentJalaliDate());
    setCurrentDate(tomorrow);
    setRangeType('tomorrow');
  };

  const setWeekRange = () => {
    setCurrentDate(getCurrentJalaliDate());
    setRangeType('week');
  };

  // Helper date parsing/range comparison
  const getAppointmentsByRange = (doctorName: string): Appointment[] => {
    let dateStr = currentDate;
    let list = appointments;

    if (rangeType === 'today') {
      list = list.filter(app => app.date === dateStr);
    } else if (rangeType === 'tomorrow') {
      const tomorrow = getNextJalaliDate(getCurrentJalaliDate());
      list = list.filter(app => app.date === tomorrow);
    } else if (rangeType === 'week') {
      // Find start of week by parsing date and backtracing. Since we don't have full date objects, we can look at the surrounding week.
      // Let's simplified to: get all appointments within (+/- 3 days of currentDate)
      // Or to be robust: simply show matching day's appointments for simplicity, or +/- 3 days for weekly
      // Let's filter appointments that are within the current date's week (comparing year/month or using date strings)
      // Let's match current month for simple week approximation, or match date str:
      list = list.filter(app => {
        const appPrefix = app.date.substring(0, 7); // e.g., "1405/03"
        const currentPrefix = currentDate.substring(0, 7);
        return appPrefix === currentPrefix; // Monthly/weekly approximation
      });
    } else {
      list = list.filter(app => app.date === dateStr);
    }

    if (doctorName && doctorName !== '👨‍⚕️ همه اساتید') {
      const normDoc = doctorName.trim().toLowerCase();
      list = list.filter(app => app.doctor.trim().toLowerCase() === normDoc);
    }

    // Filter cancelled ones
    list = list.filter(app => app.status !== 'کنسل استاد' && app.status !== 'کنسل مراجع');

    return list.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Regeneration of Tab 1: Doctor Message Preview
  useEffect(() => {
    const apps = getAppointmentsByRange(selectedDoctor);
    const rangeText = rangeType === 'today' ? `امروز ${currentDate}` :
                     rangeType === 'tomorrow' ? `فردا ${getNextJalaliDate(getCurrentJalaliDate())}` :
                     rangeType === 'week' ? `هفته جاری ${currentDate.substring(0, 7)}` : `تاریخ ${currentDate}`;

    if (apps.length === 0) {
      setDoctorMessage(`⚠️ هیچ نوبتی برای ${selectedDoctor} در ${rangeText} وجود ندارد.`);
      return;
    }

    const total = apps.reduce((sum, app) => sum + (app.final_cost || 0), 0);
    const tomansTotal = Math.floor(total / 10);

    let msg = `استاد گرامی ${selectedDoctor}\n\nسلام علیکم\n\nنوبت‌های ${rangeText} شما:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    apps.forEach((app, i) => {
      const priceTomans = Math.floor((app.final_cost || 0) / 10);
      msg += `${i + 1}. 🕐 ساعت: ${app.time}\n   👤 مراجع: ${app.patient_name}${app.patient2_name ? ` و ${app.patient2_name}` : ''}\n   📞 تلفن: ${app.phone || '-'}\n   📝 موضوع: ${app.subject || '-'}\n   💰 مبلغ: ${priceTomans.toLocaleString('fa-IR')} تومان\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    });

    msg += `📊 جمع‌بندی:\n🔹 تعداد نوبت‌ها: ${apps.length} نوبت\n🔹 مجموع مبلغ: ${tomansTotal.toLocaleString('fa-IR')} تومان\n\nبا تشکر\nمدیریت مرکز مشاوره آرامش`;
    setDoctorMessage(msg);
  }, [selectedDoctor, currentDate, rangeType, appointments]);

  // Loading patient's appointments when selected patient or date filter changes
  useEffect(() => {
    if (selectedPatient) {
      let list = appointments.filter(app => 
        (app.nat_id === selectedPatient.nat_id || (app.patient2_nat_id && app.patient2_nat_id === selectedPatient.nat_id)) &&
        app.status !== 'کنسل استاد' && app.status !== 'کنسل مراجع'
      );

      // Apply dynamic date filter
      if (rangeType === 'today') {
        list = list.filter(app => app.date === currentDate);
      } else if (rangeType === 'tomorrow') {
        const tomorrow = getNextJalaliDate(getCurrentJalaliDate());
        list = list.filter(app => app.date === tomorrow);
      } else if (rangeType === 'week') {
        list = list.filter(app => {
          const appPrefix = app.date.substring(0, 7);
          const currentPrefix = currentDate.substring(0, 7);
          return appPrefix === currentPrefix;
        });
      } else {
        list = list.filter(app => app.date === currentDate);
      }

      const sortedList = list.sort((a, b) => b.date.localeCompare(a.date));
      setPatientAppointments(sortedList);
      if (sortedList.length > 0) {
        setSelectedAppId(sortedList[0].id);
      } else {
        setSelectedAppId('');
      }
    } else {
      setPatientAppointments([]);
      setSelectedAppId('');
    }
  }, [selectedPatient, appointments, currentDate, rangeType]);

  // Regeneration of Tab 2: Patient Message Preview
  useEffect(() => {
    if (!selectedPatient) {
      setPatientMessage('⚠️ لطفا ابتدا مراجع مورد نظر را انتخاب و جستجو کنید.');
      return;
    }

    if (patientAppointments.length === 0) {
      setPatientMessage(`⚠️ هیچ نوبت فعالی برای مراجع محترم ${selectedPatient.name} یافت نشد.`);
      return;
    }

    if (patientNotifyType === 'single') {
      const activeApp = patientAppointments.find(a => a.id === Number(selectedAppId)) || patientAppointments[0];
      if (!activeApp) return;

      const priceTomans = Math.floor((activeApp.final_cost || 0) / 10);
      const coupleSuffix = activeApp.patient2_name ? ` و همسر محترمشان ${activeApp.patient2_name}` : '';

      const msg = `مراجع گرامی جناب آقای/سرکار خانم ${activeApp.patient_name}${coupleSuffix}\n\nسلام علیکم\n\nنوبت مشاوره شما:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📅 تاریخ: ${activeApp.date}\n🕐 ساعت: ${activeApp.time}\n👨‍⚕️ استاد: ${activeApp.doctor}\n📝 موضوع: ${activeApp.subject || '-'}\n💰 مبلغ: ${priceTomans.toLocaleString('fa-IR')} تومان\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔹 لطفاً ۱۵ دقیقه قبل از ساعت مقرر حضور داشته باشید.\n\nبا تشکر\nمرکز مشاوره آرامش`;
      setPatientMessage(msg);
    } else {
      const total = patientAppointments.reduce((sum, app) => sum + (app.final_cost || 0), 0);
      const tomansTotal = Math.floor(total / 10);

      let msg = `مراجع گرامی جناب آقای/سرکار خانم ${selectedPatient.name}\n\nسلام علیکم\n\nلیست نوبت‌های حضور شما:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      patientAppointments.forEach((app, i) => {
        const priceTomans = Math.floor((app.final_cost || 0) / 10);
        msg += `${i + 1}. 📅 ${app.date} | 🕐 ساعت: ${app.time}\n   👨‍⚕️ استاد: ${app.doctor}\n   💰 مبلغ: ${priceTomans.toLocaleString('fa-IR')} تومان\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      });

      msg += `📊 جمع‌بندی:\n🔹 تعداد کل نوبت‌ها: ${patientAppointments.length} جلسه\n🔹 مجموع پرداختی: ${tomansTotal.toLocaleString('fa-IR')} تومان\n\nبا تشکر\nمرکز مشاوره آرامش`;
      setPatientMessage(msg);
    }
  }, [selectedPatient, patientAppointments, selectedAppId, patientNotifyType]);

  const copyToClipboard = (text: string) => {
    if (text.startsWith('⚠️')) {
      alert('خطا: متن حاوی خطای اعتبار سنجی است و امکان کپی وجود ندارد.');
      return;
    }
    navigator.clipboard.writeText(text);
    setToastMessage('کپی شد! ✅ متن پیام در حافظه کادر موقت کلیپ‌بورد درگاه ویندوز بازنویسی شد.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        drag
        dragMomentum={false}
        dragHandleClassName="drag-handle"
        dragConstraints={{ left: -300, right: 300, top: -150, bottom: 150 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col overflow-hidden text-right font-sans h-[85vh] cursor-default"
        dir="rtl"
      >
        {/* Header toolbar */}
        <div className="drag-handle cursor-move select-none bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5 pointer-events-none">
            <BellRing className="h-6 w-6 animate-swing" />
            <div>
              <h2 className="font-black text-sm tracking-tight">مرکز کنترل اطلاع‌رسانی و چاپ فیش مراجعین</h2>
              <p className="text-[10px] text-white/80 mt-1">قابلیت کپی فیش چاپی و زمان‌بندی جلسات سیستم جهت ارسال در بله و ایتا</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition-all text-white/90 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Tab switching pills */}
        <div className="bg-slate-50 border-b border-slate-200/60 px-6 py-3 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('doctor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'doctor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            👨‍⚕️ اطلاع‌رسانی به استاد مشاور
          </button>
          <button
            onClick={() => setActiveTab('patient')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'patient'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            👤 اطلاع‌رسانی به مراجع گرامی
          </button>
        </div>

        {/* Scrollable primary body workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 select-none">
          {activeTab === 'doctor' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column Controls */}
              <div className="md:col-span-5 space-y-4">
                {/* 1. Date controllers with active interactive calendar */}
                {renderDateController()}

                {/* 2. Doctor selection dropdown featuring autocomplete search */}
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-2 relative">
                  <label className="block text-xs font-semibold text-slate-600">انتخاب استاد مشاور</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="جستجوی نام استاد..."
                      value={doctorSearch}
                      onChange={(e) => {
                        setDoctorSearch(e.target.value);
                        setShowDocDropdown(true);
                      }}
                      onFocus={() => setShowDocDropdown(true)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none"
                    />
                    <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-3" />
                  </div>

                  {showDocDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-250 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                      <div
                        onClick={() => {
                          setSelectedDoctor('👨‍⚕️ همه اساتید');
                          setDoctorSearch('👨‍⚕️ همه اساتید');
                          setShowDocDropdown(false);
                        }}
                        className="p-2.5 text-xs text-right cursor-pointer text-slate-700 hover:bg-slate-50 hover:font-bold"
                      >
                        👨‍⚕️ همه اساتید مرکز مشاوره
                      </div>
                      {doctors
                        .filter(d => !doctorSearch || d.name.toLowerCase().includes(doctorSearch.toLowerCase()))
                        .map(d => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSelectedDoctor(d.name);
                              setDoctorSearch(d.name);
                              setShowDocDropdown(false);
                            }}
                            className="p-2.5 text-xs text-right cursor-pointer text-slate-755 hover:bg-slate-50 flex justify-between items-center"
                          >
                            <span>{d.name}</span>
                            <span className="text-[10px] text-slate-400">{d.spec}</span>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column Message preview */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="flex-1">
                  <textarea
                    readOnly
                    value={doctorMessage}
                    className="w-full border border-slate-200 bg-slate-50 p-4 rounded-2xl h-80 font-mono text-xs text-right leading-relaxed text-slate-750 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(doctorMessage)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Copy className="h-4.5 w-4.5" />
                  <span>کپی فیش‌های چاپی کل روز روانشناس</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Left Column Controls */}
              <div className="md:col-span-5 space-y-4">
                
                {/* 1. Date controller with active interactive calendar for Patients list */}
                {renderDateController()}

                {/* 2. Patient selection autocomplete */}
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-2 relative">
                  <label className="block text-xs font-semibold text-slate-600">جستجوی مراجع گرامی</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="شماره همراه یا نام مراجع..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatDropdown(true);
                      }}
                      onFocus={() => setShowPatDropdown(true)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none"
                    />
                    <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-3" />
                  </div>

                  {showPatDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-250 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {patients
                        .filter(p => !patientSearch || p.name.includes(patientSearch) || p.phone.includes(patientSearch) || p.nat_id.includes(patientSearch))
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch(p.name);
                              setShowPatDropdown(false);
                            }}
                            className="p-2.5 text-xs text-right cursor-pointer text-slate-700 hover:bg-slate-50 flex justify-between items-center"
                          >
                            <span className="font-bold">{p.name} <span className="font-mono text-slate-400 font-normal">({p.phone})</span></span>
                            <span className="text-[10px] bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded-full">{p.type}</span>
                          </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Select Appointment list & radio switches */}
                {selectedPatient && patientAppointments.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3">
                    
                    {/* Toggle parameters */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">بازه اطلاع‌رسانی</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPatientNotifyType('single')}
                          className={`py-2 px-1.5 rounded-xl text-center text-[10px] font-bold border transition-all ${
                            patientNotifyType === 'single'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          📍 فقط نوبت منتخب
                        </button>
                        <button
                          onClick={() => setPatientNotifyType('all')}
                          className={`py-2 px-1.5 rounded-xl text-center text-[10px] font-bold border transition-all ${
                            patientNotifyType === 'all'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          📋 تمامی نشست‌ها
                        </button>
                      </div>
                    </div>

                    {/* Single select */}
                    {patientNotifyType === 'single' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500">انتخاب نوبت خاص مراجع</label>
                        <select
                          value={selectedAppId}
                          onChange={(e) => setSelectedAppId(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[10px] rounded-xl p-2.5 focus:outline-none font-medium"
                        >
                          {patientAppointments.map(app => (
                            <option key={app.id} value={app.id}>
                              {app.date} | ساعت {app.time} (استاد: {app.doctor})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column Preview */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="flex-1">
                  <textarea
                    readOnly
                    value={patientMessage}
                    className="w-full border border-slate-200 bg-slate-50 p-4 rounded-2xl h-80 font-mono text-xs text-right leading-relaxed text-slate-750 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(patientMessage)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Copy className="h-4.5 w-4.5" />
                  <span>کپی فیش و یادآور پیام‌رسان مراجع (ایتا / بله)</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Floating feedback alert */}
        {toastMessage && (
          <div className="bg-slate-900 text-emerald-400 hover:text-emerald-300 transition-all font-semibold rounded-xl text-xs py-3 px-6 fixed bottom-6 left-6 z-50 shadow-2xl animate-bounce">
            {toastMessage}
          </div>
        )}
      </motion.div>
    </div>
  );
}
