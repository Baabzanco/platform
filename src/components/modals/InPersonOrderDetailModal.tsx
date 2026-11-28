import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { Order, UploadedDocumentPhoto } from '../../types/order';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
} from '../../utils/formatters';
import { processDocumentImageFile } from '../../utils/imageUpload';

interface InPersonOrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onPrintSingle: (orderId: string) => void;
  onUploadDocument: (
    orderId: string,
    docType: 'invoice' | 'paymentReceipt',
    photo: UploadedDocumentPhoto
  ) => void;
  onRemoveDocument: (
    orderId: string,
    docType: 'invoice' | 'paymentReceipt'
  ) => void;
  onResubmitDocs: (orderId: string) => void;
}

export const InPersonOrderDetailModal: React.FC<
  InPersonOrderDetailModalProps
> = ({
  order,
  onClose,
  onPrintSingle,
  onUploadDocument,
  onRemoveDocument,
  onResubmitDocs,
}) => {
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [uploadingType, setUploadingType] = useState<
    'invoice' | 'paymentReceipt' | null
  >(null);
  const [uploadError, setUploadError] = useState('');
  const [zoomedDoc, setZoomedDoc] = useState<{
    title: string;
    photo: UploadedDocumentPhoto;
  } | null>(null);

  useEffect(() => {
    setUploadError('');
    setUploadingType(null);
    setZoomedDoc(null);
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
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
  }, [order, zoomedDoc, onClose]);

  if (!order) return null;

  const orderTotal = calculateOrderTotal(order);
  const totalWeight = order.items.reduce(
    (sum, item) => sum + item.requestedWeight,
    0
  );

  const invoicePhoto = order.driverDelivery?.invoicePhoto;
  const paymentReceiptPhoto = order.driverDelivery?.paymentReceiptPhoto;
  const sentToFinance = Boolean(order.driverDelivery?.sentToFinance);
  const financeVerified = Boolean(order.driverDelivery?.financeVerified);
  const financeRejected = Boolean(
    order.driverDelivery?.financeRejected && !sentToFinance
  );
  const needsInvoiceRetake = Boolean(
    financeRejected && order.driverDelivery?.rejectedDocs?.invoice
  );
  const needsReceiptRetake = Boolean(
    financeRejected && order.driverDelivery?.rejectedDocs?.paymentReceipt
  );
  const canEditPhotos = !sentToFinance;
  const readyToResubmit =
    canEditPhotos &&
    Boolean(invoicePhoto && paymentReceiptPhoto) &&
    !needsInvoiceRetake &&
    !needsReceiptRetake;

  const missingForResubmit: string[] = [];
  if (needsInvoiceRetake) {
    missingForResubmit.push('ثبت مجدد عکس فاکتور (رد شده)');
  } else if (!invoicePhoto) {
    missingForResubmit.push('ثبت عکس فاکتور');
  }
  if (needsReceiptRetake) {
    missingForResubmit.push('ثبت مجدد عکس رسید پرداخت (رد شده)');
  } else if (!paymentReceiptPhoto) {
    missingForResubmit.push('ثبت عکس رسید پرداخت');
  }

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
    setUploadingType(docType);
    try {
      const processed = await processDocumentImageFile(file);
      onUploadDocument(order.id, docType, processed);
    } catch {
      setUploadError('خطا در خواندن تصویر انتخاب‌شده. لطفاً مجدداً تلاش کنید.');
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`جزئیات فروش حضوری ${order.code}`}
        className="no-print fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[780px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[93dvh] sm:max-h-[90vh]">
          {/* Mobile Handle */}
          <div className="sm:hidden pt-2 pb-1 flex justify-center bg-slate-50 shrink-0">
            <span className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>

          {/* Priority Status Banner */}
          {financeRejected && (
            <div className="px-4 sm:px-5 py-2.5 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                مدارک توسط صدور فاکتور رد شده — لطفاً عکس مجدد بارگذاری کنید
              </span>
              <span className="tabular-nums opacity-95">کد {order.code}</span>
            </div>
          )}

          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  کد فروش حضوری
                </span>
                <span className="tabular-nums text-base sm:text-lg font-bold text-[#0056b3]">
                  {order.code}
                </span>
              </div>

              <div className="text-[13px] min-w-0">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  نام مشتری (دستی)
                </span>
                <span className="font-bold text-slate-900 block truncate">
                  {order.customerName}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  مبلغ کل فاکتور
                </span>
                <span className="tabular-nums font-bold text-[#0f5864]">
                  {formatRial(orderTotal)}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  وضعیت در صدور فاکتور
                </span>
                {financeVerified ? (
                  <span className="font-bold text-xs text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    تایید شده ({order.driverDelivery?.financeVerifiedAt})
                  </span>
                ) : financeRejected ? (
                  <span className="font-bold text-xs text-red-700">
                    مدارک رد شده (نیازمند اصلاح)
                  </span>
                ) : (
                  <span className="font-bold text-xs text-amber-700 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    در انتظار تایید صدور فاکتور
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onPrintSingle(order.id)}
                title="پرینت فاکتور"
                className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">پرینت</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن جزئیات فروش حضوری"
                className="w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-200">
            {/* Manual Purchase Method & Info Strip */}
            <div className="px-4 sm:px-5 py-3 bg-[#eef2f9]/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <Store className="w-4 h-4 text-[#0f5864] shrink-0" />
                نوع فروش: فروش حضوری (فقط قابل مشاهده برای صدور فاکتور)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0f5864] shrink-0" />
                <span>نحوه خرید:</span>
                <strong className="text-slate-900">
                  {order.inPersonPaymentMethod || 'ثبت‌نشده'}
                </strong>
              </span>
              {order.customerPhone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span dir="ltr" className="tabular-nums font-semibold">
                    {order.customerPhone}
                  </span>
                </span>
              )}
              <span className="tabular-nums text-slate-500">
                ثبت: {order.createdAt}
              </span>
            </div>

            {order.notes && (
              <div className="px-4 sm:px-5 py-2.5 bg-amber-50/75 text-amber-950 text-xs leading-relaxed">
                <strong>توضیحات:</strong> {order.notes}
              </div>
            )}

            {/* Finance Rejection Reason Alert */}
            {financeRejected && (
              <div className="px-4 sm:px-5 py-3.5 bg-red-50 text-red-900 text-xs space-y-1">
                <div className="font-bold text-red-800 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  دلیل رد مدارک توسط واحد صدور فاکتور (
                  {order.driverDelivery?.financeRejectedAt}):
                </div>
                <p className="leading-relaxed font-medium">
                  {order.driverDelivery?.financeRejectionReason}
                </p>
              </div>
            )}

            {/* Items Table */}
            <div className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs">
                      <th className="text-right font-normal px-5 py-2.5">
                        نام محصول
                      </th>
                      <th className="text-right font-normal px-5 py-2.5">
                        وزن تحویلی
                      </th>
                      <th className="text-right font-normal px-5 py-2.5">
                        قیمت واحد (ریال)
                      </th>
                      <th className="text-right font-normal px-5 py-2.5">
                        جمع ردیف
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="tabular-nums px-5 py-3 font-semibold text-slate-800">
                          {formatWeight(item.requestedWeight)}
                        </td>
                        <td className="tabular-nums px-5 py-3 text-slate-600">
                          {new Intl.NumberFormat('fa-IR').format(item.unitPrice)}
                        </td>
                        <td className="tabular-nums px-5 py-3 font-bold text-[#0f5864]">
                          {formatRial(calculateItemTotal(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Photos Section */}
            <div className="px-4 sm:px-5 py-4 bg-slate-50/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#0f5864]" />
                  مدارک بارگذاری‌شده (عکس فاکتور و رسید پرداخت)
                </h4>
                {order.driverDelivery?.completedAt && (
                  <span className="tabular-nums text-[11px] text-slate-500">
                    آخرین ارسال: {order.driverDelivery.completedAt}
                  </span>
                )}
              </div>

              {uploadError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

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
                {/* Invoice Photo Card */}
                <div
                  className={`rounded-xl border p-3 bg-white space-y-2.5 ${
                    needsInvoiceRetake
                      ? 'border-red-400 ring-1 ring-red-400/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <strong className="text-slate-800 inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#0f5864]" />
                      ۱. عکس فاکتور
                    </strong>
                    {needsInvoiceRetake ? (
                      <span className="text-[11px] font-bold text-red-600">
                        نیازمند عکس مجدد
                      </span>
                    ) : (
                      invoicePhoto && (
                        <span className="tabular-nums text-[11px] text-slate-500">
                          {invoicePhoto.uploadedAt}
                        </span>
                      )
                    )}
                  </div>

                  {invoicePhoto ? (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedDoc({
                          title: `عکس فاکتور فروش حضوری ${order.code}`,
                          photo: invoicePhoto,
                        })
                      }
                      className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={invoicePhoto.dataUrl}
                        alt={`عکس فاکتور ${order.code}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                        <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          بزرگ‌نمایی
                        </span>
                      </span>
                    </button>
                  ) : (
                    <div className="h-40 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      تصویری بارگذاری نشده است
                    </div>
                  )}

                  {canEditPhotos && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploadingType === 'invoice'}
                        onClick={() => invoiceInputRef.current?.click()}
                        className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {uploadingType === 'invoice'
                          ? 'در حال بارگذاری...'
                          : 'بارگذاری عکس جدید فاکتور'}
                      </button>
                      {invoicePhoto && (
                        <button
                          type="button"
                          onClick={() => onRemoveDocument(order.id, 'invoice')}
                          aria-label="حذف عکس فاکتور"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Receipt Photo Card */}
                <div
                  className={`rounded-xl border p-3 bg-white space-y-2.5 ${
                    needsReceiptRetake
                      ? 'border-red-400 ring-1 ring-red-400/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <strong className="text-slate-800 inline-flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#0f5864]" />
                      ۲. عکس رسید پرداخت
                    </strong>
                    {needsReceiptRetake ? (
                      <span className="text-[11px] font-bold text-red-600">
                        نیازمند عکس مجدد
                      </span>
                    ) : (
                      paymentReceiptPhoto && (
                        <span className="tabular-nums text-[11px] text-slate-500">
                          {paymentReceiptPhoto.uploadedAt}
                        </span>
                      )
                    )}
                  </div>

                  {paymentReceiptPhoto ? (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedDoc({
                          title: `عکس رسید پرداخت فروش حضوری ${order.code}`,
                          photo: paymentReceiptPhoto,
                        })
                      }
                      className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={paymentReceiptPhoto.dataUrl}
                        alt={`عکس رسید پرداخت ${order.code}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                        <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                          <Eye className="w-3.5 h-3.5" />
                          بزرگ‌نمایی
                        </span>
                      </span>
                    </button>
                  ) : (
                    <div className="h-40 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      تصویری بارگذاری نشده است
                    </div>
                  )}

                  {canEditPhotos && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploadingType === 'paymentReceipt'}
                        onClick={() => receiptInputRef.current?.click()}
                        className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {uploadingType === 'paymentReceipt'
                          ? 'در حال بارگذاری...'
                          : 'بارگذاری عکس جدید رسید'}
                      </button>
                      {paymentReceiptPhoto && (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveDocument(order.id, 'paymentReceipt')
                          }
                          aria-label="حذف عکس رسید پرداخت"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5 pb-modal-safe shrink-0">
            {canEditPhotos && missingForResubmit.length > 0 && (
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <strong>برای ارسال مجدد به صدور فاکتور لازم است:</strong>{' '}
                {missingForResubmit.join(' · ')}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="text-xs text-slate-600 tabular-nums">
                مجموع وزن:{' '}
                <strong className="text-slate-900">
                  {formatWeight(Number(totalWeight.toFixed(2)))}
                </strong>
                {' · '}
                جمع فاکتور:{' '}
                <strong className="text-[#0f5864]">
                  {formatRial(orderTotal)}
                </strong>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-md hover:bg-slate-100 transition-colors"
                >
                  بستن
                </button>
                {canEditPhotos && (
                  <button
                    type="button"
                    disabled={!readyToResubmit}
                    onClick={() => onResubmitDocs(order.id)}
                    className="min-h-[46px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    <CheckCheck className="w-4 h-4 shrink-0" />
                    ارسال مجدد مدارک به صدور فاکتور
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Viewer */}
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
                className="max-h-[75dvh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
