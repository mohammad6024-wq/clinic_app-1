/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Appointment, Doctor, Patient, Shift, Subject, DoctorAttendance } from '../types';
import { StorageHelper } from '../utils/storage';
import { 
  getCurrentJalaliDate, 
  getJalaliWeekdayIndex, 
  getJalaliWeekdayName, 
  addDaysJalali, 
  getJalaliMonthDaysCount, 
  parseJalali, 
  getJalaliMonthName,
  getCurrentJalaliTime
} from '../utils/jalali';
import { Calendar, Plus, Search, CheckCircle2, XCircle, Clock, UserCheck, AlertTriangle, Printer, Trash2, RotateCw, UserX, ShieldAlert, MessageSquare, User as UserIcon, BellRing, Edit, Edit3, ChevronDown } from 'lucide-react';
import NumberInput from './NumberInput';
import NotificationCenterModal from './NotificationCenterModal';
import { exportToPDF } from '../utils/exportPdf';

interface BookingTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

function isDoctorWorkingOnDate(workingDaysStr: string, dateStr: string): boolean {
  if (!workingDaysStr) return true;
  if (workingDaysStr.includes('همه روزه')) return true;
  
  const jWeekdayIndex = getJalaliWeekdayIndex(dateStr);
  const weekdayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  
  const todayIsEven = jWeekdayIndex === 0 || jWeekdayIndex === 2 || jWeekdayIndex === 4; // شنبه، دوشنبه، چهارشنبه
  const todayIsOdd = jWeekdayIndex === 1 || jWeekdayIndex === 3 || jWeekdayIndex === 5; // یکشنبه، سه‌شنبه، پنجشنبه
  
  if (workingDaysStr.includes('روزهای زوج') && todayIsEven) return true;
  if (workingDaysStr.includes('روزهای فرد') && todayIsOdd) return true;
  
  const parts = workingDaysStr.split(',').map(s => s.trim());
  const todayName = weekdayNames[jWeekdayIndex];
  // Standardize "پنج‌شنبه" and "پنجشنبه"
  const normalizedTodayName = todayName.replace('‌', ''); // remove half-space
  
  return parts.some(p => {
    const pt = p.replace('‌', '').trim();
    return pt === normalizedTodayName || pt === todayName;
  });
}

function getPatientTotalSessions(natId: string): number {
  if (!natId) return 0;
  const allAppointments = StorageHelper.getAppointments();
  return allAppointments.filter(app => 
    (app.nat_id === natId || app.patient2_nat_id === natId) &&
    app.status !== 'کنسل استاد' &&
    app.status !== 'کنسل مراجع'
  ).length;
}

function getShiftPredefinedTimes(shiftName: string): string[] {
  // Retrieve the configured shifts from local storage to parse actual custom time ranges
  const configuredShifts = StorageHelper.getShifts();
  const shiftObj = configuredShifts.find(s => s.name === shiftName);

  if (!shiftObj || !shiftObj.time_range) {
    const name = shiftName || '';
    if (name.includes('صبح')) {
      return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
    }
    if (name.includes('عصر')) {
      return ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    }
    if (name.includes('شب')) {
      return ['20:00', '21:00', '22:00', '23:00'];
    }
    return ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  }

  try {
    const parts = shiftObj.time_range.split('-');
    if (parts.length === 2) {
      const getMinutes = (timeStr: string) => {
        const clean = timeStr.trim();
        if (/^\d+$/.test(clean)) {
          return parseInt(clean) * 60;
        }
        const tParts = clean.split(':');
        const h = parseInt(tParts[0]) || 0;
        const m = parseInt(tParts[1]) || 0;
        return h * 60 + m;
      };

      const startMinutes = getMinutes(parts[0]);
      let endMinutes = getMinutes(parts[1]);

      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // night shift overnight offset
      }

      const times: string[] = [];
      const pad = (n: number) => n.toString().padStart(2, '0');

      // Change step from min += 30 to min += 60 (1 hour intervals)
      for (let min = startMinutes; min <= endMinutes; min += 60) {
        const actualMin = min % (24 * 60);
        const h = Math.floor(actualMin / 60);
        const m = actualMin % 60;
        times.push(`${pad(h)}:${pad(m)}`);
      }
      return times;
    }
  } catch (err) {
    console.error("Error parsing shift range", err);
  }

  return ['08:00', '09:00', '10:00', '11:00', '12:00'];
}

export default function BookingTab({ currentUser, onDataChanged }: BookingTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendances, setAttendances] = useState<DoctorAttendance[]>([]);

  // Full Interactive Persian Calendar popover state
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(3);

  // Calendar click outside handler ref and hook
  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterDate, setFilterDate] = useState(getCurrentJalaliDate());

  // Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [bookingDoctor, setBookingDoctor] = useState<string>('');
  const [bookingShift, setBookingShift] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('16:00');
  const [bookingSubject, setBookingSubject] = useState<string>('');
  const [bookingDesc, setBookingDesc] = useState('');
  const [bookingCost, setBookingCost] = useState<number>(0);
  const [bookingDiscount, setBookingDiscount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('کارتخوان');
  const [isFree, setIsFree] = useState<boolean>(true);
  const [refModel, setRefModel] = useState<string>('ارجاع به استاد');
  const [docSharePct, setDocSharePct] = useState<number>(70);

  // Couple therapy subfields
  const [isCoupleSubject, setIsCoupleSubject] = useState(false);
  const [patient2Name, setPatient2Name] = useState('');
  const [patient2NatId, setPatient2NatId] = useState('');
  const [patient2Phone, setPatient2Phone] = useState('');
  const [patient2Gender, setPatient2Gender] = useState<'مرد' | 'زن'>('زن');

  // Booking dynamic date states for modal
  const [bookingDate, setBookingDate] = useState(getCurrentJalaliDate());
  const [isModalCalendarOpen, setIsModalCalendarOpen] = useState(false);
  const [modalPickerYear, setModalPickerYear] = useState(1405);
  const [modalPickerMonth, setModalPickerMonth] = useState(3);
  const modalCalendarRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarPickerOpen(false);
      }
    }
    if (isCalendarPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarPickerOpen]);

  useEffect(() => {
    function handleClickOutsideModalCalendar(event: MouseEvent) {
      if (modalCalendarRef.current && !modalCalendarRef.current.contains(event.target as Node)) {
        setIsModalCalendarOpen(false);
      }
    }
    if (isModalCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutsideModalCalendar);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideModalCalendar);
    };
  }, [isModalCalendarOpen]);

  // Receipt Modal
  const [receiptAppointment, setReceiptAppointment] = useState<Appointment | null>(null);

  // Instant on-the-spot patient registration states
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNatId, setNewPatientNatId] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'مرد' | 'زن'>('مرد');
  const [newPatientType, setNewPatientType] = useState<string>('عادی');



  // Instant search input states for patients & doctors dropdowns
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [showSpouseResults, setShowSpouseResults] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  const [showAllDoctorsToggle, setShowAllDoctorsToggle] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      setPatientSearchQuery('');
      setShowPatientResults(false);
      setShowSpouseResults(false);
      setBookingDate(filterDate);
      setIsModalCalendarOpen(false);
    }
  }, [isModalOpen, filterDate]);

  useEffect(() => {
    if (isModalOpen && bookingDate) {
      // Select first available doctor working on this dynamic bookingDate who is not absent
      const absentDoctorNames = attendances
        .filter(att => att.date === bookingDate && att.status === 'غایب')
        .map(att => att.doctor_name);

      const workingAndPresent = doctors.filter(doc => 
        isDoctorWorkingOnDate(doc.working_days, bookingDate) && 
        !absentDoctorNames.includes(doc.name)
      );

      const defaultDoc = workingAndPresent.length > 0 
        ? workingAndPresent[0].name 
        : (doctors.find(d => isDoctorWorkingOnDate(d.working_days, bookingDate))?.name || doctors[0]?.name || '');

      setBookingDoctor(defaultDoc);
      setDoctorSearchQuery(defaultDoc);
      setShowDoctorResults(false);
    }
  }, [isModalOpen, bookingDate, doctors, attendances]);

  // Floating Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; app: Appointment } | null>(null);

  // Notification Center Modal Toggle State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Edit Appointment Modal & Form States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editAppTime, setEditAppTime] = useState('');
  const [editAppDate, setEditAppDate] = useState('');
  const [editAppDoctor, setEditAppDoctor] = useState('');
  const [editAppPatientName, setEditAppPatientName] = useState('');
  const [editAppPatient2Name, setEditAppPatient2Name] = useState('');
  const [editAppPhone, setEditAppPhone] = useState('');
  const [editAppNatId, setEditAppNatId] = useState('');
  const [editAppPatient2NatId, setEditAppPatient2NatId] = useState('');
  const [editAppSubject, setEditAppSubject] = useState('');
  const [editAppCost, setEditAppCost] = useState(0);
  const [editAppDiscount, setEditAppDiscount] = useState(0);
  const [editAppFinalCost, setEditAppFinalCost] = useState(0);
  const [editAppPaymentMethod, setEditAppPaymentMethod] = useState('نقدی');
  const [editAppPaymentStatus, setEditAppPaymentStatus] = useState('تسویه شده');
  const [editAppRefModel, setEditAppRefModel] = useState('ارجاع به استاد');
  const [editAppDocSharePct, setEditAppDocSharePct] = useState(70);

  // Dynamic Toast Notifications State
  const [infoModal, setInfoModal] = useState<{ title: string; message: string; type?: 'success' | 'warning' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const triggerAppNotificationSms = (app: Appointment, templateType: 'booking' | 'reminder' | 'cancel') => {
    // 1. Patient phone check
    if (!app.phone || app.phone.trim() === '') {
      showToast(`⚠️ خطا: تلفن مراجع ${app.patient_name} ثبت نشده است.`, 'error');
      alert(`⚠️ خطای عدم ثبت شماره تماس:\nشماره تلفنی برای مراجع "${app.patient_name}" ثبت نشده است! لطفاً تلفن مراجع را در پرونده بروزرسانی فرمایید.`);
      return;
    }

    // 2. Doctor phone check
    const matchedDoc = doctors.find(d => d.name === app.doctor);
    if (!matchedDoc || !matchedDoc.phone || matchedDoc.phone.trim() === '') {
      showToast(`⚠️ هشدار فرعی: شماره تلفنی برای استاد ${app.doctor} ثبت نشده است.`, 'info');
    }

    const smsSettings = StorageHelper.getSmsSettings();
    let template = "";
    if (templateType === 'booking') {
      template = smsSettings.booking_template || "مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% ساعت %time% تایید شد.";
    } else if (templateType === 'reminder') {
      template = smsSettings.reminder_template || "مراجعه‌کننده گرامی %patient%، یادآوری نوبت شما با %doctor% برای فردا در تاریخ %date% ساعت %time% ثبت شده است.";
    } else if (templateType === 'cancel') {
      template = smsSettings.cancel_template || "مراجعه‌کننده گرامی %patient%، نوبت شما با %doctor% در تاریخ %date% لغو گردید.";
    }

    const compiled = template
      .replace(/%patient%/g, app.patient_name)
      .replace(/%doctor%/g, app.doctor)
      .replace(/%date%/g, app.date)
      .replace(/%time%/g, app.time);

    // Register SMS in clinic activity logs helper
    StorageHelper.logActivity(
      currentUser.username,
      'ارسال پیامک وب‌آی‌پی‌آی',
      `پیامک ${templateType === 'booking' ? 'تایید نوبت' : templateType === 'reminder' ? 'یادآوری نوبت' : 'لغو نوبت'} با موفقیت به مراجع ${app.patient_name} (${app.phone}) صادر شد.`
    );

    showToast(`✉️ پیامک ${templateType === 'booking' ? 'تایید نوبت' : templateType === 'reminder' ? 'یادآور جلسه' : 'لغو جلسه'} با موفقیت ارسال شد:\n"${compiled}"`, 'success');
  };

  useEffect(() => {
    loadData();
  }, [filterDate]);

  const loadData = () => {
    setAppointments(StorageHelper.getAppointments());
    setDoctors(StorageHelper.getDoctors());
    setPatients(StorageHelper.getPatients());
    setShifts(StorageHelper.getShifts());
    setSubjects(StorageHelper.getSubjects());
    setAttendances(StorageHelper.getDoctorAttendance());
  };

  const handleStatusChange = (id: number, newStatus: 'فعال' | 'انجام شده' | 'کنسل مراجع' | 'کنسل استاد') => {
    const settings = StorageHelper.getSystemSettings();
    const isAllowed = currentUser.role === 'admin' || currentUser.role === 'super_admin' || 
                      (currentUser.role === 'secretary' && (settings.editPermissions?.secretary_can_edit_appointments ?? true)) ||
                      currentUser.role === 'supervisor';
    if (!isAllowed) {
      setInfoModal({
        title: '⚠️ عدم جواز ویرایش نوبت',
        message: 'امکان تغییر وضعیت نوبت‌ها یا لغو جلسات درمان بر اساس پیکربندی امنیتی مدیر ارشد کادر، برای موقعیت شغلی شما مسدود گردیده است.',
        type: 'error'
      });
      return;
    }

    const list = StorageHelper.getAppointments();
    const updated = list.map(app => {
      if (app.id === id) {
        // Log activity
        StorageHelper.logActivity(
          currentUser.username,
          'تغییر وضعیت نوبت',
          `وضعیت نوبت کد ${app.id} (مراجع ${app.patient_name}) به "${newStatus}" تغییر یافت`
        );
        return { ...app, status: newStatus };
      }
      return app;
    });
    StorageHelper.saveAppointments(updated);
    setAppointments(updated);
    onDataChanged();
  };

  const handleToggleDoctorAttendance = (doctorName: string) => {
    const list = StorageHelper.getDoctorAttendance();
    const existingIndex = list.findIndex(a => a.doctor_name === doctorName && a.date === filterDate);
    
    let newStatus: 'حاضر' | 'غایب' = 'غایب';
    let updatedList = [...list];

    if (existingIndex !== -1) {
      newStatus = list[existingIndex].status === 'حاضر' ? 'غایب' : 'حاضر';
      updatedList[existingIndex] = {
        ...list[existingIndex],
        status: newStatus
      };
    } else {
      // Default to غایب because everyone is assumed Present by default unless marked Absent
      newStatus = 'غایب';
      const newAttendance: DoctorAttendance = {
        id: list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1,
        doctor_name: doctorName,
        date: filterDate,
        status: newStatus
      };
      updatedList.push(newAttendance);
    }

    StorageHelper.saveDoctorAttendance(updatedList);
    setAttendances(updatedList);

    // Apply cascading rules: Changing to Absent cancels all active bookings. Changing to Present reactivates them!
    const allApps = StorageHelper.getAppointments();
    let affectedCount = 0;
    const updatedApps = allApps.map(app => {
      if (app.date === filterDate && app.doctor === doctorName) {
        if (newStatus === 'غایب' && app.status === 'فعال') {
          affectedCount++;
          return { ...app, status: 'کنسل استاد' as const };
        } else if (newStatus === 'حاضر' && app.status === 'کنسل استاد') {
          affectedCount++;
          return { ...app, status: 'فعال' as const };
        }
      }
      return app;
    });

    if (affectedCount > 0) {
      StorageHelper.saveAppointments(updatedApps);
      setAppointments(updatedApps);
    }

    // Log this important activity
    StorageHelper.logActivity(
      currentUser.username,
      'حضور و غیاب اساتید',
      `وضعیت حضور استاد «${doctorName}» در تاریخ ${filterDate} به «${newStatus === 'حاضر' ? 'حاضر' : 'غایب'}» تغییر داده شد و تعداد ${affectedCount} نوبت مربوطه بروزرسانی شد.`
    );

    onDataChanged();
  };

  const handleDeleteAppointment = (id: number) => {
    const settings = StorageHelper.getSystemSettings();
    const isAllowed = currentUser.role === 'admin' || currentUser.role === 'super_admin' || 
                      (currentUser.role === 'secretary' && (settings.editPermissions?.secretary_can_delete ?? false)) ||
                      (currentUser.role === 'supervisor' && (settings.editPermissions?.supervisor_can_delete ?? true));
    if (!isAllowed) {
      setInfoModal({
        title: '⚠️ محدودیت سطح دسترسی',
        message: 'مدیریت ارشد دپارتمان روان‌شناسی، امکان حذف فیزیکی نوبت‌های مراجعین را برای نقش کاربری شما لغو نموده است. تفویض مجدد آن از مدیر کل به صورت زنده انجام می‌شود.',
        type: 'error'
      });
      return;
    }
    setDeleteConfirm({
      message: '⚠️ هشدار مهم: حذف نوبت نهایی و غیر قابل بازگشت است. آیا مطمئن هستید که می‌خواهید این نوبت را به طور کامل حذف کنید؟',
      onConfirm: () => {
        const list = StorageHelper.getAppointments();
        const target = list.find(app => app.id === id);
        const filtered = list.filter(app => app.id !== id);
        StorageHelper.saveAppointments(filtered);
        setAppointments(filtered);

        if (target) {
          StorageHelper.logActivity(
            currentUser.username,
            'حذف نوبت',
            `نوبت کد ${id} مربوط به مراجع ${target.patient_name} توسط مدیر حذف شد`
          );
        }
        onDataChanged();
      }
    });
  };

  const handleOpenEditModal = (app: Appointment) => {
    const settings = StorageHelper.getSystemSettings();
    const isAllowed = currentUser.role === 'admin' || currentUser.role === 'super_admin' || 
                      (currentUser.role === 'secretary' && (settings.editPermissions?.secretary_can_edit_appointments ?? true)) ||
                      currentUser.role === 'supervisor';
    if (!isAllowed) {
      setInfoModal({
        title: '⚠️ محدودیت دسترسی',
        message: 'امکان ویرایش اطلاعات نوبت‌ها پس از ثبت نهایی، بر اساس صلاحدید ادمین ارشد کلینیک برای نقش کاربری شما مسدود است.',
        type: 'error'
      });
      return;
    }
    setEditingAppointment(app);
    setEditAppTime(app.time);
    setEditAppDate(app.date);
    setEditAppDoctor(app.doctor);
    setEditAppPatientName(app.patient_name);
    setEditAppPatient2Name(app.patient2_name || '');
    setEditAppPhone(app.phone || '');
    setEditAppNatId(app.nat_id || '');
    setEditAppPatient2NatId(app.patient2_nat_id || '');
    setEditAppSubject(app.subject);
    setEditAppCost(app.cost);
    setEditAppDiscount(app.discount);
    setEditAppFinalCost(app.final_cost);
    setEditAppPaymentMethod(app.payment_method || 'نقدی');
    setEditAppPaymentStatus(app.payment_status || 'تسویه شده');
    setEditAppRefModel(app.ref_model || 'ارجاع به استاد');
    setEditAppDocSharePct(app.doc_share_pct !== undefined ? app.doc_share_pct : 70);
    setIsEditModalOpen(true);
  };

  const handleSaveEditAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    const originalNatId = editingAppointment.nat_id;
    const cleanNewName = editAppPatientName.trim();
    const cleanNewNatId = editAppNatId.trim();
    const cleanNewPhone = editAppPhone.trim();

    const allPatients = StorageHelper.getPatients();

    if (!cleanNewName || !cleanNewNatId || !cleanNewPhone) {
      setInfoModal({
        title: '⚠️ تکمیل نبودن مشخصات ویرایش',
        message: 'نام مراجع، کد ملی و همراه نمی‌توانند خالی باشند.',
        type: 'error'
      });
      return;
    }

    if (!/^\d{10}$/.test(cleanNewNatId)) {
      setInfoModal({
        title: '⚠️ کد ملی مراجع نامعتبر است',
        message: 'کد ملی مراجع باید شامل دقیقاً ۱۰ رقم عددی باشد.',
        type: 'error'
      });
      return;
    }

    if (!/^0\d{10}$/.test(cleanNewPhone)) {
      setInfoModal({
        title: '⚠️ شماره همراه مراجع نامعتبر است',
        message: 'شماره همراه باید ۱۱ رقم بوده و با ۰ شروع شود (مانند 09121234567).',
        type: 'error'
      });
      return;
    }

    // Check collision of national ID with any other patient profile
    const collisionPatientObj = allPatients.find(p => p.nat_id === cleanNewNatId && p.nat_id !== originalNatId);
    if (collisionPatientObj) {
      setInfoModal({
        title: '⚠️ کد ملی تکراری است',
        message: `این کد ملی متعلق به مراجع دیگری به نام «${collisionPatientObj.name}» در سامانه است و نمی‌توانید نوبت را به این کد ملی نسبت دهید.`,
        type: 'error'
      });
      return;
    }

    // 1. Dual sync - Update central patients profile matching the original national ID
    const updatedPatients = allPatients.map(p => {
      if (p.nat_id === originalNatId) {
        return {
          ...p,
          name: cleanNewName,
          nat_id: cleanNewNatId,
          phone: cleanNewPhone,
        };
      }
      return p;
    });
    StorageHelper.savePatients(updatedPatients);
    setPatients(updatedPatients);

    // 2. Dual sync - Update ALL appointments matching the original national ID
    const list = StorageHelper.getAppointments();
    const updated = list.map(app => {
      if (app.id === editingAppointment.id) {
        return {
          ...app,
          time: editAppTime,
          date: editAppDate,
          doctor: editAppDoctor,
          patient_name: cleanNewName,
          patient2_name: editAppPatient2Name.trim() || undefined,
          phone: cleanNewPhone,
          nat_id: cleanNewNatId,
          patient2_nat_id: editAppPatient2NatId.trim() || undefined,
          subject: editAppSubject,
          cost: Number(editAppCost),
          discount: Number(editAppDiscount),
          final_cost: Number(editAppFinalCost),
          payment_method: editAppPaymentMethod,
          payment_status: editAppPaymentStatus,
          ref_model: editAppRefModel,
          doc_share_pct: Number(editAppDocSharePct)
        };
      } else if (app.nat_id === originalNatId) {
        // Automatically sync Name, ID and Phone for all other sessions
        return {
          ...app,
          patient_name: cleanNewName,
          nat_id: cleanNewNatId,
          phone: cleanNewPhone,
        };
      }
      return app;
    });

    StorageHelper.saveAppointments(updated);
    // Reload items on current day
    setAppointments(updated.filter(a => a.date === filterDate));
    setIsEditModalOpen(false);

    StorageHelper.logActivity(
      currentUser.username,
      'اصلاح مشخصات نوبت مراجع',
      `نوبت جلسه کد ${editingAppointment.id} متعلق به مراجع ${cleanNewName} با موفقیت ویرایش گردید و در پرونده و تمامی نوبت‌ها فورا همگام شد.`
    );

    showToast('✅ جزئیات نوبت درمانی و پرونده مراجع با موفقیت تغییر و در سرتاسر سیستم همگام‌سازی شد.', 'success');
    onDataChanged();
  };

  // Watch selected counseling type to toggle couple subfields
  const handleSubjectChange = (subjName: string) => {
    setBookingSubject(subjName);
    const foundSubj = subjects.find(s => s.name === subjName);
    setIsCoupleSubject(foundSubj?.is_couple === 1);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNewName = newPatientName.trim();
    const cleanNewNatId = newPatientNatId.trim();
    const cleanNewPhone = newPatientPhone.trim();

    if (!cleanNewName || !cleanNewNatId || !cleanNewPhone) {
      setInfoModal({
        title: '⚠️ تکمیل نبودن اطلاعات مراجع',
        message: 'لطفاً مشخصات مراجع اصلی (نام و نام‌خانوادگی، کد ملی و شماره همراه) را به طور کامل تکمیل نمایید.',
        type: 'error'
      });
      return;
    }

    if (!/^\d{10}$/.test(cleanNewNatId)) {
      setInfoModal({
        title: '⚠️ کد ملی مراجع نامعتبر است',
        message: 'کد ملی وارد شده باید دقیقاً ۱۰ رقم عددی بدون فاصله، خط تیره یا کاراکترهای دیگر باشد.',
        type: 'error'
      });
      return;
    }

    if (!/^0\d{10}$/.test(cleanNewPhone)) {
      setInfoModal({
        title: '⚠️ شماره تلفن همراه نامعتبر است',
        message: 'شماره همراه مراجع باید دقیقاً ۱۱ رقم بوده و با پسوند مجاز ۰ شروع شود (مثال: 09121234567).',
        type: 'error'
      });
      return;
    }

    // Validate doctor session overlap to prevent double booking on same date and time slot
    const allCurrentApps = StorageHelper.getAppointments();
    const targetDoctor = bookingDoctor || doctors[0]?.name || '';
    const isTimeOverlapping = allCurrentApps.some(app => 
      app.doctor === targetDoctor &&
      app.date === bookingDate &&
      app.time === bookingTime &&
      app.status !== 'کنسل استاد' &&
      app.status !== 'کنسل مراجع'
    );

    if (isTimeOverlapping) {
      setInfoModal({
        title: '⚠️ تداخل زمان نوبت استاد',
        message: `خطای همپوشانی: ساعت رزرو شده ${bookingTime} در تاریخ ${bookingDate} قبلاً برای استاد محترم «${targetDoctor}» ثبت شده است و این ساعت تکمیل می‌باشد. لطفاً زمان دیگری را آزاد کنید یا ساعت یا استاد دیگری انتخاب نمایید.`,
        type: 'error'
      });
      return;
    }

    const allPatients = StorageHelper.getPatients();

    // Strict duplication checks to protect the database from parallel profiles
    const testMatchByNat = allPatients.find(p => p.nat_id === cleanNewNatId);
    const hasNatColl = testMatchByNat && (!selectedPatientId || selectedPatientId !== testMatchByNat.id.toString());
    
    if (hasNatColl) {
      setInfoModal({
        title: '⚠️ کد ملی تکراری و تداخل پرونده',
        message: `خطای ذخیره: پرونده دیگری با کد ملی وارد شده (${cleanNewNatId}) برای مراجع محترم «${testMatchByNat.name}» قبلاً در سیستم ثبت شده است.\n\nبه منظور جلوگیری از ایجاد پرونده‌های موازی و مواجهه با خطای آماری، ایجاد پرونده تکراری مجاز نیست. لطفاً با زدن دکمه «فراخوانی پرونده» اطلاعات مراجع را لود کنید یا شماره ملی را اصلاح فرمایید.`,
        type: 'error'
      });
      return;
    }

    const testMatchByPhone = allPatients.find(p => p.phone === cleanNewPhone);
    const hasPhoneColl = testMatchByPhone && 
      (!selectedPatientId || selectedPatientId !== testMatchByPhone.id.toString()) &&
      (!testMatchByNat || testMatchByPhone.id !== testMatchByNat.id);

    if (hasPhoneColl) {
      setInfoModal({
        title: '⚠️ شماره همراه تکراری و تداخل پرونده',
        message: `خطای ذخیره: شماره همراه وارد شده (${cleanNewPhone}) قبلاً متعلق به مراجع گرامی «${testMatchByPhone.name}» ثبت شده است و مجاز به استفاده مجدد برای فرده دیگری نیستید.\n\nلطفاً شماره همراه متفاوتی وارد کنید یا پرونده قبلی را فراخوانی کنید.`,
        type: 'error'
      });
      return;
    }

    const normalizedNameCompare = (a: string, b: string) => 
      a.replace(/[\u064A\u06CC]/g, 'ی').replace(/[\u0643\u06A9]/g, 'ک').trim().replace(/\s+/g, ' ') === 
      b.replace(/[\u064A\u06CC]/g, 'ی').replace(/[\u0643\u06A9]/g, 'ک').trim().replace(/\s+/g, ' ');

    // Check duplication of national ID
    const matchByNat = allPatients.find(p => p.nat_id === cleanNewNatId);
    if (matchByNat) {
      if (matchByNat.is_blocked === 1) {
        setInfoModal({
          title: '🚫 مراجع در لیست سیاه کلینیک است',
          message: `خطای نوبت‌دهی: بیمار گرامی جناب آقای/سرکار خانم «${matchByNat.name}» در لیست مراجعین بلاک شده قرار دارد و نوبت‌دهی موقتاً مقدور نمی‌باشد.`,
          type: 'error'
        });
        return;
      }

      // If name is different, warning! This is a duplicate National ID attempt.
      if (!normalizedNameCompare(matchByNat.name, cleanNewName)) {
        setInfoModal({
          title: '⚠️ کد ملی تکراری و تداخل نام مراجع',
          message: `خطا: کد ملی وارد شده (${cleanNewNatId}) قبلاً برای مراجعی با نام «${matchByNat.name}» در سیستم ثبت شده است.\n\nامکان ثبت شناسنامه جدید با این شماره ملی فعال نیست. لطفاً در صورت تشابه، نام را اصلاح یا کد ملی مراجع را بررسی مجدد فرمایید.`,
          type: 'error'
        });
        return;
      }

      // Check phone number mismatch for the same patient to see if there is another patient with this phone
      const matchByPhone = allPatients.find(p => p.phone === cleanNewPhone);
      if (matchByPhone && matchByPhone.id !== matchByNat.id) {
        setInfoModal({
          title: '⚠️ تداخل شماره همراه',
          message: `خطا: شماره همراه وارد شده قبلاً برای مراجع دیگری با نام «${matchByPhone.name}» در پایگاه‌داده کلینیک ثبت گردیده است.`,
          type: 'error'
        });
        return;
      }
    } else {
      const matchByPhone = allPatients.find(p => p.phone === cleanNewPhone);
      if (matchByPhone) {
        setInfoModal({
          title: '⚠️ شماره تلفن تکراری در سیستم',
          message: `خطا: این شماره تلفن همراه قبلاً برای مراجع دیگری به نام «${matchByPhone.name}» ثبت شده است و مجاز به استفاده مجدد نیستید.`,
          type: 'error'
        });
        return;
      }
    }

    // Do the same for Spouse/Companion if isCoupleSubject is active
    if (isCoupleSubject) {
      const cleanPat2Name = patient2Name.trim();
      const cleanPat2NatId = patient2NatId.trim();
      const cleanPat2Phone = patient2Phone.trim();

      if (!cleanPat2Name || !cleanPat2NatId || !cleanPat2Phone) {
        setInfoModal({
          title: '⚠️ ناقص بودن اطلاعات همسر',
          message: 'لطفاً برای ثبت نوبت زوج‌درمانی، مشخصات همسر مراجع (نام مراجع دوم، کد ملی و همراه) را به طور کامل وارد نمایید.',
          type: 'error'
        });
        return;
      }

      if (!/^\d{10}$/.test(cleanPat2NatId)) {
        setInfoModal({
          title: '⚠️ کد ملی همسر نامعتبر است',
          message: 'کد ملی وارد شده برای همسر (مراجع دوم) باید دقیقاً ۱۰ رقم عددی باشد.',
          type: 'error'
        });
        return;
      }

      if (!/^0\d{10}$/.test(cleanPat2Phone)) {
        setInfoModal({
          title: '⚠️ شماره همراه همسر نامعتبر است',
          message: 'شماره همراه همسر مراجع باید دقیقاً ۱۱ رقم بوده و با ۰ شروع شود.',
          type: 'error'
        });
        return;
      }

      if (cleanPat2NatId === cleanNewNatId) {
        setInfoModal({
          title: '⚠️ تداخل مشخصات همسر با مراجع اصلی',
          message: 'خطا: کد ملی همسر نمی‌تواند با کد ملی مراجع اصلی یکی باشد. لطفاً کد ملی همسر را اصلاح فرمایید.',
          type: 'error'
        });
        return;
      }

      if (cleanPat2Phone === cleanNewPhone) {
        setInfoModal({
          title: '⚠️ تداخل شماره همراه همسر با مراجع اصلی',
          message: 'خطا: شماره همراه همسر نمی‌تواند با شماره همراه مراجع اصلی یکسان باشد. لطفاً شماره همراه متفاوتی برای همسر وارد کنید.',
          type: 'error'
        });
        return;
      }

      const spouseByNat = allPatients.find(p => p.nat_id === cleanPat2NatId);
      if (spouseByNat) {
        if (!normalizedNameCompare(spouseByNat.name, cleanPat2Name)) {
          setInfoModal({
            title: '⚠️ کد ملی تکراری همسر',
            message: `خطا: کد ملی همسر وارد شده (${cleanPat2NatId}) قبلاً برای مراجع دیگری به نام «${spouseByNat.name}» ثبت شده است و امکان ثبت مراجع جدیدی با این مشخصات وجود ندارد.\n\nلطفاً در صورت یکی بودن زوج، دکمه «فراخوانی اطلاعات مراجع دوم» را بزنید تا اطلاعات وی لود شود، یا کدملی را اصلاح فرمایید.`,
            type: 'error'
          });
          return;
        }

        const spouseByPhone = allPatients.find(p => p.phone === cleanPat2Phone);
        if (spouseByPhone && spouseByPhone.id !== spouseByNat.id) {
          setInfoModal({
            title: '⚠️ تداخل شماره همراه مراجع دوم',
            message: `خطا: شماره همراه مراجع دوم با شماره همراه بیمار دیگری به نام «${spouseByPhone.name}» تداخل دارد.`,
            type: 'error'
          });
          return;
        }
      } else {
        const spouseByPhone = allPatients.find(p => p.phone === cleanPat2Phone);
        if (spouseByPhone) {
          setInfoModal({
            title: '⚠️ تداخل شماره همراه همسر',
            message: `خطا: شماره همراه مراجع دوم قبلاً برای بیمار دیگری به نام «${spouseByPhone.name}» در کلینیک ثبت شده است.`,
            type: 'error'
          });
          return;
        }
      }
    }

    // Process/Update primary patient profile (Bilateral sync)
    let patient: Patient;
    const existingPatient = allPatients.find(p => p.nat_id === cleanNewNatId);

    if (existingPatient) {
      const updatedPat = {
        ...existingPatient,
        name: cleanNewName,
        phone: cleanNewPhone,
        gender: newPatientGender,
        type: newPatientType
      };
      const updatedPatients = allPatients.map(p => p.id === existingPatient.id ? updatedPat : p);
      StorageHelper.savePatients(updatedPatients);
      setPatients(updatedPatients);
      patient = updatedPat;

      // Sync all previous appointments of this patient
      const allApps = StorageHelper.getAppointments();
      const updatedApps = allApps.map(app => {
        if (app.nat_id === cleanNewNatId) {
          return {
            ...app,
            patient_name: cleanNewName,
            phone: cleanNewPhone,
            gender: newPatientGender,
            type: newPatientType
          };
        }
        return app;
      });
      StorageHelper.saveAppointments(updatedApps);
      setAppointments(updatedApps);
    } else {
      const newP: Patient = {
        id: allPatients.length > 0 ? Math.max(...allPatients.map(p => p.id)) + 1 : 1,
        name: cleanNewName,
        nat_id: cleanNewNatId,
        phone: cleanNewPhone,
        gender: newPatientGender,
        type: newPatientType,
        balance: 0,
        wallet_balance: 0,
        desc: 'ثبت پرونده سیستمی مراجع جدید',
        is_blocked: 0
      };
      const updatedPatients = [...allPatients, newP];
      StorageHelper.savePatients(updatedPatients);
      setPatients(updatedPatients);
      patient = newP;

      StorageHelper.logActivity(
        currentUser.username,
        'ثبت پرونده مراجع',
        `مراجع جدید «${newP.name}» با کدملی ${newP.nat_id} همزمان با جلسه نوبت‌دهی در سیستم ثبت و پرونده‌دار شد.`
      );
    }

    // Process/Update spouse profile
    if (isCoupleSubject) {
      const cleanPat2Name = patient2Name.trim();
      const cleanPat2NatId = patient2NatId.trim();
      const cleanPat2Phone = patient2Phone.trim();

      const allPatientsLatest = StorageHelper.getPatients();
      const existingSpouse = allPatientsLatest.find(p => p.nat_id === cleanPat2NatId);

      if (existingSpouse) {
        const updatedSpouse = {
          ...existingSpouse,
          name: cleanPat2Name,
          phone: cleanPat2Phone,
          gender: patient2Gender
        };
        const updatedPatients = allPatientsLatest.map(p => p.id === existingSpouse.id ? updatedSpouse : p);
        StorageHelper.savePatients(updatedPatients);
        setPatients(updatedPatients);

        const allApps = StorageHelper.getAppointments();
        const updatedApps = allApps.map(app => {
          if (app.patient2_nat_id === cleanPat2NatId) {
            return {
              ...app,
              patient2_name: cleanPat2Name,
              patient2_phone: cleanPat2Phone
            };
          }
          return app;
        });
        StorageHelper.saveAppointments(updatedApps);
        setAppointments(updatedApps);
      } else {
        const newSpouse: Patient = {
          id: allPatientsLatest.length > 0 ? Math.max(...allPatientsLatest.map(p => p.id)) + 1 : 1,
          name: cleanPat2Name,
          nat_id: cleanPat2NatId,
          phone: cleanPat2Phone,
          gender: patient2Gender,
          type: 'عادی',
          balance: 0,
          wallet_balance: 0,
          desc: 'ثبت پرونده همسر زوج‌درمانی',
          is_blocked: 0
        };
        const updatedPatients = [...allPatientsLatest, newSpouse];
        StorageHelper.savePatients(updatedPatients);
        setPatients(updatedPatients);

        StorageHelper.logActivity(
          currentUser.username,
          'ثبت پرونده مراجع',
          `مراجع همسر «${newSpouse.name}» با کدملی ${newSpouse.nat_id} همزمان با پرونده زوج درمانی ثبت گردید.`
        );
      }
    }

    // Wallet balance validation
    const finalAmount = isFree ? 0 : (bookingCost - bookingDiscount);
    if (!isFree && payMethod === 'کیف پول' && patient.wallet_balance < finalAmount) {
      alert(`⚠️ خطای موجودی: بیمار دارای ${patient.wallet_balance.toLocaleString('fa-IR')} تومان موجودی است، اما هزینه نهایی جلسه ${finalAmount.toLocaleString('fa-IR')} تومان می‌باشد.`);
      return;
    }

    // Process wallet deduct
    if (!isFree && payMethod === 'کیف پول') {
      const updatedPatients = StorageHelper.getPatients().map(p => {
        if (p.id === patient.id) {
          const newWalletBal = p.wallet_balance - finalAmount;
          const trans = StorageHelper.getPatientTransactions();
          trans.unshift({
            id: trans.length > 0 ? Math.max(...trans.map(t => t.id)) + 1 : 1,
            patient_nat_id: p.nat_id,
            date: bookingDate,
            time: bookingTime,
            amount: finalAmount,
            trans_type: 'پرداخت نوبت',
            description: `برداشت آنلاین نوری از کیف پول بابت جلسه مشاوره با ${bookingDoctor}`
          });
          StorageHelper.savePatientTransactions(trans);
          return { ...p, wallet_balance: newWalletBal };
        }
        return p;
      });
      StorageHelper.savePatients(updatedPatients);
      setPatients(updatedPatients);
    }

    const allApps = StorageHelper.getAppointments();
    const newApp: Appointment = {
      id: allApps.length > 0 ? Math.max(...allApps.map(a => a.id)) + 1 : 1,
      date: bookingDate,
      time: bookingTime,
      shift: bookingShift || 'صبح',
      doctor: bookingDoctor || doctors[0]?.name || '',
      patient_name: patient.name,
      nat_id: patient.nat_id,
      phone: patient.phone,
      gender: patient.gender,
      type: patient.type,
      subject: bookingSubject || subjects[0]?.name || '',
      desc: bookingDesc,
      status: 'فعال',
      doc_share_pct: isFree ? 0 : Number(docSharePct),
      cost: isFree ? 0 : bookingCost,
      discount: isFree ? 0 : bookingDiscount,
      final_cost: finalAmount,
      is_free: isFree ? 1 : 0,
      payment_status: isFree ? 'رایگان' : 'تسویه شده',
      payment_method: isFree ? 'رایگان' : payMethod,
      is_settled: 0,
      ref_model: refModel,
      ...(isCoupleSubject && {
        patient2_name: patient2Name,
        patient2_nat_id: patient2NatId,
        patient2_phone: patient2Phone,
      })
    };

    allApps.unshift(newApp);
    StorageHelper.saveAppointments(allApps);
    setAppointments(allApps);

    StorageHelper.logActivity(
      currentUser.username,
      'ثبت نوبت',
      `نوبت جدید برای مراجع ${patient.name} با موضوع "${bookingSubject}" ثبت شد. مبلغ: ${finalAmount} تومان (${payMethod})`
    );

    setIsModalOpen(false);
    // Reset form
    setSelectedPatientId('');
    setNewPatientName('');
    setNewPatientNatId('');
    setNewPatientPhone('');
    setNewPatientGender('مرد');
    setNewPatientType('عادی');
    setBookingDesc('');
    setPatient2Name('');
    setPatient2NatId('');
    setPatient2Phone('');
    setIsFree(true);
    setBookingCost(0);
    setBookingDiscount(0);
    onDataChanged();
    loadData();
  };

  // Filtered appointments list
  const filteredAppointments = appointments.filter(app => {
    // Exact date match
    if (app.date !== filterDate) return false;

    // Doctor filter
    if (selectedDoctor && app.doctor !== selectedDoctor) return false;

    // Shift filter
    if (selectedShift && app.shift !== selectedShift) return false;

    // Status filter
    if (selectedStatus && app.status !== selectedStatus) return false;

    // Search Query (matches patient name, nat_id, doctor, phone)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        app.patient_name.toLowerCase().includes(q) ||
        app.nat_id.includes(q) ||
        app.doctor.toLowerCase().includes(q) ||
        app.phone.includes(q)
      );
    }

    return true;
  });

  const normalizedNameCompare = (a: string, b: string) => 
    a.replace(/[\u064A\u06CC]/g, 'ی').replace(/[\u0643\u06A9]/g, 'ک').trim().replace(/\s+/g, ' ') === 
    b.replace(/[\u064A\u06CC]/g, 'ی').replace(/[\u0643\u06A9]/g, 'ک').trim().replace(/\s+/g, ' ');

  const matchedPatientByNat = newPatientNatId.trim().length === 10
    ? patients.find(p => p.nat_id.trim() === newPatientNatId.trim())
    : null;

  const matchedPatientByPhone = newPatientPhone.trim().length === 11
    ? patients.find(p => p.phone.trim() === newPatientPhone.trim())
    : null;

  const hasNatConflict = !!(matchedPatientByNat && (!selectedPatientId || selectedPatientId !== matchedPatientByNat.id.toString()));
  const hasPhoneConflict = !!(matchedPatientByPhone && 
    (!selectedPatientId || selectedPatientId !== matchedPatientByPhone.id.toString()) &&
    (!matchedPatientByNat || matchedPatientByPhone.id !== matchedPatientByNat.id));

  const matchedSpouseByNat = patient2NatId.trim().length === 10
    ? patients.find(p => p.nat_id.trim() === patient2NatId.trim())
    : null;

  const matchedSpouseByPhone = patient2Phone.trim().length === 11
    ? patients.find(p => p.phone.trim() === patient2Phone.trim())
    : null;

  // Spouse has conflict if there's a matched patient with that national ID, but their name is NOT the same as patient2Name.
  // We should also check that the spouse national ID/phone does not conflict with the primary patient's national ID/phone.
  const hasSpouseNatConflict = !!(matchedSpouseByNat && !normalizedNameCompare(matchedSpouseByNat.name, patient2Name));
  const hasSpousePhoneConflict = !!(matchedSpouseByPhone && 
    (!matchedSpouseByNat || matchedSpouseByPhone.id !== matchedSpouseByNat.id) &&
    !normalizedNameCompare(matchedSpouseByPhone.name, patient2Name));

  const currentDate = getCurrentJalaliDate();
  const currentTime = getCurrentJalaliTime();

  const unresolvedPastAppointments = appointments.filter(app => {
    if (app.status !== 'فعال') return false; // Must still be active/pending
    if (app.date < currentDate) return true; // Date passed
    if (app.date === currentDate && app.time < currentTime) return true; // Same day, time passed
    return false;
  });

  return (
    <div className="space-y-6" dir="rtl">

      {/* Unresolved Past Appointments Banner */}
      {unresolvedPastAppointments.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-2.5 rounded-full shrink-0 mt-1 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-orange-900 font-extrabold text-sm mb-1.5 flex items-center gap-2">
                <span>هشدار مهم سیستم: نوبت‌های گذشته با وضعیت نامشخص</span>
                <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full leading-none">{unresolvedPastAppointments.length} مورد</span>
              </h3>
              <p className="text-orange-800/80 text-[11px] font-medium leading-relaxed mb-4">
                تعداد {unresolvedPastAppointments.length} نوبت متعلق به گذشته در سیستم یافت شده که هنوز در وضعیت «فعال» قرار دارند. لطفاً با کلیک بر روی هر یک، وضعیت قطعی آنها (انجام شده، کنسل استاد، یا کنسل مراجع) را مشخص نمایید تا سیستم مالی و آماری دچار اختلال نگردد.
              </p>
              
              <div className="max-h-[160px] overflow-y-auto custom-scrollbar bg-white/60 rounded-xl border border-orange-100 p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unresolvedPastAppointments.map(app => (
                  <div 
                    key={app.id} 
                    onClick={() => {
                      setFilterDate(app.date);
                      setSearchQuery(app.patient_name || '');
                      setTimeout(() => {
                        document.getElementById('appointments-list-container')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="flex justify-between items-center p-2.5 bg-white border border-orange-100 rounded-lg hover:bg-orange-50 hover:border-orange-200 cursor-pointer transition-colors shadow-sm"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{app.patient_name}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">استاد: {app.doctor}</div>
                    </div>
                    <div className="text-left bg-orange-50/80 px-2 py-1 rounded text-orange-800">
                      <div className="text-[10px] font-mono leading-none">{app.date}</div>
                      <div className="text-[11px] font-mono font-black mt-1 leading-none">{app.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Doctor Attendance panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3" dir="rtl">
        <div className="flex flex-wrap gap-4">
          {doctors.filter(doc => isDoctorWorkingOnDate(doc.working_days, filterDate)).map(doc => {
            const att = attendances.find(a => a.doctor_name === doc.name && a.date === filterDate);
            const isAbsent = att?.status === 'غایب';
            
            return (
              <div
                key={doc.id}
                className={`p-3 rounded-xl border flex flex-col justify-between items-center text-center w-[165px] transition-all ${
                  isAbsent 
                    ? 'bg-red-50/50 border-red-100 text-red-950' 
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                }`}
              >
                <div className="w-full">
                  <div className="font-extrabold text-xs flex items-center justify-center gap-0.5">
                    <span>{doc.gender === 'مرد' ? '👨‍💼' : '👩‍💼'}</span>
                    <span className="truncate max-w-[110px]">{doc.name.replace('دکتر ', '')}</span>
                  </div>
                  <div className="text-[9px] opacity-75 mt-0.5 max-w-[145px] truncate text-center" title={doc.spec}>{doc.spec}</div>
                </div>
                
                {/* Visual Hourly Timeline Tracker representing teacher's slots */}
                {!isAbsent && (() => {
                  const docApps = appointments.filter(app => 
                    app.doctor === doc.name && 
                    app.date === filterDate && 
                    app.status !== 'کنسل استاد' && 
                    app.status !== 'کنسل مراجع'
                  );
                  
                  const docShifts = docApps.length > 0 
                    ? Array.from(new Set(docApps.map(app => app.shift)))
                    : ['صبح']; // default fallback when no appointments
                  
                  const dynamicTimesObj = new Set<string>();
                  docShifts.forEach(sh => {
                    getShiftPredefinedTimes(sh as string).forEach(t => dynamicTimesObj.add(t));
                  });
                  const dynamicTimes = Array.from(dynamicTimesObj).sort();

                  return (
                    <div className="mt-2.5 pt-2 border-t border-slate-100/80 w-full text-right space-y-1">
                      <span className="text-[8.5px] text-slate-400 block font-bold mb-1">⏰ وضعیت نوبت‌های استاد:</span>
                      <div className="grid grid-cols-4 gap-1 text-[8px] font-mono leading-none">
                        {dynamicTimes.map(t => {
                          const isBooked = appointments.some(app => 
                            app.doctor === doc.name && 
                            app.date === filterDate && 
                            app.time === t && 
                            app.status !== 'کنسل استاد' && 
                            app.status !== 'کنسل مراجع'
                          );
                          
                          return (
                            <div
                              key={t}
                              className={`py-0.5 rounded text-center transition-all ${
                                isBooked 
                                  ? 'bg-red-500 text-white font-black' 
                                  : 'bg-white text-emerald-700 border border-emerald-100 font-bold'
                              }`}
                              title={`${t} - ${isBooked ? 'تکمیل شده' : 'خالی و آزاد'}`}
                            >
                              {t}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                <button
                  type="button"
                  onClick={() => handleToggleDoctorAttendance(doc.name)}
                  className={`mt-2.5 w-full py-1 rounded-lg text-[9px] font-bold transition-all shadow-sm flex items-center justify-center gap-0.5 cursor-pointer ${
                    isAbsent
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {isAbsent ? (
                    <>
                      <XCircle className="h-2.5 w-2.5" />
                      <span>غایب</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>حاضر جهت نوبت</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
          {doctors.filter(doc => isDoctorWorkingOnDate(doc.working_days, filterDate)).length === 0 && (
            <p className="text-xs text-slate-400">هیچ استادی برای حضور در این روز ({getJalaliWeekdayName(filterDate)}) تعریف نشده است.</p>
          )}
        </div>
      </div>
      
      {/* Search and control filter grid */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Jalali Date Navigation & Full Picker Bar */}
          <div ref={calendarRef} className="relative flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5">
            {/* Prev Day button */}
            <button
              type="button"
              onClick={() => {
                const prev = addDaysJalali(filterDate, -1);
                setFilterDate(prev);
              }}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg transition-all text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
              title="روز قبل"
            >
              <span>◀ روز قبل</span>
            </button>

            {/* Today Button */}
            <button
              type="button"
              onClick={() => {
                const today = getCurrentJalaliDate();
                setFilterDate(today);
              }}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              امروز ({getJalaliWeekdayName(getCurrentJalaliDate())})
            </button>

            {/* Next Day button */}
            <button
              type="button"
              onClick={() => {
                const next = addDaysJalali(filterDate, 1);
                setFilterDate(next);
              }}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg transition-all text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
              title="روز بعد"
            >
              <span>روز بعد ▶</span>
            </button>

            {/* Divider line */}
            <span className="w-px h-5 bg-slate-200.5 my-auto mx-1"></span>

            {/* Date Input with Full Calendar Picker Toggle */}
            <button
              type="button"
              onClick={() => {
                try {
                  const { jy, jm } = parseJalali(filterDate);
                  setPickerYear(jy);
                  setPickerMonth(jm);
                } catch {
                  setPickerYear(1405);
                  setPickerMonth(3);
                }
                setIsCalendarPickerOpen(!isCalendarPickerOpen);
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-800 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-mono">{filterDate}</span>
            </button>

            {/* Interactive Popover Panel */}
            {isCalendarPickerOpen && (() => {
              const monthsList = [
                "فروردین", "اردیبهشت", "خرداد",
                "تیر", "مرداد", "شهریور",
                "مهر", "آبان", "آذر",
                "دی", "بهمن", "اسفند"
              ];

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

              const allBookings = StorageHelper.getAppointments();
              
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
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-80 space-y-4 animate-in fade-in slide-in-from-top-1 text-right" dir="rtl">
                  
                  {/* Calendar controller header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1 hover:bg-slate-150 text-slate-600 hover:text-blue-600 rounded bg-slate-50 cursor-pointer text-xs font-bold"
                    >
                      ◀
                    </button>
                    <div className="flex items-center gap-1">
                      {/* Month Dropdown */}
                      <select
                        value={pickerMonth}
                        onChange={(e) => setPickerMonth(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {monthsList.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                      {/* Year Dropdown */}
                      <select
                        value={pickerYear}
                        onChange={(e) => setPickerYear(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                      >
                        {Array.from({ length: 36 }, (_, i) => 1380 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 hover:bg-slate-150 text-slate-600 hover:text-blue-600 rounded bg-slate-50 cursor-pointer text-xs font-bold"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Weekday headers starting Saturday */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
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
                        return <span key={`empty-${idx}`} className="h-7 w-7"></span>;
                      }

                      const currentDayStr = `${pickerYear}/${padNum(pickerMonth)}/${padNum(day)}`;
                      const isToday = currentDayStr === realTodayStr;
                      const isActiveFiltered = currentDayStr === filterDate;

                      const dayApps = allBookings.filter(a => a.date === currentDayStr && a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد');
                      const hasAppointments = dayApps.length > 0;

                      let bgClass = "hover:bg-blue-50 text-slate-800";
                      
                      if (hasAppointments) {
                        bgClass = "bg-purple-100 text-purple-900 font-bold border-b-2 border-purple-500 hover:bg-purple-150";
                      }
                      if (isToday) {
                        bgClass = "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold hover:bg-amber-150";
                      }
                      if (isActiveFiltered) {
                        bgClass = "bg-blue-600 text-white font-extrabold hover:bg-blue-700 ring-2 ring-blue-500/20";
                      }

                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={() => {
                            setFilterDate(currentDayStr);
                            setIsCalendarPickerOpen(false);
                          }}
                          className={`h-8 w-8 text-xs rounded-full flex flex-col items-center justify-center relative cursor-pointer font-bold transition-all ${bgClass}`}
                          title={`${getJalaliWeekdayName(currentDayStr)} ${currentDayStr} ${hasAppointments ? `[${dayApps.length} نوبت فعال]` : ''}`}
                        >
                          <span>{day}</span>
                          {hasAppointments && !isActiveFiltered && (
                            <span className="absolute bottom-0.5 h-1 w-1 bg-purple-650 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Close and Go to Today Footer bar */}
                  <div className="flex justify-between items-center border-t border-slate-50 pt-3 text-[10px] font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDate(realTodayStr);
                        setIsCalendarPickerOpen(false);
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                    >
                      ↩ رفتن به امروز ({realTodayStr})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCalendarPickerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      بستن
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* New Compact Integrated Action Trigger and Filters */}
          <button
            onClick={() => {
              if (doctors.length === 0) {
                alert('لطفاً ابتدا اساتید مشاور را در تب پزشکان ثبت کنید.');
                return;
              }
              const defaultDocName = doctors[0]?.name || '';
              setBookingDoctor(defaultDocName);
              setDocSharePct(defaultDocName === 'دکتر علیرضا صدری' ? 80 : 70);
              setRefModel('ارجاع به استاد');
              setBookingShift(shifts[0]?.name || 'صبح');
              handleSubjectChange(subjects[0]?.name || '');
              
              setIsNewPatient(false);
              setNewPatientName('');
              setNewPatientNatId('');
              setNewPatientPhone('');
              setNewPatientGender('مرد');
              setNewPatientType('عادی');
              setSelectedPatientId('');
              setIsFree(true);
              
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg px-2.5 py-1.5 flex items-center gap-1 shadow-sm hover:shadow transition-all justify-center cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>ثبت نوبت جدید</span>
          </button>

          <button
            onClick={() => setIsNotificationCenterOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg px-2.5 py-1.5 flex items-center gap-1 shadow-sm hover:shadow transition-all justify-center cursor-pointer"
            title="سامانه هوشمند اطلاع‌رسانی اساتید و مراجعین"
          >
            <BellRing className="h-3.5 w-3.5 animate-bounce" style={{ animationDuration: '3s' }} />
            <span>اطلاع‌رسانی</span>
          </button>
        </div>

        {/* Quick Filters side on left (shifted up to top panel) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Doctor Filter */}
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">همه اساتید</option>
            {doctors.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Quick Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">همه شیفت‌ها</option>
            {shifts.map(s => (
              <option key={s.id} value={s.name}>{s.name} ({s.time_range})</option>
            ))}
          </select>

          {/* Match Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="فعال">فعال</option>
            <option value="انجام شده">انجام شده</option>
            <option value="کنسل مراجع">کنسل مراجع</option>
            <option value="کنسل استاد">کنسل استاد</option>
          </select>

          {/* Search patient input */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی مراجع، کدملی، استاد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] text-slate-800"
            />
          </div>

        </div>
      </div>

      {/* Appointment lists cards/deck */}
      <div id="appointments-list-container" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>لیست نوبت‌های تاریخ {filterDate}</span>
          </h3>
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
            {filteredAppointments.length} نوبت ثبت شده
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            هیچ نوبتی برای فیلترهای مشخص‌شده در تاریخ فوق یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="p-3 text-[11px]">ساعت</th>
                  <th className="p-3 text-[11px]">وضعیت</th>
                  <th className="p-3 text-[11px]">استاد</th>
                  <th className="p-3 text-[11px]">نام مراجع (جنسیت)</th>
                  <th className="p-3 text-[11px]">همراه / کد ملی</th>
                  <th className="p-3 text-[11px] text-center">جلسه</th>
                  <th className="p-3 text-[11px]">جزئیات مالی</th>
                  <th className="p-3 text-[11px]">پرداختی</th>
                  <th className="p-3 text-[11px]">موضوع</th>
                  <th className="p-3 text-[11px]">نوع</th>
                  <th className="p-3 text-[11px] text-center">تغییر وضعیت</th>
                  <th className="p-3 text-[11px] text-center">عملیات</th>
                  <th className="p-3 text-[11px]">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAppointments.map(app => {
                  let isUnresolvedPast = false;
                  if (app.status === 'فعال') {
                    if (app.date < currentDate) {
                      isUnresolvedPast = true;
                    } else if (app.date === currentDate && app.time < currentTime) {
                      isUnresolvedPast = true;
                    }
                  }

                  let statusColor = 'bg-blue-50 text-blue-700 border border-blue-100';
                  if (isUnresolvedPast) statusColor = 'bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse';
                  else if (app.status === 'فعال') statusColor = 'bg-blue-50 text-blue-700 border border-blue-100';
                  if (app.status === 'انجام شده') statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  if (app.status === 'کنسل مراجع') statusColor = 'bg-orange-50 text-orange-700 border border-orange-100';
                  if (app.status === 'کنسل استاد') statusColor = 'bg-rose-50 text-rose-700 border border-rose-100';

                  // Dynamic session count
                  const sCount = getPatientTotalSessions(app.nat_id);
                  const isWarningEnabled = StorageHelper.getSessionWarningEnabled();
                  
                  let sessionBg = '';
                  if (isWarningEnabled) {
                    if (sCount === 3) sessionBg = 'bg-orange-500 text-white font-bold px-2 py-0.5 rounded-md shadow-sm';
                    else if (sCount > 3) sessionBg = 'bg-red-500 text-white font-bold px-2 py-0.5 rounded-md shadow-sm';
                  }

                  return (
                    <tr 
                      key={app.id} 
                      className={`${isUnresolvedPast ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50/50'} transition-colors selection:bg-blue-100 cursor-context-menu`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          app: app
                        });
                      }}
                    >
                      <td className="p-3 font-mono font-bold text-blue-600">
                        {app.time}
                        {isUnresolvedPast && <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline-block mr-1.5" title="نوبت گذشته است و تعیین تکلیف نشده" />}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`} title={isUnresolvedPast ? "زمان نوبت گذشته است؛ لطفاً تعیین تکلیف کنید" : ""}>
                          {isUnresolvedPast ? 'نامشخص (گذشته)' : app.status}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{app.doctor}</td>
                      <td className="p-3">
                        {app.patient2_name ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 text-[11px]">{app.patient_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium leading-none">
                              همسر: <span className="text-slate-600 font-bold">{app.patient2_name}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="font-bold text-slate-800 text-[11px]">{app.patient_name}</div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">{app.gender} - {app.type}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-slate-700 text-xs font-semibold">{app.phone}</div>
                        <div className="font-mono text-slate-400 text-[10px] mt-0.5">{app.nat_id}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={sessionBg || 'font-mono text-slate-800 font-semibold'}>
                          {sCount}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] leading-tight">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-sans text-[9px]">کل:</span>
                            <span className="text-slate-600 font-medium">{(app.cost || 0).toLocaleString('fa-IR')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-sans text-[9px]">تخفیف:</span>
                            <span className="text-rose-500 font-medium">{(app.discount || 0).toLocaleString('fa-IR')}</span>
                          </div>
                          <div className="border-t border-slate-100 pt-1 mt-1 font-bold text-[11px] text-slate-800">
                            {(app.final_cost || 0).toLocaleString('fa-IR')} <span className="text-[9px] font-sans text-slate-400 font-normal">تومان</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700">{app.payment_status}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{app.payment_method || 'کیف پول'}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{app.subject}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] text-slate-500">{app.ref_type || 'عادی'} / {app.ref_model || 'مرکز'}</span>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStatusChange(app.id, 'فعال')}
                            disabled={app.status === 'فعال'}
                            title="فعال کردن مجدد"
                            className="p-1 hover:bg-blue-50 text-blue-500 rounded disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, 'انجام شده')}
                            disabled={app.status === 'انجام شده'}
                            title="انجام شده"
                            className="p-1 hover:bg-emerald-50 text-emerald-500 rounded disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, 'کنسل مراجع')}
                            disabled={app.status === 'کنسل مراجع'}
                            title="کنسل مراجع"
                            className="p-1 hover:bg-orange-50 text-orange-500 rounded disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, 'کنسل استاد')}
                            disabled={app.status === 'کنسل استاد'}
                            title="کنسل استاد"
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => triggerAppNotificationSms(app, 'booking')}
                            title="ارسال پیامک تایید نوبت"
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setReceiptAppointment(app)}
                            title="چاپ قبض مراجع"
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(app)}
                            title="ویرایش نوبت"
                            className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(app.id)}
                            title="حذف نوبت"
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 max-w-[150px] truncate" title={app.desc}>{app.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Form Dialog Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            dragConstraints={{ left: -400, right: 400, top: -250, bottom: 300 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh] text-right cursor-default"
            dir="rtl"
          >
            {/* Draggable Header with Drag Handle */}
            <div className="drag-handle cursor-move select-none p-4 border-b border-slate-100 bg-blue-50 text-blue-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="text-base">🧘</span>
                <span className="font-extrabold text-sm text-slate-800">رزرو نوبت درمانی جدید کلینیک فاطمی</span>
              </div>

              {/* Dynamic Persian Calendar Controls directly in the Header */}
              <div className="flex items-center gap-1.5 relative" ref={modalCalendarRef}>
                {/* Previous Day */}
                <button
                  type="button"
                  onClick={() => {
                    const prev = addDaysJalali(bookingDate, -1);
                    setBookingDate(prev);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-650 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                  title="روز قبل"
                >
                  ◀ روز قبل
                </button>

                {/* Today */}
                <button
                  type="button"
                  onClick={() => {
                    const today = getCurrentJalaliDate();
                    setBookingDate(today);
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg transition-all cursor-pointer"
                >
                  امروز ({getJalaliWeekdayName(getCurrentJalaliDate())})
                </button>

                {/* Next Day */}
                <button
                  type="button"
                  onClick={() => {
                    const next = addDaysJalali(bookingDate, 1);
                    setBookingDate(next);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-650 rounded-lg transition-all text-[11px] font-bold cursor-pointer"
                  title="روز بعد"
                >
                  روز بعد ▶
                </button>

                {/* Divider line */}
                <span className="w-px h-4 bg-slate-350 mx-1"></span>

                {/* Interactive Modal Calendar Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const { jy, jm } = parseJalali(bookingDate);
                      setModalPickerYear(jy);
                      setModalPickerMonth(jm);
                    } catch {
                      setModalPickerYear(1405);
                      setModalPickerMonth(3);
                    }
                    setIsModalCalendarOpen(!isModalCalendarOpen);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:border-blue-500 hover:text-blue-600 border border-slate-200 rounded-lg text-xs font-black text-slate-800 cursor-pointer shadow-xs transition-all"
                >
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-mono text-xs">{bookingDate}</span>
                </button>

                {/* Popover Panel for Modal Calendar */}
                {isModalCalendarOpen && (() => {
                  const monthsList = [
                    "فروردین", "اردیبهشت", "خرداد",
                    "تیر", "مرداد", "شهریور",
                    "مهر", "آبان", "آذر",
                    "دی", "بهمن", "اسفند"
                  ];

                  const totalDays = getJalaliMonthDaysCount(modalPickerYear, modalPickerMonth);
                  const padNum = (n: number) => n.toString().padStart(2, '0');
                  const firstDayDateStr = `${modalPickerYear}/${padNum(modalPickerMonth)}/01`;
                  const startOffsetIndex = getJalaliWeekdayIndex(firstDayDateStr);

                  const weeksGrid: (number | null)[] = [];
                  for (let i = 0; i < startOffsetIndex; i++) {
                    weeksGrid.push(null);
                  }
                  for (let d = 1; d <= totalDays; d++) {
                    weeksGrid.push(d);
                  }

                  const allBookings = StorageHelper.getAppointments();

                  const prevMonth = () => {
                    if (modalPickerMonth === 1) {
                      setModalPickerMonth(12);
                      setModalPickerYear(prev => prev - 1);
                    } else {
                      setModalPickerMonth(prev => prev - 1);
                    }
                  };

                  const nextMonth = () => {
                    if (modalPickerMonth === 12) {
                      setModalPickerMonth(1);
                      setModalPickerYear(prev => prev + 1);
                    } else {
                      setModalPickerMonth(prev => prev + 1);
                    }
                  };

                  const realTodayStr = getCurrentJalaliDate();

                  return (
                    <div className="absolute left-0 top-full mt-2 z-55 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-72 space-y-4 animate-in fade-in slide-in-from-top-1 text-right" dir="rtl">
                      {/* Controller header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-650 rounded bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                        >
                          ◀
                        </button>
                        <div className="flex items-center gap-1">
                          {/* Month Selector dropdown */}
                          <select
                            value={modalPickerMonth}
                            onChange={(e) => setModalPickerMonth(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {monthsList.map((m, idx) => (
                              <option key={idx + 1} value={idx + 1}>{m}</option>
                            ))}
                          </select>
                          {/* Year Selector dropdown */}
                          <select
                            value={modalPickerYear}
                            onChange={(e) => setModalPickerYear(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                          >
                            {Array.from({ length: 36 }, (_, i) => 1380 + i).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-650 rounded bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                        >
                          ▶
                        </button>
                      </div>

                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
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
                            return <span key={`modal-empty-${idx}`} className="h-6 w-6"></span>;
                          }

                          const currentDayStr = `${modalPickerYear}/${padNum(modalPickerMonth)}/${padNum(day)}`;
                          const isToday = currentDayStr === realTodayStr;
                          const isActiveFiltered = currentDayStr === bookingDate;

                          const dayApps = allBookings.filter(a => a.date === currentDayStr && a.status !== 'کنسل مراجع' && a.status !== 'کنسل استاد');
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
                              key={`modal-day-${day}`}
                              type="button"
                              onClick={() => {
                                setBookingDate(currentDayStr);
                                setIsModalCalendarOpen(false);
                              }}
                              className={`h-7 w-7 text-xs rounded-full flex flex-col items-center justify-center relative cursor-pointer font-bold transition-all ${bgClass}`}
                              title={`${getJalaliWeekdayName(currentDayStr)} ${currentDayStr} ${hasAppointments ? `[${dayApps.length} نوبت فعال]` : ''}`}
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

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:scale-110 text-2xl font-bold cursor-pointer transition-all"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateBooking}
              className="p-5 space-y-5 overflow-y-auto flex-1 text-right md:grid md:grid-cols-2 md:gap-6 md:space-y-0"
              dir="rtl"
            >
              
              {/* Right Column: Unified Patient & Spouse Details */}
              <div className="space-y-5">
                {/* Primary Patient Card */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 relative">
                  <div className="flex items-center gap-1.5 text-xs text-blue-800 font-extrabold pb-1 border-b border-slate-100">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    <span>مشخصات پرونده مراجع اصلی جلسه</span>
                  </div>

                  {/* Space-optimized layout with beautiful compact grid */}
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Name: 2 cols */}
                    <div className="col-span-2 relative">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">نام و خانوادگی مراجع (جستجو خودکار)</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: علی قاسمی"
                        value={newPatientName}
                        onChange={(e) => {
                          setNewPatientName(e.target.value);
                          setShowPatientResults(true);
                          const exactMatch = patients.find(p => p.name.trim() === e.target.value.trim());
                          if (exactMatch) {
                            setNewPatientNatId(exactMatch.nat_id);
                            setNewPatientPhone(exactMatch.phone);
                            setNewPatientGender(exactMatch.gender);
                            setNewPatientType(exactMatch.type);
                            setSelectedPatientId(exactMatch.id.toString());
                          } else {
                            setSelectedPatientId('');
                          }
                        }}
                        onFocus={() => setShowPatientResults(true)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                      />
                      
                      {showPatientResults && newPatientName.trim() && (
                        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {(() => {
                            const q = newPatientName.trim().toLowerCase();
                            const filtered = patients.filter(p => 
                              p.name.toLowerCase().includes(q) || 
                              p.nat_id.includes(q) || 
                              p.phone.includes(q)
                            );
                            if (filtered.length === 0) return null;
                            return filtered.slice(0, 5).map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setNewPatientName(p.name);
                                  setNewPatientNatId(p.nat_id);
                                  setNewPatientPhone(p.phone);
                                  setNewPatientGender(p.gender);
                                  setNewPatientType(p.type);
                                  setSelectedPatientId(p.id.toString());
                                  setShowPatientResults(false);
                                }}
                                className="p-2 text-right hover:bg-slate-55 cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-xs text-slate-800">{p.name} {p.is_blocked === 1 ? '⚠️ [مسدود]' : ''}</span>
                                <span className="text-[10px] text-slate-400 font-mono">کدملی: {p.nat_id}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    {/* National ID: 1 col (Requested: "Should not take full row") */}
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">کد ملی مراجع</label>
                      <input
                        type="text"
                        required
                        placeholder="۱۰ رقم دقیق"
                        value={newPatientNatId}
                        onChange={(e) => {
                          setNewPatientNatId(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Phone: 1 col */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">تلفن همراه</label>
                      <input
                        type="text"
                        required
                        placeholder="09121234567"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Gender: 1 col */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">جنسیت</label>
                      <select
                        value={newPatientGender}
                        onChange={(e) => setNewPatientGender(e.target.value as 'مرد' | 'زن')}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="مرد">مرد</option>
                        <option value="زن">زن</option>
                      </select>
                    </div>

                    {/* Type/Tariff: 1 col */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع پرونده / تعرفه</label>
                      <select
                        value={newPatientType}
                        onChange={(e) => setNewPatientType(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="عادی">عادی</option>
                        <option value="VIP">VIP</option>
                        <option value="بیمه تامین اجتماعی">تامین اجتماعی</option>
                        <option value="بیمه سلامت ایرانیان">سلامت ایرانیان</option>
                        <option value="کارت طلایی مرکز">کارت طلایی</option>
                        <option value="رایگان مرکز">رایگان</option>
                      </select>
                    </div>

                  </div>

                  {/* Duplicate National ID Alert */}
                  {hasNatConflict && matchedPatientByNat && (
                    <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm">⚠️</span>
                      <div className="flex-1">
                        <p className="font-bold text-amber-950">تداخل مراجع: کدملی تکراری</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                          پرونده‌ای با این کد ملی برای مراجع <span className="text-blue-700 font-extrabold">«{matchedPatientByNat.name}»</span> قبلاً ثبت شده است. مراجع جدید نباید از کد ملی تکراری استفاده کند.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPatientName(matchedPatientByNat.name);
                            setNewPatientPhone(matchedPatientByNat.phone);
                            setNewPatientGender(matchedPatientByNat.gender);
                            setNewPatientType(matchedPatientByNat.type);
                            setSelectedPatientId(matchedPatientByNat.id.toString());
                          }}
                          className="mt-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 inline-flex items-center gap-1"
                        >
                          📥 فراخوانی و بارگذاری پرونده {matchedPatientByNat.name}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Phone Number Alert */}
                  {hasPhoneConflict && matchedPatientByPhone && (
                    <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm">📞</span>
                      <div className="flex-1">
                        <p className="font-bold text-amber-950">تداخل مراجع: شماره همراه تکراری</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                          این شماره همراه قبلاً به نام مراجع <span className="text-blue-700 font-extrabold">«{matchedPatientByPhone.name}»</span> در سامانه کلینیک ثبت شده است.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPatientName(matchedPatientByPhone.name);
                            setNewPatientNatId(matchedPatientByPhone.nat_id);
                            setNewPatientGender(matchedPatientByPhone.gender);
                            setNewPatientType(matchedPatientByPhone.type);
                            setSelectedPatientId(matchedPatientByPhone.id.toString());
                          }}
                          className="mt-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 inline-flex items-center gap-1"
                        >
                          📥 فراخوانی و بارگذاری پرونده {matchedPatientByPhone.name}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Spouse/Partner Card (Conditional) */}
                {isCoupleSubject && (
                  <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 space-y-3 relative animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-1.5 text-xs text-purple-900 font-extrabold pb-1 border-b border-purple-100">
                      <UserCheck className="h-4 w-4 text-purple-700" />
                      <span>مشخصات همسر (به علت انتخاب موضوع زوج‌درمانی / خانواده)</span>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-purple-700 mb-1">نام و نام خانوادگی همسر (تایپ جهت جستجو)</label>
                      <input
                        type="text"
                        required
                        placeholder="تایپ کنید... مثال: سمیه رضایی"
                        value={patient2Name}
                        onChange={(e) => {
                          setPatient2Name(e.target.value);
                          setShowSpouseResults(true);
                        }}
                        onFocus={() => setShowSpouseResults(true)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                      />

                      {showSpouseResults && patient2Name.trim() && (
                        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {(() => {
                            const q = patient2Name.trim().toLowerCase();
                            const filtered = patients.filter(p => 
                              p.name.toLowerCase().includes(q) || 
                              p.nat_id.includes(q) || 
                              p.phone.includes(q)
                            );
                            if (filtered.length === 0) return null;
                            return filtered.slice(0, 5).map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setPatient2Name(p.name);
                                  setPatient2NatId(p.nat_id);
                                  setPatient2Phone(p.phone);
                                  setPatient2Gender(p.gender);
                                  setShowSpouseResults(false);
                                }}
                                className="p-2 text-right hover:bg-slate-50 cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-xs text-slate-800">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">کدملی: {p.nat_id} | همراه: {p.phone}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-purple-700 mb-1">کد ملی همسر (۱۰ رقم)</label>
                      <input
                        type="text"
                        required
                        placeholder="1112223334"
                        value={patient2NatId}
                        onChange={(e) => {
                          setPatient2NatId(e.target.value);
                          const exactPatient = patients.find(p => p.nat_id.trim() === e.target.value.trim());
                          if (exactPatient) {
                            setPatient2Name(exactPatient.name);
                            setPatient2Phone(exactPatient.phone);
                            setPatient2Gender(exactPatient.gender);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-purple-700 mb-1">تلفن همراه همسر</label>
                        <input
                          type="text"
                          required
                          placeholder="09198765432"
                          value={patient2Phone}
                          onChange={(e) => setPatient2Phone(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-700 mb-1">جنسیت همسر</label>
                        <select
                          value={patient2Gender}
                          onChange={(e) => setPatient2Gender(e.target.value as 'مرد' | 'زن')}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="مرد">مرد</option>
                          <option value="زن">زن</option>
                        </select>
                      </div>
                    </div>

                    {/* Primary/Spouse National ID Clash */}
                    {patient2NatId.trim() && patient2NatId.trim() === newPatientNatId.trim() && (
                      <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm">❌</span>
                        <div className="flex-1">
                          <p className="font-bold text-red-950">تداخل کدملی مراجع اول و دوم</p>
                          <p className="mt-1 leading-relaxed text-slate-700">
                            کد ملی وارد شده برای همسر با کد ملی مراجع اصلی یکسان است. لطفا کدملی متفاوتی برای همسر وارد کنید.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Primary/Spouse Phone Clash */}
                    {patient2Phone.trim() && patient2Phone.trim() === newPatientPhone.trim() && (
                      <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm">❌</span>
                        <div className="flex-1">
                          <p className="font-bold text-red-950">تداخل شماره همراه مراجع اول و دوم</p>
                          <p className="mt-1 leading-relaxed text-slate-700">
                            شماره همراه وارد شده برای همسر با شماره همراه مراجع اصلی یکسان است. لطفا شماره همراه متفاوتی درج فرمایید.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Duplicate National ID Alert for Spouse */}
                    {hasSpouseNatConflict && matchedSpouseByNat && (
                      <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm">⚠️</span>
                        <div className="flex-1">
                          <p className="font-bold text-amber-950">تداخل مراجع دوم: کدملی تکراری</p>
                          <p className="mt-1 leading-relaxed text-slate-700">
                            پرونده‌ای با این کد ملی مراجع دوم برای مراجع گرامی <span className="text-purple-700 font-extrabold">«{matchedSpouseByNat.name}»</span> قبلاً ثبت شده است. نام وارد شده هم‌خوانی ندارد.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPatient2Name(matchedSpouseByNat.name);
                              setPatient2Phone(matchedSpouseByNat.phone);
                              setPatient2Gender(matchedSpouseByNat.gender);
                            }}
                            className="mt-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 inline-flex items-center gap-1"
                          >
                            📥 فراخوانی و بارگذاری اطلاعات مراجع دوم ({matchedSpouseByNat.name})
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Duplicate Phone Alert for Spouse */}
                    {hasSpousePhoneConflict && matchedSpouseByPhone && (
                      <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm">📞</span>
                        <div className="flex-1">
                          <p className="font-bold text-amber-950">تداخل مراجع دوم: شماره همراه تکراری</p>
                          <p className="mt-1 leading-relaxed text-slate-700">
                            این شماره همراه قبلاً متعلق به پرونده مراجع محترم <span className="text-purple-700 font-extrabold">«{matchedSpouseByPhone.name}»</span> ثبت گردیده است.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPatient2Name(matchedSpouseByPhone.name);
                              setPatient2NatId(matchedSpouseByPhone.nat_id);
                              setPatient2Gender(matchedSpouseByPhone.gender);
                            }}
                            className="mt-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 inline-flex items-center gap-1"
                          >
                            📥 فراخوانی و بارگذاری اطلاعات مراجع دوم ({matchedSpouseByPhone.name})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Left Column: Session Configuration */}
              <div className="space-y-4">
                {/* Set Doctor & Subject */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600">استاد مشاور</label>
                      <label className="flex items-center gap-1 text-[9px] font-bold text-blue-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showAllDoctorsToggle} 
                          onChange={(e) => {
                            setShowAllDoctorsToggle(e.target.checked);
                          }} 
                          className="rounded border-slate-300 text-blue-600 h-3 w-3"
                        />
                        <span>نمایش همه اساتید</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="جستجو نام استاد..."
                        value={doctorSearchQuery}
                        onChange={(e) => {
                          setDoctorSearchQuery(e.target.value);
                          setShowDoctorResults(true);
                        }}
                        onFocus={() => {
                          setShowDoctorResults(true);
                        }}
                        onClick={() => {
                          setShowDoctorResults(prev => !prev);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
                      />
                      
                      <button
                        type="button"
                        onClick={() => setShowDoctorResults(!showDoctorResults)}
                        className="absolute left-2.5 top-3.5 text-slate-400 hover:text-slate-650"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      
                      {showDoctorResults && (
                        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {(() => {
                            const q = doctorSearchQuery.trim().toLowerCase();
                            
                            // Determine who is absent today
                            const absentNames = attendances
                              .filter(att => att.date === filterDate && att.status === 'غایب')
                              .map(att => att.doctor_name);

                            const filtered = doctors.filter(d => {
                              // If query is identical to the current selected doctor, treat as empty search to show ALL doctors!
                              const isDefaultFilled = bookingDoctor && q === bookingDoctor.toLowerCase();
                              const matchesQuery = !q || isDefaultFilled || d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q);
                              if (!matchesQuery) return false;

                              if (!showAllDoctorsToggle) {
                                const worksToday = isDoctorWorkingOnDate(d.working_days, filterDate);
                                const isAbsent = absentNames.includes(d.name);
                                return worksToday && !isAbsent;
                              }
                              return true;
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="p-2 text-center text-xs text-slate-400">
                                  <span>موردی پیدا نشد!</span>
                                </div>
                              );
                            }

                            return filtered.map(d => {
                              const isAbsentToday = absentNames.includes(d.name);
                              return (
                                <div
                                  key={d.id}
                                  onClick={() => {
                                    setBookingDoctor(d.name);
                                    setDoctorSearchQuery(d.name);
                                    setShowDoctorResults(false);
                                    setDocSharePct(d.name === 'دکتر علیرضا صدری' ? 80 : 70);
                                  }}
                                  className="p-2.5 text-right hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                >
                                  <div>
                                    <div className="font-bold text-xs text-slate-800">{d.name}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{d.spec}</div>
                                  </div>
                                  {isAbsentToday && (
                                    <span className="bg-red-50 text-red-600 text-[8px] font-bold py-0.5 px-1.5 rounded">غایب امروز</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">موضوع جلسه</label>
                    <select
                      required
                      value={bookingSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="">-- انتخاب موضوع --</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Set Shift & Time clock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">شیفت کاری</label>
                    <select
                      value={bookingShift}
                      onChange={(e) => setBookingShift(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.time_range})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ساعت دقیق حضور</label>
                    <input
                      type="text"
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-mono text-center focus:outline-none focus:ring-1"
                      placeholder="16:30"
                    />
                    
                    {/* Predefined Hours of Selected Shift Chip selections */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {getShiftPredefinedTimes(bookingShift).map(t => {
                        const isSlotBusy = appointments.some(app => 
                          app.doctor === bookingDoctor && 
                          app.date === bookingDate && 
                          app.time === t && 
                          app.status !== 'کنسل استاد' && 
                          app.status !== 'کنسل مراجع'
                        );

                        let themeClasses = '';
                        if (isSlotBusy) {
                          themeClasses = 'bg-red-500 text-white border-red-500 font-bold hover:bg-red-650';
                          if (bookingTime === t) {
                            themeClasses += ' ring-2 ring-red-400 scale-105 shadow-md';
                          }
                        } else if (bookingTime === t) {
                          themeClasses = 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm ring-1 ring-blue-300 scale-105';
                        } else {
                          themeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold';
                        }

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setBookingTime(t)}
                            title={isSlotBusy ? `${t} (قبلاً رزرو شده)` : `${t} (خالی و باز)`}
                            className={`px-2 py-1 rounded-lg text-[9px] border transition-all cursor-pointer ${themeClasses}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Free Appointment Checkbox */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFreeApp"
                      checked={isFree}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsFree(checked);
                        if (checked) {
                          setBookingCost(0);
                          setBookingDiscount(0);
                        } else {
                          setBookingCost(450000);
                          setBookingDiscount(0);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="isFreeApp" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      🎁 نوبت بدون تمکن مالی / تعریف به صورت کاملاً رایگان
                    </label>
                  </div>
                  <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">
                    تعرفه خیریه
                  </span>
                </div>

                {/* Fees and payment status */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تعرفه پایه (تومان)</label>
                    <NumberInput
                      disabled={isFree}
                      value={bookingCost}
                      onChangeValue={setBookingCost}
                      className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تخفیف کسر (تومان)</label>
                    <NumberInput
                      disabled={isFree}
                      value={bookingDiscount}
                      onChangeValue={setBookingDiscount}
                      className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">مبلغ نهایی پرداخت</label>
                    <div className="bg-slate-100 rounded-lg p-1.5 text-xs text-center font-extrabold text-blue-700 mt-0.5">
                      {isFree ? 'رایگان' : (bookingCost - bookingDiscount).toLocaleString('fa-IR')}
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                {!isFree && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">روش پرداخت و تسویه حساب</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['کارتخوان', 'نقدی', 'کیف پول'].map(method => (
                        <label
                          key={method}
                          className={`border p-2.5 rounded-xl text-center text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                            payMethod === method
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payMethod"
                            value={method}
                            checked={payMethod === method}
                            onChange={() => setPayMethod(method)}
                            className="hidden"
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referral Mode Option */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نوع ارجاع نوبت مراجع</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'ارجاع به استاد', label: 'ارجاع به استاد' },
                      { id: 'ارجاع از استاد', label: 'ارجاع از استاد' }
                    ].map(ref => (
                      <label
                        key={ref.id}
                        className={`border p-2.5 rounded-xl text-center text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          refModel === ref.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="refModel"
                          value={ref.id}
                          checked={refModel === ref.id}
                          onChange={() => setRefModel(ref.id)}
                          className="hidden"
                        />
                        <span>{ref.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Percent Share settings when NOT free */}
                {!isFree && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">تعیین درصد مشارکت (سهم استاد و مرکز)</label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">سهم استاد مشاور (درصد) *</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={docSharePct}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            setDocSharePct(val);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">سهم مرکز مشاوراتی (درصد)</label>
                        <div className="bg-slate-100/50 text-slate-700 rounded-lg p-2 text-xs text-center font-bold mt-0.5 border border-slate-200">
                          {100 - docSharePct} ٪
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">توضیحات و شرح حال اولیه مراجع</label>
                  <textarea
                    value={bookingDesc}
                    onChange={(e) => setBookingDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 h-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ملاحظات و نیازهای مراجع گرامی..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 shadow-md transition-all cursor-pointer"
                  >
                    تایید و صـدور نـوبت
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl py-3 cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptAppointment && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setReceiptAppointment(null)}
        >
          <motion.div
            id="receipt-printable"
            onClick={(e) => e.stopPropagation()}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-slate-800 text-right font-sans relative max-h-[90vh] overflow-y-auto cursor-default"
            dir="rtl"
          >
            <button 
              onClick={() => setReceiptAppointment(null)} 
              className="absolute left-4 top-4 text-slate-300 hover:text-slate-600 text-lg z-10 print:hidden"
            >
              &times;
            </button>
            
            {/* Header */}
            <div className="drag-handle cursor-move select-none text-center pb-4 border-b border-dashed border-slate-200">
              <h5 className="font-extrabold text-sm text-slate-800 pointer-events-none">مرکز مشاوره فاطمی</h5>
              <p className="text-[10px] text-emerald-700 font-bold mt-1 pointer-events-none">(حرم مطهر حضرت معصومه س)</p>
            </div>

            {/* Receipt details */}
            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">شماره قبض:</span>
                <span className="font-mono font-bold">100{receiptAppointment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مـراجع محترم:</span>
                <span className="font-bold">{receiptAppointment.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">کدملی:</span>
                <span className="font-mono">{receiptAppointment.nat_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">استاد مشاور:</span>
                <span className="font-bold text-blue-700">{receiptAppointment.doctor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">موضوع نشست:</span>
                <span>{receiptAppointment.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">تاریخ حضور:</span>
                <span className="font-bold font-mono">{receiptAppointment.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ساعت دقیق حضور:</span>
                <span className="font-bold font-mono text-blue-600">{receiptAppointment.time} ({receiptAppointment.shift})</span>
              </div>
              {receiptAppointment.patient2_name && (
                <div className="flex justify-between bg-purple-50 p-1.5 rounded text-[10px]">
                  <span className="text-purple-600">همراه زوج:</span>
                  <span className="font-bold text-purple-800">{receiptAppointment.patient2_name}</span>
                </div>
              )}
              <div className="border-t border-dashed border-slate-100 my-2 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-500">مجموع پرداختی:</span>
                <span className="text-emerald-600">{receiptAppointment.final_cost.toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>روش تسویه: {receiptAppointment.payment_method}</span>
                <span>وضعیت: {receiptAppointment.payment_status}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-1">
              <p>مراجعه‌کننده گرامی لطفاً ۱۵ دقیقه قبل از زمان مقرر در مرکز حضور داشته باشید.</p>
              <p className="font-bold mt-1 text-slate-500">کـد پیگـیری با مـوفقیت صـادر شد</p>
            </div>

            <button
              onClick={() => {
                exportToPDF('receipt-printable', `رسید_نوبت_${receiptAppointment.id}`);
              }}
              className="mt-5 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 shadow-sm transition-all shadow-inner print:hidden"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>چاپ قبض کاغذی (حرارتی)</span>
            </button>
          </motion.div>
        </div>
      )}
      {/* Floating Right Click Context Menu Overlay */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-transparent" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              setContextMenu(null); 
            }}
          />
          <div 
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 340), 
              left: Math.max(10, contextMenu.x - 245) 
            }}
            className="fixed z-50 bg-white border border-slate-200/80 rounded-2xl shadow-2xl py-1.5 w-60 text-right text-[11px] text-slate-700 animate-in fade-in zoom-in-95 max-h-[300px] overflow-y-auto custom-tab-scroll"
            dir="rtl"
          >
            <div className="px-3.5 py-1.5 border-b border-slate-100 font-bold text-slate-400 text-[10px] bg-slate-50 sticky top-0 z-10 flex items-center justify-between">
              <span>مدیریت نوبت: {contextMenu.app.patient_name}</span>
              <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">{contextMenu.app.time}</span>
            </div>

            <div className="py-1 space-y-0.5">
              {/* 1. First option: Copy notification template to Clipboard (Patient) */}
              <button
                onClick={() => {
                  const app = contextMenu.app;
                  const priceTomans = Math.floor((app.final_cost || 0) / 10);
                  const coupleSuffix = app.patient2_name ? ` و همسر محترمشان ${app.patient2_name}` : '';
                  const msg = `مراجع گرامی جناب آقای/سرکار خانم ${app.patient_name}${coupleSuffix}\n\nسلام علیکم\n\nنوبت مشاوره شما:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📅 تاریخ: ${app.date}\n🕐 ساعت: ${app.time}\n👨‍⚕️ استاد: ${app.doctor}\n📝 موضوع: ${app.subject || '-'}\n💰 مبلغ: ${priceTomans.toLocaleString('fa-IR')} تومان\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔹 لطفاً ۱۵ دقیقه قبل از ساعت مقرر حضور داشته باشید.\n\nبا تشکر\nمرکز مشاوره فاطمی`;
                  navigator.clipboard.writeText(msg);
                  setInfoModal({
                    title: '📢 کپی موفقیت‌آمیز فیش مراجع',
                    message: `فیش نوبت مراجع «${app.patient_name}» به خوبی در کلیپ‌بورد کپی شد.\n\nاکنون می‌توانید با زدن دکمه پیست (Ctrl+V) این متن را در پیام‌رسان‌ها برای مراجع محترم ارسال فرمایید.`,
                    type: 'success'
                  });
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all duration-150"
              >
                <span>📢 اطلاع‌رسانی به مراجع</span>
              </button>

              {/* 2. Second option: Copy notification template to Clipboard (Doctor) */}
              <button
                onClick={() => {
                  const app = contextMenu.app;
                  const coupleSuffix = app.patient2_name ? ` و همسر محترمشان ${app.patient2_name}` : '';
                  const msg = `استاد گرامی جناب آقای/سرکار خانم ${app.doctor}\n\nسلام علیکم\n\nنوبت مشاوره جدید در سامانه ثبت شد:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📅 تاریخ: ${app.date}\n🕐 ساعت: ${app.time}\n👤 مراجع: ${app.patient_name}${coupleSuffix}\n📝 موضوع: ${app.subject || '-'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nبا تشکر\nمرکز مشاوره فاطمی`;
                  navigator.clipboard.writeText(msg);
                  setInfoModal({
                    title: '👨‍🏫 کپی موفقیت‌آمیز فیش استاد',
                    message: `فیش نوبت استاد «${app.doctor}» به خوبی در کلیپ‌بورد کپی شد.\n\nاکنون می‌توانید با زدن دکمه پیست (Ctrl+V) این متن را در پیام‌رسان‌ها برای استاد محترم ارسال فرمایید.`,
                    type: 'success'
                  });
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 border-b border-dashed border-slate-100 pb-2 mb-1 text-right px-3 py-1.5 hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all duration-150"
              >
                <span>👨‍🏫 اطلاع‌رسانی به استاد</span>
              </button>

              {/* Quick Edit */}
              <button
                onClick={() => {
                  handleOpenEditModal(contextMenu.app);
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-amber-50/50 flex items-center gap-2 cursor-pointer font-semibold text-amber-600 rounded-lg transition-all duration-150"
              >
                <span>✏️ ویرایش نوبت</span>
              </button>

              {/* Quick Hard Delete */}
              <button
                onClick={() => {
                  handleDeleteAppointment(contextMenu.app.id);
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold text-rose-600 rounded-lg transition-all duration-150"
              >
                <span>🗑️ حذف نوبت</span>
              </button>

              {/* Quick Print Receipt */}
              <button
                onClick={() => {
                  setReceiptAppointment(contextMenu.app);
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold text-slate-800 rounded-lg transition-all duration-150"
              >
                <span>🖨️ چاپ فیش قبض</span>
              </button>

              {/* Quick Re-activate */}
              <button
                onClick={() => {
                  handleStatusChange(contextMenu.app.id, 'فعال');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-blue-50/40 flex items-center gap-2 cursor-pointer font-semibold text-blue-700 rounded-lg transition-all duration-150"
              >
                <span>🔄 فعال‌سازی مجدد نوبت</span>
              </button>

              {/* Mark completed */}
              <button
                onClick={() => {
                  handleStatusChange(contextMenu.app.id, 'انجام شده');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-emerald-50/40 flex items-center gap-2 cursor-pointer font-semibold text-emerald-700 rounded-lg transition-all duration-150"
              >
                <span>✅ ثبت حضور و انجام</span>
              </button>

              {/* Cancel appointment */}
              <button
                onClick={() => {
                  handleStatusChange(contextMenu.app.id, 'کنسل مراجع');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 border-b border-dashed border-slate-100 pb-2 mb-1 text-right px-3 py-1.5 hover:bg-orange-50/40 flex items-center gap-2 cursor-pointer font-semibold text-orange-600 rounded-lg transition-all duration-150"
              >
                <span>❌ لغو توسط مراجع</span>
              </button>

              {/* Send Confirmation SMS */}
              <button
                onClick={() => {
                  triggerAppNotificationSms(contextMenu.app, 'booking');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold text-slate-800 rounded-lg transition-all duration-150"
              >
                <span>💬 پیامک تأیید رزرو</span>
              </button>

              {/* Send Reminder SMS */}
              <button
                onClick={() => {
                  triggerAppNotificationSms(contextMenu.app, 'reminder');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold text-slate-800 rounded-lg transition-all duration-150"
              >
                <span>💬 پیامک یادآوری جلسه</span>
              </button>

              {/* Send Cancel SMS */}
              <button
                onClick={() => {
                  triggerAppNotificationSms(contextMenu.app, 'cancel');
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold text-rose-600 rounded-lg transition-all duration-150"
              >
                <span>💬 پیامک لغو نوبت</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Appointment Modal Dialogue */}
      {isEditModalOpen && editingAppointment && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsEditModalOpen(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            dragConstraints={{ left: -400, right: 400, top: -250, bottom: 250 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh] text-right cursor-default"
            dir="rtl"
          >
            <div className="drag-handle cursor-move select-none p-5 border-b border-slate-100 bg-amber-50 text-amber-950 flex justify-between items-center">
              <h4 className="font-bold text-xs flex items-center gap-2 pointer-events-none">
                <Edit3 className="h-4.5 w-4.5 text-amber-600 animate-pulse animate-pulse" />
                <span>ویرایش و اصلاح مشخصات نوبت شماره #{editingAppointment.id}</span>
              </h4>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSaveEditAppointment} className="p-6 space-y-6 overflow-y-auto flex-1 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 text-xs">
              {/* Right Column: Patient Identity information */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block border-b border-slate-200 pb-1.5 text-[11px]">👤 مشخصات پرونده مراجع اصلی</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">نام کامل مراجع</label>
                    <input
                      type="text"
                      required
                      value={editAppPatientName}
                      onChange={(e) => setEditAppPatientName(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">کد ملی مراجع</label>
                    <input
                      type="text"
                      required
                      value={editAppNatId}
                      onChange={(e) => setEditAppNatId(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs text-center font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تلفن همراه مراجع</label>
                    <input
                      type="text"
                      required
                      value={editAppPhone}
                      onChange={(e) => setEditAppPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs text-center font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {editingAppointment.patient2_name && (
                  <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-3">
                    <span className="font-bold text-purple-800 block border-b border-purple-200 pb-1.5 text-[11px]">👥 مشخصات همسر همراه</span>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">نام کامل همسر</label>
                      <input
                        type="text"
                        value={editAppPatient2Name}
                        onChange={(e) => setEditAppPatient2Name(e.target.value)}
                        className="w-full bg-white border border-purple-200 p-2.5 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">کد ملی همسر</label>
                      <input
                        type="text"
                        value={editAppPatient2NatId}
                        onChange={(e) => setEditAppPatient2NatId(e.target.value)}
                        className="w-full bg-white border border-purple-200 p-2.5 rounded-xl text-xs text-center font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Left Column: Cost calculations, doctors, date, and status */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block border-b border-slate-200 pb-1.5 text-[11px]">📅 جزئیات زمان و استاد مشاور</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">تاریخ جلسه</label>
                      <input
                        type="text"
                        required
                        value={editAppDate}
                        onChange={(e) => setEditAppDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs text-center font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ساعت دقیق جلسه</label>
                      <input
                        type="text"
                        required
                        value={editAppTime}
                        onChange={(e) => setEditAppTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs text-center font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">استاد روانشناس</label>
                    <select
                      value={editAppDoctor}
                      onChange={(e) => setEditAppDoctor(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-right font-medium focus:outline-none"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">موضوع روانشناسی</label>
                    <select
                      value={editAppSubject}
                      onChange={(e) => setEditAppSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-right font-medium focus:outline-none"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع ارجاع نوبت مراجع</label>
                    <select
                      value={editAppRefModel}
                      onChange={(e) => setEditAppRefModel(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-right font-medium focus:outline-none font-bold text-blue-700"
                    >
                      <option value="ارجاع به استاد">ارجاع به استاد</option>
                      <option value="ارجاع از استاد">ارجاع از استاد</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block border-b border-slate-200 pb-1.5 text-[11px]">💰 امور مالی و روش پرداخت فاکتور</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">مبلغ تعرفه پایه (تومان)</label>
                      <NumberInput
                        required
                        value={editAppCost}
                        onChangeValue={(val) => {
                          setEditAppCost(val);
                          setEditAppFinalCost(val - editAppDiscount);
                        }}
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-center font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">تخفیف مراجع (تومان)</label>
                      <NumberInput
                        required
                        value={editAppDiscount}
                        onChangeValue={(val) => {
                          setEditAppDiscount(val);
                          setEditAppFinalCost(editAppCost - val);
                        }}
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-center font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <span className="font-bold text-blue-900 text-[10px]">مجموع فاکتور با تخفیف:</span>
                    <span className="font-mono font-black text-blue-700 text-xs">{(editAppFinalCost).toLocaleString('fa-IR')} تومان</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">روش تسویه</label>
                      <select
                        value={editAppPaymentMethod}
                        onChange={(e) => setEditAppPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-[10px] text-right font-medium focus:outline-none"
                      >
                        <option value="نقدی">نقدی</option>
                        <option value="کارتخوان">اتصال به کارتخوان صـندوق</option>
                        <option value="بیمه">تحت پوشش بیمه‌ای</option>
                        <option value="فیش بانکی">واریز فیش بانکی (سفارشی)</option>
                        <option value="رایگان حرم">مهمان رایگان حرم مطهر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">وضعیت پرداخت</label>
                      <select
                        value={editAppPaymentStatus}
                        onChange={(e) => setEditAppPaymentStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-[10px] text-right font-medium focus:outline-none"
                      >
                        <option value="تسویه شده">تسویه شده و تسلیم صندوق</option>
                        <option value="بدهکار">بدهکار (موقت)</option>
                        <option value="رایگان">معاف (رایگان)</option>
                      </select>
                    </div>
                  </div>

                  {/* Edit Share Percent settings if NOT free */}
                  {editAppCost > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">تعیین درصد مشارکت (سهم استاد و مرکز)</label>
                      <div className="grid grid-cols-2 gap-3 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">سهم استاد (درصد) *</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editAppDocSharePct}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                              setEditAppDocSharePct(val);
                            }}
                            className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs text-center font-bold text-emerald-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">سهم مرکز (درصد)</label>
                          <div className="bg-white text-slate-700 rounded-lg p-1.5 text-xs text-center font-bold mt-0.5 border border-slate-200">
                            {100 - editAppDocSharePct} ٪
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>بروزرسانی نهایی و اعمال اصلاح فیش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="w-1/3 bg-slate-150 hover:bg-slate-200 text-slate-650 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Render the Notification Center Modal dynamically */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        initialDate={filterDate}
      />

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
                <h4 className="font-extrabold text-slate-800 text-sm">تایید حذف نهایی</h4>
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
                بله، اطمینان دارم
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

      {infoModal && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-teal-100 cursor-pointer" 
          dir="rtl"
          onClick={() => setInfoModal(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-w-md w-full text-right space-y-4 animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                infoModal.type === 'error' ? 'bg-rose-50 text-rose-600' :
                infoModal.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {infoModal.type === 'error' ? (
                  <ShieldAlert className="h-6 w-6 stroke-[2.5]" />
                ) : infoModal.type === 'warning' ? (
                  <RotateCw className="h-6 w-6 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-sm">{infoModal.title}</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed whitespace-pre-line">{infoModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setInfoModal(null)}
                className={`py-2 px-6 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                  infoModal.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  infoModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                  'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Toast Alerts stack */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full font-sans" dir="rtl">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-3.5 text-xs text-right animate-in slide-in-from-left-4 duration-300 relative flex flex-col gap-1.5"
          >
            <div className="flex justify-between items-center bg-slate-800/60 px-2 py-0.5 rounded-md font-bold text-emerald-400">
              <span>سامانه پیامک وب‌سرویس ملی کاوه نگار</span>
              <button onClick={() => setToasts(prev => prev.filter(p => p.id !== t.id))} className="text-slate-400 hover:text-white text-sm">&times;</button>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-200 text-[11px] font-mono">{t.message}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
