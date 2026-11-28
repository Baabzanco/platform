import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Plus,
  Printer,
  Search,
  Store,
} from 'lucide-react';
import { Order } from '../../types/order';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
} from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface InPersonSalesPageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onOpenNewSale: () => void;
}

type InPersonFilter = 'all' | 'rejected_docs' | 'pending_finance' | 'verified';

function isRejectedInPerson(order: Order): boolean {
  return Boolean(
    order.driverDelivery?.financeRejected &&
      !order.driverDelivery?.sentToFinance
  );
}

function isVerifiedInPerson(order: Order): boolean {
  return Boolean(
    order.driverDelivery?.sentToFinance &&
      order.driverDelivery?.financeVerified
  );
}

function isPendingFinanceInPerson(order: Order): boolean {
  return Boolean(
    order.driverDelivery?.sentToFinance &&
      !order.driverDelivery?.financeVerified
  );
}

export const InPersonSalesPage: React.FC<InPersonSalesPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onOpenNewSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<InPersonFilter>('all');

  const summary = useMemo(() => {
    let totalWeight = 0;
    let totalRial = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let verifiedCount = 0;

    for (const order of orders) {
      totalWeight += order.items.reduce(
        (sum, it) => sum + it.requestedWeight,
        0
      );
      totalRial += calculateOrderTotal(order);
      if (isRejectedInPerson(order)) rejectedCount += 1;
      else if (isVerifiedInPerson(order)) verifiedCount += 1;
      else pendingCount += 1;
    }

    return {
      count: orders.length,
      totalWeight: Number(totalWeight.toFixed(2)),
      totalRial,
      pendingCount,
      rejectedCount,
      verifiedCount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'rejected_docs' && isRejectedInPerson(order)) ||
        (filter === 'pending_finance' && isPendingFinanceInPerson(order)) ||
        (filter === 'verified' && isVerifiedInPerson(order));

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.inPersonPaymentMethod ?? '').toLowerCase().includes(q) ||
        order.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const rank = (o: Order) =>
        isRejectedInPerson(o) ? 0 : isPendingFinanceInPerson(o) ? 1 : 2;
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return b.lastActionAt - a.lastActionAt;
    });
  }, [orders, searchQuery, filter]);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            فروش حضوری
          </h1>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 hidden md:inline">
            ارسال مستقیم به صدور فاکتور (بدون نمایش در تولید، ارسال، راننده و کارشناس فروش)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintAll}
            title="پرینت لیست فروش حضوری"
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">پرینت لیست</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            ثبت فروش حضوری جدید
          </button>
        </div>
      </header>

      {/* Single-elevation Summary Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200">
        <div className="px-4 py-3">
          <span className="block text-[11px] text-slate-500 mb-0.5">
            تعداد فروش حضوری روز
          </span>
          <span className="tabular-nums text-base font-bold text-slate-900">
            {toPersianDigits(summary.count)} فاکتور
          </span>
        </div>
        <div className="px-4 py-3">
          <span className="block text-[11px] text-slate-500 mb-0.5">
            مجموع وزن تحویلی
          </span>
          <span className="tabular-nums text-base font-bold text-slate-900">
            {formatWeight(summary.totalWeight)}
          </span>
        </div>
        <div className="px-4 py-3">
          <span className="block text-[11px] text-slate-500 mb-0.5">
            جمع کل فروش حضوری
          </span>
          <span className="tabular-nums text-base font-bold text-[#0f5864]">
            {formatRial(summary.totalRial)}
          </span>
        </div>
        <div className="px-4 py-3">
          <span className="block text-[11px] text-slate-500 mb-0.5">
            وضعیت بررسی صدور فاکتور
          </span>
          <div className="tabular-nums text-xs font-bold flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            <span className="text-emerald-700">
              {toPersianDigits(summary.verifiedCount)} تاییدشده
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-700">
              {toPersianDigits(summary.pendingCount)} در انتظار
            </span>
            {summary.rejectedCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-red-700">
                  {toPersianDigits(summary.rejectedCount)} نیازمند اصلاح
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد، نام مشتری، نحوه خرید یا محصول..."
            className="w-full sm:w-72 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
            {(
              [
                { id: 'all', label: 'همه' },
                {
                  id: 'rejected_docs',
                  label:
                    summary.rejectedCount > 0
                      ? `نیازمند اصلاح مدارک (${toPersianDigits(summary.rejectedCount)})`
                      : 'نیازمند اصلاح مدارک',
                },
                { id: 'pending_finance', label: 'در انتظار تایید فاکتور' },
                { id: 'verified', label: 'تایید شده' },
              ] as Array<{ id: InPersonFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f5864]/10 text-[#0f5864] mx-auto flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {orders.length === 0
                ? 'در این تاریخ هنوز فروش حضوری ثبت نشده است.'
                : 'سفارشی با فیلتر یا جستجوی فعلی یافت نشد.'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              سفارش‌های ثبت‌شده در این بخش با نام مشتری و نحوه خرید دستی به همراه عکس فاکتور و رسید، مستقیم برای واحد صدور فاکتور ارسال می‌شوند.
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              {orders.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  className="min-h-[42px] px-4 py-2 text-xs font-bold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
                >
                  نمایش همه فروش‌های حضوری
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenNewSale}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-[#0f5864] text-white rounded-xl hover:bg-[#0b434d] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  ثبت اولین فروش حضوری
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const rejected = isRejectedInPerson(order);
            const verified = isVerifiedInPerson(order);
            const orderTotal = calculateOrderTotal(order);
            const totalWeight = Number(
              order.items
                .reduce((sum, it) => sum + it.requestedWeight, 0)
                .toFixed(2)
            );
            const hasBothPhotos = Boolean(
              order.driverDelivery?.invoicePhoto &&
                order.driverDelivery?.paymentReceiptPhoto
            );

            const cardBorder = rejected
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20'
              : verified
                ? 'border border-emerald-300 bg-emerald-50/15 hover:border-emerald-500'
                : 'border border-slate-200 bg-white hover:border-[#0f5864]';

            return (
              <article
                key={order.id}
                className={`order-card-printable ${
                  printingOrderId === order.id ? 'print-target' : ''
                } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardBorder}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectOrder(order.id)}
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      onSelectOrder(order.id);
                    }
                  }}
                  className="w-full text-right block cursor-pointer active:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                >
                  {rejected && (
                    <div className="no-print px-4 sm:px-5 py-2 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        مدارک توسط صدور فاکتور رد شد — نیازمند ثبت عکس مجدد
                      </span>
                      <span className="text-[11px] opacity-95 truncate max-w-[280px]">
                        {order.driverDelivery?.financeRejectionReason}
                      </span>
                    </div>
                  )}

                  <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 sm:gap-x-5 gap-y-2.5 flex-1 items-center text-[13px]">
                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          کد سفارش
                        </span>
                        <span
                          className={`tabular-nums text-base font-bold ${
                            rejected ? 'text-red-700' : 'text-[#0056b3]'
                          }`}
                        >
                          {order.code}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          نام مشتری (دستی)
                        </span>
                        <span className="font-bold text-slate-900 block truncate">
                          {order.customerName}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          نحوه خرید
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 max-w-full">
                          <CreditCard className="w-3.5 h-3.5 text-[#0f5864] shrink-0" />
                          <span className="truncate">
                            {order.inPersonPaymentMethod || 'ثبت‌نشده'}
                          </span>
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          مبلغ و وزن کل
                        </span>
                        <div className="tabular-nums font-bold text-[#0f5864]">
                          {formatRial(orderTotal)}
                        </div>
                        <div className="tabular-nums text-[11px] text-slate-500">
                          {formatWeight(totalWeight)} ·{' '}
                          {toPersianDigits(order.items.length)} قلم
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          وضعیت صدور فاکتور
                        </span>
                        {rejected ? (
                          <span className="font-bold text-xs text-red-700">
                            رد مدارک — ثبت عکس مجدد
                          </span>
                        ) : verified ? (
                          <span className="font-bold text-xs text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            مدارک تایید شد
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-amber-700 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            در انتظار تایید فاکتور
                          </span>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <Camera className="w-3 h-3 shrink-0" />
                          <span>
                            {hasBothPhotos
                              ? 'عکس فاکتور و رسید پیوست شده'
                              : 'مدارک ناقص'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="no-print pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex items-center justify-between sm:justify-end gap-1.5 text-xs font-bold text-[#0f5864] shrink-0">
                      <span>{rejected ? 'اصلاح عکس‌ها' : 'مشاهده جزئیات'}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Print-only Detail Table */}
                <div className="hidden print:block border-t border-slate-200 bg-white">
                  <div className="px-5 py-2 text-xs text-slate-600 border-b border-slate-100">
                    نحوه خرید: <strong>{order.inPersonPaymentMethod}</strong>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-right px-5 py-2">نام محصول</th>
                        <th className="text-right px-5 py-2">وزن</th>
                        <th className="text-right px-5 py-2">قیمت واحد</th>
                        <th className="text-right px-5 py-2">جمع ردیف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-5 py-2 font-medium">
                            {item.productName}
                          </td>
                          <td className="tabular-nums px-5 py-2">
                            {formatWeight(item.requestedWeight)}
                          </td>
                          <td className="tabular-nums px-5 py-2">
                            {new Intl.NumberFormat('fa-IR').format(
                              item.unitPrice
                            )}
                          </td>
                          <td className="tabular-nums px-5 py-2 font-semibold">
                            {formatRial(calculateItemTotal(item))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
