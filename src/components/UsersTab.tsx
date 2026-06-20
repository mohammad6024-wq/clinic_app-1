/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { StorageHelper } from '../utils/storage';
import { Plus, Edit3, Trash2, KeyRound, ShieldAlert, UserPlus, Users2 } from 'lucide-react';

interface UsersTabProps {
  currentUser: { username: string; role: string };
  onDataChanged: () => void;
}

export default function UsersTab({ currentUser, onDataChanged }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  
  // User form modal fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [natIdInput, setNatIdInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'secretary' | 'supervisor'>('secretary');
  const [genderInput, setGenderInput] = useState('زن');
  const [descInput, setDescInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(StorageHelper.getUsers());
  };

  const handleOpenAddModal = () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'supervisor') {
      alert('🔒 دسترسی غیرمجاز: تنها مدیران و سوپروایزرهای سامانه امکان تعریف کاربر جدید دارند.');
      return;
    }
    setEditingUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setFullNameInput('');
    setPhoneInput('');
    setNatIdInput('');
    setRoleInput('secretary');
    setGenderInput('زن');
    setDescInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'supervisor') {
      alert('🔒 دسترسی غیرمجاز: تنها مدیران سیستم حق اصلاح حساب کاربران دارا می‌باشند.');
      return;
    }
    setEditingUser(user);
    setUsernameInput(user.username);
    setPasswordInput(''); // Leave blank to keep existing password
    setFullNameInput(user.name);
    setPhoneInput(user.phone);
    setNatIdInput(user.nat_id);
    setRoleInput(user.role);
    setGenderInput(user.gender);
    setDescInput(user.desc || '');
    setIsModalOpen(true);
  };

  const handleDeleteUser = (id: number, uName: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      alert('🔒 دسترسی غیرمجاز: حذف یا تعلیق کامل حساب کاربران تنها از عهده مدیر کل برمی‌آید.');
      return;
    }
    if (uName === 'admin') {
      alert('خطا: حساب کاربری مدیر اصلی (admin) غیر قابل حذف می‌باشد.');
      return;
    }
    if (uName === currentUser.username) {
      alert('خطا: شما نمی‌توانید حساب جاری خودتان را حذف کنید!');
      return;
    }

    setDeleteConfirm({
      message: `آیا مطمئن هستید که می‌خواهید حساب کاربری "${uName}" را مسدود و غیرفعال کنید؟`,
      onConfirm: () => {
        const list = StorageHelper.getUsers();
        // In Python, users are marked is_active = 0 instead of hard deleted. Let's do the exact same!
        const updated = list.map(u => {
          if (u.id === id) {
            return { ...u, is_active: 0 };
          }
          return u;
        });
        StorageHelper.saveUsers(updated);
        setUsers(updated.filter(u => u.is_active === 1));

        StorageHelper.logActivity(
          currentUser.username,
          'تعلیق حساب کاربر',
          `حساب پرسنلی مجمع کاربر "${uName}" تعلیق و مسدود گردید`
        );
        onDataChanged();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!usernameInput.trim() || !fullNameInput.trim() || !natIdInput.trim()) {
      alert('لطفاً نام کاربری، نام کامل و کدملی را پر نمایید.');
      return;
    }

    const list = StorageHelper.getUsers();

    if (editingUser) {
      // Edit
      const updated = list.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            username: usernameInput.trim().toLowerCase(),
            name: fullNameInput.trim(),
            phone: phoneInput.trim(),
            nat_id: natIdInput.trim(),
            role: roleInput,
            gender: genderInput,
            desc: descInput.trim(),
            password: passwordInput ? passwordInput.trim() : u.password
          };
        }
        return u;
      });
      StorageHelper.saveUsers(updated);
      setUsers(updated.filter(u => u.is_active === 1));

      StorageHelper.logActivity(
        currentUser.username,
        'اصلاح حساب کاربری پرسنل',
        `تغییرات پروفایلی بر حساب کاربر ${usernameInput} با موفقیت اعمال گردید`
      );
    } else {
      // Add
      if (list.some(u => u.username.toLowerCase() === usernameInput.trim().toLowerCase() && u.is_active === 1)) {
        alert('این نام کاربری از قبل برای کاربر فعال دیگری وجود دارد و تکراری است.');
        return;
      }
      const newU: User = {
        id: list.length > 0 ? Math.max(...list.map(u => u.id)) + 1 : 1,
        username: usernameInput.trim().toLowerCase(),
        password: passwordInput.trim() || '123',
        name: fullNameInput.trim(),
        role: roleInput,
        phone: phoneInput.trim(),
        nat_id: natIdInput.trim(),
        gender: genderInput,
        desc: descInput.trim(),
        created_at: new Date().toLocaleDateString('fa-IR'),
        is_active: 1
      };
      const updated = [...list, newU];
      StorageHelper.saveUsers(updated);
      setUsers(updated.filter(u => u.is_active === 1));

      StorageHelper.logActivity(
        currentUser.username,
        'ایجاد حساب کاربری پرسنل',
        `حساب پرسنلی جدید برای مراجع به کاربر "${usernameInput}" با عنوان ${roleInput} ثبت شد`
      );
    }

    setIsModalOpen(false);
    onDataChanged();
    loadUsers();
  };

  // Filter listed active staff users
  const activeUsers = users.filter(u => u.is_active === 1);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Control row */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <Users2 className="h-5 w-5 text-blue-500" />
          <span>لیست پرسنل اداری و کادر رزرویشن مرکز مشاوره فاطمی</span>
        </h3>

        {currentUser.role !== 'secretary' && (
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-3 flex items-center gap-1.5 shadow-sm hover:shadow transition-all w-full sm:w-auto justify-center animate-pulse"
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>تعریف حساب کاربری جدید پرسنل</span>
          </button>
        )}
      </div>

      {/* Main Grid display mapping profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeUsers.map(u => {
          let roleBadgeStyle = 'bg-slate-150 text-slate-700';
          let roleLabel = 'منشی رزرویشن';
          if (u.role === 'admin') {
            roleBadgeStyle = 'bg-red-50 text-red-700 border border-red-100 font-extrabold';
            roleLabel = 'مدیر سیستم کلان';
          }
          if (u.role === 'supervisor') {
            roleBadgeStyle = 'bg-purple-50 text-purple-700 border border-purple-100 font-extrabold';
            roleLabel = 'مدیر کلینیک';
          }

          return (
            <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-200 transition-colors">
              
              {/* Header profile row */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 text-xl font-bold bg-slate-50 text-slate-800 rounded-full flex items-center justify-center shadow-inner">
                      👤
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{u.name}</span>
                        <span className="text-blue-600 bg-blue-50 text-[9px] px-1.5 py-0.5 rounded-md font-mono">#{u.id}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">نام کاربری: {u.username}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] ${roleBadgeStyle}`}>
                    {roleLabel}
                  </span>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium space-y-1.5">
                  <p className="text-slate-700">{u.desc || 'توضیحات پرسنلی ضمیمه حساب نگردیده است.'}</p>
                  <div className="pt-2 border-t border-slate-100/70 grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                    <div>🪪 کدملی: <span className="text-slate-600 font-bold">{u.nat_id || 'ثبت نشده'}</span></div>
                    <div>📞 همراه: <span className="text-slate-600 font-bold font-sans">{u.phone || 'ثبت نشده'}</span></div>
                  </div>
                </div>
              </div>

              {/* Actions row contact info */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-50 flex justify-between items-center text-xs">
                <div className="text-[10px] text-slate-400">
                  <span>تعریف: {u.created_at || '1405/01/01'}</span>
                </div>

                {currentUser.role !== 'secretary' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="p-1.5 bg-white border border-slate-250 text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                      title="اصلاح حساب"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    {u.username !== 'admin' && u.username !== currentUser.username && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 bg-white border border-slate-250 text-slate-500 hover:text-red-650 hover:border-red-100 rounded-lg transition-all"
                        title="تعلیق حساب پرسنل"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* User Edit/Add modal dialogue */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden text-right cursor-default" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <KeyRound className="h-4.5 w-4.5" />
                <span>{editingUser ? `اصلاح مشخصات کارفرما: ${editingUser.name}` : 'تعریف پرسنل اداری حساب کاربر جدید'}</span>
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {/* Username & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نام کاربری ورود</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:outline-none"
                    placeholder="reception2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نقش دسترسی</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  >
                    <option value="secretary">منشی رزرویشن</option>
                    <option value="supervisor">مدیر کلینیک</option>
                    <option value="admin">مدیر ارشد سیستم</option>
                  </select>
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {editingUser ? 'گذرواژه ورود (خالی بذارید تا قبلی حفظ شود)' : 'گذرواژه اصلی ورود'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center text-xs"
                  placeholder="گذرواژه ایمن را درج نمایید"
                />
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نام کامل پرسنل</label>
                  <input
                    type="text"
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                    placeholder="سارا صبوری"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد ملی</label>
                  <input
                    type="text"
                    required
                    value={natIdInput}
                    onChange={(e) => setNatIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0012345678"
                  />
                </div>
              </div>

              {/* Phone & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تلفن همراه</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0912"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">جنسیت</label>
                  <select
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="زن">زن</option>
                    <option value="مرد">مرد</option>
                  </select>
                </div>
              </div>

              {/* Desc notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">یادداشت پرسنلی یادگیر</label>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs h-16 focus:outline-none"
                  placeholder="منشی شیفت عصر، مربی مهارتهای فردی..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 shadow-md"
                >
                  ثبت کلی حساب کارفرما
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs py-3"
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
              <div className="bg-amber-50 p-2 text-amber-60 stroke-[3.5] rounded-xl">
                <Trash2 className="h-6 w-6 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-sm">تایید نهایی تغییر وضعیت</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{deleteConfirm.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl px-4 py-2 flex-1 cursor-pointer"
              >
                بله، معلق و مسدود شود
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
