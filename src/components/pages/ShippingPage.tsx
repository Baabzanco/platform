import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lock,
  MapPin,
  Printer,
  RotateCcw,
  Scale,
  Search,
  Truck,
  Zap,
} from 'lucide-react';
import { DEPARTMENT_LABELS, DRIVERS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import { formatWeight, getShippingWeight } from '../../utils/formatters';
import { ReturnResolutionBox } from '../ReturnResolutionBox';

interface ShippingPageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onPrintSingle: (orderId: string) => void;
  onSelectDriver: (orderId: string, driverName: string) => void;
  onOpenDiscrepancy: (order: Order) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenReturn: (order: Order) => void;
  onConfirmReturn: (orderId: string) => void;
  onDriverMissingWarning: (orderCode: string) => void;
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
  if (isPendingReturnConfirmInShipping(order)) return 0; // Return awaiting shipping confirmation
  if (order.status === 'pending_shipping') return 1;     // Active in shipping -> top priority
  if (order.status === 'finance_discrepancy_review') return 2;
  if (isLocked(order)) return 3;
  if (order.status === 'delivered') return 4;
  if (order.status === 'returned') return 5;
  return 6; // rejected
}

export const ShippingPage: React.FC<ShippingPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onPrintSingle,
  onSelectDriver,
  onOpenDiscrepancy,
  onOpenDelivery,
  onOpenReturn,
  onConfirmReturn,
  onDriverMissingWarning,
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

  const handleDeliveryClick = (order: Order) => {
    if (!order.driverName) {
      onDriverMissingWarning(order.code);
      return;
    }
    onOpenDelivery(order);
  };

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
              { id: 'locked', label: 'در انتظار مالی' },
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

      {/* Shipping Cards */}
      <div className="flex flex-col gap-4">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              سفارشی در این بخش یافت نشد.
            </p>
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
          </div>
        ) : (
          sortedAndFilteredOrders.map((order, index) => {
            const rejected = order.status === 'rejected';
            const returned = order.status === 'returned';
            const pendingReturnConfirm = isPendingReturnConfirmInShipping(order);
            const delivered = order.status === 'delivered';
            const readyToShip = order.status === 'pending_shipping';
            const discrepancyReview = order.status === 'finance_discrepancy_review';

            const showOtherDivider =
              priorityCount > 0 && index === priorityCount;

            const cardStyle = pendingReturnConfirm
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20'
              : rejected || returned
                ? 'border border-red-400 bg-white'
                : readyToShip
                  ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15'
                  : delivered
                    ? 'border border-emerald-500 bg-white'
                    : discrepancyReview
                      ? 'border border-amber-500 bg-white'
                      : 'border border-[#7a9cbf] bg-white';

            const headerBg = rejected || returned
              ? 'bg-red-100/80'
              : readyToShip
                ? 'bg-[#eaf4f6]'
                : 'bg-[#eef2f9]';

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
                  {/* Featured Priority Strip for Unconfirmed Return */}
                  {pendingReturnConfirm && (
                    <div className="no-print px-5 py-2 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        سفارش مرجوعی — به همه واحدها اعلام شد، نیازمند تایید مرجوعی در بخش ارسال
                      </span>
                      <span className="tabular-nums opacity-95 font-medium">
                        سفارش {order.code}
                      </span>
                    </div>
                  )}

                  {/* Featured Priority Strip for Ready-to-Ship Orders */}
                  {readyToShip && (
                    <div className="no-print px-5 py-2 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        اولویت ارسال — تاییدشده توسط مالی، آماده تخصیص راننده و خروج
                      </span>
                      <span className="opacity-95 font-medium">
                        بازه ارسال: {order.deliverySlot}
                      </span>
                    </div>
                  )}

                  {/* Header (Order Code & Delivery Slot only — no customer name) */}
                  <div className={`px-5 py-4 border-b border-slate-200 ${headerBg}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex flex-wrap items-center gap-x-10 gap-y-2 flex-1">
                        <div className="text-[13px]">
                          <span className="block text-xs text-slate-500 mb-1">کد سفارش</span>
                          <span
                            className={`tabular-nums font-bold ${
                              rejected || returned ? 'text-red-700' : 'text-[#0056b3]'
                            }`}
                          >
                            {order.code}
                          </span>
                        </div>
                        <div className="text-[13px]">
                          <span className="block text-xs text-slate-500 mb-1">بازه ارسال</span>
                          <span className="font-bold text-slate-800">{order.deliverySlot}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onPrintSingle(order.id)}
                        className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        پرینت
                      </button>
                    </div>

                    <div className="flex items-start gap-2 bg-white border border-dashed border-slate-300 rounded-md px-3.5 py-2.5 text-[13px] text-slate-700">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>آدرس تحویل:</strong> {order.address}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Banner */}
                  {rejected && order.rejection && (
                    <div className="px-5 py-3 bg-red-100 text-red-900 border-b border-red-300 text-[13px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                      <span>
                        سفارش توسط <strong>{DEPARTMENT_LABELS[order.rejection.source]}</strong> رد شد — دلیل:{' '}
                        <strong>{order.rejection.reason}</strong>
                      </span>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full border-collapse text-[13px] ${
                        rejected ? 'opacity-60' : ''
                      }`}
                    >
                      <thead>
                        <tr className="bg-white border-b border-slate-200 text-slate-500">
                          <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                          <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                          <th className="text-right font-normal px-5 py-2.5">
                            مقدار تحویل شده (تولید / واقعی)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {order.items.map((item) => {
                          const effectiveWeight = getShippingWeight(item);
                          const showRevisionDiff =
                            item.deliveredWeight === null &&
                            item.revisedWeight !== null &&
                            item.previousWeightBeforeDiscrepancy !== null;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3 font-medium text-slate-900">
                                {item.productName}
                              </td>
                              <td className="tabular-nums px-5 py-3 text-slate-600">
                                {formatWeight(item.requestedWeight)}
                              </td>
                              <td className="tabular-nums px-5 py-3">
                                {showRevisionDiff ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="line-through text-red-600 text-xs">
                                      {formatWeight(item.previousWeightBeforeDiscrepancy!)}
                                    </span>
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-xs">
                                      {formatWeight(item.revisedWeight!)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-900">
                                    {formatWeight(effectiveWeight)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Locked State */}
                  {rejected && (
                    <div className="px-5 py-3.5 bg-red-50 text-red-800 border-t border-red-200 text-[13px] font-bold flex items-center gap-2">
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>
                        این سفارش توسط{' '}
                        {order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : 'واحد مربوطه'}{' '}
                        رد شده و ارسال آن لغو گردید.
                      </span>
                    </div>
                  )}

                  {discrepancyReview && (
                    <div className="px-5 py-3.5 bg-amber-50 text-amber-900 border-t border-amber-200 text-[13px] font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>
                        مغایرت وزن ثبت شد و سفارش جهت بررسی و تایید مجدد فاکتور به واحد مالی ارجاع گردید.
                      </span>
                    </div>
                  )}

                  {(order.status === 'pending_production_approval' ||
                    order.status === 'in_production' ||
                    order.status === 'pending_finance_approval') && (
                    <div className="px-5 py-3.5 bg-amber-50/90 text-amber-900 border-t border-amber-200 text-[13px] font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        این سفارش در انتظار تایید نهایی توسط واحد مالی است. پس از تایید، امکان تخصیص راننده فراهم می‌شود.
                      </span>
                    </div>
                  )}

                  {/* Ready to Ship Actions */}
                  {readyToShip && (
                    <div className="no-print px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
                        <label
                          htmlFor={`driver-${order.id}`}
                          className="text-xs font-medium text-slate-700 whitespace-nowrap"
                        >
                          انتخاب راننده:
                        </label>
                        <select
                          id={`driver-${order.id}`}
                          value={order.driverName}
                          onChange={(e) => onSelectDriver(order.id, e.target.value)}
                          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#0f5864]"
                        >
                          <option value="">-- انتخاب کنید --</option>
                          {DRIVERS.map((driver) => (
                            <option key={driver.id} value={driver.name}>
                              {driver.name} ({driver.vehicle})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenDiscrepancy(order)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-500 hover:text-white transition-colors whitespace-nowrap"
                        >
                          <Scale className="w-4 h-4" />
                          مغایرت وزن / ارجاع به مالی
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeliveryClick(order)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
                        >
                          <Truck className="w-4 h-4" />
                          ثبت وزن و تحویل به راننده
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delivered / Returned Bar */}
                  {(delivered || returned) && (
                    <div className="px-5 py-3.5 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-emerald-800 font-bold text-[13px]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        با موفقیت تحویل داده شد (راننده: {order.driverName})
                      </span>

                      <button
                        type="button"
                        disabled={returned}
                        onClick={() => onOpenReturn(order)}
                        className="no-print inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold bg-white text-red-600 border border-red-500 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {returned ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            مرجوعی ثبت شد
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            مرجوع کردن سفارش
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Return Resolution & Cross-Department Confirmation Box */}
                  {returned && order.returnRecord && (
                    <ReturnResolutionBox
                      returnRecord={order.returnRecord}
                      currentDept="shipping"
                      onConfirmReturn={() => onConfirmReturn(order.id)}
                    />
                  )}
                </article>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
