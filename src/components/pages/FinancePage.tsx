import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ExternalLink,
  Printer,
  RotateCcw,
  Scale,
  Search,
  Store,
  Zap,
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
} from '../../utils/formatters';
import { CreditStandingTag } from '../CreditStandingTag';

interface FinancePageProps {
  orders: Order[];
  printingOrderId: string | null;
  access: AccessControlHelpers;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onOpenCustomerProfile: (order: Order) => void;
}

type FinanceFilter =
  | 'all'
  | 'in_person'
  | 'driver_docs'
  | 'waiting_prod'
  | 'ready'
  | 'discrepancy'
  | 'approved'
  | 'returned'
  | 'rejected';

function isAwaitingShippingReturn(order: Order): boolean {
  return (
    order.status === 'returned' &&
    order.returnRecord?.stage === 'awaiting_shipping_receive' &&
    !(order.returnRecord?.confirmations.shipping.confirmed ?? false)
  );
}

function isReturnVisibleToFinance(order: Order): boolean {
  return order.status === 'returned' && !isAwaitingShippingReturn(order);
}

function isFinanceApproved(order: Order): boolean {
  return (
    order.status === 'pending_shipping' ||
    order.status === 'delivered' ||
    isAwaitingShippingReturn(order)
  );
}

function isWaitingProd(order: Order): boolean {
  return order.status === 'in_production';
}

function isPendingReturnConfirmInFinance(order: Order): boolean {
  return (
    isReturnVisibleToFinance(order) &&
    !(order.returnRecord?.confirmations.finance.confirmed ?? false)
  );
}

function getNetDeliveredWeightInFinance(order: Order): number {
  return Number(
    order.items
      .reduce(
        (sum, item) =>
          sum + Math.max(0, getShippingWeight(item) - (item.returnedWeight ?? 0)),
        0
      )
      .toFixed(2)
  );
}

function hasPendingDriverDocs(order: Order): boolean {
  if (isAwaitingShippingReturn(order)) return false;
  return Boolean(
    order.driverDelivery?.sentToFinance && !order.driverDelivery?.financeVerified
  );
}

function hasRejectedDriverDocsAwaitingRetake(order: Order): boolean {
  if (isAwaitingShippingReturn(order)) return false;
  return Boolean(
    order.driverDelivery?.financeRejected && !order.driverDelivery?.sentToFinance
  );
}

function isFinancePriority(order: Order): boolean {
  return (
    isPendingReturnConfirmInFinance(order) ||
    hasPendingDriverDocs(order) ||
    order.status === 'finance_discrepancy_review' ||
    order.status === 'pending_finance_approval'
  );
}

function getFinanceSortRank(order: Order): number {
  if (isPendingReturnConfirmInFinance(order)) return 0;
  if (hasPendingDriverDocs(order)) return 1;
  if (order.status === 'finance_discrepancy_review') return 2;
  if (order.status === 'pending_finance_approval') return 3;
  if (hasRejectedDriverDocsAwaitingRetake(order)) return 4;
  if (isWaitingProd(order)) return 5;
  if (order.status === 'pending_management_approval') return 6;
  if (isFinanceApproved(order)) return 7;
  if (isReturnVisibleToFinance(order)) return 8;
  return 9;
}

export const FinancePage: React.FC<FinancePageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onOpenCustomerProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FinanceFilter>('all');

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'in_person' && Boolean(order.isInPersonSale)) ||
        (filter === 'driver_docs' &&
          !isAwaitingShippingReturn(order) &&
          Boolean(
            order.driverDelivery?.sentToFinance ||
              order.driverDelivery?.financeRejected
          )) ||
        (filter === 'waiting_prod' && isWaitingProd(order)) ||
        (filter === 'ready' && order.status === 'pending_finance_approval') ||
        (filter === 'discrepancy' &&
          order.status === 'finance_discrepancy_review') ||
        (filter === 'approved' && isFinanceApproved(order)) ||
        (filter === 'returned' && isReturnVisibleToFinance(order)) ||
        (filter === 'rejected' && order.status === 'rejected');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.inPersonPaymentMethod ?? '').toLowerCase().includes(q) ||
        order.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      const rankDiff = getFinanceSortRank(a) - getFinanceSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      if (isFinancePriority(a) && isFinancePriority(b)) {
        return b.lastActionAt - a.lastActionAt;
      }
      return 0;
    });
  }, [orders, searchQuery, filter]);

  const priorityCount = useMemo(
    () => sortedAndFilteredOrders.filter(isFinancePriority).length,
    [sortedAndFilteredOrders]
  );

  const getFinanceStatusDisplay = (
    order: Order
  ): { text: string; className: string } => {
    if (order.status === 'returned_to_sales') {
      const src = order.salesReturn
        ? ALL_DEPARTMENT_LABELS[order.salesReturn.source]
        : '';
      return {
        text: src ? `برگشت‌خورده به فروش (${src})` : 'برگشت‌خورده به فروش',
        className: 'text-amber-800',
      };
    }
    if (order.status === 'pending_management_approval') {
      return {
        text: 'در انتظار تایید مدیریت',
        className: 'text-amber-700',
      };
    }
    if (order.status === 'rejected') {
      const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
      return { text: `رد شده (${src})`, className: 'text-red-700' };
    }
    if (isReturnVisibleToFinance(order)) {
      const returnConfirmed = Boolean(order.returnRecord?.confirmations.finance.confirmed);
      const netDeliveredKg = getNetDeliveredWeightInFinance(order);
      const isPartialReturn = Boolean(order.returnRecord) && netDeliveredKg > 0.001;

      if (isPartialReturn) {
        const docsVerified = Boolean(order.driverDelivery?.financeVerified);
        const docsPending = hasPendingDriverDocs(order);
        const docsRejected = hasRejectedDriverDocsAwaitingRetake(order);

        if (returnConfirmed && docsVerified) {
          return {
            text: 'مرجوعی و بار تحویل‌داده‌شده هر دو تایید شدند',
            className: 'text-emerald-700',
          };
        }
        if (!returnConfirmed && docsPending) {
          return {
            text: 'مرجوعی و مدارک بار تحویلی — هر دو نیازمند تایید',
            className: 'text-red-700',
          };
        }
        if (!returnConfirmed && docsVerified) {
          return {
            text: 'بار تحویلی تایید شد · مرجوعی نیازمند تایید فاکتور',
            className: 'text-red-700',
          };
        }
        if (!returnConfirmed && docsRejected) {
          return {
            text: 'مرجوعی نیازمند تایید · مدارک بار تحویلی رد شده',
            className: 'text-red-700',
          };
        }
        if (!returnConfirmed) {
          return {
            text: 'مرجوعی نیازمند تایید · در انتظار مدارک بار تحویلی',
            className: 'text-red-700',
          };
        }
        if (docsPending) {
          return {
            text: 'مرجوعی تایید شد · مدارک بار تحویلی آماده بررسی',
            className: 'text-emerald-700',
          };
        }
        if (docsRejected) {
          return {
            text: 'مرجوعی تایید شد · مدارک بار تحویلی رد شد (عکس مجدد)',
            className: 'text-red-700',
          };
        }
        return {
          text: 'مرجوعی تایید شد · در انتظار مدارک بار تحویلی راننده',
          className: 'text-amber-700',
        };
      }

      return returnConfirmed
        ? { text: 'مرجوعی کل تایید شده', className: 'text-emerald-700' }
        : { text: 'مرجوع شده — نیازمند تایید فاکتور', className: 'text-red-700' };
    }
    if (isAwaitingShippingReturn(order)) {
      return { text: 'فاکتور صادر و تایید شد', className: 'text-emerald-700' };
    }
    if (hasRejectedDriverDocsAwaitingRetake(order)) {
      return {
        text: order.isInPersonSale
          ? 'مدارک فروش حضوری رد شد — در انتظار عکس مجدد'
          : 'مدارک راننده رد شد — در انتظار عکس مجدد',
        className: 'text-red-700',
      };
    }
    if (order.driverDelivery?.sentToFinance) {
      if (order.isInPersonSale) {
        return order.driverDelivery.financeVerified
          ? { text: 'فروش حضوری · مدارک تایید شد', className: 'text-emerald-700' }
          : { text: 'فروش حضوری · مدارک آماده بررسی', className: 'text-emerald-700' };
      }
      return order.driverDelivery.financeVerified
        ? { text: 'مدارک تحویل راننده تایید شد', className: 'text-emerald-700' }
        : { text: 'مدارک تحویل دریافت شد (آماده بررسی)', className: 'text-emerald-700' };
    }
    if (order.status === 'finance_discrepancy_review') {
      return { text: 'در انتظار تایید مجدد (اصلاح وزن)', className: 'text-amber-700' };
    }
    if (order.status === 'pending_finance_approval') {
      return { text: 'در انتظار صدور فاکتور', className: 'text-[#0f5864]' };
    }
    if (isFinanceApproved(order)) {
      return { text: 'فاکتور صادر و تایید شد', className: 'text-emerald-700' };
    }
    return { text: 'در انتظار تولید', className: 'text-slate-500' };
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            بخش صدور فاکتور
          </h1>
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          title="پرینت تمامی سفارشات"
          className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">پرینت تمامی سفارشات</span>
          <span className="sm:hidden">پرینت</span>
        </button>
      </header>

      {/* Search & Horizontally Scrollable Filter Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد، طرف حساب یا محصول..."
            className="w-full sm:w-64 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
            {(
              [
                { id: 'all', label: 'همه' },
                { id: 'in_person', label: 'فروش حضوری' },
                { id: 'driver_docs', label: 'مدارک فاکتور و رسید' },
                { id: 'ready', label: 'آماده تایید' },
                { id: 'discrepancy', label: 'مغایرت وزن' },
                { id: 'returned', label: 'مرجوعی' },
                { id: 'approved', label: 'تایید شده' },
                { id: 'waiting_prod', label: 'در انتظار تولید' },
                { id: 'rejected', label: 'رد شده' },
              ] as Array<{ id: FinanceFilter; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
      </div>

      {/* Collapsed Finance Order Cards */}
      <div className="flex flex-col gap-3">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              {orders.length === 0
                ? 'در این تاریخ سفارشی برای صدور فاکتور ثبت نشده است.'
                : 'سفارشی در این دسته‌بندی بخش صدور فاکتور وجود ندارد.'}
            </p>
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
                className="min-h-[44px] px-5 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
              >
                نمایش همه سفارش‌ها
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredOrders.map((order, index) => {
            const rejected = order.status === 'rejected';
            const returned = isReturnVisibleToFinance(order);
            const pendingReturnConfirm = isPendingReturnConfirmInFinance(order);
            const pendingDriverDocs = hasPendingDriverDocs(order);
            const rejectedDriverDocs = hasRejectedDriverDocsAwaitingRetake(order);
            const discrepancy = order.status === 'finance_discrepancy_review';
            const readyForApproval = order.status === 'pending_finance_approval';
            const approved = isFinanceApproved(order);
            const statusInfo = getFinanceStatusDisplay(order);
            const orderTotal = calculateOrderTotal(order);
            const returnDeduction = order.items.reduce(
              (sum, item) => sum + item.returnedWeight * item.unitPrice,
              0
            );
            const netAfterReturn = Math.max(0, orderTotal - returnDeduction);
            const netDeliveredKg = getNetDeliveredWeightInFinance(order);
            const isPartialReturn =
              returned && Boolean(order.returnRecord) && netDeliveredKg > 0.001;
            const awaitingPartialDriverDocs =
              isPartialReturn &&
              !order.driverDelivery?.sentToFinance &&
              !rejectedDriverDocs;

            const showOtherDivider =
              priorityCount > 0 && index === priorityCount;

            const returnedToSales = order.status === 'returned_to_sales';
            const cardStyle = pendingReturnConfirm
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20'
              : pendingDriverDocs
                ? 'border-2 border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20'
                : rejectedDriverDocs
                  ? 'border border-red-400 bg-red-50/25'
                  : returnedToSales
                    ? 'border border-amber-400 bg-amber-50/30'
                    : rejected || returned
                      ? 'border border-red-300 bg-red-50/20'
                      : discrepancy
                        ? 'border-2 border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20'
                        : readyForApproval
                          ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15'
                          : approved
                            ? 'border border-emerald-400 bg-emerald-50/20'
                            : 'border border-[#7a9cbf] bg-white hover:border-[#0f5864]';

            return (
              <React.Fragment key={order.id}>
                {showOtherDivider && (
                  <div className="no-print flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      سایر سفارش‌ها
                    </span>
                    <div className="h-px bg-slate-300/80 flex-1" />
                  </div>
                )}

                <article
                  className={`order-card-printable ${
                    printingOrderId === order.id ? 'print-target' : ''
                  } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardStyle}`}
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
                    {pendingReturnConfirm && (
                      <div className="no-print px-4 sm:px-5 py-2 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          {isPartialReturn
                            ? 'مرجوعی جزئی نیازمند تایید در صدور فاکتور'
                            : 'سفارش مرجوعی نیازمند تایید در صدور فاکتور'}
                        </span>
                        <span className="tabular-nums opacity-95 text-[11px]">
                          کسر مرجوعی: {formatRial(returnDeduction)}
                          {isPartialReturn
                            ? ` · تحویل به مشتری: ${formatWeight(netDeliveredKg)}`
                            : ''}
                        </span>
                      </div>
                    )}

                    {pendingDriverDocs && (
                      <div className="no-print px-4 sm:px-5 py-2 bg-emerald-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          {order.isInPersonSale ? (
                            <Store className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {order.isInPersonSale
                            ? 'فروش حضوری — عکس فاکتور و رسید دریافت شد (آماده بررسی و تایید)'
                            : isPartialReturn
                              ? 'مدارک بار تحویل‌داده‌شده (باقی‌مانده پس از مرجوعی جزئی) دریافت شد — آماده تایید یا رد'
                              : 'مدارک تحویل راننده دریافت شد — آماده بررسی (تایید یا رد)'}
                        </span>
                        <span className="tabular-nums opacity-95 text-[11px]">
                          {order.isInPersonSale && order.inPersonPaymentMethod
                            ? `${order.inPersonPaymentMethod} · مشاهده عکس‌ها`
                            : isPartialReturn
                              ? `خالص: ${formatRial(netAfterReturn)} · مشاهده عکس‌ها`
                              : 'مشاهده عکس‌ها'}
                        </span>
                      </div>
                    )}

                    {rejectedDriverDocs && (
                      <div className="no-print px-4 sm:px-5 py-2 bg-red-100 text-red-900 border-b border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          {order.isInPersonSale
                            ? 'مدارک فروش حضوری رد شد — در انتظار عکاسی مجدد'
                            : isPartialReturn
                              ? 'مدارک بار تحویل‌داده‌شده رد شد — در انتظار عکاسی مجدد راننده'
                              : 'مدارک تحویل رد شد — در انتظار عکاسی مجدد راننده'}
                        </span>
                        <span className="text-[11px] text-red-700 font-medium truncate max-w-[260px]">
                          {order.driverDelivery?.financeRejectionReason}
                        </span>
                      </div>
                    )}

                    {awaitingPartialDriverDocs && (
                      <div className="no-print px-4 sm:px-5 py-1.5 bg-amber-50 text-amber-900 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          در انتظار ارسال عکس فاکتور و رسید بخش تحویل‌داده‌شده توسط راننده
                        </span>
                        <span className="tabular-nums text-amber-800">
                          تحویلی خالص: {formatWeight(netDeliveredKg)} · {formatRial(netAfterReturn)}
                        </span>
                      </div>
                    )}

                    {discrepancy && (
                      <div className="no-print px-4 sm:px-5 py-2 bg-amber-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 shrink-0" />
                          مغایرت وزن از ارسال — نیازمند تایید مجدد
                        </span>
                        <span className="opacity-95 text-[11px]">بررسی و تایید</span>
                      </div>
                    )}

                    {readyForApproval && (
                      <div className="no-print px-4 sm:px-5 py-2 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          تولید تکمیل شد — آماده صدور فاکتور
                        </span>
                        <span className="opacity-95 text-[11px]">تایید فاکتور</span>
                      </div>
                    )}

                    <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-2.5 flex-1 items-center text-[13px]">
                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">
                            کد سفارش
                          </span>
                          <span
                            className={`tabular-nums text-base font-bold ${
                              rejected || returned || rejectedDriverDocs
                                ? 'text-red-700'
                                : 'text-[#0056b3]'
                            }`}
                          >
                            {order.code}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[11px] text-slate-500 mb-0.5">
                            {order.isInPersonSale
                              ? 'مشتری فروش حضوری و نحوه خرید'
                              : 'طرف حساب و وضعیت اعتباری'}
                          </span>
                          {order.isInPersonSale ? (
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {order.customerName}
                              </div>
                              <div className="text-[11px] font-semibold text-[#0f5864] truncate">
                                فروش حضوری
                                {order.inPersonPaymentMethod
                                  ? ` · ${order.inPersonPaymentMethod}`
                                  : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCustomerProfile(order);
                                }}
                                title="مشاهده پروفایل طرف حساب"
                                className="group inline-flex items-center gap-1 max-w-full font-semibold text-[#0f5864] hover:text-[#083942] underline decoration-[#0f5864]/40 hover:decoration-[#083942] underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] rounded"
                              >
                                <span className="truncate">{order.customerName}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <CreditStandingTag
                                standing={order.customerStanding}
                                standingLabel={order.customerStandingLabel}
                                size="xs"
                              />
                              {order.managementApproval?.approved &&
                                (order.customerStanding === 'yellow' ||
                                  order.customerStanding === 'red' ||
                                  order.customerStanding === 'black') && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    تایید مدیریت
                                  </span>
                                )}
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">
                            {returned ? 'مانده پس از مرجوعی' : 'مبلغ کل فاکتور'}
                          </span>
                          <span className="tabular-nums font-bold text-[#0f5864]">
                            {formatRial(returned ? netAfterReturn : orderTotal)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500 mb-0.5">
                            وضعیت
                          </span>
                          <span className={`font-bold text-xs ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      <div className="no-print pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex items-center justify-between sm:justify-end gap-1.5 text-xs font-bold text-[#0f5864] shrink-0">
                        <span>مشاهده و اقدام</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Print-only Full Detail Table */}
                  <div className="hidden print:block border-t border-slate-200 bg-white">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="text-right px-5 py-2">نام محصول</th>
                          <th className="text-right px-5 py-2">درخواستی</th>
                          <th className="text-right px-5 py-2">تحویلی / اصلاحی</th>
                          <th className="text-right px-5 py-2">قیمت واحد</th>
                          <th className="text-right px-5 py-2">جمع ردیف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-5 py-2 font-medium">{item.productName}</td>
                            <td className="tabular-nums px-5 py-2">
                              {formatWeight(item.requestedWeight)}
                            </td>
                            <td className="tabular-nums px-5 py-2">
                              {formatWeight(getFinanceWeight(item))}
                            </td>
                            <td className="tabular-nums px-5 py-2">
                              {new Intl.NumberFormat('fa-IR').format(item.unitPrice)}
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
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
