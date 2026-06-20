/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shift, Subject } from '../types';
import { StorageHelper } from '../utils/storage';
import { Plus, Trash2, CalendarClock, BookLock, Edit2, Check, X, GripVertical } from 'lucide-react';

interface ShiftsSubjectsTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

export default function ShiftsSubjectsTab({ currentUser, onDataChanged }: ShiftsSubjectsTabProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Shift form fields (Adding)
  const [shiftName, setShiftName] = useState('');
  const [shiftHours, setShiftHours] = useState('');

  // Subject form fields (Adding)
  const [subjectName, setSubjectName] = useState('');
  const [isCouple, setIsCouple] = useState(0);

  // Editing state for Shifts
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShiftName, setEditShiftName] = useState('');
  const [editShiftHours, setEditShiftHours] = useState('');

  // Editing state for Subjects
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectIsCouple, setEditSubjectIsCouple] = useState<number>(0);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedType, setDraggedType] = useState<'shift' | 'subject' | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'shift' | 'subject';
    data: any;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setShifts(StorageHelper.getShifts());
    setSubjects(StorageHelper.getSubjects());
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim() || !shiftHours.trim()) return;

    const list = StorageHelper.getShifts();
    if (list.some(s => s.name === shiftName.trim())) {
      alert('شیفت نامبرده تکراری می‌باشد.');
      return;
    }

    const newShift: Shift = {
      id: list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1,
      name: shiftName.trim(),
      time_range: shiftHours.trim()
    };
    const updated = [...list, newShift];
    StorageHelper.saveShifts(updated);
    setShifts(updated);

    StorageHelper.logActivity(
      currentUser.username,
      'تعریف شیفت کاری',
      `شیفت کاری جدید "${shiftName}" با محدوده زمانی ${shiftHours} ثبت گردید`
    );

    setShiftName('');
    setShiftHours('');
    onDataChanged();
  };

  const handleStartEditShift = (s: Shift) => {
    setEditingShiftId(s.id);
    setEditShiftName(s.name);
    setEditShiftHours(s.time_range);
  };

  const handleSaveEditShift = (id: number) => {
    if (!editShiftName.trim() || !editShiftHours.trim()) {
      alert('لطفاً نام شیفت و ساعت کاری را پر کنید.');
      return;
    }
    const list = StorageHelper.getShifts();
    const updated = list.map(s => {
      if (s.id === id) {
        return {
          ...s,
          name: editShiftName.trim(),
          time_range: editShiftHours.trim()
        };
      }
      return s;
    });
    StorageHelper.saveShifts(updated);
    setShifts(updated);
    setEditingShiftId(null);

    StorageHelper.logActivity(
      currentUser.username,
      'ویرایش شیفت کاری',
      `شیفت کاری به نام "${editShiftName}" ویرایش گردید`
    );
    onDataChanged();
  };

  const handleDeleteShift = (id: number, name: string) => {
    setDeleteConfirm({
      message: `آیا مایل به حذف کامل شیفت کاری "${name}" می‌باشید؟`,
      onConfirm: () => {
        const list = StorageHelper.getShifts();
        const updated = list.filter(s => s.id !== id);
        StorageHelper.saveShifts(updated);
        setShifts(updated);

        StorageHelper.logActivity(
          currentUser.username,
          'حذف شیفت کاری',
          `شیفت کاری "${name}" متوقف و حذف گردید`
        );
        onDataChanged();
      }
    });
  };

  // HTML5 Drag and Drop events
  const handleDragStart = (e: React.DragEvent, index: number, type: 'shift' | 'subject') => {
    setDraggedIndex(index);
    setDraggedType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'shift' | 'subject') => {
    e.preventDefault();
    if (draggedType !== type) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, type: 'shift' | 'subject') => {
    e.preventDefault();
    if (draggedIndex === null || draggedType !== type) return;
    
    if (draggedIndex !== targetIndex) {
      if (type === 'shift') {
        const list = [...shifts];
        const [removed] = list.splice(draggedIndex, 1);
        list.splice(targetIndex, 0, removed);
        StorageHelper.saveShifts(list);
        setShifts(list);
        onDataChanged();
      } else {
        const list = [...subjects];
        const [removed] = list.splice(draggedIndex, 1);
        list.splice(targetIndex, 0, removed);
        StorageHelper.saveSubjects(list);
        setSubjects(list);
        onDataChanged();
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedType(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedType(null);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'secretary') {
      alert('🔒 خطا: کاربران منشی فاقد حق ویرایش موضوعات روانشناسی می‌باشند.');
      return;
    }
    if (!subjectName.trim()) return;

    const list = StorageHelper.getSubjects();
    if (list.some(s => s.name.toLowerCase() === subjectName.trim().toLowerCase())) {
      alert('این موضوع مشاوره روانشناسی قبلاً در سیستم ثبت شده است.');
      return;
    }

    const newSubj: Subject = {
      id: list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1,
      name: subjectName.trim(),
      is_couple: isCouple
    };
    const updated = [...list, newSubj];
    StorageHelper.saveSubjects(updated);
    setSubjects(updated);

    StorageHelper.logActivity(
      currentUser.username,
      'تعریف موضوع مشاوره',
      `موضوع جدید "${subjectName}" با گرایش زوج/خانواده: ${isCouple === 1 ? 'بله' : 'خیر'} ثبت شد`
    );

    setSubjectName('');
    setIsCouple(0);
    onDataChanged();
  };

  const handleStartEditSubject = (s: Subject) => {
    setEditingSubjectId(s.id);
    setEditSubjectName(s.name);
    setEditSubjectIsCouple(s.is_couple);
  };

  const handleSaveEditSubject = (id: number) => {
    if (!editSubjectName.trim()) {
      alert('عنوان موضوع نباید خالی باشد.');
      return;
    }
    const list = StorageHelper.getSubjects();
    const updated = list.map(s => {
      if (s.id === id) {
        return {
          ...s,
          name: editSubjectName.trim(),
          is_couple: editSubjectIsCouple
        };
      }
      return s;
    });
    StorageHelper.saveSubjects(updated);
    setSubjects(updated);
    setEditingSubjectId(null);

    StorageHelper.logActivity(
      currentUser.username,
      'ویرایش موضوع مشاوره',
      `موضوع مشاوره به عنوان "${editSubjectName}" تغییر یافت`
    );
    onDataChanged();
  };

  const handleDeleteSubject = (id: number, name: string) => {
    setDeleteConfirm({
      message: `آیا مایل به حذف کامل موضوع مشاوره "${name}" از بانک اطلاعاتی کلینیک می‌باشید؟`,
      onConfirm: () => {
        const list = StorageHelper.getSubjects();
        const updated = list.filter(s => s.id !== id);
        StorageHelper.saveSubjects(updated);
        setSubjects(updated);

        StorageHelper.logActivity(
          currentUser.username,
          'حذف موضوع مشاوره',
          `موضوع درمانی "${name}" حذف شد`
        );
        onDataChanged();
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center" dir="rtl">
      
      {/* Shifts panel box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 flex flex-col items-center">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center justify-center gap-2 border-b border-slate-50 pb-3 h-10 w-full text-center">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          <span>پیکربندی شیفت‌های نوبت‌دهی اساتید</span>
        </h3>

        {/* Add shift form inline */}
        <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 w-full">
          <input
            type="text"
            required
            placeholder="نام شیفت (مثال: صبح)"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            required
            placeholder="ساعت کاری (08:00 - 13:00)"
            value={shiftHours}
            onChange={(e) => setShiftHours(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg py-2 flex items-center justify-center gap-1 transition-all cursor-pointer w-full"
          >
            <Plus className="h-4 w-4" />
            <span>افزودن شیفت</span>
          </button>
        </form>

        {/* List of shifts with drag handling */}
        <div className="space-y-3 w-full">
          {shifts.map((s, index) => {
            const isEditing = editingShiftId === s.id;
            const isDragging = draggedIndex === index && draggedType === 'shift';
            const isOver = dragOverIndex === index && draggedType === 'shift';

            return (
              <div
                key={s.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, index, 'shift')}
                onDragOver={(e) => handleDragOver(e, index, 'shift')}
                onDrop={(e) => handleDrop(e, index, 'shift')}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    type: 'shift',
                    data: s
                  });
                }}
                className={`border p-4 rounded-xl flex flex-col gap-2 transition-all duration-150 text-center select-none ${
                  isDragging 
                    ? 'opacity-40 border-dashed border-blue-300 bg-blue-50/20 scale-[0.98]' 
                    : isOver 
                      ? 'border-t-2 border-t-blue-500 scale-[1.01] bg-blue-50/10' 
                      : 'border-slate-100 hover:bg-slate-50/50 shadow-xs'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2.5 bg-blue-50/50 p-2.5 rounded-lg border border-blue-150 w-full">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editShiftName}
                        onChange={(e) => setEditShiftName(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-550"
                        placeholder="نام شیفت"
                      />
                      <input
                        type="text"
                        value={editShiftHours}
                        onChange={(e) => setEditShiftHours(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-550"
                        placeholder="08:00 - 13:00"
                      />
                    </div>
                    <div className="flex justify-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleSaveEditShift(s.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <Check className="h-3 w-3" />
                        <span>ذخیره</span>
                      </button>
                      <button
                        onClick={() => setEditingShiftId(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold px-4 py-1.5 rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>انصراف</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs w-full">
                    {/* Grip handle, Title Name, Time Range */}
                    <div className="flex items-center gap-3">
                      <div
                        className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                        title="جهت تغییر ترتیب، این قسمت را بکشید"
                      >
                        <GripVertical className="h-4.5 w-4.5" />
                      </div>
                      
                      {/* Flex layout container isolating BiDi elements */}
                      <div className="flex items-center gap-2" dir="rtl">
                        <span className="font-extrabold text-slate-800 text-[13px]">
                          {s.name}
                        </span>
                        <span className="bg-blue-50 text-blue-700 font-mono text-[10px] py-0.5 px-3 rounded-full font-bold">
                          {s.time_range}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditShift(s)}
                        className="p-1.5 hover:bg-blue-50 text-blue-650 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش شیفت"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteShift(s.id, s.name)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="حذف شیفت"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Counseling study subjects panel box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 flex flex-col items-center">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center justify-center gap-2 border-b border-slate-50 pb-3 h-10 w-full text-center">
          <BookLock className="h-5 w-5 text-purple-500" />
          <span>موضوعات روانشناسی و درمانی برای مراجعین</span>
        </h3>

        {/* Add subject form inline */}
        {currentUser.role !== 'secretary' && (
          <form onSubmit={handleAddSubject} className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 w-full text-center flex flex-col items-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              <input
                type="text"
                required
                placeholder="عنوان گرایش (مثال: زوج‌درمانی)"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full text-center sm:col-span-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg py-2.5 flex items-center justify-center gap-1 transition-all cursor-pointer w-full"
              >
                <Plus className="h-4 w-4" />
                <span>افزودن گرایش</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 p-1">
              <input
                type="checkbox"
                id="coupleCheck"
                checked={isCouple === 1}
                onChange={(e) => setIsCouple(e.target.checked ? 1 : 0)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="coupleCheck" className="cursor-pointer font-medium text-[10px]">نیاز به ثبت اطلاعات همسر یا همراه ثانویه (مشاوره زوج/خانواده)</label>
            </div>
          </form>
        )}

        {/* List of subjects with drag handling */}
        <div className="space-y-3 w-full">
          {subjects.map((sub, index) => {
            const isEditing = editingSubjectId === sub.id;
            const isDragging = draggedIndex === index && draggedType === 'subject';
            const isOver = dragOverIndex === index && draggedType === 'subject';

            return (
              <div
                key={sub.id}
                draggable={currentUser.role !== 'secretary' && !isEditing}
                onDragStart={(e) => handleDragStart(e, index, 'subject')}
                onDragOver={(e) => handleDragOver(e, index, 'subject')}
                onDrop={(e) => handleDrop(e, index, 'subject')}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    type: 'subject',
                    data: sub
                  });
                }}
                className={`border p-4 rounded-xl flex flex-col gap-2 transition-all duration-150 text-center select-none ${
                  isDragging 
                    ? 'opacity-40 border-dashed border-purple-300 bg-purple-50/20 scale-[0.98]' 
                    : isOver 
                      ? 'border-t-2 border-t-purple-500 scale-[1.01] bg-purple-50/10' 
                      : 'border-slate-100 hover:bg-slate-50/50 shadow-xs'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2.5 bg-purple-50/50 p-2.5 rounded-lg border border-purple-150 w-full">
                    <input
                      type="text"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2"
                      style={{ padding: '8px 12px', fontSize: '12px', textAlign: 'center' }}
                      placeholder="عنوان گرایش"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600 p-1">
                      <input
                        type="checkbox"
                        id={`editCoupleCheck-${sub.id}`}
                        checked={editSubjectIsCouple === 1}
                        onChange={(e) => setEditSubjectIsCouple(e.target.checked ? 1 : 0)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <label htmlFor={`editCoupleCheck-${sub.id}`} className="cursor-pointer text-[10px] font-bold">مشاوره خانواده یا زوج‌درمانی (نیاز به اطلاعات همسر)</label>
                    </div>
                    <div className="flex justify-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleSaveEditSubject(sub.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Check className="h-3 w-3" />
                        <span>ذخیره</span>
                      </button>
                      <button
                        onClick={() => setEditingSubjectId(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold px-4 py-1.5 rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>انصراف</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs w-full">
                    {/* Grip handle, Title, Custom Couple badge */}
                    <div className="flex items-center gap-3">
                      {currentUser.role !== 'secretary' && (
                        <div
                          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                          title="جهت تغییر ترتیب، این قسمت را بکشید"
                        >
                          <GripVertical className="h-4.5 w-4.5" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-right" dir="rtl">
                        <span className="font-extrabold text-slate-800 text-[13px] leading-relaxed">
                          {sub.name}
                        </span>
                        {sub.is_couple === 1 && (
                          <span className="bg-purple-50 text-purple-700 text-[9px] py-0.5 px-3 rounded-md font-bold whitespace-nowrap">
                            زوج / خانواده
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {currentUser.role !== 'secretary' && (
                        <button
                          onClick={() => handleStartEditSubject(sub)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="ویرایش موضوع"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      {currentUser.role !== 'secretary' && (
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="حذف موضوع"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer" 
          dir="rtl"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl max-w-sm w-full text-center space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="bg-red-50 p-2 text-red-600 rounded-xl">
                <Trash2 className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1 text-right">
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

      {/* Floating Right Click Context Menu Overlay */}
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
              top: Math.min(contextMenu.y, window.innerHeight - 150), 
              left: Math.max(10, contextMenu.x - 180) 
            }}
            className="fixed z-50 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 w-44 text-right text-xs text-slate-700 animate-in fade-in zoom-in-95"
            dir="rtl"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-400 text-[10px] bg-slate-50">
              {contextMenu.type === 'shift' ? `مدیریت نوبت: ${contextMenu.data.name}` : `مدیریت گرایش: ${contextMenu.data.name}`}
            </div>
            <div className="py-0.5 space-y-0.5">
              <button
                onClick={() => {
                  if (contextMenu.type === 'shift') {
                    handleStartEditShift(contextMenu.data);
                  } else {
                    handleStartEditSubject(contextMenu.data);
                  }
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-blue-50 text-blue-600 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>ویرایش اطلاعات</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.type === 'shift') {
                    handleDeleteShift(contextMenu.data.id, contextMenu.data.name);
                  } else {
                    handleDeleteSubject(contextMenu.data.id, contextMenu.data.name);
                  }
                  setContextMenu(null);
                }}
                className="w-[calc(100%-12px)] mx-1.5 text-right px-2.5 py-1.5 hover:bg-red-50 text-red-600 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف از سیستم</span>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
