/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { StorageHelper } from '../utils/storage';
import { KeyRound, User as UserIcon, Eye, EyeOff, ShieldAlert, HeartPulse } from 'lucide-react';

function ShiahCounselingLogo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Rounded Card Base with Soft Turquoise Shadow Tint */}
      <rect width="100" height="100" rx="24" fill="#faf5ff" />
      <rect width="100" height="100" rx="24" fill="#f0fffb" className="opacity-90" />
      <rect width="100" height="100" rx="24" stroke="#0d9488" strokeWidth="2.5" strokeOpacity="0.15" />
      
      {/* Traditional Islamic Turquoise Dome Silhouette & Pattern (Holy Shrine Shrine style) */}
      <path 
        d="M50 14C53.8 26.5 62.5 29.5 76 33.5C76 40.5 76 50.5 76 53.5C76 73.5 50 84.5 50 84.5C50 84.5 24 73.5 24 53.5C24 50.5 24 40.5 24 33.5C37.5 29.5 46.2 26.5 50 14Z" 
        fill="#0d9488" 
      />
      
      {/* Shimmer turquoise gradient simulation for premium vector feel */}
      <path 
        d="M50 20C52.8 30 59.5 32.5 71.5 36C71.5 41.5 71.5 49.5 71.5 52C71.5 68 50 77 50 77C50 77 28.5 68 28.5 52C28.5 49.5 28.5 41.5 28.5 36C40.5 32.5 47.2 30 50 20Z" 
        fill="#14b8a6" 
      />

      {/* Counseling Empathy & Heart (Golden Amber, symbolizing warmth, clinical compassion, and Hazrat Masuma (SA) Golden Dome affiliation) */}
      <path 
        d="M50 70C50 70 38 60 38 49.5C38 44.5 41.5 41 46 41C48.5 41 50 42.5 50 42.5C50 42.5 51.5 41 54 41C58.5 41 62 44.5 62 49.5C62 60 50 70 50 70Z" 
        fill="#d97706" 
        stroke="#ffffff"
        strokeWidth="1.5"
      />

      {/* Radiant Star of Guidance at the peak */}
      <path d="M50 26L51.3 29.3L54.8 29.3L52 31.4L53.1 34.7L50 32.6L46.9 34.7L48 31.4L45.2 29.3L48.7 29.3L50 26Z" fill="#fef08a" />
    </svg>
  );
}

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  mode?: 'login' | 'unlock';
  lockedUsername?: string;
  onChangeUser?: () => void;
}

export default function LoginScreen({ onLoginSuccess, mode = 'login', lockedUsername, onChangeUser }: LoginScreenProps) {
  const systemSettings = StorageHelper.getSystemSettings();
  const [username, setUsername] = useState(lockedUsername || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userList, setUserList] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const passwordRef = React.useRef<HTMLInputElement>(null);

  const users = StorageHelper.getUsers().filter(u => u.is_active !== 0);

  // Handle lock countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockUntil > Date.now()) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          setErrorMsg('');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockUntil]);

  // Handle suggestions as username input changes
  useEffect(() => {
    if (!username) {
      setUserList([]);
      setShowSuggestions(false);
      setSuggestionIdx(-1);
      return;
    }
    const term = username.toLowerCase();
    const matches = users.filter(u => 
      (u.name && u.name.toLowerCase().includes(term)) || 
      (u.username && u.username.toLowerCase().includes(term))
    );
    setUserList(matches.slice(0, 5));
    setShowSuggestions(matches.length > 0 && !matches.some(m => m.username.toLowerCase() === term));
    setSuggestionIdx(-1);
  }, [username]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || userList.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIdx(prev => (prev < userList.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIdx(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && suggestionIdx >= 0) {
      e.preventDefault();
      handleSelectUser(userList[suggestionIdx].username);
    }
  };

  const handleSelectUser = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setShowSuggestions(false);
    setSuggestionIdx(-1);
    if (passwordRef.current) {
      passwordRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (Date.now() < lockUntil) {
      setErrorMsg(`سیستم به علت تلاش ناموفق قفل شده است. لطفا ${secondsRemaining} ثانیه صبر کنید.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMsg('لطفا نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    const norm = (s: string) => s.replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').trim().toLowerCase();
    const matchedUser = users.find(u => norm(u.username) === norm(username));
    
    // Verify strictly stored password
    const isPasswordCorrect = matchedUser && (
      (matchedUser.password !== undefined && String(matchedUser.password) === password)
    );

    if (matchedUser && isPasswordCorrect) {
      setErrorMsg('');
      setValueAndSuccess(matchedUser);
    } else {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      setPassword('');

      if (nextFailCount >= 3) {
        const lockTime = Date.now() + 60000; // 1 minute
        setLockUntil(lockTime);
        setSecondsRemaining(60);
        setFailedAttempts(0);
        setErrorMsg('به دلیل ۳ تلاش ناموفق، سیستم به مدت ۱ دقیقه وارد قفل امنیتی شد.');
      } else {
        setErrorMsg(`نام کاربری یا رمز عبور اشتباه است. تلاش‌های باقیمانده: ${3 - nextFailCount}`);
      }
    }
  };

  const setValueAndSuccess = (user: User) => {
    StorageHelper.logActivity(user.username, 'ورود به سیستم', `کاربر ${user.name} با نقش ${user.role} وارد سیستم شد`);
    
    // Update last login
    const updatedUsers = StorageHelper.getUsers().map(u => 
      u.id === user.id ? { ...u, last_login_at: new Date().toLocaleDateString('fa-IR') } : u
    );
    StorageHelper.saveUsers(updatedUsers);
    
    onLoginSuccess(user);
  };

  // Dynamically prepare active font styles
  const fontStyles = React.useMemo(() => {
    let fontName = 'Vazirmatn';
    let fontFaceDeclaration = '';

    if (systemSettings.activeFontFamily === 'custom' && systemSettings.uploadedFontData) {
      fontName = "'CustomerFontAdmin'";
      fontFaceDeclaration = `
        @font-face {
          font-family: 'CustomerFontAdmin';
          src: url('${systemSettings.uploadedFontData}') format('woff2'),
               url('${systemSettings.uploadedFontData}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `;
    } else if (systemSettings.activeFontFamily === 'System') {
      fontName = "Tahoma, 'Segoe UI', Arial, sans-serif font-sans";
    } else if (systemSettings.activeFontFamily) {
      fontName = `'${systemSettings.activeFontFamily}', Vazirmatn, sans-serif`;
    }

    return `
      ${fontFaceDeclaration}
      * {
        font-family: ${fontName}, Vazirmatn, sans-serif !important;
      }
    `;
  }, [systemSettings.activeFontFamily, systemSettings.uploadedFontData]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      {/* Dynamic Font Style Tag */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-5 hover:scale-105 transition-transform duration-300">
            {systemSettings?.clinicLogo ? (
              <img src={systemSettings.clinicLogo} alt="Logo" className="h-18 w-18 object-contain shadow-xs rounded-xl" />
            ) : (
              <ShiahCounselingLogo className="h-18 w-18 shadow-xs animate-[pulse_3.5s_infinite]" />
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {systemSettings?.clinicName || 'مرکز مشاوره فاطمی'}
          </h2>
          {systemSettings?.clinicSlogan && (
            <p className="text-emerald-750 font-extrabold text-sm mt-1 text-emerald-700">
              {systemSettings.clinicSlogan}
            </p>
          )}
          <p className="mt-2.5 text-sm text-slate-500 leading-normal">
            {mode === 'login' ? 'به سامانه مدیریت جامع روان‌درمانی و نوبت‌دهی خوش آمدید' : 'قفل امنیتی سیستم - لطفاً مجدداً احراز هویت کنید'}
          </p>
        </div>

        {/* Form Container (Replaced <form> with <div> to prevent credential harvesting/saving by browser) */}
        <div className="mt-8 space-y-6" onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e as any);
          }
        }}>
          {/* Prevent auto-fill helper fields (browsers often try to fill the first username/password found) */}
          <input type="text" name="fakeusernameremembered" style={{display: 'none'}} />
          <input type="password" name="fakepasswordremembered" style={{display: 'none'}} />

          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs flex items-start gap-2 border border-red-100">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کاربری</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  name="usr_secure_field"
                  disabled={mode === 'unlock'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-3 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 text-sm transition-all text-right"
                  placeholder="نام یا نام کاربری خود را وارد کنید"
                />

                {/* Autocomplete suggestions */}
                {showSuggestions && userList.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-100 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {userList.map((user, idx) => (
                      <button
                        key={user.username}
                        type="button"
                        onClick={() => handleSelectUser(user.username)}
                        className={`w-full text-right px-4 py-2 text-xs transition-colors flex flex-col gap-0.5
                          ${idx === suggestionIdx ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500' : 'hover:bg-blue-50 text-slate-700'}`}
                      >
                        <span className="font-bold">{user.name}</span>
                        <span className="text-[10px] text-slate-400">@{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رمز عبور</label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  name="pwd_secure_field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 text-sm transition-all text-right"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              type="button"
              disabled={secondsRemaining > 0}
              className={`w-full py-3.5 px-4 border border-transparent rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all ${
                secondsRemaining > 0 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:shadow-lg'
              }`}
            >
              {secondsRemaining > 0 
                ? `قفل امنیتی (${secondsRemaining} ثانیه)` 
                : mode === 'login' ? 'ورود به سامانه مدیریت' : 'باز کردن قفل سیستم'}
            </button>
          </div>

          {mode === 'unlock' && onChangeUser && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onChangeUser}
                className="text-xs text-rose-600 hover:text-rose-700 font-extrabold focus:outline-none transition-all hover:underline cursor-pointer"
              >
                👤 تغییر کاربر (خروج و ورود با حساب کاربری دیگر)
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">نسخه ۱.۴.۰ - تحت وب (ریاکت لوکال)</p>
        </div>

      </div>
    </div>
  );
}
