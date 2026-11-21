import React from 'react';
import {
  Factory,
  FileSpreadsheet,
  Truck,
  PieChart,
  RotateCcw,
  UserCircle2,
} from 'lucide-react';
import { Department, WorkflowDepartment } from '../types/order';

interface SidebarProps {
  activePage: Department;
  onSelectPage: (page: Department) => void;
  unreadCounts: Record<WorkflowDepartment, number>;
  onRequestReset: () => void;
}

const NAV_ITEMS: Array<{
  id: Department;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeKey?: WorkflowDepartment;
}> = [
  { id: 'production', label: 'بخش تولید', icon: Factory, badgeKey: 'production' },
  { id: 'finance', label: 'بخش مالی', icon: FileSpreadsheet, badgeKey: 'finance' },
  { id: 'shipping', label: 'بخش ارسال', icon: Truck, badgeKey: 'shipping' },
  { id: 'reports', label: 'گزارش‌ها و آمار', icon: PieChart },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  unreadCounts,
  onRequestReset,
}) => {
  return (
    <aside className="no-print w-[78px] shrink-0 bg-white border-l border-slate-200 flex flex-col items-center py-4 z-20 select-none">
      <div className="flex flex-col items-center text-center px-1 mb-6">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-1.5 border border-slate-200">
          <UserCircle2 className="w-6 h-6" />
        </div>
        <span className="text-[11px] font-medium text-slate-600 leading-tight">
          امیر مرادصالحی
        </span>
      </div>

      <nav aria-label="منوی بخش‌ها" className="flex-1 w-full flex flex-col items-center gap-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const badgeCount = item.badgeKey ? unreadCounts[item.badgeKey] : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPage(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-[#0f5864] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {badgeCount > 0 && (
                <span className="tabular-nums absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
                  {badgeCount}
                </span>
              )}
              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-[calc(100%+10px)] whitespace-nowrap bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-md z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-100 w-full flex flex-col items-center">
        <button
          type="button"
          onClick={onRequestReset}
          title="بازنشانی داده‌های نمونه"
          aria-label="بازنشانی داده‌های نمونه"
          className="group relative w-11 h-11 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-[calc(100%+10px)] whitespace-nowrap bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-md z-50">
            بازنشانی داده‌های نمونه
          </span>
        </button>
      </div>
    </aside>
  );
};
