/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { StorageHelper } from '../utils/storage';
import { Plus, Edit3, Trash2, Search, UserCheck, ShieldAlert } from 'lucide-react';

interface DoctorsTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
            .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
}

export default function DoctorsTab({ currentUser, onDataChanged }: DoctorsTabProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Doctor form modal fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docGender, setDocGender] = useState('زن');
  const [docNatId, setDocNatId] = useState('');
  const [docImage, setDocImage] = useState<string | undefined>(undefined);
  
  const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  const [selectedDays, setSelectedDays] = useState<string[]>(WEEKDAYS);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = () => {
    setDoctors(StorageHelper.getDoctors());
  };

  const handleOpenAddModal = () => {
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی ثبت یا تغییر اطلاعات اساتید می‌باشد.');
      return;
    }
    setEditingDoctor(null);
    setDocName('');
    setDocSpec('');
    setDocPhone('');
    setDocDesc('');
    setDocGender('زن');
    setDocNatId('');
    setDocImage(undefined);
    setSelectedDays(WEEKDAYS);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doctor: Doctor) => {
    if (currentUser.role === 'secretary') {
      alert('🔒 دسترسی فرعی: منشی کلینیک فاقد حق دسترسی ثبت یا تغییر اطلاعات اساتید می‌باشد.');
      return;
    }
    setEditingDoctor(doctor);
    setDocName(doctor.name);
    setDocSpec(doctor.spec);
    setDocPhone(doctor.phone);
    setDocDesc(doctor.desc || '');
    setDocGender(doctor.gender);
    setDocNatId(doctor.nat_id || '');
    setDocImage(doctor.image);
    
    if (!doctor.working_days || doctor.working_days === 'همه روزه') {
      setSelectedDays(WEEKDAYS);
    } else {
      setSelectedDays(doctor.working_days.split(',').map(s => s.trim()));
    }
    
    setIsModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteDoctor = (id: number, name: string) => {
    setDeleteConfirm({
      message: `⚠️ هشدار: آیا مطمئن هستید که می‌خواهید مشخصات استاد "${name}" را به طور کامل از بانک اطلاعاتی کلینیک حذف کنید؟`,
      onConfirm: () => {
        const list = StorageHelper.getDoctors();
        const updated = list.filter(d => d.id !== id);
        StorageHelper.saveDoctors(updated);
        setDoctors(updated);
        
        StorageHelper.logActivity(
          currentUser.username,
          'حذف پزشک/استاد',
          `پروفایل استاد ${name} با موفقیت توسط مدیریت حذف شد`
        );
        onDataChanged();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = toEnglishDigits(docPhone.trim().replace(/[-\s]/g, ''));
    const cleanNatId = toEnglishDigits(docNatId.trim().replace(/[-\s]/g, ''));

    if (!docName.trim() || !docSpec.trim() || !cleanPhone || !cleanNatId) {
      alert('لطفاً فیلدهای الزامی نام، کدملی و تلفن همراه را پر کنید.');
      return;
    }

    // Phone validation
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      alert('⚠️ شماره همراه نامعتبر است: شماره تلفن همراه استاد باید دقیقاً ۱۱ رقم بوده و با ۰ شروع شود (به عنوان مثال: 09121234567).');
      return;
    }

    // National ID validation
    const natIdRegex = /^\d{10}$/;
    if (!natIdRegex.test(cleanNatId)) {
      alert('⚠️ کدملی نامعتبر است: کد ملی استاد باید دقیقاً ۱۰ رقم عددی باشد.');
      return;
    }

    const list = StorageHelper.getDoctors();

    // Check duplicate National ID
    const isDuplicateNatId = list.some(d => d.nat_id === cleanNatId && d.id !== (editingDoctor?.id || -1));
    if (isDuplicateNatId) {
      alert('⚠️ خطا: این کد ملی قبلاً برای استاد دیگری ثبت شده است.');
      return;
    }

    // Determine working days string
    let finalWorkingDays = 'همه روزه';
    if (selectedDays.length === 0) {
      alert('لطفاً حداقل یک روز پذیرش نوبت انتخاب کنید.');
      return;
    } else if (selectedDays.length === 7) {
      finalWorkingDays = 'همه روزه';
    } else {
      // Sort days in the order of WEEKDAYS so they look nice
      const sortedDays = WEEKDAYS.filter(d => selectedDays.includes(d));
      finalWorkingDays = sortedDays.join(', ');
    }

    if (editingDoctor) {
      // Edit
      const updated = list.map(d => {
        if (d.id === editingDoctor.id) {
          return {
            ...d,
            name: docName.trim(),
            spec: docSpec.trim(),
            phone: cleanPhone,
            nat_id: cleanNatId,
            desc: docDesc.trim(),
            working_days: finalWorkingDays,
            gender: docGender,
            image: docImage
          };
        }
        return d;
      });
      StorageHelper.saveDoctors(updated);
      setDoctors(updated);
      StorageHelper.logActivity(
        currentUser.username,
        'ویرایش استاد',
        `اطلاعات پروفایل پزشک/استاد ${docName} با موفقیت به روز رسانی شد`
      );
    } else {
      // Add
      const newDoc: Doctor = {
        id: list.length > 0 ? Math.max(...list.map(d => d.id)) + 1 : 1,
        name: docName.trim(),
        spec: docSpec.trim(),
        phone: cleanPhone,
        nat_id: cleanNatId,
        desc: docDesc.trim(),
        working_days: finalWorkingDays,
        gender: docGender,
        image: docImage
      };
      const updated = [...list, newDoc];
      StorageHelper.saveDoctors(updated);
      setDoctors(updated);
      StorageHelper.logActivity(
        currentUser.username,
        'ثبت پزشک/استاد',
        `استاد جدید دکتر ${docName} با تخصص ${docSpec} با موفقیت تعریف گردید`
      );
    }

    setIsModalOpen(false);
    onDataChanged();
  };

  // Filter doctors based on search
  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.spec.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Control row with search bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی اساتید بر اساس نام یا تخصص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
          />
        </div>

        {/* Add Doctor button */}
        {currentUser.role !== 'secretary' && (
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-3 flex items-center gap-1.5 shadow-sm hover:shadow transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            <span>ثبت و عضویت استاد جدید</span>
          </button>
        )}
      </div>

      {/* Grid listing card portfolios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            هیچ روانشناس یا مشاور مشابه‌ای در سیستم پیدا نشد.
          </div>
        ) : (
          filteredDoctors.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              
              {/* Header profile row */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {doc.image ? (
                      <img src={doc.image} alt={doc.name} className="h-11 w-11 rounded-full object-cover border border-blue-100 shadow-sm" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center text-lg shadow-inner">
                        {doc.gender === 'مرد' ? '👨' : '👩'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{doc.spec}</p>
                      {doc.nat_id && (
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">کد ملی: {doc.nat_id}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Readonly Badge indicator */}
                  <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold max-w-[120px] truncate" title={doc.working_days}>
                    {doc.working_days}
                  </span>
                </div>

                <div className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {doc.desc || 'توضیحات و شرح حال تخصص درج نشده است.'}
                </div>
              </div>

              {/* Footer contact or actions */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-50 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">تلفن همراه:</span>{' '}
                  <span className="font-mono text-slate-700 font-bold">{doc.phone}</span>
                </div>

                {currentUser.role !== 'secretary' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-colors"
                      title="ویرایش اطلاعات"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors"
                      title="حذف استاد"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Edit/Add Doctor Dialog Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <UserCheck className="h-4.5 w-4.5" />
                <span>{editingDoctor ? `اصلاح اطلاعات پروفایل ${editingDoctor.name}` : 'ثبت نام و عضویت استاد جدید'}</span>
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Doctor Name & National ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">نام و نام خانوادگی استاد *</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="مثال: دکتر مهران علوی"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">کد ملی استاد *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={docNatId}
                    onChange={(e) => setDocNatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                    placeholder="XXXXXXXXXX"
                  />
                </div>
              </div>

              {/* Specialty & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">تخصص پزشک/روانشناس *</label>
                  <input
                    type="text"
                    required
                    value={docSpec}
                    onChange={(e) => setDocSpec(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="امور زناشویی، بالینی کودک..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">شماره تلفن همراه *</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                    placeholder="09121234567"
                  />
                </div>
              </div>

              {/* Gender & Photo Upload */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">جنسیت *</label>
                  <select
                    value={docGender}
                    onChange={(e) => setDocGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="زن">زن</option>
                    <option value="مرد">مرد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">تصویر پرسنلی استاد</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="upload-doc-photo"
                    />
                    <label
                      htmlFor="upload-doc-photo"
                      className="cursor-pointer bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold text-[10px] px-3 py-2.5 rounded-xl border border-dashed border-slate-350 flex-1 text-center truncate"
                    >
                      {docImage ? 'تغییر عکس پرسنلی' : 'انتخاب فایل تصویر'}
                    </label>
                    {docImage && (
                      <button
                        type="button"
                        onClick={() => setDocImage(undefined)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors cursor-pointer"
                        title="حذف عکس"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {docImage && (
                <div className="flex justify-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="relative">
                    <img src={docImage} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-blue-500" referrerPolicy="no-referrer" />
                    <span className="absolute -bottom-1 -right-2 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold">پیش‌نمایش</span>
                  </div>
                </div>
              )}

              {/* Working days week checklist */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">روزهای پذیرش نوبت استاد *</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedDays.length === 7) {
                        setSelectedDays([]);
                      } else {
                        setSelectedDays(WEEKDAYS);
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-850 font-bold cursor-pointer"
                  >
                    {selectedDays.length === 7 ? 'حذف کلیه تیک‌ها' : 'انتخاب همه (همه روزه)'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {WEEKDAYS.map(day => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <label key={day} className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedDays(prev => prev.filter(d => d !== day));
                            } else {
                              setSelectedDays(prev => [...prev, day]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[10px] font-extrabold text-slate-700">{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specialty details description */}
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">شرح حال و رزومه کوتاه استاد</label>
                <textarea
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="مدارک بین‌المللی، گرایش CBT، طرح‌واره‌درمانی..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 shadow-md cursor-pointer"
                >
                  {editingDoctor ? 'اعمال اصلاحات' : 'تایید عضویت جدید'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl py-3 cursor-pointer"
                >
                  انصراف
                </button>
              </div>

            </form>
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
                className="bg-red-650 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl px-4 py-2 flex-1 cursor-pointer"
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

    </div>
  );
}
