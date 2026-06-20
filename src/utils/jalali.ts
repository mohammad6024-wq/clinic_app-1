/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function gregToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let g_day_no = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(g_day_no / 12053);
  g_day_no %= 12053;
  jy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;
  if (g_day_no > 365) {
    jy += Math.floor((g_day_no - 1) / 365);
    g_day_no = (g_day_no - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (g_day_no < 186) {
    jm = 1 + Math.floor(g_day_no / 31);
    jd = 1 + (g_day_no % 31);
  } else {
    jm = 7 + Math.floor((g_day_no - 186) / 30);
    jd = 1 + ((g_day_no - 186) % 30);
  }
  return [jy, jm, jd];
}

export function getCurrentJalaliDate(): string {
  const now = new Date();
  const [jy, jm, jd] = gregToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function getCurrentJalaliTime(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getCurrentJalaliDateTimeString(): string {
  return `${getCurrentJalaliDate()} ${getCurrentJalaliTime()}`;
}

export function getJalaliMonthName(monthNum: number): string {
  const months = [
    "فروردین", "اردیبهشت", "خرداد",
    "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر",
    "دی", "بهمن", "اسفند"
  ];
  return months[monthNum - 1] || "";
}

// Convert "1405/03/27" format into components
export function parseJalali(dateStr: string): { jy: number; jm: number; jd: number } {
  const parts = dateStr.split('/');
  return {
    jy: parseInt(parts[0], 10),
    jm: parseInt(parts[1], 10),
    jd: parseInt(parts[2], 10)
  };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy -= 979;
  jm -= 1;
  jd -= 1;
  let jy_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    jy_day_no += (i < 6) ? 31 : 30;
  }
  jy_day_no += jd;
  let g_day_no = jy_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097); /* 146097 = 365*400 + 400/4 - 400/100 + 400/400 */
  g_day_no %= 146097;
  let leap = true;
  if (g_day_no >= 36525) { /* 36525 = 365*100 + 100/4 */
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524); /* 36524 = 365*100 + 100/4 - 1 */
    g_day_no %= 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }
  gy += 4 * Math.floor(g_day_no / 1461); /* 1461 = 365*4 + 1 */
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }
  const sal_a = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  let i = 0;
  while (g_day_no >= sal_a[i] + (i === 1 && leap ? 1 : 0)) {
    i++;
  }
  let gm = i;
  let gd = g_day_no - sal_a[i - 1] - (i > 1 && leap ? 1 : 0) + 1;
  return [gy, gm, gd];
}

export function getJalaliWeekdayIndex(dateStr: string): number {
  try {
    const { jy, jm, jd } = parseJalali(dateStr);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    const date = new Date(gy, gm - 1, gd);
    const jsDay = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    return (jsDay + 1) % 7; // Convert so Saturday=0, Sunday=1, ... Friday=6
  } catch (error) {
    return 0; // fallback to Saturday
  }
}

export function getJalaliWeekdayName(dateStr: string): string {
  const index = getJalaliWeekdayIndex(dateStr);
  const weekdayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  return weekdayNames[index] || "";
}

export function addDaysJalali(dateStr: string, days: number): string {
  try {
    const { jy, jm, jd } = parseJalali(dateStr);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    const date = new Date(gy, gm - 1, gd);
    date.setDate(date.getDate() + days);
    const [ny, nm, nd] = gregToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${ny}/${pad(nm)}/${pad(nd)}`;
  } catch (err) {
    return dateStr;
  }
}

export function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) {
    // Check if Esfand has 30 days by converting 30th Esfand to Gregorian and back
    const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30);
    const [ry, rm, rd] = gregToJalali(gy, gm, gd);
    return rd === 30 ? 30 : 29;
  }
  return 30;
}

