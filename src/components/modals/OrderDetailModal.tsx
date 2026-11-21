import React, { useEffect } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Lock,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Scale,
  Stamp,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import { DEPARTMENT_LABELS, DRIVERS } from '../../data/initialOrders';
import { Order, OrderItem, WorkflowDepartment } from '../../types/order';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
  getFinanceWeight,
  getShippingWeight,
} from '../../utils/formatters';
import { AudioRecordingPlayer } from '../AudioRecordingPlayer';
import { ReturnResolutionBox } from '../ReturnResolutionBox';

interface OrderDetailModalProps {
  order: Order | null;
  department: WorkflowDepartment;
  disableEscape?: boolean;
  onClose: () => void;
  onPrintSingle: (orderId: string) => void;
  // Production actions
  onApproveProduction: (orderId: string) => void;
  onOpenWeight: (order: Order, item: OrderItem) => void;
  onCompleteProduction: (orderId: string) => void;
  // Finance actions
  onApproveFinance: (orderId: string) => void;
  onCallCustomer: (order: Order) => void;
  // Shipping actions
  onSelectDriver: (orderId: string, driverName: string) => void;
  onOpenDiscrepancy: (order: Order) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenReturn: (order: Order) => void;
  onDriverMissingWarning: (orderCode: string) => void;
  // Shared actions
  onOpenReject: (order: Order, source: WorkflowDepartment) => void;
  onConfirmReturn: (orderId: string, dept: WorkflowDepartment) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  department,
  disableEscape = false,
  onClose,
  onPrintSingle,
  onApproveProduction,
  onOpenWeight,
  onCompleteProduction,
  onApproveFinance,
  onCallCustomer,
  onSelectDriver,
  onOpenDiscrepancy,
  onOpenDelivery,
  onOpenReturn,
  onDriverMissingWarning,
  onOpenReject,
  onConfirmReturn,
}) => {
  useEffect(() => {
    if (!order || disableEscape) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [order, disableEscape, onClose]);

  if (!order) return null;

  const rejected = order.status === 'rejected';
  const returned = order.status === 'returned';
  const inProduction = order.status === 'in_production';
  const discrepancy = order.status === 'finance_discrepancy_review';
  const readyForFinance = order.status === 'pending_finance_approval';
  const readyToShip = order.status === 'pending_shipping';
  const delivered = order.status === 'delivered';

  const prodCompleted =
    readyForFinance || discrepancy || readyToShip || delivered;
  const financeApproved = readyToShip || delivered;
  const financeCanAct = readyForFinance || discrepancy;

  const weighedCount = order.items.filter((i) => i.producedWeight !== null).length;
  const allItemsWeighed = inProduction && weighedCount === order.items.length;

  const orderTotal = calculateOrderTotal(order);
  const returnDeduction = order.items.reduce(
    (sum, item) => sum + item.returnedWeight * item.unitPrice,
    0
  );
  const netAfterReturn = Math.max(0, orderTotal - returnDeduction);

  const deptReturnPending =
    returned && !(order.returnRecord?.confirmations[department]?.confirmed ?? false);

  const handleDeliveryClick = () => {
    if (!order.driverName) {
      onDriverMissingWarning(order.code);
      return;
    }
    onOpenDelivery(order);
  };

  const getFinanceStatusText = () => {
    if (rejected) {
      const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
      return { text: `رد شده (${src})`, className: 'text-red-700' };
    }
    if (returned) {
      return order.returnRecord?.confirmations.finance.confirmed
        ? { text: 'مرجوعی تایید شده (مالی)', className: 'text-emerald-700' }
        : { text: 'مرجوع شده — در انتظار تایید مالی', className: 'text-red-700' };
    }
    if (discrepancy) {
      return { text: 'در انتظار تایید مجدد (اصلاح وزن)', className: 'text-amber-700' };
    }
    if (readyForFinance) {
      return { text: 'در انتظار تایید مالی', className: 'text-[#0f5864]' };
    }
    if (financeApproved) {
      return { text: 'تایید شده', className: 'text-emerald-700' };
    }
    return { text: 'در انتظار تولید', className: 'text-slate-500' };
  };

  const financeStatus = getFinanceStatusText();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`جزئیات سفارش ${order.code}`}
      className="no-print fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1.5px] flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[820px] rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Priority Banner inside Modal */}
        {deptReturnPending && (
          <div className="px-5 py-2 bg-red-600 text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              سفارش مرجوعی — نیازمند تعیین‌تکلیف و تایید مرجوعی در {DEPARTMENT_LABELS[department]}
            </span>
            <span className="tabular-nums opacity-95">کد {order.code}</span>
          </div>
        )}

        {department === 'production' && inProduction && (
          <div className="px-5 py-2 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              در پروسه اقدام تولید — ثبت وزن اقلام
            </span>
            <span className="tabular-nums opacity-95 font-medium">
              پیشرفت توزین: {weighedCount} از {order.items.length} قلم
            </span>
          </div>
        )}

        {department === 'finance' && discrepancy && (
          <div className="px-5 py-2 bg-amber-600 text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 shrink-0" />
              اولویت فوری مالی — ارجاع مغایرت وزن از ارسال (نیازمند تایید مجدد)
            </span>
            <span className="tabular-nums opacity-95">کد {order.code}</span>
          </div>
        )}

        {department === 'finance' && readyForFinance && (
          <div className="px-5 py-2 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              آماده اقدام واحد مالی — تایید حسابداری
            </span>
            <span className="tabular-nums opacity-95 font-medium">
              مبلغ: {formatRial(orderTotal)}
            </span>
          </div>
        )}

        {department === 'shipping' && readyToShip && (
          <div className="px-5 py-2 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              اولویت ارسال — تاییدشده توسط مالی، آماده تخصیص راننده
            </span>
            <span className="opacity-95 font-medium">بازه ارسال: {order.deliverySlot}</span>
          </div>
        )}

        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0 ${
            rejected || returned ? 'bg-red-50/70' : 'bg-slate-50'
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 flex-1">
            <div className="text-[13px]">
              <span className="block text-[11px] text-slate-500 mb-0.5">کد سفارش</span>
              <span
                className={`tabular-nums text-base font-bold ${
                  rejected || returned ? 'text-red-700' : 'text-[#0056b3]'
                }`}
              >
                {order.code}
              </span>
            </div>

            {department !== 'finance' && (
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">بازه ارسال</span>
                <span className="font-bold text-slate-900">{order.deliverySlot}</span>
              </div>
            )}

            {department === 'finance' && (
              <>
                <div className="text-[13px]">
                  <span className="block text-[11px] text-slate-500 mb-0.5">طرف حساب</span>
                  <span className="font-bold text-slate-900">{order.customerName}</span>
                </div>
                <div className="text-[13px]">
                  <span className="block text-[11px] text-slate-500 mb-0.5">وضعیت مالی</span>
                  <span className={`font-bold ${financeStatus.className}`}>
                    {financeStatus.text}
                  </span>
                </div>
                <div className="text-[13px]">
                  <span className="block text-[11px] text-slate-500 mb-0.5">
                    {returned ? 'مبلغ خالص پس از مرجوعی' : 'مبلغ کل فاکتور'}
                  </span>
                  <span className="tabular-nums font-bold text-[#0f5864]">
                    {formatRial(returned ? netAfterReturn : orderTotal)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPrintSingle(order.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              پرینت
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن جزئیات سفارش"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-200">
          {/* Rejection Alert */}
          {rejected && order.rejection && (
            <div className="px-5 py-3 bg-red-100 text-red-900 text-[13px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
              <span>
                سفارش توسط <strong>{DEPARTMENT_LABELS[order.rejection.source]}</strong> رد شد — دلیل:{' '}
                <strong>{order.rejection.reason}</strong>
              </span>
            </div>
          )}

          {/* Production Notes */}
          {department === 'production' && (
            <div className="px-5 py-3 bg-amber-50/90 text-amber-950 text-[13px]">
              <strong>توضیحات تولید:</strong> {order.notes}
            </div>
          )}

          {/* Finance Contact & Audio + Discrepancy Alert */}
          {department === 'finance' && (
            <>
              <div className="px-5 py-3 bg-[#eef2f9]/60 flex flex-wrap items-center gap-3">
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

              {discrepancy && order.discrepancy && (
                <div className="px-5 py-3 bg-amber-50 text-amber-950 text-[13px] flex items-start gap-2.5">
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
            </>
          )}

          {/* Shipping Delivery Address */}
          {department === 'shipping' && (
            <div className="px-5 py-3 bg-slate-50/70">
              <div className="flex items-start gap-2 bg-white border border-dashed border-slate-300 rounded-md px-3.5 py-2.5 text-[13px] text-slate-700">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>آدرس تحویل:</strong> {order.address}
                </span>
              </div>
            </div>
          )}

          {/* Department-Specific Items Table */}
          <div className="overflow-x-auto bg-white">
            {department === 'production' && (
              <table className={`w-full border-collapse text-[13px] ${rejected ? 'opacity-60' : ''}`}>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                    <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                    <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                    <th className="text-right font-normal px-5 py-2.5">وضعیت / اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const weighed = item.producedWeight !== null;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">{item.productName}</td>
                        <td className="tabular-nums px-5 py-3 text-slate-700">
                          {formatWeight(item.requestedWeight)}
                        </td>
                        <td className="px-5 py-3">
                          {weighed ? (
                            <div className="inline-flex items-center gap-2 flex-wrap">
                              <span className="tabular-nums inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded text-xs font-medium">
                                <Check className="w-3.5 h-3.5" />
                                تحویل داده شده ({formatWeight(item.producedWeight!)})
                              </span>
                              {item.returnedWeight > 0 && (
                                <span className="tabular-nums text-xs font-bold text-red-700">
                                  (مرجوعی: {formatWeight(item.returnedWeight)})
                                </span>
                              )}
                              {inProduction && (
                                <button
                                  type="button"
                                  onClick={() => onOpenWeight(order, item)}
                                  title="ویرایش وزن"
                                  className="text-slate-400 hover:text-[#0f5864] p-1 rounded transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!inProduction}
                              onClick={() => onOpenWeight(order, item)}
                              className="px-3 py-1.5 text-xs font-medium rounded border transition-colors bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-700 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              ثبت وزن محصول
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {department === 'finance' && (
              <table className={`w-full border-collapse text-[13px] ${rejected ? 'opacity-60' : ''}`}>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                    <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                    <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                    <th className="text-right font-normal px-5 py-2.5">
                      مقدار تحویل شده (تولید / اصلاحی)
                    </th>
                    <th className="text-right font-normal px-5 py-2.5">قیمت واحد (ریال)</th>
                    <th className="text-right font-normal px-5 py-2.5">مبلغ کل ردیف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const hasRevision =
                      item.revisedWeight !== null &&
                      item.previousWeightBeforeDiscrepancy !== null;
                    const weightForCalc = getFinanceWeight(item);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">{item.productName}</td>
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
            )}

            {department === 'shipping' && (
              <table className={`w-full border-collapse text-[13px] ${rejected ? 'opacity-60' : ''}`}>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                    <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                    <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                    <th className="text-right font-normal px-5 py-2.5">
                      مقدار تحویل شده (تولید / واقعی)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const effectiveWeight = getShippingWeight(item);
                    const showRevisionDiff =
                      item.deliveredWeight === null &&
                      item.revisedWeight !== null &&
                      item.previousWeightBeforeDiscrepancy !== null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">{item.productName}</td>
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
            )}
          </div>

          {/* Return Resolution Box (shared across all 3 departments when returned) */}
          {returned && order.returnRecord && (
            <ReturnResolutionBox
              returnRecord={order.returnRecord}
              currentDept={department}
              onConfirmReturn={() => onConfirmReturn(order.id, department)}
              extraSummary={
                department === 'finance' ? (
                  <div className="tabular-nums pt-1 text-xs text-red-900 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      مبلغ اولیه فاکتور: <strong>{formatRial(orderTotal)}</strong>
                    </span>
                    <span>
                      کسر بابت مرجوعی:{' '}
                      <strong className="text-red-700">{formatRial(returnDeduction)}</strong>
                    </span>
                    <span>
                      مانده قابل پرداخت:{' '}
                      <strong className="text-[#0f5864]">{formatRial(netAfterReturn)}</strong>
                    </span>
                  </div>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Sticky Modal Action Footer */}
        {department === 'production' && !returned && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500">
              {order.status === 'pending_production_approval'
                ? 'پس از تایید سفارش، دکمه ثبت وزن محصولات فعال می‌شود.'
                : inProduction && !allItemsWeighed
                  ? `لطفاً وزن تمام اقلام را ثبت کنید (${weighedCount} از ${order.items.length}).`
                  : allItemsWeighed
                    ? 'تمامی اقلام توزین شده‌اند؛ آماده ارسال به بخش مالی.'
                    : ''}
            </span>

            <div className="flex items-center gap-2.5 flex-wrap">
              {order.status === 'pending_production_approval' && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenReject(order, 'production')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    رد سفارش
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveProduction(order.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" />
                    تایید سفارش
                  </button>
                </>
              )}

              {inProduction && !allItemsWeighed && (
                <button
                  type="button"
                  onClick={() => onOpenReject(order, 'production')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" />
                  رد سفارش
                </button>
              )}

              {allItemsWeighed && (
                <button
                  type="button"
                  onClick={() => onCompleteProduction(order.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-4 h-4" />
                  اتمام تولید و ارسال به مالی
                </button>
              )}

              {prodCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-600 text-white rounded-md whitespace-nowrap">
                  <CheckCheck className="w-4 h-4" />
                  تولید تکمیل و به مالی ارسال شد
                </span>
              )}

              {rejected && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3.5 py-2 rounded-md text-xs font-bold">
                  <Ban className="w-4 h-4" />
                  سفارش رد شده است
                </span>
              )}
            </div>
          </div>
        )}

        {department === 'finance' && !returned && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-600">
              جمع قابل پرداخت:{' '}
              <strong className="tabular-nums text-sm text-slate-900">
                {formatRial(orderTotal)}
              </strong>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {financeApproved && (
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

              {!financeApproved && !rejected && (
                <>
                  <button
                    type="button"
                    disabled={!financeCanAct}
                    onClick={() => onOpenReject(order, 'finance')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    رد سفارش
                  </button>
                  <button
                    type="button"
                    disabled={!financeCanAct}
                    onClick={() => onApproveFinance(order.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {financeCanAct ? (
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

        {department === 'shipping' && (
          <>
            {rejected && (
              <div className="px-5 py-3.5 bg-red-50 text-red-800 border-t border-red-200 text-[13px] font-bold flex items-center gap-2 shrink-0">
                <Ban className="w-4 h-4 shrink-0" />
                <span>
                  این سفارش توسط{' '}
                  {order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : 'واحد مربوطه'}{' '}
                  رد شده و ارسال آن لغو گردید.
                </span>
              </div>
            )}

            {discrepancy && (
              <div className="px-5 py-3.5 bg-amber-50 text-amber-900 border-t border-amber-200 text-[13px] font-bold flex items-center gap-2 shrink-0">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  مغایرت وزن ثبت شد و سفارش جهت بررسی و تایید مجدد فاکتور به واحد مالی ارجاع گردید.
                </span>
              </div>
            )}

            {(order.status === 'pending_production_approval' ||
              order.status === 'in_production' ||
              order.status === 'pending_finance_approval') && (
              <div className="px-5 py-3.5 bg-amber-50/90 text-amber-900 border-t border-amber-200 text-[13px] font-semibold flex items-center gap-2 shrink-0">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  این سفارش در انتظار تایید نهایی توسط واحد مالی است. پس از تایید، امکان تخصیص راننده فراهم می‌شود.
                </span>
              </div>
            )}

            {readyToShip && (
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                  <label
                    htmlFor={`modal-driver-${order.id}`}
                    className="text-xs font-medium text-slate-700 whitespace-nowrap"
                  >
                    انتخاب راننده:
                  </label>
                  <select
                    id={`modal-driver-${order.id}`}
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

                <div className="flex items-center gap-2 flex-wrap">
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
                    onClick={handleDeliveryClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
                  >
                    <Truck className="w-4 h-4" />
                    ثبت وزن و تحویل به راننده
                  </button>
                </div>
              </div>
            )}

            {(delivered || returned) && (
              <div className="px-5 py-3.5 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <span className="inline-flex items-center gap-2 text-emerald-800 font-bold text-[13px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  با موفقیت تحویل داده شد (راننده: {order.driverName})
                </span>

                <button
                  type="button"
                  disabled={returned}
                  onClick={() => onOpenReturn(order)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold bg-white text-red-600 border border-red-500 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
          </>
        )}
      </div>
    </div>
  );
};
