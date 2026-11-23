import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  GripVertical,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Search,
} from 'lucide-react';
import { DRIVERS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
import { formatWeight, getShippingWeight } from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface DriverPageProps {
  orders: Order[];
  printingOrderId: string | null;
  access: AccessControlHelpers;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onReorderOrders: (orderedIds: string[]) => void;
  onCallCustomer: (order: Order) => void;
  onSortByDistrictToast: () => void;
}

type DriverFilter =
  | 'all'
  | 'rejected_docs'
  | 'pending'
  | 'ready_complete'
  | 'completed';

function getDocCount(order: Order): number {
  let count = 0;
  if (order.driverDelivery?.invoicePhoto) count += 1;
  if (order.driverDelivery?.paymentReceiptPhoto) count += 1;
  return count;
}

function isDriverDocsRejected(order: Order): boolean {
  return Boolean(
    order.driverDelivery?.financeRejected && !order.driverDelivery?.sentToFinance
  );
}

export const DriverPage: React.FC<DriverPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onReorderOrders,
  onCallCustomer,
  onSortByDistrictToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DriverFilter>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);

  // Active deliverable orders on the selected day:
  // Rejected-doc orders ALWAYS pinned at the top (Red Priority), then by driver's routeOrder
  const routeOrderedDayOrders = useMemo(() => {
    return orders
      .filter((order) => order.status !== 'rejected')
      .slice()
      .sort((a, b) => {
        const aRej = isDriverDocsRejected(a) ? 0 : 1;
        const bRej = isDriverDocsRejected(b) ? 0 : 1;
        if (aRej !== bRej) return aRej - bRej;
        if (aRej === 0 && bRej === 0) return b.lastActionAt - a.lastActionAt;
        return a.routeOrder - b.routeOrder;
      });
  }, [orders]);

  const rejectedDocsCount = useMemo(
    () => routeOrderedDayOrders.filter(isDriverDocsRejected).length,
    [routeOrderedDayOrders]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routeOrderedDayOrders.filter((order) => {
      const completed = Boolean(order.driverDelivery?.sentToFinance);
      const rejectedDocs = isDriverDocsRejected(order);
      const docCount = getDocCount(order);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'rejected_docs' && rejectedDocs) ||
        (filter === 'pending' && !completed) ||
        (filter === 'ready_complete' && !completed && !rejectedDocs && docCount === 2) ||
        (filter === 'completed' && completed);

      if (!matchesFilter) return false;

      if (driverFilter !== 'all' && order.driverName !== driverFilter) {
        return false;
      }

      if (!q) return true;
      return (
        order.code.toLowerCase().includes(q) ||
        order.district.toLowerCase().includes(q) ||
        order.address.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [routeOrderedDayOrders, searchQuery, filter, driverFilter]);

  const isFilteredView =
    searchQuery.trim() !== '' || filter !== 'all' || driverFilter !== 'all';

  const completedCount = useMemo(
    () => routeOrderedDayOrders.filter((o) => o.driverDelivery?.sentToFinance).length,
    [routeOrderedDayOrders]
  );

  const moveOrderToIndex = (orderId: string, targetIndex: number) => {
    const currentIds = routeOrderedDayOrders.map((o) => o.id);
    const fromIndex = currentIds.indexOf(orderId);
    if (fromIndex === -1) return;
    const boundedTarget = Math.max(0, Math.min(currentIds.length - 1, targetIndex));
    if (fromIndex === boundedTarget) return;

    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(boundedTarget, 0, moved);
    onReorderOrders(nextIds);
  };

  const handleDropOnOrder = (targetOrderId: string) => {
    if (!draggedOrderId || draggedOrderId === targetOrderId) {
      setDraggedOrderId(null);
      setDragOverOrderId(null);
      return;
    }
    const currentIds = routeOrderedDayOrders.map((o) => o.id);
    const targetIndex = currentIds.indexOf(targetOrderId);
    if (targetIndex !== -1) {
      moveOrderToIndex(draggedOrderId, targetIndex);
    }
    setDraggedOrderId(null);
    setDragOverOrderId(null);
  };

  const handleAutoSortByDistrict = () => {
    if (routeOrderedDayOrders.length <= 1) return;
    const sortedIds = routeOrderedDayOrders
      .slice()
      .sort((a, b) => a.district.localeCompare(b.district, 'fa'))
      .map((o) => o.id);
    onReorderOrders(sortedIds);
    onSortByDistrictToast();
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            پنل رانندگان و مسیر تحویل
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoSortByDistrict}
            disabled={routeOrderedDayOrders.length <= 1}
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:border-[#0f5864] hover:text-[#0f5864] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>مرتب‌سازی محدوده</span>
          </button>

          <button
            type="button"
            onClick={onPrintAll}
            title="پرینت لیست مسیر"
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">پرینت لیست مسیر</span>
          </button>
        </div>
      </header>

      {/* Compact Route Summary Strip */}
      <section className="no-print bg-white border border-slate-200 rounded-xl px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-slate-700">
          <Navigation className="w-4 h-4 text-[#0f5864] shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-relaxed">
            اولویت تحویل را با دکمه‌های بالا/پایین تنظیم کنید و برای ثبت عکس فاکتور و رسید روی سفارش بزنید.
          </span>
        </div>

        <div className="tabular-nums text-slate-600 flex flex-wrap items-center gap-2.5 shrink-0 font-medium pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span>
            مسیر روز:{' '}
            <strong className="text-slate-900">
              {toPersianDigits(routeOrderedDayOrders.length)}
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            تکمیل‌شده:{' '}
            <strong className="text-emerald-700">
              {toPersianDigits(completedCount)}/{toPersianDigits(routeOrderedDayOrders.length)}
            </strong>
          </span>
          {rejectedDocsCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-red-700 font-bold">
                نیازمند عکس مجدد: {toPersianDigits(rejectedDocsCount)}
              </span>
            </>
          )}
        </div>
      </section>

      {/* Search, Driver Filter & Horizontally Scrollable Status Filter */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو کد، محدوده، آدرس یا تلفن..."
              className="w-full sm:w-64 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
            />
          </div>

          <select
            aria-label="فیلتر راننده"
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="h-11 sm:h-9 px-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg text-slate-700 focus:outline-none focus:border-[#0f5864]"
          >
            <option value="all">همه رانندگان</option>
            {DRIVERS.map((driver) => (
              <option key={driver.id} value={driver.name}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
            {(
              [
                { id: 'all', label: 'همه' },
                ...(rejectedDocsCount > 0
                  ? [
                      {
                        id: 'rejected_docs' as DriverFilter,
                        label: `عکس مجدد (${toPersianDigits(rejectedDocsCount)})`,
                        isDanger: true,
                      },
                    ]
                  : []),
                { id: 'pending', label: 'در انتظار تحویل' },
                { id: 'ready_complete', label: 'آماده اتمام' },
                { id: 'completed', label: 'تکمیل‌شده' },
              ] as Array<{ id: DriverFilter; label: string; isDanger?: boolean }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === f.id
                    ? f.isDanger
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : f.isDanger
                      ? 'text-red-700 hover:text-red-900'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prioritized Driver Route Order Cards */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              {routeOrderedDayOrders.length === 0
                ? 'در این تاریخ سفارشی برای تحویل رانندگان وجود ندارد.'
                : 'سفارشی مطابق فیلتر انتخابی در لیست مسیر یافت نشد.'}
            </p>
            {routeOrderedDayOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  setDriverFilter('all');
                }}
                className="min-h-[44px] px-5 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
              >
                نمایش همه سفارش‌های مسیر
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const globalIndex = routeOrderedDayOrders.findIndex(
              (o) => o.id === order.id
            );
            const stopNumber = globalIndex + 1;
            const totalStops = routeOrderedDayOrders.length;
            const docCount = getDocCount(order);
            const completed = Boolean(order.driverDelivery?.sentToFinance);
            const financeVerified = Boolean(order.driverDelivery?.financeVerified);
            const rejectedDocs = isDriverDocsRejected(order);
            const isDragging = draggedOrderId === order.id;
            const isDragOver = dragOverOrderId === order.id && !isDragging;

            const showRouteDivider =
              filter === 'all' &&
              rejectedDocsCount > 0 &&
              idx === rejectedDocsCount;

            const cardBorderClass = rejectedDocs
              ? 'border-2 border-red-500 bg-red-50/35 shadow-md ring-2 ring-red-500/20'
              : completed
                ? 'border border-emerald-400 bg-emerald-50/20'
                : docCount === 2
                  ? 'border-2 border-[#0f5864] bg-white shadow-sm'
                  : 'border border-[#7a9cbf] bg-white';

            return (
              <React.Fragment key={order.id}>
                {showRouteDivider && (
                  <div className="no-print flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      سایر سفارش‌های مسیر
                    </span>
                    <div className="h-px bg-slate-300/80 flex-1" />
                  </div>
                )}

                <article
                  draggable={!isFilteredView && !rejectedDocs}
                  onDragStart={(e) => {
                    if (rejectedDocs) return;
                    setDraggedOrderId(order.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', order.id);
                  }}
                  onDragOver={(e) => {
                    if (isFilteredView || rejectedDocs) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverOrderId !== order.id) {
                      setDragOverOrderId(order.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverOrderId === order.id) {
                      setDragOverOrderId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isFilteredView && !rejectedDocs) {
                      handleDropOnOrder(order.id);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedOrderId(null);
                    setDragOverOrderId(null);
                  }}
                  className={`order-card-printable ${
                    printingOrderId === order.id ? 'print-target' : ''
                  } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardBorderClass} ${
                    isDragging ? 'opacity-50 scale-[0.99]' : ''
                  } ${isDragOver ? 'ring-2 ring-[#0f5864] ring-offset-2' : ''}`}
                >
                  {/* RED TOP PRIORITY BANNER when Finance Rejected Driver Photos */}
                  {rejectedDocs && (
                    <div className="no-print px-4 py-2.5 bg-red-600 text-white space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          اولویت فوری — مدارک تحویل رد شد (نیازمند عکاسی مجدد)
                        </span>
                        {order.driverDelivery?.financeRejectedAt && (
                          <span className="tabular-nums text-[11px] opacity-90">
                            {order.driverDelivery.financeRejectedAt}
                          </span>
                        )}
                      </div>
                      {order.driverDelivery?.financeRejectionReason && (
                        <div className="text-[11px] sm:text-xs text-red-50 leading-relaxed bg-red-700/55 rounded-lg px-2.5 py-1.5">
                          <strong>دلیل رد صدور فاکتور:</strong>{' '}
                          {order.driverDelivery.financeRejectionReason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Emerald Banner when Completed */}
                  {completed && (
                    <div className="no-print px-4 py-2 bg-emerald-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        {financeVerified
                          ? 'تحویل تکمیل شد · تایید نهایی صدور فاکتور'
                          : 'اتمام تحویل ثبت شد · ارسال‌شده به صدور فاکتور'}
                      </span>
                      <span className="tabular-nums text-[11px] opacity-95">
                        {order.driverDelivery?.completedAt}
                      </span>
                    </div>
                  )}

                  {/* Teal Banner when Ready to Complete */}
                  {!completed && !rejectedDocs && docCount === 2 && (
                    <div className="no-print px-4 py-2 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <Camera className="w-4 h-4 shrink-0" />
                        هر دو عکس بارگذاری شد — آماده ثبت اتمام تحویل
                      </span>
                      <span className="text-[11px] opacity-95">بزنید برای اتمام</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch">
                    {/* Priority Rail: Ergonomic top bar on mobile, right rail on desktop */}
                    <div
                      className={`no-print sm:w-[136px] shrink-0 border-b sm:border-b-0 sm:border-l px-3.5 py-2.5 sm:py-3 flex sm:flex-col items-center justify-between sm:justify-center gap-2 ${
                        rejectedDocs
                          ? 'bg-red-100/70 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {!isFilteredView && !rejectedDocs && (
                          <span
                            title="برای تغییر اولویت بکشید"
                            className="hidden sm:inline-flex cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                        )}

                        {rejectedDocs ? (
                          <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-600 text-white whitespace-nowrap">
                            اولویت فوری
                          </span>
                        ) : (
                          <>
                            <label className="sr-only" htmlFor={`stop-select-${order.id}`}>
                              اولویت مسیر سفارش {order.code}
                            </label>
                            <select
                              id={`stop-select-${order.id}`}
                              value={stopNumber}
                              onChange={(e) =>
                                moveOrderToIndex(order.id, Number(e.target.value) - 1)
                              }
                              className={`tabular-nums h-10 sm:h-8 text-xs font-bold rounded-lg px-2.5 border focus:outline-none focus:ring-2 focus:ring-[#0f5864] cursor-pointer ${
                                completed
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-[#0f5864] text-white border-[#0c4850]'
                              }`}
                            >
                              {Array.from({ length: totalStops }, (_, i) => i + 1).map(
                                (rank) => (
                                  <option
                                    key={rank}
                                    value={rank}
                                    className="bg-white text-slate-900"
                                  >
                                    مسیر {toPersianDigits(rank)}
                                  </option>
                                )
                              )}
                            </select>
                          </>
                        )}
                      </div>

                      {!rejectedDocs && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={globalIndex <= rejectedDocsCount}
                            onClick={() => moveOrderToIndex(order.id, globalIndex - 1)}
                            title="انتقال به اولویت بالاتر"
                            aria-label={`افزایش اولویت سفارش ${order.code}`}
                            className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#0f5864] hover:text-[#0f5864] active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={globalIndex >= totalStops - 1}
                            onClick={() => moveOrderToIndex(order.id, globalIndex + 1)}
                            title="انتقال به اولویت پایین‌تر"
                            aria-label={`کاهش اولویت سفارش ${order.code}`}
                            className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#0f5864] hover:text-[#0f5864] active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Main Clickable Order Body + Mobile Action Bar */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectOrder(order.id)}
                        className="w-full text-right px-4 sm:px-5 pt-3.5 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                      >
                        {/* Top Row: Code + District + Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 flex-1 text-[13px]">
                            <div>
                              <span className="block text-[11px] text-slate-500 mb-0.5">
                                کد سفارش
                              </span>
                              <span
                                className={`tabular-nums text-base font-bold ${
                                  rejectedDocs ? 'text-red-700' : 'text-[#0056b3]'
                                }`}
                              >
                                {order.code}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[11px] text-slate-500 mb-0.5">
                                محدوده
                              </span>
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {order.district}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[11px] text-slate-500 mb-0.5">
                                تلفن مشتری
                              </span>
                              <span
                                dir="ltr"
                                className="tabular-nums font-bold text-slate-800 inline-block text-[13px]"
                              >
                                {order.customerPhone}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[11px] text-slate-500 mb-0.5">
                                مدارک تحویل
                              </span>
                              <span
                                className={`tabular-nums font-bold text-xs ${
                                  rejectedDocs
                                    ? 'text-red-700'
                                    : completed
                                      ? 'text-emerald-700'
                                      : docCount === 2
                                        ? 'text-[#0f5864]'
                                        : docCount === 1
                                          ? 'text-amber-700'
                                          : 'text-slate-500'
                                }`}
                              >
                                {rejectedDocs
                                  ? 'رد شده · عکاسی مجدد'
                                  : completed
                                    ? 'ارسال‌شده به فاکتور'
                                    : docCount === 2
                                      ? '۲ از ۲ · آماده اتمام'
                                      : docCount === 1
                                        ? order.driverDelivery?.invoicePhoto
                                          ? '۱ از ۲ · رسید باقی‌مانده'
                                          : '۱ از ۲ · فاکتور باقی‌مانده'
                                        : '۰ از ۲ · ثبت عکس'}
                              </span>
                            </div>
                          </div>

                          <div className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#0f5864] shrink-0 pt-1">
                            <span>{rejectedDocs ? 'عکاسی مجدد' : 'ثبت عکس'}</span>
                            <ChevronLeft className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Readable Full Address & Time Slot */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs sm:text-[13px] text-slate-700">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="leading-relaxed font-medium text-slate-800">
                              {order.address}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                بازه {order.deliverySlot}
                              </span>
                              {order.driverName && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>راننده: {order.driverName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Action Footer: 2-column Full-Width Touch Buttons on Mobile */}
                      <div className="no-print px-4 sm:px-5 pb-3.5 pt-1 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2">
                        <a
                          href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCallCustomer(order);
                          }}
                          className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                          <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          تماس با مشتری
                        </a>

                        <button
                          type="button"
                          onClick={() => onSelectOrder(order.id)}
                          className={`min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold border active:scale-[0.98] transition-all whitespace-nowrap ${
                            rejectedDocs
                              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                              : completed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-[#0f5864] sm:bg-white text-white sm:text-[#0f5864] border-[#0f5864] hover:bg-[#0f5864] hover:text-white'
                          }`}
                        >
                          <Camera className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          {rejectedDocs
                            ? 'ثبت عکس مجدد'
                            : completed
                              ? 'مشاهده مدارک'
                              : 'عکس فاکتور و رسید'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Print-only Summary Table */}
                  <div className="hidden print:block border-t border-slate-200 px-5 py-2 text-xs text-slate-700">
                    <div className="font-bold mb-1">
                      اولویت مسیر {toPersianDigits(stopNumber)} — {order.district}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {order.items.map((item) => (
                        <span key={item.id} className="tabular-nums">
                          {item.productName}: {formatWeight(getShippingWeight(item))}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
