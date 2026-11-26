import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  Edit3,
  Eye,
  FilePlus2,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Scale,
  Search,
  Truck,
  Undo2,
} from 'lucide-react';
import {
  ALL_DEPARTMENT_LABELS,
  DEPARTMENT_LABELS,
} from '../../data/initialOrders';
import { Order } from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
  getFinanceWeight,
  getShippingWeight,
  getStatusLabel,
} from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';
import { CreditStandingTag } from '../CreditStandingTag';

interface SalesPageProps {
  orders: Order[];
  printingOrderId: string | null;
  access: AccessControlHelpers;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onOpenNewInvoice: () => void;
  onEditReturnedOrder: (order: Order) => void;
  onCallCustomer: (order: Order) => void;
}

type SalesFilter =
  | 'all'
  | 'returned_to_sales'
  | 'pending_management_approval'
  | 'in_production'
  | 'finance'
  | 'pending_shipping'
  | 'delivered'
  | 'returned'
  | 'rejected';

function getSalesSortRank(order: Order): number {
  if (order.status === 'returned_to_sales') return 0;
  if (order.status === 'pending_management_approval') return 1;
  if (order.status === 'in_production') return 2;
  if (order.status === 'finance_discrepancy_review') return 3;
  if (order.status === 'pending_finance_approval') return 4;
  if (order.status === 'pending_shipping') return 5;
  if (order.status === 'delivered') return 6;
  if (order.status === 'returned') return 7;
  return 8;
}

function getSalesStatusStyle(order: Order): {
  label: string;
  textClass: string;
} {
  switch (order.status) {
    case 'returned_to_sales': {
      const src = order.salesReturn
        ? ALL_DEPARTMENT_LABELS[order.salesReturn.source]
        : '';
      return {
        label: src ? `برگشت‌خورده از ${src}` : 'برگشت‌خورده به فروش',
        textClass: 'text-amber-800',
      };
    }
    case 'pending_management_approval':
      return { label: 'در انتظار تایید مدیریت', textClass: 'text-amber-700' };
    case 'in_production':
      return { label: 'در حال تولید و توزین', textClass: 'text-sky-700' };
    case 'pending_finance_approval':
      return { label: 'در انتظار صدور فاکتور', textClass: 'text-indigo-700' };
    case 'finance_discrepancy_review':
      return { label: 'مغایرت وزن (در صدور فاکتور)', textClass: 'text-amber-700' };
    case 'pending_shipping':
      return { label: 'آماده ارسال و تخصیص راننده', textClass: 'text-[#0f5864]' };
    case 'delivered':
      return {
        label: order.driverName
          ? `تحویل به راننده (${order.driverName})`
          : 'تحویل شده به راننده',
        textClass: 'text-emerald-700',
      };
    case 'returned':
      return { label: 'مرجوع شده', textClass: 'text-red-700' };
    case 'rejected': {
      const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
      return {
        label: src ? `رد شده (${src})` : 'رد شده',
        textClass: 'text-red-700',
      };
    }
  }
}

export const SalesPage: React.FC<SalesPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onOpenNewInvoice,
  onEditReturnedOrder,
  onCallCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SalesFilter>('all');

  const returnedToSalesCount = useMemo(
    () => orders.filter((o) => o.status === 'returned_to_sales').length,
    [orders]
  );

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'returned_to_sales' && order.status === 'returned_to_sales') ||
        (filter === 'pending_management_approval' &&
          order.status === 'pending_management_approval') ||
        (filter === 'in_production' && order.status === 'in_production') ||
        (filter === 'finance' &&
          (order.status === 'pending_finance_approval' ||
            order.status === 'finance_discrepancy_review')) ||
        (filter === 'pending_shipping' && order.status === 'pending_shipping') ||
        (filter === 'delivered' && order.status === 'delivered') ||
        (filter === 'returned' && order.status === 'returned') ||
        (filter === 'rejected' && order.status === 'rejected');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q) ||
        order.district.toLowerCase().includes(q) ||
        order.address.toLowerCase().includes(q) ||
        order.notes.toLowerCase().includes(q) ||
        order.driverName.toLowerCase().includes(q) ||
        order.items.some((item) => item.productName.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      const rankDiff = getSalesSortRank(a) - getSalesSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return b.lastActionAt - a.lastActionAt;
    });
  }, [orders, searchQuery, filter]);

  const priorityCount = useMemo(
    () =>
      sortedAndFilteredOrders.filter((o) => o.status === 'returned_to_sales')
        .length,
    [sortedAndFilteredOrders]
  );

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            بخش کارشناس فروش
          </h1>
          <span className="tabular-nums text-xs text-slate-400 font-medium">
            ({toPersianDigits(orders.length)} سفارش)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintAll}
            title="پرینت تمامی سفارشات"
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">پرینت لیست</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewInvoice}
            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>ثبت فاکتور جدید</span>
          </button>
        </div>
      </header>

      {/* Search & Status Filters */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد، مشتری، تلفن، آدرس یا محصول..."
            className="w-full sm:w-72 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
            {(
              [
                { id: 'all', label: 'همه' },
                ...(returnedToSalesCount > 0
                  ? [
                      {
                        id: 'returned_to_sales' as SalesFilter,
                        label: `برگشت‌خورده به فروش (${toPersianDigits(returnedToSalesCount)})`,
                        isAlert: true,
                      },
                    ]
                  : [
                      {
                        id: 'returned_to_sales' as SalesFilter,
                        label: 'برگشت‌خورده به فروش',
                      },
                    ]),
                { id: 'pending_management_approval', label: 'تایید مدیریت' },
                { id: 'in_production', label: 'در تولید' },
                { id: 'finance', label: 'صدور فاکتور' },
                { id: 'pending_shipping', label: 'آماده ارسال' },
                { id: 'delivered', label: 'تحویل شده' },
                { id: 'returned', label: 'مرجوعی' },
                { id: 'rejected', label: 'رد شده' },
              ] as Array<{ id: SalesFilter; label: string; isAlert?: boolean }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === f.id
                    ? f.isAlert
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : f.isAlert
                      ? 'text-amber-800 hover:text-amber-950'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Detail Orders List */}
      <div className="flex flex-col gap-3.5">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              {orders.length === 0
                ? 'در این تاریخ هنوز فاکتوری ثبت نشده است.'
                : 'هیچ سفارشی با فیلتر انتخاب‌شده یافت نشد.'}
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
                >
                  نمایش همه سفارش‌ها
                </button>
              )}
              <button
                type="button"
                onClick={onOpenNewInvoice}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0f5864] rounded-xl hover:bg-[#0b434d] transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                ثبت فاکتور جدید
              </button>
            </div>
          </div>
        ) : (
          sortedAndFilteredOrders.map((order, index) => {
            const isReturnedToSales = order.status === 'returned_to_sales';
            const isRejected = order.status === 'rejected';
            const isReturned = order.status === 'returned';
            const isDiscrepancy = order.status === 'finance_discrepancy_review';
            const statusInfo = getSalesStatusStyle(order);

            const orderTotal = calculateOrderTotal(order);
            const totalReqKg = order.items.reduce(
              (s, i) => s + i.requestedWeight,
              0
            );
            const returnDeduction = order.items.reduce(
              (sum, item) => sum + item.returnedWeight * item.unitPrice,
              0
            );
            const netAfterReturn = Math.max(0, orderTotal - returnDeduction);

            const showOtherDivider =
              priorityCount > 0 && index === priorityCount;

            const cardBorder = isReturnedToSales
              ? 'border-2 border-amber-500 bg-white shadow-md ring-2 ring-amber-500/20'
              : isRejected || isReturned
                ? 'border border-red-300 bg-white'
                : 'border border-slate-200 bg-white hover:border-[#0f5864]/60';

            return (
              <React.Fragment key={order.id}>
                {showOtherDivider && (
                  <div className="no-print flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      سایر سفارش‌های ثبت‌شده
                    </span>
                    <div className="h-px bg-slate-300/80 flex-1" />
                  </div>
                )}

                <article
                  className={`order-card-printable ${
                    printingOrderId === order.id ? 'print-target' : ''
                  } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardBorder}`}
                >
                  {/* Returned to Sales Top Priority Strip */}
                  {isReturnedToSales && order.salesReturn && (
                    <div className="px-4 sm:px-5 py-2.5 bg-amber-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold inline-flex items-center gap-1.5">
                          <Undo2 className="w-4 h-4 shrink-0" />
                          برگشت‌خورده از {ALL_DEPARTMENT_LABELS[order.salesReturn.source]} ({order.salesReturn.timestamp})
                        </div>
                        <p className="text-amber-50 leading-relaxed">
                          علت برگشت: {order.salesReturn.reason}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditReturnedOrder(order)}
                        className="no-print min-h-[38px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold bg-white text-amber-900 hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        اصلاح و ارسال مجدد به تولید
                      </button>
                    </div>
                  )}

                  {/* Top Summary Header Row */}
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-2.5 flex-1 text-[13px]">
                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          کد سفارش
                        </span>
                        <span
                          className={`tabular-nums text-base font-bold ${
                            isRejected || isReturned
                              ? 'text-red-700'
                              : isReturnedToSales
                                ? 'text-amber-800'
                                : 'text-[#0056b3]'
                          }`}
                        >
                          {order.code}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          طرف حساب / مشتری
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate max-w-full">
                            {order.customerName}
                          </span>
                          <CreditStandingTag
                            standing={order.customerStanding}
                            standingLabel={order.customerStandingLabel}
                            size="xs"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          بازه ارسال · زمان ثبت
                        </span>
                        <span className="font-semibold text-slate-800 inline-flex items-center gap-1 text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.deliverySlot}</span>
                          <span className="text-slate-400">·</span>
                          <span className="tabular-nums text-slate-500">
                            {order.createdAt}
                          </span>
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          وضعیت فعلی
                        </span>
                        <span className={`font-bold text-xs ${statusInfo.textClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500 mb-0.5">
                          {isReturned ? 'مانده پس از مرجوعی' : 'مبلغ کل فاکتور'}
                        </span>
                        <span className="tabular-nums font-bold text-[#0f5864]">
                          {formatRial(isReturned ? netAfterReturn : orderTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="no-print flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/80">
                      <a
                        href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                        onClick={() => onCallCustomer(order)}
                        className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr" className="tabular-nums">
                          {order.customerPhone}
                        </span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onSelectOrder(order.id)}
                        className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864]/40 hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>پرونده کامل</span>
                      </button>
                    </div>
                  </div>

                  {/* Full Details Metadata Row: Address, District, Driver, Notes */}
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100 space-y-2 text-xs text-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1.5">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          <strong className="text-slate-900">{order.district}:</strong>{' '}
                          {order.address}
                        </span>
                      </div>

                      {order.driverName && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 shrink-0">
                          <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          راننده: {order.driverName}
                        </span>
                      )}
                    </div>

                    {order.notes && (
                      <div className="text-slate-600 bg-amber-50/70 border border-amber-100 rounded-lg px-3 py-1.5 leading-relaxed">
                        <strong className="text-amber-950">توضیحات سفارش:</strong>{' '}
                        {order.notes}
                      </div>
                    )}

                    {/* Inline Alerts for Rejection / Discrepancy / Return */}
                    {isRejected && order.rejection && (
                      <div className="flex items-start gap-2 text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          رد شده توسط <strong>{DEPARTMENT_LABELS[order.rejection.source]}</strong> — علت:{' '}
                          <strong>{order.rejection.reason}</strong>
                        </span>
                      </div>
                    )}

                    {isDiscrepancy && order.discrepancy && (
                      <div className="flex items-start gap-2 text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <Scale className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>
                          <strong>مغایرت وزن (ارجاع از ارسال):</strong> {order.discrepancy.note}
                        </span>
                      </div>
                    )}

                    {isReturned && order.returnRecord && (
                      <div className="flex items-start gap-2 text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <RotateCcw className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>مرجوعی ثبت‌شده:</strong> {order.returnRecord.notes} — کسر مبلغ:{' '}
                          <strong className="tabular-nums">{formatRial(returnDeduction)}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Full Order Items Table (Desktop) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500">
                          <th className="text-right font-medium px-5 py-2">نام محصول</th>
                          <th className="text-right font-medium px-4 py-2">وزن درخواستی</th>
                          <th className="text-right font-medium px-4 py-2">وزن تولید / اصلاحی</th>
                          <th className="text-right font-medium px-4 py-2">تحویلی / مرجوعی</th>
                          <th className="text-right font-medium px-4 py-2">قیمت واحد (ریال)</th>
                          <th className="text-right font-medium px-5 py-2">جمع ردیف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item) => {
                          const hasRevision =
                            item.revisedWeight !== null &&
                            item.previousWeightBeforeDiscrepancy !== null;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-2.5 font-semibold text-slate-900">
                                {item.productName}
                              </td>
                              <td className="tabular-nums px-4 py-2.5 text-slate-700">
                                {formatWeight(item.requestedWeight)}
                              </td>
                              <td className="tabular-nums px-4 py-2.5">
                                {hasRevision ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="line-through text-red-500">
                                      {formatWeight(item.previousWeightBeforeDiscrepancy!)}
                                    </span>
                                    <span className="font-bold text-amber-800">
                                      {formatWeight(item.revisedWeight!)} (اصلاحی)
                                    </span>
                                  </span>
                                ) : item.producedWeight !== null ? (
                                  <span className="font-semibold text-emerald-700">
                                    {formatWeight(item.producedWeight)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">در انتظار توزین</span>
                                )}
                              </td>
                              <td className="tabular-nums px-4 py-2.5">
                                {item.deliveredWeight !== null ? (
                                  <span className="font-semibold text-slate-800">
                                    {formatWeight(item.deliveredWeight)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                                {item.returnedWeight > 0 && (
                                  <span className="text-red-700 font-bold mr-2">
                                    (مرجوعی: {formatWeight(item.returnedWeight)})
                                  </span>
                                )}
                              </td>
                              <td className="tabular-nums px-4 py-2.5 text-slate-700">
                                {new Intl.NumberFormat('fa-IR').format(item.unitPrice)}
                              </td>
                              <td className="tabular-nums px-5 py-2.5 font-bold text-slate-900">
                                {formatRial(calculateItemTotal(item))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/70 border-t border-slate-200 text-xs font-bold text-slate-700">
                          <td className="px-5 py-2">
                            جمع ({toPersianDigits(order.items.length)} قلم)
                          </td>
                          <td className="tabular-nums px-4 py-2">
                            {formatWeight(Number(totalReqKg.toFixed(2)))}
                          </td>
                          <td className="tabular-nums px-4 py-2">
                            {formatWeight(
                              Number(
                                order.items
                                  .reduce((s, i) => s + getFinanceWeight(i), 0)
                                  .toFixed(2)
                              )
                            )}
                          </td>
                          <td className="tabular-nums px-4 py-2">
                            {order.status === 'delivered' || order.status === 'returned'
                              ? formatWeight(
                                  Number(
                                    order.items
                                      .reduce((s, i) => s + getShippingWeight(i), 0)
                                      .toFixed(2)
                                  )
                                )
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-slate-500">جمع فاکتور:</td>
                          <td className="tabular-nums px-5 py-2 text-[#0f5864]">
                            {formatRial(orderTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Full Order Items List (Mobile) */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {item.productName}
                          </span>
                          <span className="tabular-nums font-bold text-[#0f5864]">
                            {formatRial(calculateItemTotal(item))}
                          </span>
                        </div>
                        <div className="tabular-nums flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                          <span>درخواستی: {formatWeight(item.requestedWeight)}</span>
                          {item.producedWeight !== null && (
                            <span className="text-emerald-700 font-semibold">
                              تولید: {formatWeight(item.producedWeight)}
                            </span>
                          )}
                          {item.revisedWeight !== null && (
                            <span className="text-amber-800 font-semibold">
                              اصلاحی: {formatWeight(item.revisedWeight)}
                            </span>
                          )}
                          {item.returnedWeight > 0 && (
                            <span className="text-red-700 font-bold">
                              مرجوعی: {formatWeight(item.returnedWeight)}
                            </span>
                          )}
                          <span>
                            فی: {new Intl.NumberFormat('fa-IR').format(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 bg-slate-50 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        جمع {toPersianDigits(order.items.length)} قلم · {getStatusLabel(order.status)}
                      </span>
                      <span className="tabular-nums text-[#0f5864]">
                        {formatRial(orderTotal)}
                      </span>
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
