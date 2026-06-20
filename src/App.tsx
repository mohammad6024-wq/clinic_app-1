/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import BookingTab from './components/BookingTab';
import StatsTab from './components/StatsTab';
import PatientsTab from './components/PatientsTab';
import DoctorsTab from './components/DoctorsTab';
import FinanceTab from './components/FinanceTab';
import ReportsTab from './components/ReportsTab';
import ShiftsSubjectsTab from './components/ShiftsSubjectsTab';
import ManagementTab from './components/ManagementTab';
import SmsTab from './components/SmsTab';
import SettingsTab from './components/SettingsTab';

import { 
  CalendarCheck2, 
  BarChart3, 
  Users, 
  Award, 
  DollarSign, 
  FileText, 
  Sliders, 
  UserCog, 
  Activity, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  MailWarning, 
  Laptop,
  Lock,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import { getCurrentJalaliDate, getCurrentJalaliTime } from './utils/jalali';
import { StorageHelper, initStorage } from './utils/storage';
import { SystemSettings } from './types';

export function ShiahCounselingLogo({ className = "h-9 w-9" }: { className?: string }) {
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState('booking');
  const [currentDate, setCurrentDate] = useState(getCurrentJalaliDate());
  const [currentTime, setCurrentTime] = useState(getCurrentJalaliTime());

  // Navigation state variables for polished sidebar
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Lock status
  const [isSystemLocked, setIsSystemLocked] = useState(false);

  // Watch for active state triggers to keep components updated
  const [renderCount, setRenderCount] = useState(0);

  // System Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(StorageHelper.getSystemSettings());
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // States for Profile Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileNatId, setProfileNatId] = useState('');
  const [profileGender, setProfileGender] = useState('زن');
  const [profileDesc, setProfileDesc] = useState('');
  const [profileSpec, setProfileSpec] = useState('');

  // Status indicators in footer
  const [totals, setTotals] = useState({
    patients: 0,
    appointments: 0,
    doctors: 0
  });

  useEffect(() => {
    // Hydrate storage on app mounting
    initStorage();

    const fetchOnlineData = async () => {
      const { syncFromDatabase } = await import('./utils/storage');
      await syncFromDatabase();
      const loaded = StorageHelper.getSystemSettings();
      setSystemSettings(loaded);
      if (loaded && loaded.defaultSidebarCollapsed !== undefined) {
        setIsSidebarCollapsed(loaded.defaultSidebarCollapsed);
      }
      setIsDataLoaded(true);
    };
    fetchOnlineData();

    // Regular ticks for jalali clock
    const timer = setInterval(() => {
      setCurrentTime(getCurrentJalaliTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync profile editing fields when modal is opened or user changes
  useEffect(() => {
    if (currentUser && isProfileModalOpen) {
      const allUsers = StorageHelper.getUsers();
      const dbUser = allUsers.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase()) || currentUser as any;
      setProfileName(dbUser.name || '');
      setProfileUsername(dbUser.username || '');
      setProfilePassword(dbUser.password || '');
      setProfilePhone(dbUser.phone || '');
      setProfileNatId(dbUser.nat_id || '');
      setProfileGender(dbUser.gender || 'زن');
      setProfileDesc(dbUser.desc || '');
      setProfileSpec(dbUser.spec || '');
    }
  }, [isProfileModalOpen, currentUser]);

  useEffect(() => {
    if (currentUser) {
      updateFooterStats();
    }

    // Dynamically toggle the CSS dark class for active dark theme styling
    const settings = StorageHelper.getSystemSettings();
    setSystemSettings(settings);
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [renderCount, currentUser]);

  const updateFooterStats = () => {
    setTotals({
      patients: StorageHelper.getPatients().length,
      appointments: StorageHelper.getAppointments().filter(a => a.date === getCurrentJalaliDate()).length,
      doctors: StorageHelper.getDoctors().length
    });
  };

  const handleDataChanged = () => {
    setRenderCount(prev => prev + 1);
    const settings = StorageHelper.getSystemSettings();
    setSystemSettings(settings);
  };

  const handleLogOut = () => {
    if (currentUser) {
      StorageHelper.logActivity(currentUser.username, 'خروج از سیستم', 'کاربر با موفقیت از پنل مدیریت کلینیک خارج شد');
    }
    setCurrentUser(null);
    setActiveTab('booking');
  };

  // Dynamically prepare active font styles
  const fontStyles = React.useMemo(() => {
    let fontName = 'Vazirmatn';
    let fontFaceDeclaration = '';

    if (systemSettings?.activeFontFamily === 'custom' && systemSettings?.uploadedFontData) {
      fontName = "'CustomerFontAdmin'";
      fontFaceDeclaration = `
        @font-face {
          font-family: 'CustomerFontAdmin';
          src: url('${systemSettings?.uploadedFontData}') format('woff2'),
               url('${systemSettings?.uploadedFontData}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `;
    } else if (systemSettings?.activeFontFamily === 'System') {
      fontName = "Tahoma, 'Segoe UI', Arial, sans-serif font-sans";
    } else if (systemSettings?.activeFontFamily) {
      fontName = `'${systemSettings?.activeFontFamily}', Vazirmatn, sans-serif`;
    }

    return `
      ${fontFaceDeclaration}
      body, input, button, select, textarea, p, span, div, h1, h2, h3, h4, h5, h6, table, tr, td, th, a, li, option, label {
        font-family: ${fontName}, Vazirmatn, sans-serif !important;
      }
    `;
  }, [systemSettings?.activeFontFamily, systemSettings?.uploadedFontData]);

  // If system is locked, show secure Unlock screen
  if (isSystemLocked && currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          setIsSystemLocked(false);
          StorageHelper.logActivity(currentUser.username, 'بازشدن قفل سیستم', 'کاربر با رمز عبور قفل سیستم را باز کرد');
        }}
        mode="unlock"
        lockedUsername={currentUser.username}
        onChangeUser={() => {
          setIsSystemLocked(false);
          handleLogOut();
        }}
      />
    );
  }

  // If data is not hydrated yet, show a clean modern spinner
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans gap-4" dir="rtl">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">در حال لود ایمن و همگام‌سازی اطلاعات کلینیک فاطمی...</p>
      </div>
    );
  }

  // If user is not authenticated, show secure Login and lock screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  // Set the correct menu tabs based on user authorization roles dynamically
  const categories = [
    {
      title: 'میز پذیرش',
      items: [
        { id: 'booking', label: 'نوبت‌دهی', icon: CalendarCheck2 },
        { id: 'stats', label: 'داشبورد آماری', icon: BarChart3 },
        { id: 'patients', label: 'مراجعین', icon: Users },
        { id: 'shiftsSubjects', label: 'شیفت‌ها و موضوعات', icon: Sliders },
      ]
    },
    {
      title: 'مالی و گزارشات',
      items: [
        { id: 'finance', label: 'امور مالی', icon: DollarSign },
        { id: 'reports', label: 'گزارش‌ها', icon: FileText },
      ]
    },
    {
      title: 'مدیریت و ارتباطات',
      items: [
        { id: 'doctors', label: 'اساتید', icon: Award },
        { id: 'sms', label: 'پنل پیامک', icon: MailWarning },
        { id: 'management', label: 'امکانات مدیریتی', icon: ShieldCheck },
      ]
    },
    {
      title: 'تنظیمات سامانه',
      items: [
        { id: 'settings', label: 'تنظیمات کلینیک', icon: Settings }
      ]
    }
  ];

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      // settings is strictly reserved for admin or super_admin roles
      if (item.id === 'settings') {
        return currentUser.role === 'admin' || currentUser.role === 'super_admin';
      }
      
      // Admin and Super Admin always have unrestricted access to all tabs
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        return true;
      }
      
      // Other roles are checked dynamically against saved settings
      if (currentUser?.role === 'supervisor') {
        return (systemSettings?.allowedTabs?.supervisor || []).includes(item.id);
      }
      if (currentUser?.role === 'secretary') {
        return (systemSettings?.allowedTabs?.secretary || []).includes(item.id);
      }
      
      return false;
    })
  })).filter(cat => cat.items.length > 0);

  // Flat menu for rendering fallback active checks in simple arrays
  const allowedMenuItems = filteredCategories.flatMap(c => c.items);

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-105 selection:text-blue-800 dark:selection:bg-slate-800 dark:selection:text-blue-300 overflow-hidden" dir="rtl">
      {/* Dynamic Font Styling Injection */}
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

      {/* 1. Backdrop Overlay for mobile slideout menu drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 2. Right Navigation Sidebar Drawer (Fixed on mobile, collapsible on desktop) */}
      <aside 
        className={`
          fixed inset-y-0 right-0 z-50 lg:static lg:z-auto
          flex flex-col h-full bg-white dark:bg-slate-900 text-slate-705 dark:text-slate-200 border-l border-slate-200/80 dark:border-slate-800/80
          transition-all duration-300 ease-in-out shadow-xl lg:shadow-[0_0_20px_rgba(0,0,0,0.015)] shrink-0
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : 'translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[256px]'}
        `}
      >
        {/* Sidebar Header branding bar */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center bg-white dark:bg-slate-900 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                {systemSettings?.clinicLogo ? (
                  <img src={systemSettings.clinicLogo} alt="Logo" className="h-9.5 w-9.5 object-contain shrink-0 rounded-lg transition-all duration-300" />
                ) : (
                  <ShiahCounselingLogo className="h-9.5 w-9.5 shrink-0 transition-all duration-300" />
                )}
                <div className="truncate text-right">
                  <h1 className="font-extrabold text-slate-800 text-[11px] tracking-tight leading-4">{systemSettings?.clinicName || 'سامانه مدیریت بالینی'}</h1>
                  <p className="text-[9px] text-emerald-600 font-bold leading-3">{systemSettings?.clinicSlogan || 'نوبت‌دهی و مدیریت کلینیک'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-705 lg:hidden cursor-pointer"
                  title="بستن منو"
                >
                  <X className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 hidden lg:block cursor-pointer"
                  title="کوچک‌نمایی منو"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-1.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 shadow-xs flex items-center justify-center text-slate-500 hover:text-blue-600 cursor-pointer transition-all duration-300"
              title="بزرگ‌نمایی منو"
            >
              {systemSettings?.clinicLogo ? (
                <img src={systemSettings.clinicLogo} alt="Logo" className="h-8 w-8 object-contain transition-all duration-300 shrink-0 rounded-lg" />
              ) : (
                <ShiahCounselingLogo className="h-8 w-8 transition-all duration-300 shrink-0" />
              )}
            </button>
          )}
        </div>

        {/* Categories of Navigation items - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 custom-tab-scroll">
          {filteredCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              {/* Group Title */}
              {!isSidebarCollapsed ? (
                <p className="px-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-normal mb-1.5">
                  {cat.title}
                </p>
              ) : (
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
              )}

              {/* Action Buttons within this group */}
              <div className="space-y-1">
                {cat.items.map(item => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50 dark:shadow-none font-bold'
                          : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-amber-400'
                        }
                      `}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <span className="shrink-0 animate-none">
                        <IconComponent className="h-4.5 w-4.5 stroke-[2]" />
                      </span>
                      {!isSidebarCollapsed && (
                        <span className="truncate leading-relaxed py-0.5 text-right flex-1">
                          {item.label}
                        </span>
                      )}
                      
                      {/* Active glowing stripe indicator incollapsed mode */}
                      {isSidebarCollapsed && isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-md" />
                      )}

                      {/* Tooltip for collapsed mode */}
                      {isSidebarCollapsed && (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-slate-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 shadow-md whitespace-nowrap pointer-events-none border border-slate-800">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </aside>

      {/* 3. Main Workspace Container layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Dynamic header stage bar (Desktop & Mobile adaptive structure) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">
          
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger pull Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -mr-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 lg:hidden cursor-pointer shrink-0"
              title="مشاهده منوی سیستم"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            {/* Title description of what active stage we are viewing */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">{systemSettings?.clinicName || 'مرکز مشاوره فاطمی'}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <h2 className="font-extrabold text-slate-850 dark:text-slate-105 text-xs sm:text-sm tracking-tight">
                {allowedMenuItems.find(i => i.id === activeTab)?.label || 'کابین کاربری'}
              </h2>
            </div>
          </div>

          {/* User Profile, Clock and Action Controls */}
          <div className="flex items-center gap-3">
            {/* Realtime date and live JALALI clock displays */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-705 dark:text-slate-300">
              <span className="flex items-center gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-150 shrink-0">{currentTime}</span>
              </span>
              <span className="text-[10px] text-slate-300 dark:text-slate-700 font-bold select-none shrink-0">|</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-slate-650 dark:text-slate-350 shrink-0">{currentDate}</span>
            </div>

            {/* Divider line on desktop */}
            <div className="hidden sm:block h-6 w-px bg-slate-200/60 dark:bg-slate-800" />

            {/* Profile User Badge block & utilities */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]">{currentUser.name}</span>
                <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-extrabold shrink-0">
                  {currentUser.role === 'admin' || currentUser.role === 'super_admin' ? 'مدیر ارشد' : currentUser.role === 'supervisor' ? 'مدیر' : 'رزرویشن'}
                </span>
              </div>

              {/* Edit Profile Action */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-450 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer shrink-0"
                title="ویرایش حساب کاربری"
              >
                <UserCog className="h-4.5 w-4.5" />
              </button>

              {/* System Lock Screen action */}
              <button
                onClick={() => {
                  setIsSystemLocked(true);
                  StorageHelper.logActivity(currentUser.username, 'قفل سیستم', 'سیستم مدیریت کلینیک به حالت قفل امنیتی منتقل شد');
                }}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-450 hover:text-amber-500 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer shrink-0"
                title="قفل سریع صفحه نمایش"
              >
                <Lock className="h-4.5 w-4.5" />
              </button>

              {/* Sign out Log-out action */}
              <button
                onClick={handleLogOut}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-955/20 text-slate-450 dark:text-slate-500 hover:text-red-650 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-950 transition-all cursor-pointer shrink-0"
                title="تغییر کاربر / خروج ایمن"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 4. Active Main View Container Component space */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-slate-50/70 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto w-full">
            
            {activeTab === 'booking' && (
              <BookingTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'stats' && (
              <StatsTab />
            )}

            {activeTab === 'patients' && (
              <PatientsTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'doctors' && (
              <DoctorsTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'finance' && (
              <FinanceTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'reports' && (
              <ReportsTab />
            )}

            {activeTab === 'shiftsSubjects' && (
              <ShiftsSubjectsTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'management' && (
              <ManagementTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'sms' && (
              <SmsTab />
            )}

            {activeTab === 'settings' && (
              <SettingsTab currentUser={currentUser} onDataChanged={handleDataChanged} />
            )}

          </div>
        </main>



      </div>

      {/* 5. Profile Edit Modal Dialog */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden text-right" dir="rtl">
            <div className="p-5 border-b border-slate-100 bg-blue-50 text-blue-800 flex justify-between items-center">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <UserCog className="h-5 w-5" />
                <span>ویرایش پروفایل پرسنلی من ({currentUser.name})</span>
              </h4>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none">&times;</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!profileUsername.trim() || !profileName.trim() || !profileNatId.trim()) {
                alert('نام کاربری، نام کامل و کدملی نمی‌توانند خالی باشند.');
                return;
              }
              const allUsers = StorageHelper.getUsers();
              // Check if username changed and exists for another user
              if (profileUsername.trim().toLowerCase() !== currentUser.username.toLowerCase()) {
                const usernameExists = allUsers.some(u => u.username.toLowerCase() === profileUsername.trim().toLowerCase() && u.id !== currentUser.id && u.is_active === 1);
                if (usernameExists) {
                  alert('این نام کاربری توسط فرد دیگری استفاده می‌شود.');
                  return;
                }
              }

              const updatedUsers = allUsers.map(u => {
                if (u.username.toLowerCase() === currentUser.username.toLowerCase()) {
                  return {
                    ...u,
                    username: profileUsername.trim().toLowerCase(),
                    name: profileName.trim(),
                    password: profilePassword.trim() || u.password,
                    phone: profilePhone.trim(),
                    nat_id: profileNatId.trim(),
                    gender: profileGender,
                    desc: profileDesc.trim(),
                    spec: profileSpec.trim()
                  };
                }
                return u;
              });

              StorageHelper.saveUsers(updatedUsers);
              
              const storedUser = updatedUsers.find(u => u.username.toLowerCase() === profileUsername.trim().toLowerCase());
              if (storedUser) {
                setCurrentUser({
                  username: storedUser.username,
                  role: storedUser.role,
                  name: storedUser.name
                });
              }

              StorageHelper.logActivity(
                currentUser.username,
                'اصلاح پروفایل شخصی پرسنل',
                `اطلاعات حساب کاربری ${profileUsername} توسط خود کاربر ویرایش گردید`
              );
              
              alert('✅ مشخصات پروفایل شما با موفقیت بروزرسانی شد.');
              setIsProfileModalOpen(false);
              handleDataChanged();
            }} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Username & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نام کاربری ورود</label>
                  <input
                    type="text"
                    required
                    disabled={currentUser.role === 'secretary'}
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:outline-none"
                    placeholder="reception"
                  />
                  {currentUser.role === 'secretary' && <span className="text-[9px] text-red-500 mt-1 block font-bold">غیرقابل تغییر توسط منشی</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    disabled={currentUser.role === 'secretary'}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                    placeholder="خانم علوی"
                  />
                  {currentUser.role === 'secretary' && <span className="text-[9px] text-red-500 mt-1 block font-bold">غیرقابل تغییر توسط منشی</span>}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">رمز عبور ورود به سامانه</label>
                <input
                  type="text"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center text-xs font-mono focus:outline-none"
                  placeholder="رمز عبور فعال"
                />
              </div>

              {/* National ID & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد ملی (۱۰ رقم)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={profileNatId}
                    onChange={(e) => setProfileNatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0012345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تلفن همراه</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono"
                    placeholder="0912..."
                  />
                </div>
              </div>

              {/* Gender & Spec */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">جنسیت</label>
                  <select
                    value={profileGender}
                    onChange={(e) => setProfileGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="زن">زن</option>
                    <option value="مرد">مرد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تخصص / موقعیت</label>
                  <input
                    type="text"
                    value={profileSpec}
                    onChange={(e) => setProfileSpec(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                    placeholder="رزرویشن شیفت عصر"
                  />
                </div>
              </div>

              {/* Description bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">یادداشت پرسنلی / بیوگرافی</label>
                <textarea
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs h-16 focus:outline-none"
                  placeholder="مشخصات و یادداشت های فردی مربوط به کاربری شما"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-3 shadow-md transition-all cursor-pointer"
                >
                  ذخیره تغییرات پروفایل
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs py-3 transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
