import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { DEPARTMENT_LABELS } from '../data/initialOrders';
import { ReturnRecord, WorkflowDepartment } from '../types/order';
import { formatRial, formatWeight } from '../utils/formatters';

interface ReturnResolutionBoxProps {
  returnRecord: ReturnRecord;
  currentDept: WorkflowDepartment;
  canEditConfirm?: boolean;
  onConfirmReturn: () => void;
  onOpenShippingReceive?: () => void;
  extraSummary?: React.ReactNode;
}

const ALL_DEPTS: WorkflowDepartment[] = ['production', 'finance', 'shipping'];

export const ReturnResolutionBox: React.FC<ReturnResolutionBoxProps> = ({
  returnRecord,
  currentDept,
  canEditConfirm = true,
  onConfirmReturn,
  onOpenShippingReceive,
  extraSummary,
}) => {
  const currentConfirmed =
    returnRecord.confirmations[currentDept]?.confirmed ?? false;
  const confirmedCount = ALL_DEPTS.filter(
    (d) => returnRecord.confirmations[d]?.confirmed
  ).length;
  const isAwaitingShippingReceive =
    returnRecord.stage === 'awaiting_shipping_receive' &&
    !returnRecord.confirmations.shipping?.confirmed;
  const isFullyCompleted =
    returnRecord.stage === 'completed' || confirmedCount === 3;

  const totalWeightKg = Number(
    returnRecord.items
      .reduce((sum, ret) => sum + (ret.shippingWeight ?? ret.weight), 0)
      .toFixed(2)
  );
  const totalRial = returnRecord.items.reduce(
    (sum, ret) =>
      sum +
      (ret.totalRial ??
        Math.round((ret.shippingWeight ?? ret.weight) * (ret.unitPrice ?? 0))),
    0
  );

  const scopeLabel =
    returnRecord.scope === 'full_order'
      ? 'مرجوعی کل سفارش'
      : returnRecord.scope === 'partial'
        ? 'مرجوعی بخشی از سفارش'
        : null;

  return (
    <div className="px-4 sm:px-5 pt-4 pb-6 bg-red-50/90 border-t border-red-200 text-red-950 text-[13px] space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="font-bold flex flex-wrap items-center gap-x-2 gap-y-1 text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              گزارش مرجوعی ثبت‌شده ({returnRecord.timestamp})
              {returnRecord.initiatedBy === 'driver'
                ? ` · ثبت توسط راننده (${returnRecord.driverName || 'راننده'})`
                : ''}
              {scopeLabel ? ` · ${scopeLabel}` : ''}:
            </span>
          </div>

          <ul className="list-disc mr-6 space-y-1 text-red-900">
            {returnRecord.items.map((ret) => {
              const hasBothWeights =
                ret.driverWeight !== undefined &&
                ret.shippingWeight !== undefined &&
                Math.abs(ret.driverWeight - ret.shippingWeight) > 0.001;
              return (
                <li key={ret.itemId} className="tabular-nums">
                  <strong>{ret.productName}:</strong>{' '}
                  {formatWeight(ret.shippingWeight ?? ret.weight)} مرجوع شد
                  {hasBothWeights && (
                    <span className="text-xs text-red-700/90 mr-1.5">
                      (اعلام راننده: {formatWeight(ret.driverWeight!)} · تایید ارسال:{' '}
                      {formatWeight(ret.shippingWeight!)})
                    </span>
                  )}
                  {ret.totalRial && ret.totalRial > 0 ? (
                    <span className="text-xs text-slate-700 mr-2">
                      ({formatRial(ret.totalRial)})
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="tabular-nums flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-red-900 pt-0.5">
            <span>
              حجم کل مرجوعی:{' '}
              <strong className="text-red-800">{formatWeight(totalWeightKg)}</strong>
            </span>
            {totalRial > 0 && (
              <span>
                مبلغ کل مرجوعی:{' '}
                <strong className="text-red-800">{formatRial(totalRial)}</strong>
              </span>
            )}
          </div>

          <div className="text-red-900">
            <strong>توضیحات مرجوعی:</strong> {returnRecord.notes}
          </div>

          {returnRecord.shippingNote && (
            <div className="text-slate-800 text-xs">
              <strong>توضیحات تحویل مجدد در بخش ارسال:</strong>{' '}
              {returnRecord.shippingNote}
              {returnRecord.shippingReceivedAt
                ? ` (${returnRecord.shippingReceivedAt})`
                : ''}
            </div>
          )}

          {extraSummary}
        </div>

        <div className="no-print shrink-0">
          {isAwaitingShippingReceive ? (
            currentDept === 'shipping' ? (
              <button
                type="button"
                disabled={!canEditConfirm}
                onClick={() =>
                  onOpenShippingReceive
                    ? onOpenShippingReceive()
                    : onConfirmReturn()
                }
                className="min-h-[42px] sm:min-h-0 inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed shadow-xs transition-colors whitespace-nowrap"
              >
                <PackageCheck className="w-4 h-4 shrink-0" />
                تحویل گرفتن بار، ثبت وزن و تایید مرجوعی
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-md text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>در انتظار تحویل بار و ثبت وزن توسط بخش ارسال</span>
              </div>
            )
          ) : currentConfirmed ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                مرجوعی توسط {DEPARTMENT_LABELS[currentDept]} تایید شد
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canEditConfirm}
              title={!canEditConfirm ? 'عدم دسترسی ویرایش/تایید مرجوعی' : undefined}
              onClick={onConfirmReturn}
              className="min-h-[42px] sm:min-h-0 inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed shadow-xs transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              تایید مرجوعی ({DEPARTMENT_LABELS[currentDept]})
            </button>
          )}
        </div>
      </div>

      {/* Cross-Department Confirmation Status Strip */}
      <div className="pt-2.5 border-t border-red-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="font-semibold text-red-800">وضعیت تعیین‌تکلیف واحدها:</span>
          {ALL_DEPTS.map((dept) => {
            const status = returnRecord.confirmations[dept];
            const isDone = status?.confirmed;
            const waitingForShipping =
              isAwaitingShippingReceive && dept !== 'shipping';
            return (
              <span
                key={dept}
                className={`inline-flex items-center gap-1.5 font-medium ${
                  isDone
                    ? 'text-emerald-800'
                    : waitingForShipping
                      ? 'text-slate-500'
                      : 'text-red-700'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Clock
                    className={`w-3.5 h-3.5 shrink-0 ${
                      waitingForShipping ? 'text-slate-400' : 'text-amber-600'
                    }`}
                  />
                )}
                <span>{DEPARTMENT_LABELS[dept]}:</span>
                <span className="font-bold">
                  {isDone
                    ? 'تایید شد'
                    : dept === 'shipping' && isAwaitingShippingReceive
                      ? 'در انتظار تحویل بار و ثبت وزن'
                      : waitingForShipping
                        ? 'پس از تایید ارسال'
                        : 'در انتظار تایید'}
                </span>
              </span>
            );
          })}
        </div>

        <span className="tabular-nums text-[11px] font-semibold text-slate-600">
          تاییدشده: {confirmedCount} از ۳ واحد
        </span>
      </div>

      {isFullyCompleted && (
        <div className="pt-2 border-t border-emerald-200/80 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            مرجوعی توسط ارسال، تولید و صدور فاکتور تایید نهایی شد و حجم و قیمت آن در رخداد حسابداری طرف حساب ثبت گردید.
          </span>
        </div>
      )}
    </div>
  );
};
