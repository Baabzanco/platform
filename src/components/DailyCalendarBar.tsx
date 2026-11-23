import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarDayInfo, toPersianDigits } from '../utils/jalaliCalendar';

export interface DayBadgeMetrics {
  totalCount: number;
  unseenCount: number;
}

interface DailyCalendarBarProps {
  days: CalendarDayInfo[];
  selectedDateKey: string;
  metricsByDate: Record<string, DayBadgeMetrics>;
  readOnly?: boolean;
  onSelectDate: (dateKey: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export const DailyCalendarBar: React.FC<DailyCalendarBarProps> = ({
  days,
  selectedDateKey,
  metricsByDate,
  readOnly = false,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}) => {
  return (
    <section
      aria-label="تقویم روزانه سفارش‌ها"
      className="no-print bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex items-stretch gap-1.5 sm:gap-2 w-full"
    >
      {/* Previous Week Button (Right side in RTL) */}
      <button
        type="button"
        disabled={readOnly}
        onClick={onPrevWeek}
        title={readOnly ? 'تقویم در حالت فقط مشاهده است' : 'هفته قبل'}
        aria-label="هفته قبل"
        className="w-9 sm:w-10 shrink-0 rounded-lg border border-[#0f5864]/70 text-[#0f5864] bg-white hover:bg-[#0f5864]/8 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* 7 Day Cards: Smooth horizontal snap strip on mobile, 7-column grid on md+ */}
      <div className="flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
        <div className="flex md:grid md:grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const metrics = metricsByDate[day.dateKey] ?? {
              totalCount: 0,
              unseenCount: 0,
            };
            const showUnseenBadge = !isSelected && metrics.unseenCount > 0;
            const showTotalBadge = !showUnseenBadge && metrics.totalCount > 0;

            return (
              <button
                key={day.dateKey}
                type="button"
                disabled={readOnly && !isSelected}
                onClick={() => {
                  if (!readOnly) onSelectDate(day.dateKey);
                }}
                aria-pressed={isSelected}
                className={`snap-start shrink-0 min-w-[92px] md:min-w-0 rounded-xl py-2 px-2.5 min-h-[76px] sm:min-h-[84px] flex flex-col items-center justify-center text-center border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] disabled:opacity-65 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-[#105c66] text-white border-[#0c4850] shadow-xs'
                    : 'bg-[#f8fafc] text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span
                  className={`text-xs sm:text-[13px] font-bold leading-snug whitespace-nowrap ${
                    isSelected ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {day.weekdayName}
                </span>

                <span
                  className={`text-[11px] sm:text-xs mt-0.5 leading-snug whitespace-nowrap ${
                    isSelected ? 'text-white/90' : 'text-slate-500'
                  }`}
                >
                  {day.dateLabel}
                </span>

                {showUnseenBadge && (
                  <span className="tabular-nums mt-1.5 px-2 py-0.5 rounded-md bg-[#eb5757] text-white text-[10px] sm:text-[11px] font-semibold leading-4 sm:leading-5 whitespace-nowrap">
                    {toPersianDigits(metrics.unseenCount)} دیده نشده
                  </span>
                )}

                {showTotalBadge && (
                  <span className="tabular-nums mt-1.5 px-2 py-0.5 rounded-md bg-[#1ea85c] text-white text-[10px] sm:text-[11px] font-semibold leading-4 sm:leading-5 whitespace-nowrap">
                    {toPersianDigits(metrics.totalCount)} سفارش
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next Week Button (Left side in RTL) */}
      <button
        type="button"
        disabled={readOnly}
        onClick={onNextWeek}
        title={readOnly ? 'تقویم در حالت فقط مشاهده است' : 'هفته بعد'}
        aria-label="هفته بعد"
        className="w-9 sm:w-10 shrink-0 rounded-lg border border-[#0f5864]/70 text-[#0f5864] bg-white hover:bg-[#0f5864]/8 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </section>
  );
};
