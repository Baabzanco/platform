import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  MapPin,
  Package,
  Printer,
  RotateCcw,
  Search,
  Truck,
  Zap,
} from 'lucide-react';
import { DEPARTMENT_LABELS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import { formatWeight, getShippingWeight } from '../../utils/formatters';

interface ShippingPageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
}

type ShippingFilter = 'all' | 'locked' | 'ready' | 'delivered' | 'returned' | 'rejected';

function isLocked(order: Order): boolean {
  return (
    order.status === 'pending_production_approval' ||
    order.status === 'in_production' ||
    order.status === 'pending_finance_approval' ||
    order.status === 'finance_discrepancy_review'
  );
}

function isPendingReturnConfirmInShipping(order: Order): boolean {
  return (
    order.status === 'returned' &&
    !(order.returnRecord?.confirmations.shipping.confirmed ?? false)
  );
}

function isShippingPriority(order: Order): boolean {
  return isPendingReturnConfirmInShipping(order) || order.status === 'pending_shipping';
}

function getShippingSortRank(order: Order): number {
  if (isPendingReturnConfirmInShipping(order)) return 0;
  if (order.status === 'pending_shipping') return 1;
  if (order.status === 'finance_discrepancy_review') return 2;
  if (isLocked(order)) return 3;
  if (order.status === 'delivered') return 4;
  if (order.status === 'returned') return 5;
  return 6;
}

function getShippingStatusDisplay(order: Order): { label: string; className: string } {
  if (order.status === 'rejected') {
    const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
    return { label: `رد شده (${src})`, className: 'text-red-700' };
  }
  if (order.status === 'returned') {
    const confirmed = order.returnRecord?.confirmations.shipping.confirmed;
    return confirmed
      ? { label: 'مرجوعی تایید شده', className: 'text-emerald-700' }
      : { label: 'مرجوع شده — نیازمند تایید ارسال', className: 'text-red-700' };
  }
  if (order.status === 'delivered') {
    return { label: `تحویل به ${order.driverName}`, className: 'text-emerald-700' };
  }
  if (order.status === 'pending_shipping') {
    return { label: 'آماده تخصیص راننده و خروج', className: 'text-[#0f5864]' };
  }
  if (order.status === 'finance_discrepancy_review') {
    return { label: 'ارجاع به صدور فاکتور (مغایرت وزن)', className: 'text-amber-700' };
  }
  return { label: 'در انتظار تایید واحد صدور فاکتور', className: 'text-slate-500' };
}

export const ShippingPage: React.FC<ShippingPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ShippingFilter>('all');

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'locked' && isLocked(order)) ||
        (filter === 'ready' && order.status === 'pending_shipping') ||
        (filter === 'delivered' && order.status === 'delivered') ||
        (filter === 'returned' && order.status === 'returned') ||
        (filter === 'rejected' && order.status === 'rejected');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.address.toLowerCase().includes(q) ||
        order.driverName.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const rankDiff = getShippingSortRank(a) - getShippingSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      if (isShippingPriority(a) && isShippingPriority(b)) {
        return b.lastActionAt - a.lastActionAt;
      }
      return 0;
    });
  }, [orders, searchQuery, filter]);

  const priorityCount = useMemo(
    () => sortedAndFilteredOrders.filter(isShippingPriority).length,
    [sortedAndFilteredOrders]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>داشبورد مدیریت</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800">بخش ارسال</span>
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          پرینت تمامی سفارشات
        </button>
      </header>

      {/* Search & Filter */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد سفارش، آدرس یا راننده..."
            className="w-64 pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: 'همه' },
              { id: 'ready', label: 'آماده ارسال' },
              { id: 'locked', label: 'در انتظار صدور فاکتور' },
              { id: 'delivered', label: 'تحویل شده' },
              { id: 'returned', label: 'مرجوعی' },
              { id: 'rejected', label: 'رد شده' },
            ] as Array<{ id: ShippingFilter; label: string }>
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

      {/* Collapsed Shipping Order Cards (Click to open popup) */}
      <div className="flex flex-col gap-3">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              {orders.length === 0
                ? 'در این تاریخ سفارشی برای ارسال ثبت نشده است.'
                : 'سفارشی در این بخش یافت نشد.'}
            </p>
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-lg hover:bg-[#0f5864] hover:text-white transition-colors"
              >
                نمایش همه سفارش‌ها
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredOrders.map((order, index) => {
            const rejected = order.status === 'rejected';
            const returned = order.status === 'returned';
            const pendingReturnConfirm = isPendingReturnConfirmInShipping(order);
            const delivered = order.status === 'delivered';
            const readyToShip = order.status === 'pending_shipping';
            const discrepancyReview = order.status === 'finance_discrepancy_review';
            const statusDisplay = getShippingStatusDisplay(order);
            const totalEffectiveKg = order.items.reduce(
              (sum, i) => sum + getShippingWeight(i),
              0
            );

            const showOtherDivider = priorityCount > 0 && index === priorityCount;

            const cardStyle = pendingReturnConfirm
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20 hover:bg-red-50/30'
              : rejected || returned
                ? 'border border-red-300 bg-red-50/20 hover:border-red-400'
                : readyToShip
                  ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15 hover:bg-[#f4fafa]'
                  : delivered
                    ? 'border border-emerald-400 bg-emerald-50/20 hover:border-emerald-500'
                    : discrepancyReview
                      ? 'border border-amber-400 bg-amber-50/20 hover:border-amber-500'
                      : 'border border-[#7a9cbf] bg-white hover:border-[#0f5864] hover:shadow-xs';

            return (
              <React.Fragment key={order.id}>
                {showOtherDivider && (
                  <div className="no-print flex items-center gap-3 pt-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      سایر سفارش‌ها
                    </span>
                    <div className="h-px bg-slate-300/80 flex-1" />
                  </div>
                )}

                <article
                  className={`order-card-printable ${
                    printingOrderId === order.id ? 'print-target' : ''
                  } rounded-lg overflow-hidden transition-all ${cardStyle}`}
                >
                  {/* Clickable Collapsed Summary Surface */}
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className="w-full text-right block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                  >
                    {pendingReturnConfirm && (
                      <div className="no-print px-5 py-1.5 bg-red-600 text-white flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          سفارش مرجوعی — نیازمند تایید مرجوعی در بخش ارسال
                        </span>
                        <span className="opacity-95 text-[11px]">کلیک برای تایید</span>
                      </div>
                    )}

                    {readyToShip && (
                      <div className="no-print px-5 py-1.5 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          اولویت ارسال — تاییدشده توسط بخش صدور فاکتور، آماده تخصیص راننده و خروج
                        </span>
                        <span className="opacity-95 text-[11px]">کلیک برای تخصیص راننده</span>
                      </div>
                    )}

                    <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 flex-1 items-center text-[13px]">
                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">کد سفارش</span>
                          <span
                            className={`tabular-nums text-[15px] font-bold ${
                              rejected || returned ? 'text-red-700' : 'text-[#0056b3]'
                            }`}
                          >
                            {order.code}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">بازه ارسال</span>
                          <span className="font-semibold text-slate-800">{order.deliverySlot}</span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">اقلام و وزن</span>
                          <span className="tabular-nums font-medium text-slate-700 inline-flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {order.items.length} قلم · {formatWeight(totalEffectiveKg)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">وضعیت ارسال</span>
                          <span className={`font-bold text-xs inline-flex items-center gap-1 ${statusDisplay.className}`}>
                            {delivered && <Truck className="w-3.5 h-3.5 shrink-0" />}
                            {statusDisplay.label}
                          </span>
                        </div>
                      </div>

                      <div className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f5864] shrink-0">
                        <span>مشاهده و اقدام</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Subtle 1-line address preview inside collapsed card */}
                    <div className="px-5 pb-3 pt-0 flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{order.address}</span>
                    </div>
                  </button>

                  {/* Print-only Full Detail Table */}
                  <div className="hidden print:block border-t border-slate-200 bg-white">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="text-right px-5 py-2">نام محصول</th>
                          <th className="text-right px-5 py-2">مقدار درخواستی</th>
                          <th className="text-right px-5 py-2">مقدار تحویلی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-5 py-2 font-medium">{item.productName}</td>
                            <td className="tabular-nums px-5 py-2">
                              {formatWeight(item.requestedWeight)}
                            </td>
                            <td className="tabular-nums px-5 py-2 font-semibold">
                              {formatWeight(getShippingWeight(item))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
