/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import UsersTab from './UsersTab';
import LogsTab from './LogsTab';
import { UserCog, Activity, ShieldCheck } from 'lucide-react';

interface ManagementTabProps {
  currentUser: User;
  onDataChanged: () => void;
}

export default function ManagementTab({ currentUser, onDataChanged }: ManagementTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs'>('users');

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Brand tab header box */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600 animate-pulse" />
            <span>مدیریت یکپارچه پرسنل و ممیزی سیستم</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">
            پیکربندی حساب‌های کاربری، کنترل سطوح دسترسی فعالان و مشاهده رکوردهای امنیتی مرکز مشاوره
          </p>
        </div>

        {/* Sub-tabs selector toggles */}
        <div className="flex bg-slate-50 border border-slate-150 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'
            }`}
          >
            <UserCog className="h-4 w-4" />
            <span>مدیریت پرسنل اداری</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>تاریخچه عملیات سیستمی</span>
          </button>
        </div>
      </div>

      {/* Lazy view mounting */}
      <div className="transition-all duration-300">
        {activeSubTab === 'users' ? (
          <UsersTab currentUser={currentUser} onDataChanged={onDataChanged} />
        ) : (
          <LogsTab currentUser={currentUser} />
        )}
      </div>

    </div>
  );
}
