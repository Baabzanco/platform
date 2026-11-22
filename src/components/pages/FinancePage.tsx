import React, { useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  Printer,
  RotateCcw,
  Scale,
  Search,
  Zap,
} from 'lucide-react';
import { DEPARTMENT_LABELS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
  getFinanceWeight,
} from '../../utils/formatters';

interface FinancePageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
}

type FinanceFilter =
  | 'all'
  | 'driver_docs'
  | 'waiting_prod'
  | 'ready'
  | 'discrepancy'
  | 'approved'
  | 'returned'
  | 'rejected';

function isFinanceApproved(order: Order): boolean {
  return order.status === 'pending_shipping' || order.status === 'delivered';
}

function isWaitingProd(order: Order): boolean {
  return order.status === 'pending_production_approval' || order.status === 'in_production';
}

function isPendingReturnConfirmInFinance(order: Order): boolean {
  return (
    order.status === 'returned' &&
    !(order.returnRecord?.confirmations.finance.confirmed ?? false)
  );
}

function hasPendingDriverDocs(order: Order): boolean {
  return Boolean(
    order.driverDelivery?.sentToFinance && !order.driverDelivery?.financeVerified
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
  if (isWaitingProd(order)) return 4;
  if (isFinanceApproved(order)) return 5;
  if (order.status === 'returned') return 6;
  return 7;
}

export const FinancePage: React.FC<FinancePageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FinanceFilter>('all');

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'driver_docs' && Boolean(order.driverDelivery?.sentToFinance)) ||
        (filter === 'waiting_prod' && isWaitingProd(order)) ||
        (filter === 'ready' && order.status === 'pending_finance_approval') ||
        (filter === 'discrepancy' && order.status === 'finance_discrepancy_review') ||
        (filter === 'approved' && isFinanceApproved(order)) ||
        (filter === 'returned' && order.status === 'returned') ||
        (filter === 'rejected' && order.status === 'rejected');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
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

  const getFinanceStatusDisplay = (order: Order): { text: string; className: string } => {
    if (order.status === 'rejected') {
      const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
      return { text: `رد شده (${src})`, className: 'text-red-700' };
    }
    if (order.status === 'returned') {
      const confirmed = order.returnRecord?.confirmations.finance.confirmed;
      return confirmed
        ? { text: 'مرجوعی تایید شده (صدور فاکتور)', className: 'text-emerald-700' }
        : { text: 'مرجوع شده — در انتظار تایید صدور فاکتور', className: 'text-red-700' };
    }
    if (order.driverDelivery?.sentToFinance) {
      return order.driverDelivery.financeVerified
        ? { text: 'مدارک تحویل راننده تایید شد', className: 'text-emerald-700' }
        : { text: 'مدارک تحویل راننده دریافت شد (نیازمند بررسی)', className: 'text-emerald-700' };
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
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>داشبورد مدیریت</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800">بخش صدور فاکتور</span>
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

      {/* Search & Filter Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد، طرف حساب یا محصول..."
            className="w-64 pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: 'همه' },
              { id: 'driver_docs', label: 'مدارک تحویل راننده' },
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

      {/* Collapsed Finance Order Cards (Click to open popup) */}
      <div className="flex flex-col gap-3">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
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
            const pendingReturnConfirm = isPendingReturnConfirmInFinance(order);
            const pendingDriverDocs = hasPendingDriverDocs(order);
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

            const showOtherDivider = priorityCount > 0 && index === priorityCount;

            const cardStyle = pendingReturnConfirm
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20 hover:bg-red-50/30'
              : pendingDriverDocs
                ? 'border-2 border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20 hover:bg-emerald-50/30'
                : rejected || returned
                  ? 'border border-red-300 bg-red-50/20 hover:border-red-400'
                  : discrepancy
                    ? 'border-2 border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20 hover:bg-amber-50/40'
                    : readyForApproval
                      ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15 hover:bg-[#f4fafa]'
                      : approved
                        ? 'border border-emerald-400 bg-emerald-50/20 hover:border-emerald-500'
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
                          اولویت فوری صدور فاکتور — سفارش مرجوعی نیازمند اصلاح سند و تایید مرجوعی
                        </span>
                        <span className="tabular-nums opacity-95 text-[11px]">
                          کسر مرجوعی: {formatRial(returnDeduction)}
                        </span>
                      </div>
                    )}

                    {pendingDriverDocs && !pendingReturnConfirm && (
                      <div className="no-print px-5 py-1.5 bg-emerald-600 text-white flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-2">
                          <Camera className="w-3.5 h-3.5 shrink-0" />
                          مدارک تحویل راننده دریافت شد — عکس فاکتور و رسید پرداخت آماده بررسی و تایید
                        </span>
                        <span className="opacity-95 text-[11px]">کلیک برای مشاهده عکس‌ها</span>
                      </div>
                    )}

                    {discrepancy && (
                      <div className="no-print px-5 py-1.5 bg-amber-600 text-white flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-2">
                          <Scale className="w-3.5 h-3.5 shrink-0" />
                          اولویت فوری صدور فاکتور — ارجاع مغایرت وزن از ارسال (نیازمند تایید مجدد)
                        </span>
                        <span className="opacity-95 text-[11px]">کلیک برای بررسی</span>
                      </div>
                    )}

                    {readyForApproval && (
                      <div className="no-print px-5 py-1.5 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="inline-flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          وارد شده به صف صدور فاکتور — تولید تکمیل شده و آماده صدور فاکتور
                        </span>
                        <span className="opacity-95 text-[11px]">کلیک برای تایید</span>
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
                          <span className="block text-[11px] text-slate-500 mb-0.5">طرف حساب</span>
                          <span className="font-semibold text-slate-900 block truncate">
                            {order.customerName}
                          </span>
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
                          <span className="block text-[11px] text-slate-500 mb-0.5">وضعیت صدور فاکتور</span>
                          <span className={`font-bold text-xs ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      <div className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f5864] shrink-0">
                        <span>مشاهده و اقدام</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

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
