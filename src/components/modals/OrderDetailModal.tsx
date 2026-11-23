import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Camera,
  CameraOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
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
import {
  Order,
  OrderItem,
  UploadedDocumentPhoto,
  WorkflowDepartment,
} from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
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
  access: AccessControlHelpers;
  disableEscape?: boolean;
  onClose: () => void;
  onPrintSingle: (orderId: string) => void;
  // Production actions
  onOpenWeight: (order: Order, item: OrderItem) => void;
  onCompleteProduction: (orderId: string) => void;
  // Finance actions
  onApproveFinance: (orderId: string) => void;
  onVerifyDriverDocuments: (orderId: string) => void;
  onOpenRejectDriverDocs: (order: Order) => void;
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
  access,
  disableEscape = false,
  onClose,
  onPrintSingle,
  onOpenWeight,
  onCompleteProduction,
  onApproveFinance,
  onVerifyDriverDocuments,
  onOpenRejectDriverDocs,
  onCallCustomer,
  onSelectDriver,
  onOpenDiscrepancy,
  onOpenDelivery,
  onOpenReturn,
  onDriverMissingWarning,
  onOpenReject,
  onConfirmReturn,
}) => {
  const [zoomedDoc, setZoomedDoc] = useState<{
    title: string;
    photo: UploadedDocumentPhoto;
  } | null>(null);

  useEffect(() => {
    setZoomedDoc(null);
  }, [order?.id]);

  useEffect(() => {
    if (!order || disableEscape) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedDoc) {
          setZoomedDoc(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [order, disableEscape, zoomedDoc, onClose]);

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

  const driverDocsRejectedPending = Boolean(
    order.driverDelivery?.financeRejected && !order.driverDelivery?.sentToFinance
  );

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
        ? { text: 'مرجوعی تایید شده (صدور فاکتور)', className: 'text-emerald-700' }
        : { text: 'مرجوع شده — در انتظار تایید صدور فاکتور', className: 'text-red-700' };
    }
    if (driverDocsRejectedPending) {
      return { text: 'مدارک راننده رد شد — در انتظار عکس مجدد', className: 'text-red-700' };
    }
    if (order.driverDelivery?.sentToFinance) {
      return order.driverDelivery.financeVerified
        ? { text: 'مدارک تحویل راننده تایید شد', className: 'text-emerald-700' }
        : { text: 'مدارک تحویل دریافت شد (آماده بررسی)', className: 'text-emerald-700' };
    }
    if (discrepancy) {
      return { text: 'در انتظار تایید مجدد (اصلاح وزن)', className: 'text-amber-700' };
    }
    if (readyForFinance) {
      return { text: 'در انتظار صدور فاکتور', className: 'text-[#0f5864]' };
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
      className="no-print fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[840px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[93dvh] sm:max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center bg-slate-50 shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Top Priority Banner inside Modal */}
        {deptReturnPending && (
          <div className="px-4 sm:px-5 py-2.5 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4 shrink-0" />
              سفارش مرجوعی — نیازمند تایید در {DEPARTMENT_LABELS[department]}
            </span>
            <span className="tabular-nums opacity-95">کد {order.code}</span>
          </div>
        )}

        {department === 'production' && inProduction && (
          <div className="px-4 sm:px-5 py-2.5 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              در پروسه تولید — ثبت وزن اقلام
            </span>
            <span className="tabular-nums opacity-95 font-medium">
              توزین: {weighedCount} از {order.items.length} قلم
            </span>
          </div>
        )}

        {department === 'finance' && discrepancy && (
          <div className="px-4 sm:px-5 py-2.5 bg-amber-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Scale className="w-4 h-4 shrink-0" />
              اولویت فوری — مغایرت وزن از ارسال (نیازمند تایید مجدد)
            </span>
            <span className="tabular-nums opacity-95">کد {order.code}</span>
          </div>
        )}

        {department === 'finance' && readyForFinance && (
          <div className="px-4 sm:px-5 py-2.5 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              آماده صدور فاکتور
            </span>
            <span className="tabular-nums opacity-95 font-medium">
              مبلغ: {formatRial(orderTotal)}
            </span>
          </div>
        )}

        {department === 'shipping' && readyToShip && (
          <div className="px-4 sm:px-5 py-2.5 bg-[#0f5864] text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              اولویت ارسال — آماده تخصیص راننده و خروج
            </span>
            <span className="opacity-95 font-medium">بازه {order.deliverySlot}</span>
          </div>
        )}

        {/* Modal Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0 ${
            rejected || returned ? 'bg-red-50/70' : 'bg-slate-50'
          }`}
        >
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
            {access.canView('field_order_code') && (
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">کد سفارش</span>
                <span
                  className={`tabular-nums text-base sm:text-lg font-bold ${
                    rejected || returned ? 'text-red-700' : 'text-[#0056b3]'
                  }`}
                >
                  {order.code}
                </span>
              </div>
            )}

            {department !== 'finance' && access.canView('field_delivery_slot') && (
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">بازه ارسال</span>
                <span className="font-bold text-slate-900">{order.deliverySlot}</span>
              </div>
            )}

            {department === 'finance' && (
              <>
                {access.canView('field_customer_name') && (
                  <div className="text-[13px] min-w-0">
                    <span className="block text-[11px] text-slate-500 mb-0.5">طرف حساب</span>
                    <span className="font-bold text-slate-900 block truncate">
                      {order.customerName}
                    </span>
                  </div>
                )}
                {access.canView('field_order_status') && (
                  <div className="text-[13px] col-span-2 sm:col-span-1">
                    <span className="block text-[11px] text-slate-500 mb-0.5">وضعیت</span>
                    <span className={`font-bold text-xs sm:text-[13px] ${financeStatus.className}`}>
                      {financeStatus.text}
                    </span>
                  </div>
                )}
                {access.canView('field_order_total') && (
                  <div className="text-[13px]">
                    <span className="block text-[11px] text-slate-500 mb-0.5">
                      {returned ? 'مبلغ خالص' : 'مبلغ کل فاکتور'}
                    </span>
                    <span className="tabular-nums font-bold text-[#0f5864]">
                      {formatRial(returned ? netAfterReturn : orderTotal)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {access.canView('action_print') && (
              <button
                type="button"
                disabled={!access.canEdit('action_print')}
                onClick={() => onPrintSingle(order.id)}
                title="پرینت سفارش"
                className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-md hover:bg-slate-100 disabled:opacity-45 transition-colors whitespace-nowrap"
              >
                <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">پرینت</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن جزئیات سفارش"
              className="w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-200">
          {/* Rejection Alert */}
          {rejected && order.rejection && (
            <div className="px-4 sm:px-5 py-3 bg-red-100 text-red-900 text-xs sm:text-[13px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700 mt-0.5" />
              <span className="leading-relaxed">
                سفارش توسط <strong>{DEPARTMENT_LABELS[order.rejection.source]}</strong> رد شد — دلیل:{' '}
                <strong>{order.rejection.reason}</strong>
              </span>
            </div>
          )}

          {/* Production Notes */}
          {department === 'production' && access.canView('field_notes') && (
            <div className="px-4 sm:px-5 py-3 bg-amber-50/90 text-amber-950 text-xs sm:text-[13px] leading-relaxed">
              <strong>توضیحات تولید:</strong> {order.notes}
            </div>
          )}

          {/* Finance Contact & Audio + Discrepancy Alert */}
          {department === 'finance' && (
            <>
              {(access.canView('field_customer_phone') ||
                access.canView('field_call_recording')) && (
                <div className="px-4 sm:px-5 py-3 bg-[#eef2f9]/60 flex flex-wrap items-center gap-3">
                  {access.canView('field_customer_phone') && (
                    <a
                      href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                      onClick={() => onCallCustomer(order)}
                      className="min-h-[42px] sm:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      تماس با مشتری
                      <span dir="ltr" className="tabular-nums opacity-90">
                        ({order.customerPhone})
                      </span>
                    </a>
                  )}
                  {access.canView('field_call_recording') && (
                    <AudioRecordingPlayer
                      orderCode={order.code}
                      durationSeconds={order.callDurationSeconds}
                    />
                  )}
                </div>
              )}

              {discrepancy && order.discrepancy && access.canView('field_revised_weight') && (
                <div className="px-4 sm:px-5 py-3 bg-amber-50 text-amber-950 text-xs sm:text-[13px] flex items-start gap-2.5">
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
          {department === 'shipping' && access.canView('field_address') && (
            <div className="px-4 sm:px-5 py-3 bg-slate-50/70">
              <div className="flex items-start gap-2 bg-white border border-dashed border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>آدرس تحویل ({order.district}):</strong> {order.address}
                </span>
              </div>
            </div>
          )}

          {/* Department-Specific Items (Mobile Stacked Cards + Desktop Table) */}
          <div className="bg-white">
            {/* PRODUCTION ITEMS */}
            {department === 'production' && (
              <>
                {/* Mobile Card List (Easy Touch Targets) */}
                <div className={`sm:hidden divide-y divide-slate-100 ${rejected ? 'opacity-60' : ''}`}>
                  {order.items.map((item) => {
                    const weighed = item.producedWeight !== null;
                    return (
                      <div key={item.id} className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {item.productName}
                            </div>
                            <div className="tabular-nums text-xs text-slate-500 mt-1">
                              مقدار درخواستی:{' '}
                              <strong className="text-slate-800">
                                {formatWeight(item.requestedWeight)}
                              </strong>
                            </div>
                          </div>
                          {weighed && (
                            <span className="tabular-nums inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
                              <Check className="w-3.5 h-3.5" />
                              {formatWeight(item.producedWeight!)}
                            </span>
                          )}
                        </div>

                        {item.returnedWeight > 0 && (
                          <div className="tabular-nums text-xs font-bold text-red-700">
                            مقدار مرجوعی: {formatWeight(item.returnedWeight)}
                          </div>
                        )}

                        {weighed ? (
                          inProduction && (
                            <button
                              type="button"
                              onClick={() => onOpenWeight(order, item)}
                              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-[#0f5864] border border-slate-200 active:scale-[0.99] transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                              ویرایش وزن ثبت‌شده
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={!inProduction}
                            onClick={() => onOpenWeight(order, item)}
                            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white active:scale-[0.99] disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed transition-all"
                          >
                            <Scale className="w-4 h-4" />
                            ثبت وزن محصول
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
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
                                      className="text-slate-400 hover:text-[#0f5864] p-1.5 rounded transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!inProduction}
                                  onClick={() => onOpenWeight(order, item)}
                                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-700 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed whitespace-nowrap"
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
                </div>
              </>
            )}

            {/* FINANCE ITEMS */}
            {department === 'finance' && (
              <>
                {/* Mobile Card List */}
                <div className={`sm:hidden divide-y divide-slate-100 ${rejected ? 'opacity-60' : ''}`}>
                  {order.items.map((item) => {
                    const hasRevision =
                      item.revisedWeight !== null &&
                      item.previousWeightBeforeDiscrepancy !== null;
                    const weightForCalc = getFinanceWeight(item);

                    return (
                      <div key={item.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {item.productName}
                          </span>
                          <span className="tabular-nums text-xs font-bold text-[#0f5864] shrink-0">
                            {formatRial(calculateItemTotal(item))}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 tabular-nums">
                          <div>
                            درخواستی: <strong className="text-slate-800">{formatWeight(item.requestedWeight)}</strong>
                          </div>
                          <div>
                            فی واحد: <strong className="text-slate-800">{new Intl.NumberFormat('fa-IR').format(item.unitPrice)}</strong>
                          </div>
                          <div className="col-span-2">
                            وزن تحویلی:{' '}
                            {hasRevision ? (
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span className="line-through text-red-600">
                                  {formatWeight(item.previousWeightBeforeDiscrepancy!)}
                                </span>
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
                                  {formatWeight(item.revisedWeight!)} (اصلاحی)
                                </span>
                              </span>
                            ) : item.producedWeight !== null ? (
                              <strong className="text-slate-900">
                                {formatWeight(item.producedWeight)}
                              </strong>
                            ) : (
                              <span className="text-slate-400">
                                در انتظار توزین ({formatWeight(weightForCalc)} تخمینی)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className={`w-full border-collapse text-[13px] ${rejected ? 'opacity-60' : ''}`}>
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                        <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                        <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                        <th className="text-right font-normal px-5 py-2.5">مقدار تحویل شده (تولید / اصلاحی)</th>
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
                </div>
              </>
            )}

            {/* SHIPPING ITEMS */}
            {department === 'shipping' && (
              <>
                {/* Mobile Card List */}
                <div className={`sm:hidden divide-y divide-slate-100 ${rejected ? 'opacity-60' : ''}`}>
                  {order.items.map((item) => {
                    const effectiveWeight = getShippingWeight(item);
                    const showRevisionDiff =
                      item.deliveredWeight === null &&
                      item.revisedWeight !== null &&
                      item.previousWeightBeforeDiscrepancy !== null;

                    return (
                      <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900">
                            {item.productName}
                          </div>
                          <div className="tabular-nums text-xs text-slate-500 mt-0.5">
                            درخواستی: {formatWeight(item.requestedWeight)}
                          </div>
                        </div>

                        <div className="tabular-nums text-left shrink-0">
                          <span className="block text-[10px] text-slate-500">تحویلی / واقعی</span>
                          {showRevisionDiff ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="line-through text-red-600 text-xs">
                                {formatWeight(item.previousWeightBeforeDiscrepancy!)}
                              </span>
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-xs">
                                {formatWeight(item.revisedWeight!)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-900">
                              {formatWeight(effectiveWeight)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className={`w-full border-collapse text-[13px] ${rejected ? 'opacity-60' : ''}`}>
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                        <th className="text-right font-normal px-5 py-2.5">نام محصول</th>
                        <th className="text-right font-normal px-5 py-2.5">مقدار درخواستی</th>
                        <th className="text-right font-normal px-5 py-2.5">مقدار تحویل شده (تولید / واقعی)</th>
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
                </div>
              </>
            )}
          </div>

          {/* Driver-Submitted Delivery Photos in Invoice Issuance (Verify OR Reject with Reason) */}
          {department === 'finance' && order.driverDelivery?.sentToFinance && (
            <div className="px-4 sm:px-5 py-4 bg-emerald-50/50 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-[13px] font-bold text-emerald-950 inline-flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                    مدارک تحویل ارسال‌شده توسط راننده
                  </h4>
                  <p className="text-xs text-emerald-800/85 mt-0.5">
                    زمان ارسال: {order.driverDelivery.completedAt}
                    {order.driverName ? ` · راننده: ${order.driverName}` : ''}
                  </p>
                </div>

                {order.driverDelivery.financeVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    تایید شده توسط صدور فاکتور ({order.driverDelivery.financeVerifiedAt})
                  </span>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenRejectDriverDocs(order)}
                      className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-300 hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <CameraOff className="w-4 h-4 shrink-0" />
                      رد مدارک و درخواست عکس مجدد
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerifyDriverDocuments(order.id)}
                      className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                      <CheckCheck className="w-4 h-4 shrink-0" />
                      تایید مدارک تحویل
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.driverDelivery.invoicePhoto && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-slate-800">عکس فاکتور</strong>
                      <span className="tabular-nums text-[11px] text-slate-500">
                        {order.driverDelivery.invoicePhoto.uploadedAt}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedDoc({
                          title: `عکس فاکتور سفارش ${order.code}`,
                          photo: order.driverDelivery!.invoicePhoto!,
                        })
                      }
                      className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={order.driverDelivery.invoicePhoto.dataUrl}
                        alt={`عکس فاکتور سفارش ${order.code}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                        <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          بزرگ‌نمایی
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                {order.driverDelivery.paymentReceiptPhoto && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-slate-800">عکس رسید پرداخت</strong>
                      <span className="tabular-nums text-[11px] text-slate-500">
                        {order.driverDelivery.paymentReceiptPhoto.uploadedAt}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedDoc({
                          title: `عکس رسید پرداخت سفارش ${order.code}`,
                          photo: order.driverDelivery!.paymentReceiptPhoto!,
                        })
                      }
                      className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={order.driverDelivery.paymentReceiptPhoto.dataUrl}
                        alt={`عکس رسید پرداخت سفارش ${order.code}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                        <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          بزرگ‌نمایی
                        </span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejected Driver Docs Awaiting Driver Re-capture Notice in Finance */}
          {department === 'finance' && driverDocsRejectedPending && (
            <div className="px-4 sm:px-5 py-4 bg-red-50/90 space-y-2">
              <div className="flex items-start gap-2.5 text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <div className="font-bold text-red-800">
                    مدارک تحویل رد شده و در اولویت قرمز راننده جهت عکاسی مجدد قرار دارد
                  </div>
                  <div>
                    <strong>دلیل رد ثبت‌شده:</strong>{' '}
                    {order.driverDelivery?.financeRejectionReason}
                  </div>
                  <div className="text-red-700/90">
                    زمان رد: {order.driverDelivery?.financeRejectedAt}
                    {' · '}در انتظار ثبت عکس جدید و ارسال مجدد توسط راننده
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Return Resolution Box */}
          {returned && order.returnRecord && (
            <ReturnResolutionBox
              returnRecord={order.returnRecord}
              currentDept={department}
              canEditConfirm={true}
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

        {/* Sticky Modal Action Footer (Thumb-Friendly Full-Width CTAs on Mobile) */}
        {department === 'production' && !returned && (
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-modal-safe shrink-0">
            <span className="text-xs text-slate-600 leading-snug">
              {inProduction && !allItemsWeighed
                ? `لطفاً وزن تمام اقلام را ثبت کنید (${weighedCount} از ${order.items.length}).`
                : allItemsWeighed
                  ? 'تمامی اقلام توزین شده‌اند؛ آماده ارسال به صدور فاکتور.'
                  : ''}
            </span>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
              {inProduction && !allItemsWeighed && (
                <button
                  type="button"
                  onClick={() => onOpenReject(order, 'production')}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl sm:rounded-md hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  رد سفارش
                </button>
              )}

              {allItemsWeighed && (
                <button
                  type="button"
                  onClick={() => onCompleteProduction(order.id)}
                  className="min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold bg-emerald-600 text-white rounded-xl sm:rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-4 h-4" />
                  تایید نهایی و ارسال به صدور فاکتور
                </button>
              )}

              {prodCompleted && (
                <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-semibold bg-slate-600 text-white rounded-xl sm:rounded-md whitespace-nowrap">
                  <CheckCheck className="w-4 h-4" />
                  تولید تکمیل و به صدور فاکتور ارسال شد
                </span>
              )}

              {rejected && (
                <span className="inline-flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold">
                  <Ban className="w-4 h-4" />
                  سفارش رد شده است
                </span>
              )}
            </div>
          </div>
        )}

        {department === 'finance' && !returned && (
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-modal-safe shrink-0">
            <div className="text-xs text-slate-600">
              جمع قابل پرداخت:{' '}
              <strong className="tabular-nums text-sm text-slate-900">
                {formatRial(orderTotal)}
              </strong>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
              {financeApproved && (
                <span className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  تایید شده - ارسال به بخش ارسال
                </span>
              )}

              {rejected && (
                <span className="inline-flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold">
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
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    رد سفارش
                  </button>
                  <button
                    type="button"
                    disabled={!financeCanAct}
                    onClick={() => onApproveFinance(order.id)}
                    className="min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {financeCanAct ? (
                      <>
                        <Stamp className="w-4 h-4" />
                        {discrepancy ? 'تایید مجدد فاکتور اصلاحی' : 'تایید و صدور فاکتور'}
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
              <div className="px-4 sm:px-5 py-3.5 bg-red-50 text-red-800 border-t border-red-200 text-xs sm:text-[13px] font-bold flex items-center gap-2 pb-modal-safe shrink-0">
                <Ban className="w-4 h-4 shrink-0" />
                <span>
                  این سفارش توسط{' '}
                  {order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : 'واحد مربوطه'}{' '}
                  رد شده و ارسال آن لغو گردید.
                </span>
              </div>
            )}

            {discrepancy && (
              <div className="px-4 sm:px-5 py-3.5 bg-amber-50 text-amber-900 border-t border-amber-200 text-xs sm:text-[13px] font-bold flex items-center gap-2 pb-modal-safe shrink-0">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  مغایرت وزن ثبت شد و سفارش جهت تایید مجدد به واحد صدور فاکتور ارجاع گردید.
                </span>
              </div>
            )}

            {(order.status === 'in_production' ||
              order.status === 'pending_finance_approval') && (
              <div className="px-4 sm:px-5 py-3.5 bg-amber-50/90 text-amber-900 border-t border-amber-200 text-xs sm:text-[13px] font-semibold flex items-center gap-2 pb-modal-safe shrink-0">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  این سفارش در انتظار تایید نهایی توسط واحد صدور فاکتور است. پس از تایید، امکان تخصیص راننده فراهم می‌شود.
                </span>
              </div>
            )}

            {readyToShip && (
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-modal-safe shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 flex-1">
                  <label
                    htmlFor={`modal-driver-${order.id}`}
                    className="text-xs font-bold text-slate-700 whitespace-nowrap"
                  >
                    انتخاب راننده:
                  </label>
                  <select
                    id={`modal-driver-${order.id}`}
                    value={order.driverName}
                    onChange={(e) => onSelectDriver(order.id, e.target.value)}
                    className="w-full sm:flex-1 h-11 sm:h-9 px-3 text-sm sm:text-xs font-medium bg-white border border-slate-300 rounded-xl sm:rounded-md focus:outline-none focus:border-[#0f5864]"
                  >
                    <option value="">-- انتخاب راننده --</option>
                    {DRIVERS.map((driver) => (
                      <option key={driver.id} value={driver.name}>
                        {driver.name} ({driver.vehicle})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDiscrepancy(order)}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-500 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Scale className="w-4 h-4" />
                    مغایرت وزن / ارجاع
                  </button>

                  <button
                    type="button"
                    onClick={handleDeliveryClick}
                    className="min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
                  >
                    <Truck className="w-4 h-4" />
                    ثبت وزن و تحویل به راننده
                  </button>
                </div>
              </div>
            )}

            {(delivered || returned) && (
              <div className="px-4 sm:px-5 py-3.5 bg-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-modal-safe shrink-0">
                <span className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-[13px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  با موفقیت تحویل داده شد
                  {order.driverName ? ` (راننده: ${order.driverName})` : ''}
                </span>

                <button
                  type="button"
                  disabled={returned}
                  onClick={() => onOpenReturn(order)}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-md text-xs font-bold bg-white text-red-600 border border-red-500 hover:bg-red-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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

      {/* Fullscreen Zoom Viewer for Driver Photos in Finance */}
      {zoomedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomedDoc.title}
          className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setZoomedDoc(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-xl max-w-3xl w-full max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-900">
                {zoomedDoc.title}
              </span>
              <button
                type="button"
                onClick={() => setZoomedDoc(null)}
                aria-label="بستن پیش‌نمایش"
                className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4 bg-slate-900 flex items-center justify-center overflow-auto">
              <img
                src={zoomedDoc.photo.dataUrl}
                alt={zoomedDoc.title}
                referrerPolicy="no-referrer"
                className="max-h-[75dvh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
