import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Phone,
  Printer,
  RotateCcw,
  Scale,
  Search,
  Stamp,
  X,
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
import { AudioRecordingPlayer } from '../AudioRecordingPlayer';
import { ReturnResolutionBox } from '../ReturnResolutionBox';

interface FinancePageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onPrintSingle: (orderId: string) => void;
  onApproveFinance: (orderId: string) => void;
  onOpenReject: (order: Order) => void;
  onCallCustomer: (order: Order) => void;
  onConfirmReturn: (orderId: string) => void;
}

type FinanceFilter =
  | 'all'
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

function isFinancePriority(order: Order): boolean {
  return (
    isPendingReturnConfirmInFinance(order) ||
    order.status === 'finance_discrepancy_review' ||
    order.status === 'pending_finance_approval'
  );
}

function getFinanceSortRank(order: Order): number {
  if (isPendingReturnConfirmInFinance(order)) return 0; // Highest urgency: returned order awaiting finance resolution
  if (order.status === 'finance_discrepancy_review') return 1;
  if (order.status === 'pending_finance_approval') return 2;
  if (isWaitingProd(order)) return 3;
  if (isFinanceApproved(order)) return 4;
  if (order.status === 'returned') return 5;            // Confirmed return
  return 6;                                             // rejected
}

export const FinancePage: React.FC<FinancePageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onPrintSingle,
  onApproveFinance,
  onOpenReject,
  onCallCustomer,
  onConfirmReturn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FinanceFilter>('all');

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
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
        ? { text: 'مرجوعی تایید شده (مالی)', className: 'text-emerald-700' }
        : { text: 'مرجوع شده — در انتظار تایید مالی', className: 'text-red-700' };
    }
    if (order.status === 'finance_discrepancy_review') {
      return { text: 'در انتظار تایید مجدد (اصلاح وزن)', className: 'text-amber-700' };
    }
    if (order.status === 'pending_finance_approval') {
      return { text: 'در انتظار تایید مالی', className: 'text-[#0f5864]' };
    }
    if (isFinanceApproved(order)) {
      return { text: 'تایید شده', className: 'text-emerald-700' };
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
          <span className="font-bold text-slate-800">بخش مالی</span>
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

      {/* Finance Order Cards */}
      <div className="flex flex-col gap-4">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              سفارشی در این دسته‌بندی مالی وجود ندارد.
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
            const pendingReturnConfirm = isPendingReturnConfirmInFinance(order);
            const discrepancy = order.status === 'finance_discrepancy_review';
            const readyForApproval = order.status === 'pending_finance_approval';
            const approved = isFinanceApproved(order);
            const canAct = readyForApproval || discrepancy;
            const statusInfo = getFinanceStatusDisplay(order);
            const orderTotal = calculateOrderTotal(order);
            const returnDeduction = order.items.reduce(
              (sum, item) => sum + item.returnedWeight * item.unitPrice,
              0
            );
            const netAfterReturn = Math.max(0, orderTotal - returnDeduction);

            const showOtherDivider =
              priorityCount > 0 && index === priorityCount;

            const cardStyle = pendingReturnConfirm
              ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20'
              : rejected || returned
                ? 'border border-red-400 bg-red-50/20'
                : discrepancy
                  ? 'border-2 border-amber-500 bg-amber-50/15 shadow-md ring-2 ring-amber-500/20'
                  : readyForApproval
                    ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15'
                    : approved
                      ? 'border border-emerald-500 bg-white'
                      : 'border border-[#7a9cbf] bg-white';

            const headerBg = rejected || returned
              ? 'bg-red-100/80'
              : discrepancy
                ? 'bg-amber-100/75'
                : readyForApproval
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
                  {/* Featured Priority Action Strips */}
                  {pendingReturnConfirm && (
                    <div className="no-print px-5 py-2 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        اولویت فوری مالی — سفارش مرجوعی از ارسال (نیازمند اصلاح سند و تایید مرجوعی)
                      </span>
                      <span className="tabular-nums opacity-95 font-medium">
                        کسر مرجوعی: {formatRial(returnDeduction)}
                      </span>
                    </div>
                  )}

                  {discrepancy && (
                    <div className="no-print px-5 py-2 bg-amber-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 shrink-0" />
                        اولویت فوری واحد مالی — ارجاع مغایرت وزن از بخش ارسال (نیازمند تایید مجدد)
                      </span>
                      <span className="tabular-nums opacity-95 font-medium">
                        سفارش {order.code}
                      </span>
                    </div>
                  )}

                  {readyForApproval && (
                    <div className="no-print px-5 py-2 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        وارد شده به صف مالی — تولید تکمیل شده و آماده تایید حسابداری
                      </span>
                      <span className="tabular-nums opacity-95 font-medium">
                        مبلغ فاکتور: {formatRial(orderTotal)}
                      </span>
                    </div>
                  )}

                  {/* Finance Header */}
                  <div className={`px-5 py-4 border-b border-slate-200 ${headerBg}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
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
                          <span className="block text-xs text-slate-500 mb-1">طرف حساب</span>
                          <span className="font-bold text-slate-900">{order.customerName}</span>
                        </div>
                        <div className="text-[13px]">
                          <span className="block text-xs text-slate-500 mb-1">وضعیت مالی</span>
                          <span className={`font-bold ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <div className="text-[13px]">
                          <span className="block text-xs text-slate-500 mb-1">
                            {returned ? 'مبلغ خالص پس از مرجوعی' : 'مبلغ کل فاکتور'}
                          </span>
                          <span className="tabular-nums font-bold text-[#0f5864]">
                            {formatRial(returned ? netAfterReturn : orderTotal)}
                          </span>
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

                    {/* Contact & Audio Recording Bar */}
                    <div className="no-print flex flex-wrap items-center gap-3 bg-white px-3.5 py-2.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => onCallCustomer(order)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        تماس با مشتری
                        <span className="tabular-nums opacity-90 dir-ltr">
                          ({order.customerPhone})
                        </span>
                      </button>

                      <AudioRecordingPlayer
                        orderCode={order.code}
                        durationSeconds={order.callDurationSeconds}
                      />
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

                  {/* Discrepancy Banner */}
                  {discrepancy && order.discrepancy && (
                    <div className="px-5 py-3 bg-amber-50 text-amber-950 border-b border-amber-300 text-[13px] flex items-start gap-2.5">
                      <Scale className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                      <div className="space-y-1">
                        <div>
                          <strong>ارجاع از واحد ارسال (مغایرت وزن):</strong> {order.discrepancy.note}
                        </div>
                        <div className="tabular-nums text-xs text-amber-800">
                          {order.discrepancy.changes
                            .map((c) => `${c.productName}: ${c.oldWeight}kg ← ${c.newWeight}kg`)
                            .join(' · ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invoice Items Table */}
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
                            مقدار تحویل شده (تولید / اصلاحی)
                          </th>
                          <th className="text-right font-normal px-5 py-2.5">قیمت واحد (ریال)</th>
                          <th className="text-right font-normal px-5 py-2.5">مبلغ کل ردیف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {order.items.map((item) => {
                          const hasRevision =
                            item.revisedWeight !== null &&
                            item.previousWeightBeforeDiscrepancy !== null;
                          const weightForCalc = getFinanceWeight(item);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3 font-medium text-slate-900">
                                {item.productName}
                              </td>
                              <td className="tabular-nums px-5 py-3 text-slate-600">
                                {formatWeight(item.requestedWeight)}
                              </td>
                              <td className="tabular-nums px-5 py-3">
                                {hasRevision ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="line-through text-red-600 text-xs">
                                      {formatWeight(item.previousWeightBeforeDiscrepancy!)}
                                    </span>
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-xs">
                                      {formatWeight(item.revisedWeight!)} (اصلاحی ارسال)
                                    </span>
                                  </div>
                                ) : item.producedWeight !== null ? (
                                  <span className="font-semibold text-slate-900">
                                    {formatWeight(item.producedWeight)}
                                    {item.returnedWeight > 0 && (
                                      <span className="text-xs font-bold text-red-700 mr-2">
                                        (مرجوعی: {formatWeight(item.returnedWeight)})
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">
                                    در انتظار توزین تولید ({formatWeight(weightForCalc)} تخمینی)
                                  </span>
                                )}
                              </td>
                              <td className="tabular-nums px-5 py-3 text-slate-700">
                                {new Intl.NumberFormat('fa-IR').format(item.unitPrice)}
                              </td>
                              <td className="tabular-nums px-5 py-3 font-semibold text-slate-900">
                                {formatRial(calculateItemTotal(item))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Return Resolution & Confirmation Box for Finance */}
                  {returned && order.returnRecord && (
                    <ReturnResolutionBox
                      returnRecord={order.returnRecord}
                      currentDept="finance"
                      onConfirmReturn={() => onConfirmReturn(order.id)}
                      extraSummary={
                        <div className="tabular-nums pt-1 text-xs text-red-900 flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            مبلغ اولیه فاکتور: <strong>{formatRial(orderTotal)}</strong>
                          </span>
                          <span>
                            کسر بابت مرجوعی: <strong className="text-red-700">{formatRial(returnDeduction)}</strong>
                          </span>
                          <span>
                            مانده قابل پرداخت: <strong className="text-[#0f5864]">{formatRial(netAfterReturn)}</strong>
                          </span>
                        </div>
                      }
                    />
                  )}

                  {/* Finance Footer Actions */}
                  {!returned && (
                    <div className="no-print px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">
                        جمع قابل پرداخت:{' '}
                        <strong className="tabular-nums text-sm text-slate-900">
                          {formatRial(orderTotal)}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {approved && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-md text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            تایید شده - ارسال به بخش ارسال
                          </span>
                        )}

                        {rejected && (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3.5 py-2 rounded-md text-xs font-bold">
                            <Ban className="w-4 h-4" />
                            رد شده توسط{' '}
                            {order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : ''}
                          </span>
                        )}

                        {!approved && !rejected && (
                          <>
                            <button
                              type="button"
                              disabled={!canAct}
                              onClick={() => onOpenReject(order)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              <X className="w-3.5 h-3.5" />
                              رد سفارش
                            </button>
                            <button
                              type="button"
                              disabled={!canAct}
                              onClick={() => onApproveFinance(order.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              {canAct ? (
                                <>
                                  <Stamp className="w-4 h-4" />
                                  {discrepancy ? 'تایید مجدد فاکتور اصلاحی' : 'تایید حسابداری'}
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  در انتظار اتمام تولید...
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
