import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Store,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { PRODUCT_CATALOG } from '../../data/initialOrders';
import {
  CreateInPersonSaleInput,
  UploadedDocumentPhoto,
} from '../../types/order';
import { formatRial, formatWeight } from '../../utils/formatters';
import { processDocumentImageFile } from '../../utils/imageUpload';
import { CalendarDayInfo, toPersianDigits } from '../../utils/jalaliCalendar';

interface NewInPersonSaleModalProps {
  open: boolean;
  defaultDateKey: string;
  weekDays: CalendarDayInfo[];
  onClose: () => void;
  onCreateSale: (input: CreateInPersonSaleInput) => void;
}

interface DraftSaleItem {
  id: string;
  productName: string;
  customProductName: string;
  weight: string;
  unitPrice: string;
}

const CUSTOM_PRODUCT_VALUE = '__custom__';

const QUICK_PAYMENT_METHODS = [
  'کارت‌خوان حضوری',
  'کارت به کارت',
  'نقدی',
  'حواله بانکی',
  'چک صیادی',
];

function createDraftItem(index: number): DraftSaleItem {
  const defaultProd = PRODUCT_CATALOG[index % PRODUCT_CATALOG.length];
  return {
    id: `inperson-row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    productName: defaultProd.name,
    customProductName: '',
    weight: '',
    unitPrice: String(defaultProd.defaultUnitPrice),
  };
}

export const NewInPersonSaleModal: React.FC<NewInPersonSaleModalProps> = ({
  open,
  defaultDateKey,
  weekDays,
  onClose,
  onCreateSale,
}) => {
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(defaultDateKey);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftSaleItem[]>([createDraftItem(0)]);

  const [invoicePhoto, setInvoicePhoto] = useState<UploadedDocumentPhoto | null>(
    null
  );
  const [paymentReceiptPhoto, setPaymentReceiptPhoto] =
    useState<UploadedDocumentPhoto | null>(null);
  const [uploadingType, setUploadingType] = useState<
    'invoice' | 'paymentReceipt' | null
  >(null);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{
    title: string;
    photo: UploadedDocumentPhoto;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMethod('');
    setDeliveryDate(defaultDateKey);
    setNotes('');
    setItems([createDraftItem(0)]);
    setInvoicePhoto(null);
    setPaymentReceiptPhoto(null);
    setUploadingType(null);
    setUploadError('');
    setError('');
    setPreviewPhoto(null);
  }, [open, defaultDateKey]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewPhoto) {
          setPreviewPhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, previewPhoto, onClose]);

  const parsedSummary = useMemo(() => {
    let totalWeight = 0;
    let totalRial = 0;
    let validCount = 0;
    for (const row of items) {
      const name =
        row.productName === CUSTOM_PRODUCT_VALUE
          ? row.customProductName.trim()
          : row.productName.trim();
      const w = parseFloat(row.weight);
      const p = parseInt(row.unitPrice.replace(/[^\d]/g, ''), 10);
      if (name && Number.isFinite(w) && w > 0 && Number.isFinite(p) && p > 0) {
        validCount += 1;
        totalWeight += w;
        totalRial += Math.round(w * p);
      }
    }
    return { totalWeight, totalRial, validCount };
  }, [items]);

  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!customerName.trim()) missing.push('نام مشتری');
    if (!paymentMethod.trim()) missing.push('نحوه خرید');
    if (parsedSummary.validCount === 0) missing.push('حداقل یک قلم کالا با وزن و قیمت معتبر');
    if (!invoicePhoto) missing.push('عکس فاکتور');
    if (!paymentReceiptPhoto) missing.push('عکس رسید پرداخت');
    return missing;
  }, [
    customerName,
    paymentMethod,
    parsedSummary.validCount,
    invoicePhoto,
    paymentReceiptPhoto,
  ]);

  if (!open) return null;

  const handleProductSelect = (rowId: string, selectedName: string) => {
    const matched = PRODUCT_CATALOG.find((p) => p.name === selectedName);
    setItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              productName: selectedName,
              unitPrice: matched ? String(matched.defaultUnitPrice) : row.unitPrice,
            }
          : row
      )
    );
    setError('');
  };

  const handleItemField = (
    rowId: string,
    field: 'customProductName' | 'weight' | 'unitPrice',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
    setError('');
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, createDraftItem(prev.length)]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleFileChange = async (
    docType: 'invoice' | 'paymentReceipt',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('لطفاً یک فایل تصویری معتبر (عکس) انتخاب یا ثبت کنید.');
      return;
    }

    setUploadError('');
    setError('');
    setUploadingType(docType);
    try {
      const processed = await processDocumentImageFile(file);
      if (docType === 'invoice') {
        setInvoicePhoto(processed);
      } else {
        setPaymentReceiptPhoto(processed);
      }
    } catch {
      setUploadError('خطا در خواندن تصویر انتخاب‌شده. لطفاً مجدداً تلاش کنید.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError('لطفاً نام مشتری را به‌صورت دستی وارد کنید.');
      return;
    }
    if (!paymentMethod.trim()) {
      setError('لطفاً نحوه خرید و پرداخت را به‌صورت دستی وارد کنید.');
      return;
    }

    const validItems: CreateInPersonSaleInput['items'] = [];
    for (let i = 0; i < items.length; i += 1) {
      const row = items[i];
      const name =
        row.productName === CUSTOM_PRODUCT_VALUE
          ? row.customProductName.trim()
          : row.productName.trim();
      const weight = parseFloat(row.weight);
      const unitPrice = parseInt(row.unitPrice.replace(/[^\d]/g, ''), 10);

      if (!name) {
        setError(`لطفاً نام محصول ردیف ${toPersianDigits(i + 1)} را مشخص کنید.`);
        return;
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        setError(
          `لطفاً وزن معتبر (بیشتر از صفر) برای «${name}» وارد کنید.`
        );
        return;
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        setError(
          `لطفاً قیمت واحد معتبر (ریال) برای «${name}» وارد کنید.`
        );
        return;
      }
      validItems.push({
        productName: name,
        weight: Number(weight.toFixed(2)),
        unitPrice,
      });
    }

    if (!invoicePhoto || !paymentReceiptPhoto) {
      setError(
        'برای ثبت نهایی فروش حضوری، بارگذاری هر دو عکس فاکتور و عکس رسید پرداخت الزامی است.'
      );
      return;
    }

    onCreateSale({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      paymentMethod: paymentMethod.trim(),
      deliveryDate,
      notes: notes.trim() || undefined,
      invoicePhoto,
      paymentReceiptPhoto,
      items: validItems,
    });
    onClose();
  };

  const readyToSubmit = missingRequirements.length === 0;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ثبت فروش حضوری جدید"
        className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[780px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
          {/* Mobile Handle */}
          <div className="sm:hidden pt-2 pb-1 flex justify-center bg-slate-50 shrink-0">
            <span className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 bg-[#0f5864] text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold leading-snug truncate">
                  ثبت سفارش فروش حضوری جدید
                </h2>
                <p className="text-[11px] text-white/85 truncate">
                  فقط در بخش فروش حضوری و بخش صدور فاکتور نمایش داده می‌شود
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن فرم فروش حضوری"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form
            id="new-inperson-sale-form"
            onSubmit={handleSubmit}
            className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5"
          >
            {/* Section 1: Manual Customer & Purchase Method */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#0f5864]" />
                  ۱. مشخصات مشتری و نحوه خرید (ثبت دستی)
                </h3>
                <span className="text-[11px] text-slate-500">
                  موارد ستاره‌دار الزامی است
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="inperson-customer-name"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    نام مشتری (دستی) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="inperson-customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setError('');
                    }}
                    placeholder="مثلاً: آقای رضایی یا رستوران ..."
                    className="w-full h-11 sm:h-10 px-3.5 text-sm sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/20 focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inperson-customer-phone"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    شماره تماس مشتری{' '}
                    <span className="font-normal text-slate-400">(اختیاری)</span>
                  </label>
                  <input
                    id="inperson-customer-phone"
                    type="tel"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0912-000-0000"
                    className="w-full h-11 sm:h-10 px-3.5 text-sm sm:text-xs text-left tabular-nums bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/20 focus:border-[#0f5864]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label
                    htmlFor="inperson-payment-method"
                    className="block text-xs font-bold text-slate-700"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#0f5864]" />
                      نحوه خرید / پرداخت (دستی){' '}
                      <span className="text-red-600">*</span>
                    </span>
                  </label>
                  <input
                    id="inperson-payment-method"
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setError('');
                    }}
                    placeholder="نحوه خرید و تسویه را دستی وارد کنید (مثلاً: کارت‌خوان حضوری، کارت به کارت، نقدی، چک صیادی...)"
                    className="w-full h-11 sm:h-10 px-3.5 text-sm sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/20 focus:border-[#0f5864]"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 ml-1">
                      انتخاب سریع:
                    </span>
                    {QUICK_PAYMENT_METHODS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(preset);
                          setError('');
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                          paymentMethod === preset
                            ? 'bg-[#0f5864] text-white border-[#0f5864]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#0f5864] hover:text-[#0f5864]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="inperson-sale-date"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    تاریخ ثبت فروش
                  </label>
                  <select
                    id="inperson-sale-date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-11 sm:h-10 px-3 text-sm sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/20 focus:border-[#0f5864]"
                  >
                    {weekDays.map((day) => (
                      <option key={day.dateKey} value={day.dateKey}>
                        {day.weekdayName} — {day.dateLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inperson-sale-notes"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    توضیحات{' '}
                    <span className="font-normal text-slate-400">(اختیاری)</span>
                  </label>
                  <input
                    id="inperson-sale-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="توضیح تکمیلی برای واحد صدور فاکتور..."
                    className="w-full h-11 sm:h-10 px-3.5 text-sm sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/20 focus:border-[#0f5864]"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Items */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#0f5864]" />
                  ۲. اقلام و وزن فروش حضوری
                </h3>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0f5864] bg-[#0f5864]/10 hover:bg-[#0f5864] hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  افزودن ردیف کالا
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((row, idx) => {
                  const isCustom = row.productName === CUSTOM_PRODUCT_VALUE;
                  const w = parseFloat(row.weight);
                  const p = parseInt(row.unitPrice.replace(/[^\d]/g, ''), 10);
                  const rowTotal =
                    Number.isFinite(w) && w > 0 && Number.isFinite(p) && p > 0
                      ? Math.round(w * p)
                      : 0;

                  return (
                    <div
                      key={row.id}
                      className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            محصول ({toPersianDigits(idx + 1)})
                          </label>
                          <select
                            value={row.productName}
                            onChange={(e) =>
                              handleProductSelect(row.id, e.target.value)
                            }
                            className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                          >
                            {PRODUCT_CATALOG.map((prod) => (
                              <option key={prod.name} value={prod.name}>
                                {prod.name}
                              </option>
                            ))}
                            <option value={CUSTOM_PRODUCT_VALUE}>
                              + سایر محصولات (ورود دستی نام)
                            </option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            وزن (کیلوگرم)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            value={row.weight}
                            onChange={(e) =>
                              handleItemField(row.id, 'weight', e.target.value)
                            }
                            placeholder="مثلاً 12.5"
                            className="w-full h-10 px-3 text-xs tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            قیمت واحد (ریال)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            inputMode="numeric"
                            value={row.unitPrice}
                            onChange={(e) =>
                              handleItemField(
                                row.id,
                                'unitPrice',
                                e.target.value
                              )
                            }
                            className="w-full h-10 px-3 text-xs tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveRow(row.id)}
                            aria-label="حذف ردیف کالا"
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isCustom && (
                        <input
                          type="text"
                          value={row.customProductName}
                          onChange={(e) =>
                            handleItemField(
                              row.id,
                              'customProductName',
                              e.target.value
                            )
                          }
                          placeholder="نام محصول را دستی وارد کنید..."
                          className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                        />
                      )}

                      {rowTotal > 0 && (
                        <div className="text-[11px] text-slate-600 tabular-nums flex justify-end">
                          جمع ردیف:{' '}
                          <strong className="text-[#0f5864] mr-1">
                            {formatRial(rowTotal)}
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Compact Totals Strip */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                <span className="text-slate-600">
                  مجموع وزن:{' '}
                  <strong className="text-slate-900">
                    {formatWeight(Number(parsedSummary.totalWeight.toFixed(2)))}
                  </strong>
                  {' · '}
                  تعداد اقلام معتبر:{' '}
                  <strong className="text-slate-900">
                    {toPersianDigits(parsedSummary.validCount)}
                  </strong>
                </span>
                <span className="text-slate-600">
                  جمع کل فاکتور:{' '}
                  <strong className="text-[#0f5864] text-sm">
                    {formatRial(parsedSummary.totalRial)}
                  </strong>
                </span>
              </div>
            </section>

            {/* Section 3: Required Invoice & Payment Receipt Photos (Driver-style) */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#0f5864]" />
                  ۳. ثبت عکس فاکتور و رسید پرداخت (الزامی)
                </h3>
                <span className="text-[11px] text-slate-500">
                  مشابه پنل راننده برای تایید بخش صدور فاکتور
                </span>
              </div>

              {uploadError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={invoiceInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange('invoice', e)}
                className="hidden"
              />
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange('paymentReceipt', e)}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Photo 1: Invoice Photo */}
                <div
                  className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                    invoicePhoto
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0f5864]" />
                      ۱. عکس فاکتور
                    </span>
                    {invoicePhoto ? (
                      <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        بارگذاری شد
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700">
                        الزامی
                      </span>
                    )}
                  </div>

                  {invoicePhoto ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            title: 'پیش‌نمایش عکس فاکتور',
                            photo: invoicePhoto,
                          })
                        }
                        className="group relative block w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={invoicePhoto.dataUrl}
                          alt="عکس فاکتور فروش حضوری"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            بزرگ‌نمایی
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => invoiceInputRef.current?.click()}
                          className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تغییر عکس
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePhoto(null)}
                          aria-label="حذف عکس فاکتور"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingType === 'invoice'}
                      onClick={() => invoiceInputRef.current?.click()}
                      className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0f5864] hover:bg-white bg-white/60 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-colors"
                    >
                      <Camera className="w-6 h-6 text-[#0f5864]" />
                      <span className="text-xs font-bold text-slate-800">
                        {uploadingType === 'invoice'
                          ? 'در حال پردازش تصویر...'
                          : 'انتخاب یا گرفتن عکس فاکتور'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        فرمت تصویر (JPG / PNG)
                      </span>
                    </button>
                  )}
                </div>

                {/* Photo 2: Payment Receipt Photo */}
                <div
                  className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                    paymentReceiptPhoto
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-[#0f5864]" />
                      ۲. عکس رسید پرداخت
                    </span>
                    {paymentReceiptPhoto ? (
                      <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        بارگذاری شد
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700">
                        الزامی
                      </span>
                    )}
                  </div>

                  {paymentReceiptPhoto ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            title: 'پیش‌نمایش عکس رسید پرداخت',
                            photo: paymentReceiptPhoto,
                          })
                        }
                        className="group relative block w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={paymentReceiptPhoto.dataUrl}
                          alt="عکس رسید پرداخت فروش حضوری"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            بزرگ‌نمایی
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => receiptInputRef.current?.click()}
                          className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تغییر عکس
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentReceiptPhoto(null)}
                          aria-label="حذف عکس رسید پرداخت"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingType === 'paymentReceipt'}
                      onClick={() => receiptInputRef.current?.click()}
                      className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0f5864] hover:bg-white bg-white/60 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition-colors"
                    >
                      <Camera className="w-6 h-6 text-[#0f5864]" />
                      <span className="text-xs font-bold text-slate-800">
                        {uploadingType === 'paymentReceipt'
                          ? 'در حال پردازش تصویر...'
                          : 'انتخاب یا گرفتن عکس رسید پرداخت'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        رسید کارت‌خوان، فیش واریز یا چک
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Sticky Footer */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5 pb-modal-safe shrink-0">
            {!readyToSubmit && (
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                <strong>موارد باقی‌مانده برای ثبت نهایی:</strong>{' '}
                {missingRequirements.join(' · ')}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>

              <button
                type="submit"
                form="new-inperson-sale-form"
                disabled={!readyToSubmit}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                ثبت فروش حضوری و ارسال به صدور فاکتور
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Zoom Preview */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewPhoto.title}
          className="no-print fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-xl max-w-3xl w-full max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-900">
                {previewPhoto.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="بستن پیش‌نمایش"
                className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4 bg-slate-900 flex items-center justify-center overflow-auto">
              <img
                src={previewPhoto.photo.dataUrl}
                alt={previewPhoto.title}
                className="max-h-[75dvh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
