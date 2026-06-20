/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActivityLog, User } from '../types';
import { StorageHelper } from '../utils/storage';
import { CalendarRange, Search, Filter, ShieldAlert, Trash2, CheckCircle, FileSpreadsheet, UserCheck, ShieldCheck, Activity } from 'lucide-react';

export default function LogsTab({ currentUser }: { currentUser?: User }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    // Load fresh logs from storage
    setLogs(StorageHelper.getActivityLogs());
  }, []);

  const handleClearLogs = () => {
    setDeleteConfirm({
      message: '⚠️ هشدار فوق امنیتی: پاکسازی کامل آرشیو ممیزی غیرقابل بازگشت است. آیا از حدف دائم تمامی گزارشهای فعالیت و ردپای سیستمی اطمینان نهایی دارید؟',
      onConfirm: () => {
        // Clear local logs
        StorageHelper.saveActivityLogs([]);
        setLogs([]);
        
        // Audit log the deletion action itself as the first subsequent log!
        if (currentUser) {
          StorageHelper.logActivity(
            currentUser.username,
            'پاکسازی ممیزی',
            'آرشیو کامل تاریخچه فعالیت‌ها توسط راهبر ارشد سیستم خالی و پاکسازی گردید.'
          );
          setLogs(StorageHelper.getActivityLogs());
        }
      }
    });
  };

  // Unique actions for filters
  const uniqueActionTypes = Array.from(new Set(logs.map(lg => lg?.action_type).filter(Boolean)));
  // Unique operators for filters
  const uniqueOperators = Array.from(new Set(logs.map(lg => lg?.username).filter(Boolean)));

  // Filter logs based on search query or category
  const filteredLogs = logs.filter(lg => {
    if (filterActionType && lg.action_type !== filterActionType) return false;
    if (filterOperator && lg.username !== filterOperator) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        lg.id.toString().includes(q) ||
        (lg.username || '').toLowerCase().includes(q) ||
        (lg.action_type || '').toLowerCase().includes(q) ||
        (lg.description || '').toLowerCase().includes(q) ||
        (lg.timestamp || '').includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Visual Analytics Hub widgets for Operations Audit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Logs Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">کل عملیات ثبت شده</span>
            <span className="text-xl font-black text-slate-800 font-mono">{logs.length} رکورد</span>
          </div>
          <div className="bg-blue-50 p-2.5 text-blue-600 rounded-2xl">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* Unique Operators Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">تعداد کاربران فعال سیستم</span>
            <span className="text-xl font-black text-slate-800 font-mono">{uniqueOperators.length} اپراتور</span>
          </div>
          <div className="bg-amber-50 p-2.5 text-amber-600 rounded-2xl">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        {/* System Integrity Rating Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">سطح پایش امنیتی</span>
            <span className="text-[13px] font-black text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> فعال و رمزنگاری‌شده
            </span>
          </div>
          <div className="bg-emerald-50 p-2.5 text-emerald-600 rounded-2xl">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Clear logs controller */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full">
            <span className="text-[10px] text-slate-400 font-bold block">مدیریت هارددیسک و حافظه</span>
            {currentUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={handleClearLogs}
                className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>حذف دائم تاریخچه عملیات</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">فقط دسترسی راهبر ارشد</span>
            )}
          </div>
        </div>

      </div>

      {/* Audit filtration bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          
          {/* Action Type Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">دسته‌بندی موضوعی</label>
            <select
              value={filterActionType}
              onChange={(e) => setFilterActionType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              <option value="">همه فعالیت‌ها</option>
              {uniqueActionTypes.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Operator Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">نام کاربری اپراتور</label>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              <option value="">همه اپراتورها</option>
              {uniqueOperators.map((op) => (
                <option key={op} value={op}>@{op}</option>
              ))}
            </select>
          </div>

          {/* Complex Free Searching */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">جستجو در متن جزئیات، آیدی و تاریخ</label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="مثال: نوبت، نام مراجع، شناسه نوبت، حذف، ویرایش..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main system logs reporting and auditing table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
            <FileSpreadsheet className="h-4.5 w-4.5 text-blue-500" />
            <span>گزارشات ممیزی تفصیلی و ریز رویدادهای سیستم کلینیک</span>
          </h4>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
            نمایش {filteredLogs.length} از {logs.length} رویداد
          </span>
        </div>
        
        {filteredLogs.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-12">هیچ گزارش یا ممیزی با فیلترهای کنونی پیدا نگردید.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs divide-y divide-slate-100">
              <thead>
                <tr className="text-slate-400 font-extrabold text-[11px] bg-slate-50/50">
                  <th className="p-3 text-center w-16">شناسه</th>
                  <th className="p-3 w-36">زمان ثبت رویداد</th>
                  <th className="p-3 w-32">کاربر ثبت‌کننده</th>
                  <th className="p-3 w-40">دسته‌بندی اقدام</th>
                  <th className="p-3">شرح دقیق رویداد / تغییرات ممیزی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map(lg => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (lg.action_type.includes('حذف') || lg.action_type.includes('لغو') || lg.action_type.includes('کنسل') || lg.action_type.includes('پاکسازی')) {
                    badgeColor = 'bg-red-50 text-red-700 border border-red-100';
                  } else if (lg.action_type.includes('ثبت') || lg.action_type.includes('ایجاد') || lg.action_type.includes('افزودن')) {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  } else if (lg.action_type.includes('ویرایش') || lg.action_type.includes('بروزرسانی')) {
                    badgeColor = 'bg-amber-50 text-amber-700 border border-amber-100';
                  } else if (lg.action_type.includes('ورود') || lg.action_type.includes('خروج')) {
                    badgeColor = 'bg-blue-50 text-blue-700 border border-blue-100';
                  }

                  return (
                    <tr key={lg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono font-bold text-[10px]">
                        #{lg.id}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[10.5px]">
                        {lg.timestamp}
                      </td>
                      <td className="p-3">
                        <span className="text-slate-800 font-extrabold flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-normal">@</span>
                          {lg.username || 'سیستم'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                          {lg.action_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium text-[11px] leading-relaxed">
                        {lg.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dual Confirmation Delete Modal Dialog */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" 
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
                <h4 className="font-extrabold text-slate-800 text-sm">تایید نهایی و دائم ممیزی</h4>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{deleteConfirm.message}</p>
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
                بله، کاملا مطمئنم
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-xl px-4 py-2 flex-1 cursor-pointer"
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
