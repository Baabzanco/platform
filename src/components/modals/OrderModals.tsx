import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CameraOff,
  RotateCcw,
  RotateCw,
  Scale,
  Truck,
  Undo2,
  X,
} from 'lucide-react';
import { ALL_DEPARTMENT_LABELS } from '../../data/initialOrders';
import {
  Order,
  OrderItem,
  ReturnToSalesSource,
  WorkflowDepartment,
} from '../../types/order';
import { getFinanceWeight, getShippingWeight } from '../../utils/formatters';

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tone?: 'default' | 'danger' | 'warning';
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidthClass?: string;
}

const ModalShell: React.FC<BaseModalProps> = ({
  open,
  onClose,
  title,
  tone = 'default',
  icon,
  children,
  footer,
  maxWidthClass = 'max-w-[520px]',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const titleColor =
    tone === 'danger'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-amber-800'
        : 'text-slate-900';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="no-print fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white w-full ${maxWidthClass} rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]`}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h3 className={`text-[15px] font-bold flex items-center gap-2 leading-snug ${titleColor}`}>
            {icon}
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-10 h-10 -ml-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>

        <div className="px-4 sm:px-5 pt-3.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pb-modal-safe shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );
};

/* ================= 1. Weight Modal (Production) ================= */
interface WeightModalProps {
  open: boolean;
  item: OrderItem | null;
  orderCode: string;
  onClose: () => void;
  onSubmit: (weight: number) => void;
}

export const WeightModal: React.FC<WeightModalProps> = ({
  open,
  item,
  orderCode,
  onClose,
  onSubmit,
}) => {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && item) {
      setWeight(
        item.producedWeight !== null
          ? String(item.producedWeight)
          : String(item.requestedWeight)
      );
      setError('');
    }
  }, [open, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(weight);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('لطفاً یک وزن معتبر و بزرگتر از صفر وارد کنید.');
      return;
    }
    onSubmit(numeric);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="ثبت وزن دقیق تحویلی (تولید)"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="weight-modal-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-[#0f5864] rounded-xl sm:rounded-lg hover:bg-[#0b434d] transition-colors whitespace-nowrap"
          >
            ثبت وزن
          </button>
        </>
      }
    >
      <form id="weight-modal-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
          <span>
            محصول: <strong className="text-slate-900 text-sm">{item?.productName}</strong>
          </span>
          <span className="tabular-nums font-semibold text-[#0056b3]">سفارش {orderCode}</span>
        </div>

        <div className="space-y-2">
          <label htmlFor="prod-exact-weight" className="block text-xs font-semibold text-slate-700">
            وزن دقیق تحویل داده شده (کیلوگرم) — درخواستی:{' '}
            <span className="tabular-nums font-bold text-slate-900">{item?.requestedWeight} kg</span>
          </label>
          <input
            id="prod-exact-weight"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            autoFocus
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError('');
            }}
            placeholder="مثلاً 29.5"
            className="tabular-nums w-full h-12 sm:h-11 px-3.5 text-base sm:text-sm font-bold border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/30 focus:border-[#0f5864]"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 2. Reject Modal (Production / Finance) ================= */
interface RejectModalProps {
  open: boolean;
  source: WorkflowDepartment;
  orderCode: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  open,
  source,
  orderCode,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('لطفاً دلیل رد سفارش را وارد کنید.');
      return;
    }
    onSubmit(reason.trim());
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="danger"
      title={
        source === 'finance'
          ? `دلیل رد سفارش ${orderCode} (بخش صدور فاکتور)`
          : `دلیل رد سفارش ${orderCode} (بخش تولید)`
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="reject-modal-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-red-600 rounded-xl sm:rounded-lg hover:bg-red-700 transition-colors"
          >
            ثبت و رد سفارش
          </button>
        </>
      }
    >
      <form id="reject-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="reject-reason-input" className="block text-xs font-medium text-slate-700 leading-relaxed">
          لطفاً دلیل و توضیحات رد این سفارش را وارد کنید (به تمامی بخش‌ها اطلاع‌رسانی می‌شود):
        </label>
        <textarea
          id="reject-reason-input"
          rows={4}
          autoFocus
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="مثلاً: عدم موجودی کافی در سردخانه یا تایید نشدن اعتبار مالی مشتری..."
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
        />
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 2b. Reject Driver Documents Modal (Finance -> Driver) ================= */
interface DriverDocsRejectModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (
    reason: string,
    rejectedDocs: { invoice: boolean; paymentReceipt: boolean }
  ) => void;
}

const QUICK_DOC_REJECTION_REASONS = [
  'عکس تار و بی‌کیفیت است و اعداد خوانا نیستند',
  'مبلغ یا امضای مشتری روی فاکتور مشخص نیست',
  'تصویر اشتباه بارگذاری شده است',
  'شماره پیگیری رسید پرداخت خوانا نیست',
];

export const DriverDocsRejectModal: React.FC<DriverDocsRejectModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
}) => {
  const [rejectInvoice, setRejectInvoice] = useState(true);
  const [rejectReceipt, setRejectReceipt] = useState(true);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRejectInvoice(true);
      setRejectReceipt(true);
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectInvoice && !rejectReceipt) {
      setError('لطفاً حداقل یکی از مدارک (فاکتور یا رسید پرداخت) را برای عکاسی مجدد انتخاب کنید.');
      return;
    }
    if (!reason.trim()) {
      setError('لطفاً دلیل رد عکس مدارک را برای راننده بنویسید.');
      return;
    }
    onSubmit(reason.trim(), {
      invoice: rejectInvoice,
      paymentReceipt: rejectReceipt,
    });
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<CameraOff className="w-4 h-4 shrink-0" />}
      title={`رد عکس مدارک تحویل — سفارش ${order?.code ?? ''}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="driver-docs-reject-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-red-600 rounded-xl sm:rounded-lg hover:bg-red-700 transition-colors"
          >
            رد مدارک و ارسال فوری به راننده
          </button>
        </>
      }
    >
      <form id="driver-docs-reject-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          پس از ثبت رد، این سفارش به‌صورت <strong className="text-red-700">قرمز و در اولویت اول</strong> پنل راننده نمایش داده می‌شود تا مجدداً عکس گرفته و ارسال کند.
        </p>

        {/* Select which documents need retake */}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-800">
            کدام مدرک نیازمند عکس مجدد است؟
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-colors ${
                rejectInvoice
                  ? 'bg-red-50 border-red-400 text-red-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={rejectInvoice}
                onChange={(e) => {
                  setRejectInvoice(e.target.checked);
                  setError('');
                }}
                className="w-4 h-4 accent-red-600 rounded"
              />
              <span>عکس فاکتور</span>
            </label>

            <label
              className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-colors ${
                rejectReceipt
                  ? 'bg-red-50 border-red-400 text-red-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={rejectReceipt}
                onChange={(e) => {
                  setRejectReceipt(e.target.checked);
                  setError('');
                }}
                className="w-4 h-4 accent-red-600 rounded"
              />
              <span>عکس رسید پرداخت</span>
            </label>
          </div>
        </div>

        {/* Quick Reason Suggestions */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-600">
            دلایل پرتکرار (انتخاب سریع):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DOC_REJECTION_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setReason(preset);
                  setError('');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors text-right ${
                  reason === preset
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Textarea */}
        <div className="space-y-1.5">
          <label
            htmlFor="driver-doc-reject-reason"
            className="block text-xs font-bold text-slate-800"
          >
            دلیل رد مدارک برای نمایش به راننده:
          </label>
          <textarea
            id="driver-doc-reject-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="مثلاً: تصویر فاکتور تار است و مبلغ نهایی و امضای مشتری خوانا نیست. لطفاً در نور کافی مجدد عکس بگیرید."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 3. Discrepancy Modal (Shipping -> Finance) ================= */
interface DiscrepancyModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (weights: Record<string, number>, note: string) => void;
}

export const DiscrepancyModal: React.FC<DiscrepancyModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
}) => {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && order) {
      const initial: Record<string, string> = {};
      order.items.forEach((item) => {
        initial[item.id] = String(getFinanceWeight(item));
      });
      setWeights(initial);
      setNote('');
      setError('');
    }
  }, [open, order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const numericMap: Record<string, number> = {};
    let hasChange = false;

    for (const item of order.items) {
      const val = parseFloat(weights[item.id]);
      const current = getFinanceWeight(item);
      if (!Number.isFinite(val) || val <= 0) {
        setError('لطفاً وزن واقعی معتبر (بزرگتر از صفر) برای همه محصولات وارد کنید.');
        return;
      }
      if (val !== current) hasChange = true;
      numericMap[item.id] = val;
    }

    if (!hasChange) {
      setError('هیچ تغییری در وزن محصولات نسبت به مقدار ثبت‌شده فعلی ایجاد نشده است.');
      return;
    }

    if (!note.trim()) {
      setError('لطفاً توضیحات علت مغایرت وزن را برای واحد صدور فاکتور وارد کنید.');
      return;
    }

    onSubmit(numericMap, note.trim());
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="warning"
      icon={<Scale className="w-4 h-4 shrink-0" />}
      title={`اصلاح وزن و ارجاع به صدور فاکتور (سفارش ${order?.code ?? ''})`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="discrepancy-modal-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-amber-600 rounded-xl sm:rounded-lg hover:bg-amber-700 transition-colors"
          >
            ارسال مجدد به واحد صدور فاکتور
          </button>
        </>
      }
    >
      <form id="discrepancy-modal-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          وزن واقعی مشاهده‌شده در بخش ارسال را وارد کنید تا فاکتور مجدداً توسط واحد صدور فاکتور بررسی و تایید شود:
        </p>

        <div className="space-y-2.5">
          {order?.items.map((item) => {
            const current = getFinanceWeight(item);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900">{item.productName}</div>
                  <div className="tabular-nums text-[11px] text-slate-500 mt-0.5">
                    وزن فعلی: {current} kg
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={weights[item.id] ?? ''}
                  onChange={(e) => {
                    setWeights((prev) => ({ ...prev, [item.id]: e.target.value }));
                    setError('');
                  }}
                  className="tabular-nums w-28 h-11 px-3 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="discrepancy-note" className="block text-xs font-medium text-slate-700">
            توضیحات مغایرت وزن برای واحد صدور فاکتور:
          </label>
          <textarea
            id="discrepancy-note"
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError('');
            }}
            placeholder="مثلاً: وزن باسکول ارسال با وزن ثبت‌شده تولید مغایرت دارد..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 4. Delivery Modal (Shipping -> Driver) ================= */
interface DeliveryModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (weights: Record<string, number>) => void;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
}) => {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && order) {
      const initial: Record<string, string> = {};
      order.items.forEach((item) => {
        initial[item.id] = String(getShippingWeight(item));
      });
      setWeights(initial);
      setError('');
    }
  }, [open, order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const numericMap: Record<string, number> = {};
    for (const item of order.items) {
      const val = parseFloat(weights[item.id]);
      if (!Number.isFinite(val) || val <= 0) {
        setError('لطفاً وزن معتبر (بزرگتر از صفر) برای تمام محصولات وارد کنید.');
        return;
      }
      numericMap[item.id] = val;
    }

    onSubmit(numericMap);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={<Truck className="w-4 h-4 text-[#0f5864] shrink-0" />}
      title={`ثبت وزن نهایی و تحویل به راننده (${order?.driverName ?? ''})`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="delivery-modal-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-[#0f5864] rounded-xl sm:rounded-lg hover:bg-[#0b434d] transition-colors"
          >
            تایید نهایی و خروج
          </button>
        </>
      }
    >
      <form id="delivery-modal-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          لطفاً وزن دقیق تحویل داده شده به راننده را برای هر محصول تایید یا اصلاح کنید:
        </p>

        <div className="space-y-2.5">
          {order?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3"
            >
              <span className="text-xs sm:text-[13px] font-bold text-slate-900">{item.productName}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={weights[item.id] ?? ''}
                onChange={(e) => {
                  setWeights((prev) => ({ ...prev, [item.id]: e.target.value }));
                  setError('');
                }}
                className="tabular-nums w-28 h-11 px-3 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/30 focus:border-[#0f5864]"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 5. Return Modal (Shipping) ================= */
interface ReturnModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (returnedWeights: Record<string, number>, notes: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
}) => {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && order) {
      const initial: Record<string, string> = {};
      order.items.forEach((item) => {
        initial[item.id] = '0';
      });
      setWeights(initial);
      setNotes('');
      setError('');
    }
  }, [open, order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const numericMap: Record<string, number> = {};
    let totalReturned = 0;

    for (const item of order.items) {
      const maxWeight = getShippingWeight(item);
      const val = parseFloat(weights[item.id]) || 0;
      if (val < 0 || val > maxWeight) {
        setError('مقدار مرجوعی نمی‌تواند منفی یا بیشتر از مقدار تحویل داده‌شده باشد.');
        return;
      }
      numericMap[item.id] = val;
      totalReturned += val;
    }

    if (totalReturned <= 0) {
      setError('لطفاً مقدار مرجوعی را حداقل برای یک محصول وارد کنید.');
      return;
    }

    if (!notes.trim()) {
      setError('لطفاً توضیحات و علت مرجوعی را وارد کنید.');
      return;
    }

    onSubmit(numericMap, notes.trim());
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<RotateCcw className="w-4 h-4 shrink-0" />}
      title={`ثبت مرجوعی سفارش ${order?.code ?? ''}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="return-modal-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-red-600 rounded-xl sm:rounded-lg hover:bg-red-700 transition-colors"
          >
            ثبت مرجوعی
          </button>
        </>
      }
    >
      <form id="return-modal-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600">
          مقدار مرجوع‌شده (به کیلوگرم) را برای هر محصول وارد کنید:
        </p>

        <div className="space-y-2.5">
          {order?.items.map((item) => {
            const maxWeight = getShippingWeight(item);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900">{item.productName}</div>
                  <div className="tabular-nums text-[11px] text-slate-500 mt-0.5">
                    حداکثر مقدار تحویلی: {maxWeight} kg
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max={maxWeight}
                  value={weights[item.id] ?? '0'}
                  onChange={(e) => {
                    setWeights((prev) => ({ ...prev, [item.id]: e.target.value }));
                    setError('');
                  }}
                  className="tabular-nums w-28 h-11 px-3 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="return-notes" className="block text-xs font-medium text-slate-700">
            توضیحات و علت مرجوعی:
          </label>
          <textarea
            id="return-notes"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError('');
            }}
            placeholder="توضیحات مربوط به علت مرجوعی مشتری را وارد کنید..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

/* ================= 6. Reset Demo Data Confirmation Modal ================= */
interface ResetConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<RotateCw className="w-4 h-4 shrink-0" />}
      title="بازنشانی داده‌های سامانه"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-red-600 rounded-xl sm:rounded-lg hover:bg-red-700 transition-colors"
          >
            بله، بازنشانی شود
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700 leading-relaxed">
        آیا مطمئن هستید که می‌خواهید تمامی سفارش‌های ثبت‌شده، تغییرات وزن، تاییدها، مدارک تحویل و مرجوعی‌ها را پاک کرده و داده‌های نمونه اولیه را بازگردانی کنید؟
      </p>
    </ModalShell>
  );
};

/* ================= 7. Return Order to Sales Modal (All Stages -> Sales) ================= */
interface ReturnToSalesModalProps {
  open: boolean;
  order: Order | null;
  source: ReturnToSalesSource;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const QUICK_RETURN_TO_SALES_REASONS: Record<ReturnToSalesSource, string[]> = {
  management: [
    'سقف اعتبار مشتری تکمیل است؛ ابتدا تسویه بخشی از بدهی انجام شود',
    'فاکتورهای معوق قبلی تسویه نشده است و ارسال جدید مجاز نیست',
    'فقط در صورت پرداخت نقدی هم‌زمان با تحویل امکان تایید وجود دارد',
  ],
  production: [
    'موجودی محصول در سردخانه ناکافی است و نیاز به اصلاح فاکتور دارد',
    'توضیحات یا نوع برش درخواستی مشتری نامشخص است',
    'بازه زمانی ارسال برای تولید قابل انجام نیست',
  ],
  finance: [
    'مغایرت در قیمت واحد یا جمع فاکتور و نیاز به اصلاح فروش',
    'وضعیت اعتبار یا تسویه مشتری نیاز به هماهنگی کارشناس فروش دارد',
    'اطلاعات طرف حساب یا شماره تماس مشتری ناقص است',
  ],
  shipping: [
    'آدرس یا محدوده تحویل ناقص است و نیاز به اصلاح فروش دارد',
    'بازه ارسال انتخاب‌شده با برنامه مسیر هماهنگ نیست',
    'مشتری درخواست تغییر اقلام یا زمان ارسال داده است',
  ],
  driver: [
    'مشتری در محل حضور ندارد و نیاز به هماهنگی مجدد فروش است',
    'مشتری درخواست اصلاح فاکتور یا تغییر زمان تحویل دارد',
    'آدرس ثبت‌شده در فاکتور با محل واقعی مشتری تطابق ندارد',
  ],
};

export const ReturnToSalesModal: React.FC<ReturnToSalesModalProps> = ({
  open,
  order,
  source,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('لطفاً علت برگشت سفارش به بخش فروش را وارد کنید.');
      return;
    }
    onSubmit(reason.trim());
    onClose();
  };

  const presets = QUICK_RETURN_TO_SALES_REASONS[source];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      tone="warning"
      icon={<Undo2 className="w-4 h-4 shrink-0" />}
      title={`برگشت سفارش ${order?.code ?? ''} به فروش (${ALL_DEPARTMENT_LABELS[source]})`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="return-to-sales-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-amber-600 rounded-xl sm:rounded-lg hover:bg-amber-700 transition-colors"
          >
            برگشت سفارش به فروش
          </button>
        </>
      }
    >
      <form id="return-to-sales-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          با ثبت این درخواست، سفارش <strong className="tabular-nums text-slate-900">{order?.code}</strong> ({order?.customerName}) از{' '}
          <strong className="text-amber-800">{ALL_DEPARTMENT_LABELS[source]}</strong> متوقف شده و در بالای صف صفحه{' '}
          <strong className="text-slate-900">کارشناس فروش</strong> جهت اصلاح و ارسال مجدد قرار می‌گیرد.
        </p>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-600">
            دلایل پرتکرار (انتخاب سریع):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setReason(preset);
                  setError('');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors text-right ${
                  reason === preset
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="return-to-sales-reason"
            className="block text-xs font-bold text-slate-800"
          >
            علت و توضیحات برگشت سفارش به کارشناس فروش:
          </label>
          <textarea
            id="return-to-sales-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="توضیحات دقیق جهت اصلاح فاکتور توسط کارشناس فروش را بنویسید..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};
