import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { DEPARTMENT_LABELS } from '../data/initialOrders';
import { ReturnRecord, WorkflowDepartment } from '../types/order';
import { formatWeight } from '../utils/formatters';

interface ReturnResolutionBoxProps {
  returnRecord: ReturnRecord;
  currentDept: WorkflowDepartment;
  canEditConfirm?: boolean;
  onConfirmReturn: () => void;
  extraSummary?: React.ReactNode;
}

const ALL_DEPTS: WorkflowDepartment[] = ['production', 'finance', 'shipping'];

export const ReturnResolutionBox: React.FC<ReturnResolutionBoxProps> = ({
  returnRecord,
  currentDept,
  canEditConfirm = true,
  onConfirmReturn,
  extraSummary,
}) => {
  const currentConfirmed = returnRecord.confirmations[currentDept]?.confirmed ?? false;
  const confirmedCount = ALL_DEPTS.filter(
    (d) => returnRecord.confirmations[d]?.confirmed
  ).length;

  return (
    <div className="px-5 py-4 bg-red-50/90 border-t border-red-200 text-red-950 text-[13px] space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="font-bold flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>گزارش مرجوعی ثبت‌شده ({returnRecord.timestamp}):</span>
          </div>

          <ul className="list-disc mr-6 space-y-1 text-red-900">
            {returnRecord.items.map((ret) => (
              <li key={ret.itemId} className="tabular-nums">
                <strong>{ret.productName}:</strong> {formatWeight(ret.weight)} مرجوع شد
              </li>
            ))}
          </ul>

          <div className="text-red-900">
            <strong>توضیحات مرجوعی:</strong> {returnRecord.notes}
          </div>

          {extraSummary}
        </div>

        <div className="no-print shrink-0">
          {currentConfirmed ? (
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed shadow-xs transition-colors whitespace-nowrap"
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
            return (
              <span
                key={dept}
                className={`inline-flex items-center gap-1.5 font-medium ${
                  isDone ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span>{DEPARTMENT_LABELS[dept]}:</span>
                <span className="font-bold">
                  {isDone ? 'تایید شد' : 'در انتظار تایید'}
                </span>
              </span>
            );
          })}
        </div>

        <span className="tabular-nums text-[11px] font-semibold text-slate-600">
          تاییدشده: {confirmedCount} از ۳ واحد
        </span>
      </div>
    </div>
  );
};
