/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SmsSetting, Patient } from '../types';
import { StorageHelper } from '../utils/storage';
import { Mail, Settings, MessageSquareShare, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export default function SmsTab() {
  const [settings, setSettings] = useState<SmsSetting | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Form Fields
  const [apiKey, setApiKey] = useState('');
  const [senderNum, setSenderNum] = useState('');
  const [bookingTmpl, setBookingTmpl] = useState('');
  const [reminderTmpl, setReminderTmpl] = useState('');
  const [cancelTmpl, setCancelTmpl] = useState('');

  // Bulk Panel fields
  const [targetAudience, setTargetAudience] = useState('همه مراجعین');
  const [bulkText, setBulkText] = useState('مراجع گرامی، مرکز مشاوره فاطمی (حرم مطهر حضرت معصومه س) در روزهای تعطیل رسمی نیز پذیرای هموطنان گرامی می‌باشد.');
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    const sms = StorageHelper.getSmsSettings();
    setSettings(sms);
    setApiKey(sms.api_key || '');
    setSenderNum(sms.sender_number || '');
    setBookingTmpl(sms.booking_template || '');
    setReminderTmpl(sms.reminder_template || '');
    setCancelTmpl(sms.cancel_template || '');

    setPatients(StorageHelper.getPatients());
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: SmsSetting = {
      id: settings?.id || 1,
      api_key: apiKey.trim(),
      sender_number: senderNum.trim(),
      booking_template: bookingTmpl,
      reminder_template: reminderTmpl,
      cancel_template: cancelTmpl
    };

    StorageHelper.saveSmsSettings(updated);
    setSettings(updated);
    alert('✅ تنظیمات پنل الکترونیکی و الگوهای پیامک با موفقیت در سیستم محلی بازنویسی شد.');
  };

  const handleBroadcastSimulate = () => {
    if (!bulkText.trim()) return;

    setIsBroadcasting(true);
    setBroadcastLogs([]);

    let targets: Patient[] = [];
    if (targetAudience === 'همه مراجعین') {
      targets = patients;
    } else if (targetAudience === 'بیماران بیمه‌ای') {
      targets = patients.filter(p => p.type.includes('بیمه'));
    } else {
      targets = patients.filter(p => p.type === 'VIP');
    }

    if (targets.length === 0) {
      setBroadcastLogs(['خطا: جامعه هدف مورد نظر خالی است. هیچ بیماری یافت نشد.']);
      setIsBroadcasting(false);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < targets.length) {
        const p = targets[index];
        setBroadcastLogs(prev => [
          ...prev,
          `📡 ارسال موفقیت‌آمیز به ${p.name} (${p.phone}) ◀ [پیام: ${bulkText.slice(0, 30)}...]`
        ]);
        index++;
      } else {
        clearInterval(interval);
        setBroadcastLogs(prev => [...prev, '🟢 عملیات ارسال همگانی با موفقیت خاتمه یافت.']);
        setIsBroadcasting(false);
      }
    }, 450);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right font-sans" dir="rtl">
      
      {/* Box 1: SMS credentials setup and text patterns configuration */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
          <Settings className="h-5 w-5 text-blue-500" />
          <span>تنظیمات درگاه پیامک و الگوهای متنی سیستم</span>
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          
          {/* API and sender number configurations */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">کلید API درگاه پیامک (کاوه نگار)</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center font-mono focus:outline-none"
                placeholder="Ex: API_KEY_XXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">شماره اختصاصی فرستنده</label>
              <input
                type="text"
                value={senderNum}
                onChange={(e) => setSenderNum(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center font-mono focus:outline-none"
                placeholder="30006024"
              />
            </div>
          </div>

          {/* Schedulers patterns textareas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">الگوی پیامک تایید نوبت‌دهی اولیه</label>
            <textarea
              value={bookingTmpl}
              onChange={(e) => setBookingTmpl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-14 font-sans leading-relaxed focus:outline-none text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">الگوی پیامک یادآور ۲۴ ساعت قبل نوبت</label>
            <textarea
              value={reminderTmpl}
              onChange={(e) => setReminderTmpl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-14 font-sans leading-relaxed focus:outline-none text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">الگوی پیامک کنسل یا لغو جلسه روان‌شناسی</label>
            <textarea
              value={cancelTmpl}
              onChange={(e) => setCancelTmpl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-14 font-sans leading-relaxed focus:outline-none text-[11px]"
            />
          </div>

          {/* Action trigger button */}
          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl py-3 transition-colors"
          >
            تغییر و ذخیره الگوهای پیامکی سیستم
          </button>

        </form>
      </div>

      {/* Box 2: Bulk push communications broadcaster simulations */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
          <MessageSquareShare className="h-5 w-5 text-purple-500" />
          <span>ارسال همگانی بروشورهای اطلاع‌رسانی و پیامک عمومی</span>
        </h3>

        <div className="space-y-4 text-xs">
          
          {/* Target Audience selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">انتخاب جامعه مخاطب هدف</label>
            <div className="grid grid-cols-3 gap-2">
              {['همه مراجعین', 'بیماران بیمه‌ای', 'مراجعین ویژه VIP'].map(aud => (
                <label
                  key={aud}
                  className={`border rounded-xl p-2 lg:p-2.5 text-center text-[10px] lg:text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
                    targetAudience === aud
                      ? 'border-purple-500 bg-purple-50 text-purple-700 font-extrabold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value={aud}
                    checked={targetAudience === aud}
                    onChange={() => setTargetAudience(aud)}
                    className="hidden"
                  />
                  <span>{aud}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message Text area container */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">متن نهایی ارسال گروهی پیامک</label>
            <textarea
              required
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-20 focus:outline-none text-[11px] leading-relaxed"
              placeholder="متن خودکار همگانی کلینیک..."
            />
          </div>

          {/* Trigger dispatcher */}
          <button
            onClick={handleBroadcastSimulate}
            disabled={isBroadcasting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-305 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-1 shadow-sm transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>{isBroadcasting ? 'در حال ارسال دسته جمعی در شبکه...' : 'شروع عملیات ارسال گروهی پیامک'}</span>
          </button>

          {/* Logs broadcast outputs screen */}
          {broadcastLogs.length > 0 && (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4.5 font-mono text-[10px] space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {broadcastLogs.map((log, index) => (
                <div key={index} className="flex gap-1 items-start">
                  <span className="text-purple-400">⚡</span>
                  <p>{log}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
