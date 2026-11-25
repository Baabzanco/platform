import React, { useState } from 'react';
import {
  Factory,
  FileSpreadsheet,
  Images,
  MoreHorizontal,
  Navigation,
  PieChart,
  RotateCcw,
  ShieldCheck,
  Truck,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { Department, WorkflowDepartment } from '../types/order';

interface SidebarProps {
  activePage: Department;
  onSelectPage: (page: Department) => void;
  unreadCounts: Record<WorkflowDepartment, number>;
  rejectedDriverDocsCount: number;
  onRequestReset: () => void;
}

const NAV_ITEMS: Array<{
  id: Department;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  badgeKey?: WorkflowDepartment;
  isDriver?: boolean;
}> = [
  {
    id: 'production',
    label: 'بخش تولید',
    shortLabel: 'تولید',
    icon: Factory,
    badgeKey: 'production',
  },
  {
    id: 'finance',
    label: 'بخش صدور فاکتور',
    shortLabel: 'فاکتور',
    icon: FileSpreadsheet,
    badgeKey: 'finance',
  },
  {
    id: 'shipping',
    label: 'بخش ارسال',
    shortLabel: 'ارسال',
    icon: Truck,
    badgeKey: 'shipping',
  },
  {
    id: 'driver',
    label: 'پنل رانندگان',
    shortLabel: 'راننده',
    icon: Navigation,
    isDriver: true,
  },
  {
    id: 'reports',
    label: 'گزارش‌ها و آمار',
    shortLabel: 'گزارش‌ها',
    icon: PieChart,
  },
  {
    id: 'access',
    label: 'سطح دسترسی کاربران',
    shortLabel: 'دسترسی‌ها',
    icon: ShieldCheck,
  },
  {
    id: 'customers',
    label: 'لیست طرف حساب‌ها (مشتریان)',
    shortLabel: 'طرف حساب‌ها',
    icon: Users,
  },
  {
    id: 'product_photos',
    label: 'عکس محصولات',
    shortLabel: 'عکس محصولات',
    icon: Images,
  },
];

const MOBILE_PRIMARY_TABS: Department[] = [
  'production',
  'finance',
  'shipping',
  'driver',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  unreadCounts,
  rejectedDriverDocsCount,
  onRequestReset,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const getBadgeCount = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.badgeKey) return unreadCounts[item.badgeKey];
    if (item.isDriver) return rejectedDriverDocsCount;
    return 0;
  };

  const isMoreActive =
    activePage === 'reports' ||
    activePage === 'access' ||
    activePage === 'customers' ||
    activePage === 'product_photos';

  return (
    <>
      {/* Desktop Side Rail (hidden on mobile) */}
      <aside className="no-print hidden md:flex w-[78px] shrink-0 bg-white border-l border-slate-200 flex-col items-center py-4 z-30 select-none">
        {/* Static User Profile */}
        <div className="flex flex-col items-center text-center px-1 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 border bg-[#0f5864]/10 text-[#0f5864] border-[#0f5864]/25">
            <UserCircle2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 leading-tight">
            امیر مرادصالح
          </span>
        </div>

        {/* Navigation Links */}
        <nav aria-label="منوی بخش‌ها" className="flex-1 w-full flex flex-col items-center gap-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const badgeCount = getBadgeCount(item);

            return (
              <React.Fragment key={item.id}>
                {item.id === 'customers' && (
                  <div
                    className="w-8 h-px bg-slate-200 my-0.5"
                    aria-hidden="true"
                  />
                )}
                <button
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
              </React.Fragment>
            );
          })}
        </nav>

        {/* Reset Demo Data Button */}
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

      {/* Mobile Fixed Bottom Navigation Bar (Thumb-Zone Ergonomic) */}
      <nav
        aria-label="ناوبری موبایل"
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {MOBILE_PRIMARY_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const badgeCount = getBadgeCount(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSelectPage(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors ${
                  isActive
                    ? 'text-[#0f5864] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span
                  className={`relative flex items-center justify-center w-9 h-7 rounded-lg transition-colors ${
                    isActive ? 'bg-[#0f5864]/12' : ''
                  }`}
                >
                  <Icon className="w-[21px] h-[21px]" />
                  {badgeCount > 0 && (
                    <span className="tabular-nums absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                      {badgeCount}
                    </span>
                  )}
                </span>
                <span className="text-[11px] mt-0.5 leading-tight whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={`relative flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-colors ${
              isMoreActive || moreOpen
                ? 'text-[#0f5864] font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <span
              className={`flex items-center justify-center w-9 h-7 rounded-lg transition-colors ${
                isMoreActive || moreOpen ? 'bg-[#0f5864]/12' : ''
              }`}
            >
              <MoreHorizontal className="w-[21px] h-[21px]" />
            </span>
            <span className="text-[11px] mt-0.5 leading-tight whitespace-nowrap">
              بیشتر
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="منوی بیشتر"
          className="no-print md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1.5px] flex items-end justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false);
          }}
        >
          <div className="bg-white w-full rounded-t-2xl border-t border-slate-200 shadow-2xl pb-modal-safe overflow-hidden">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0f5864]/10 text-[#0f5864] flex items-center justify-center">
                  <UserCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">امیر مرادصالح</div>
                  <div className="text-[11px] text-slate-500">پنل مدیریت سفارشات</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="بستن منو"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSelectPage('reports');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  activePage === 'reports'
                    ? 'bg-[#0f5864]/10 text-[#0f5864]'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <PieChart className="w-5 h-5 shrink-0" />
                <span>گزارش‌ها و آمار زنده</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSelectPage('access');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  activePage === 'access'
                    ? 'bg-[#0f5864]/10 text-[#0f5864]'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>سطح دسترسی و گروه‌های کاربری</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSelectPage('customers');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  activePage === 'customers'
                    ? 'bg-[#0f5864]/10 text-[#0f5864]'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span>لیست طرف حساب‌ها (مشتریان)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSelectPage('product_photos');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  activePage === 'product_photos'
                    ? 'bg-[#0f5864]/10 text-[#0f5864]'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Images className="w-5 h-5 shrink-0" />
                <span>عکس محصولات</span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onRequestReset();
                }}
                className="w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <RotateCcw className="w-5 h-5 shrink-0" />
                <span>بازنشانی داده‌های نمونه</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
