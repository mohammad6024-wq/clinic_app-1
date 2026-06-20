/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { 
  getCurrentJalaliDate, 
  parseJalali, 
  getJalaliMonthDaysCount, 
  getJalaliWeekdayIndex, 
  getJalaliWeekdayName,
  getCurrentJalaliDateTimeString
} from '../utils/jalali';

interface JalaliDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function JalaliDatePicker({ value, onChange, label, required = false, disabled = false }: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Year & month of picker panel
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(1);

  // Sync state when calendar opens or date changes
  useEffect(() => {
    if (value) {
      try {
        const { jy, jm } = parseJalali(value);
        setPickerYear(jy);
        setPickerMonth(jm);
      } catch {
        const today = getCurrentJalaliDate();
        const { jy, jm } = parseJalali(today);
        setPickerYear(jy);
        setPickerMonth(jm);
      }
    }
  }, [value, isOpen]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  // Populate offset empty tags
  for (let i = 0; i < startOffsetIndex; i++) {
    weeksGrid.push(null);
  }
  // Populate days
  for (let d = 1; d <= totalDays; d++) {
    weeksGrid.push(d);
  }

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pickerMonth === 1) {
      setPickerMonth(12);
      setPickerYear(prev => prev - 1);
    } else {
      setPickerMonth(prev => prev - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pickerMonth === 12) {
      setPickerMonth(1);
      setPickerYear(prev => prev + 1);
    } else {
      setPickerMonth(prev => prev + 1);
    }
  };

  const realTodayStr = getCurrentJalaliDate();

  return (
    <div className="relative text-right font-sans w-full" dir="rtl" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          readOnly
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 font-extrabold pr-9"
        />
        <Calendar 
          className="absolute right-3 top-3 h-4 w-4 text-slate-400 cursor-pointer pointer-events-none" 
        />
      </div>

      {isOpen && !disabled && (
        <div 
          className="absolute right-0 top-full mt-2 z-[999] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-72 space-y-4 animate-in fade-in slide-in-from-top-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-600 rounded bg-slate-50 cursor-pointer text-[10px] font-bold transition-all"
            >
              ◀
            </button>
            <div className="flex items-center gap-1">
              {/* Month Selector dropdown */}
              <select
                value={pickerMonth}
                onChange={(e) => setPickerMonth(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {monthsList.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
              {/* Year Selector dropdown */}
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
              className="p-1 hover:bg-slate-100 hover:text-blue-650 text-slate-600 rounded bg-slate-50 cursor-pointer text-[10px] font-bold transition-all"
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
              const isSelected = currentDayStr === value;

              let bgClass = "hover:bg-blue-50 text-slate-800";
              if (isToday) {
                bgClass = "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold hover:bg-amber-150";
              }
              if (isSelected) {
                bgClass = "bg-blue-600 text-white font-extrabold hover:bg-blue-700 ring-2 ring-blue-500/20";
              }

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => {
                    onChange(currentDayStr);
                    setIsOpen(false);
                  }}
                  className={`h-7 w-7 text-[11px] rounded-full flex flex-col items-center justify-center relative cursor-pointer font-bold transition-all ${bgClass}`}
                  title={`${getJalaliWeekdayName(currentDayStr)} ${currentDayStr}`}
                >
                  <span>{day}</span>
                </button>
              );
            })}
          </div>

          {/* Footer view */}
          <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 text-[9px] font-sans">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(realTodayStr);
                setIsOpen(false);
              }}
              className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
            >
              ↩ امروز ({realTodayStr})
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
