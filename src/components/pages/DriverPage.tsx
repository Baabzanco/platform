import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Camera,
  CheckCircle2,
  ChevronLeft,
  GripVertical,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Search,
} from 'lucide-react';
import { DRIVERS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import { formatWeight, getShippingWeight } from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface DriverPageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onReorderOrders: (orderedIds: string[]) => void;
  onCallCustomer: (order: Order) => void;
  onSortByDistrictToast: () => void;
}

type DriverFilter = 'all' | 'pending' | 'ready_complete' | 'completed';

function getDocCount(order: Order): number {
  let count = 0;
  if (order.driverDelivery?.invoicePhoto) count += 1;
  if (order.driverDelivery?.paymentReceiptPhoto) count += 1;
  return count;
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

  // Active deliverable orders on the selected day sorted by driver's route priority
  const routeOrderedDayOrders = useMemo(() => {
    return orders
      .filter((order) => order.status !== 'rejected')
      .slice()
      .sort((a, b) => a.routeOrder - b.routeOrder);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routeOrderedDayOrders.filter((order) => {
      const completed = Boolean(order.driverDelivery?.sentToFinance);
      const docCount = getDocCount(order);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'pending' && !completed) ||
        (filter === 'ready_complete' && !completed && docCount === 2) ||
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

  // Move order to a specific 0-based index within routeOrderedDayOrders
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
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>داشبورد مدیریت</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800">پنل رانندگان و اولویت‌بندی مسیر</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutoSortByDistrict}
            disabled={routeOrderedDayOrders.length <= 1}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:border-[#0f5864] hover:text-[#0f5864] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            مرتب‌سازی بر اساس محدوده
          </button>

          <button
            type="button"
            onClick={onPrintAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            پرینت لیست مسیر
          </button>
        </div>
      </header>

      {/* Route Planning Summary & Guidance Strip */}
      <section className="no-print bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700">
          <Navigation className="w-4 h-4 text-[#0f5864] shrink-0" />
          <span>
            با کشیدن کارت‌ها یا دکمه‌های بالا/پایین، ترتیب تحویل سفارش‌ها را بر اساس مسیر مشخص کنید. برای ثبت عکس فاکتور و رسید پرداخت روی هر سفارش کلیک کنید.
          </span>
        </div>

        <div className="tabular-nums text-slate-600 flex items-center gap-3 shrink-0 font-medium">
          <span>
            کل مسیر روز:{' '}
            <strong className="text-slate-900">
              {toPersianDigits(routeOrderedDayOrders.length)} سفارش
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            تحویل تکمیل‌شده:{' '}
            <strong className="text-emerald-700">
              {toPersianDigits(completedCount)} از {toPersianDigits(routeOrderedDayOrders.length)}
            </strong>
          </span>
        </div>
      </section>

      {/* Search, Driver Filter & Status Filter */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو کد، محدوده، آدرس یا تلفن..."
              className="w-64 pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f5864]"
            />
          </div>

          <select
            aria-label="فیلتر راننده"
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0f5864]"
          >
            <option value="all">همه رانندگان</option>
            {DRIVERS.map((driver) => (
              <option key={driver.id} value={driver.name}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: 'همه' },
              { id: 'pending', label: 'در انتظار تحویل' },
              { id: 'ready_complete', label: 'آماده اتمام تحویل' },
              { id: 'completed', label: 'تکمیل و ارسال‌شده' },
            ] as Array<{ id: DriverFilter; label: string }>
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prioritized Driver Route Order Cards */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
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
                className="px-4 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-lg hover:bg-[#0f5864] hover:text-white transition-colors"
              >
                نمایش همه سفارش‌های مسیر
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const globalIndex = routeOrderedDayOrders.findIndex(
              (o) => o.id === order.id
            );
            const stopNumber = globalIndex + 1;
            const totalStops = routeOrderedDayOrders.length;
            const docCount = getDocCount(order);
            const completed = Boolean(order.driverDelivery?.sentToFinance);
            const financeVerified = Boolean(order.driverDelivery?.financeVerified);
            const isDragging = draggedOrderId === order.id;
            const isDragOver = dragOverOrderId === order.id && !isDragging;

            const cardBorderClass = completed
              ? 'border border-emerald-400 bg-emerald-50/20 hover:border-emerald-500'
              : docCount === 2
                ? 'border-2 border-[#0f5864] bg-white shadow-sm hover:bg-[#f4fafa]'
                : 'border border-[#7a9cbf] bg-white hover:border-[#0f5864] hover:shadow-xs';

            return (
              <article
                key={order.id}
                draggable={!isFilteredView}
                onDragStart={(e) => {
                  setDraggedOrderId(order.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', order.id);
                }}
                onDragOver={(e) => {
                  if (isFilteredView) return;
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
                  if (!isFilteredView) {
                    handleDropOnOrder(order.id);
                  }
                }}
                onDragEnd={() => {
                  setDraggedOrderId(null);
                  setDragOverOrderId(null);
                }}
                className={`order-card-printable ${
                  printingOrderId === order.id ? 'print-target' : ''
                } rounded-lg overflow-hidden transition-all ${cardBorderClass} ${
                  isDragging ? 'opacity-50 scale-[0.99]' : ''
                } ${isDragOver ? 'ring-2 ring-[#0f5864] ring-offset-2' : ''}`}
              >
                {/* Top Strip when Completed or Ready to Finish */}
                {completed && (
                  <div className="no-print px-4 py-1.5 bg-emerald-600 text-white flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {financeVerified
                        ? 'تحویل تکمیل شد · مدارک توسط بخش صدور فاکتور تایید نهایی گردید'
                        : 'اتمام تحویل ثبت شد · عکس فاکتور و رسید پرداخت به بخش صدور فاکتور ارسال شد'}
                    </span>
                    <span className="tabular-nums text-[11px] opacity-95">
                      {order.driverDelivery?.completedAt}
                    </span>
                  </div>
                )}

                {!completed && docCount === 2 && (
                  <div className="no-print px-4 py-1.5 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      عکس فاکتور و رسید پرداخت بارگذاری شد — آماده ثبت اتمام تحویل
                    </span>
                    <span className="text-[11px] opacity-95">کلیک برای اتمام تحویل</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Right Rail (RTL): Route Priority & Reordering Controls */}
                  <div className="no-print sm:w-[132px] shrink-0 bg-slate-50 border-b sm:border-b-0 sm:border-l border-slate-200 px-3 py-3 flex sm:flex-col items-center justify-between sm:justify-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {!isFilteredView && (
                        <span
                          title="برای تغییر اولویت بکشید"
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                      )}
                      <label className="sr-only" htmlFor={`stop-select-${order.id}`}>
                        اولویت مسیر سفارش {order.code}
                      </label>
                      <select
                        id={`stop-select-${order.id}`}
                        value={stopNumber}
                        onChange={(e) =>
                          moveOrderToIndex(order.id, Number(e.target.value) - 1)
                        }
                        title="انتخاب اولویت مسیر"
                        className={`tabular-nums text-xs font-bold rounded-md px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-[#0f5864] cursor-pointer ${
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
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={globalIndex <= 0}
                        onClick={() => moveOrderToIndex(order.id, globalIndex - 1)}
                        title="انتقال به اولویت بالاتر"
                        aria-label={`افزایش اولویت سفارش ${order.code}`}
                        className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-[#0f5864] hover:text-[#0f5864] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={globalIndex >= totalStops - 1}
                        onClick={() => moveOrderToIndex(order.id, globalIndex + 1)}
                        title="انتقال به اولویت پایین‌تر"
                        aria-label={`کاهش اولویت سفارش ${order.code}`}
                        className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-[#0f5864] hover:text-[#0f5864] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Clickable Collapsed Order Summary */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className="w-full text-right px-4 sm:px-5 pt-3.5 pb-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-2.5 flex-1 text-[13px]">
                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">
                              کد سفارش
                            </span>
                            <span className="tabular-nums text-[15px] font-bold text-[#0056b3]">
                              {order.code}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">
                              محدوده
                            </span>
                            <span className="font-bold text-slate-900 block truncate">
                              {order.district}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">
                              تلفن مشتری
                            </span>
                            <span
                              dir="ltr"
                              className="tabular-nums font-semibold text-slate-800 inline-block"
                            >
                              {order.customerPhone}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">
                              وضعیت مدارک تحویل
                            </span>
                            <span
                              className={`tabular-nums font-bold text-xs ${
                                completed
                                  ? 'text-emerald-700'
                                  : docCount === 2
                                    ? 'text-[#0f5864]'
                                    : docCount === 1
                                      ? 'text-amber-700'
                                      : 'text-slate-500'
                              }`}
                            >
                              {completed
                                ? 'ارسال‌شده به صدور فاکتور'
                                : docCount === 2
                                  ? '۲ از ۲ مدرک (آماده اتمام)'
                                  : docCount === 1
                                    ? order.driverDelivery?.invoicePhoto
                                      ? '۱ از ۲ · در انتظار رسید پرداخت'
                                      : '۱ از ۲ · در انتظار عکس فاکتور'
                                    : '۰ از ۲ · نیاز به ثبت عکس'}
                            </span>
                          </div>
                        </div>

                        <div className="no-print inline-flex items-center gap-1 text-xs font-semibold text-[#0f5864] shrink-0 pt-1">
                          <span>ثبت عکس و تحویل</span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>
                    </button>

                    {/* Address + Direct Call Customer Footer Strip */}
                    <div className="px-4 sm:px-5 pb-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 flex-1 min-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {order.address}
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="text-slate-500">
                            بازه {order.deliverySlot}
                          </span>
                          {order.driverName && (
                            <>
                              <span className="text-slate-400 mx-1.5">·</span>
                              <span className="text-slate-600 font-medium">
                                راننده: {order.driverName}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="no-print flex items-center gap-2 shrink-0">
                        <a
                          href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCallCustomer(order);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          تماس با مشتری
                        </a>

                        <button
                          type="button"
                          onClick={() => onSelectOrder(order.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                            completed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-[#0f5864] border-[#0f5864] hover:bg-[#0f5864] hover:text-white'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {completed ? 'مشاهده مدارک' : 'عکس فاکتور و رسید'}
                        </button>
                      </div>
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
            );
          })
        )}
      </div>
    </div>
  );
};
