export interface JalaliDate {
  year: number;
  month: number; // 1..12
  day: number;   // 1..31
}

export interface CalendarDayInfo {
  dateKey: string;       // e.g. "1405-09-01"
  weekdayName: string;   // e.g. "یکشنبه"
  dateLabel: string;     // e.g. "۱ آذر"
  jalali: JalaliDate;
}

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

function getJalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Standard 33-year leap cycle check for Esfand
  const leapRemainders = [1, 5, 9, 13, 17, 22, 26, 30];
  return leapRemainders.includes(year % 33) ? 30 : 29;
}

export function formatJalaliKey(date: JalaliDate): string {
  const y = String(date.year);
  const m = String(date.month).padStart(2, '0');
  const d = String(date.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toPersianDigits(input: string | number): string {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/\d/g, (digit) => map[Number(digit)]);
}

export function addJalaliDays(base: JalaliDate, delta: number): JalaliDate {
  let { year, month, day } = base;
  let remaining = delta;

  while (remaining > 0) {
    const dim = getJalaliMonthDays(year, month);
    if (day + remaining <= dim) {
      day += remaining;
      remaining = 0;
    } else {
      remaining -= dim - day + 1;
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  while (remaining < 0) {
    if (day + remaining >= 1) {
      day += remaining;
      remaining = 0;
    } else {
      remaining += day;
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day = getJalaliMonthDays(year, month);
    }
  }

  return { year, month, day };
}

// Reference Saturday: 30 Aban 1405 (so Sunday is 1 Azar 1405, matching the calendar)
export const REFERENCE_WEEK_START: JalaliDate = {
  year: 1405,
  month: 8,
  day: 30,
};

export const DEFAULT_SELECTED_DATE_KEY = '1405-09-01'; // یکشنبه ۱ آذر

export function getWeekDays(weekOffset: number): CalendarDayInfo[] {
  const weekStart = addJalaliDays(REFERENCE_WEEK_START, weekOffset * 7);
  return PERSIAN_WEEKDAYS.map((weekdayName, index) => {
    const jalali = addJalaliDays(weekStart, index);
    return {
      dateKey: formatJalaliKey(jalali),
      weekdayName,
      dateLabel: `${toPersianDigits(jalali.day)} ${PERSIAN_MONTHS[jalali.month - 1]}`,
      jalali,
    };
  });
}

export function formatJalaliDisplay(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3) return dateKey;
  const [, month, day] = parts;
  const monthName = PERSIAN_MONTHS[month - 1] ?? '';
  return `${toPersianDigits(day)} ${monthName}`;
}
