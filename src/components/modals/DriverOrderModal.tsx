import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  MapPin,
  MapPinPlus,
  Navigation,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Order, UploadedDocumentPhoto } from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
import { formatWeight, getShippingWeight } from '../../utils/formatters';
import { processDocumentImageFile } from '../../utils/imageUpload';
import { toPersianDigits } from '../../utils/jalaliCalendar';
import { LocationModalMode } from './LocationMapModal';

interface DriverOrderModalProps {
  order: Order | null;
  access: AccessControlHelpers;
  disableEscape?: boolean;
  onClose: () => void;
  onCallCustomer: (order: Order) => void;
  onOpenLocationModal: (order: Order, mode: LocationModalMode) => void;
  onUploadDocument: (
    orderId: string,
    docType: 'invoice' | 'paymentReceipt',
    photo: UploadedDocumentPhoto
  ) => void;
  onRemoveDocument: (
    orderId: string,
    docType: 'invoice' | 'paymentReceipt'
  ) => void;
  onCompleteDelivery: (orderId: string) => void;
  onOpenReturnToSales: (order: Order) => void;
}

export const DriverOrderModal: React.FC<DriverOrderModalProps> = ({
  order,
  disableEscape = false,
  onClose,
  onCallCustomer,
  onOpenLocationModal,
  onUploadDocument,
  onRemoveDocument,
  onCompleteDelivery,
  onOpenReturnToSales,
}) => {
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [uploadingType, setUploadingType] = useState<
    'invoice' | 'paymentReceipt' | null
  >(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [previewPhoto, setPreviewPhoto] = useState<{
    title: string;
    photo: UploadedDocumentPhoto;
  } | null>(null);

  useEffect(() => {
    if (!order || disableEscape) return;
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
  }, [order, disableEscape, previewPhoto, onClose]);

  useEffect(() => {
    setUploadError('');
    setUploadingType(null);
    setPreviewPhoto(null);
  }, [order?.id]);

  if (!order) return null;

  const invoicePhoto = order.driverDelivery?.invoicePhoto;
  const paymentReceiptPhoto = order.driverDelivery?.paymentReceiptPhoto;
  const bothUploaded = Boolean(invoicePhoto && paymentReceiptPhoto);
  const completed = Boolean(order.driverDelivery?.sentToFinance);
  const financeVerified = Boolean(order.driverDelivery?.financeVerified);
  const financeRejected = Boolean(
    order.driverDelivery?.financeRejected && !completed
  );
  const needsInvoiceRetake = Boolean(
    financeRejected && order.driverDelivery?.rejectedDocs?.invoice
  );
  const needsReceiptRetake = Boolean(
    financeRejected && order.driverDelivery?.rejectedDocs?.paymentReceipt
  );
  const hasUnresolvedRejectedDoc = needsInvoiceRetake || needsReceiptRetake;
  const readyToSubmit = bothUploaded && !hasUnresolvedRejectedDoc;

  const totalWeight = order.items.reduce(
    (sum, item) => sum + getShippingWeight(item),
    0
  );

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
        aria-label={`جزئیات تحویل سفارش ${order.code}`}
        className="no-print fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[780px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2 pb-1 flex justify-center bg-slate-50 shrink-0">
            <span className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>

          {/* Top Status Banner */}
          {financeRejected && (
            <div className="px-4 sm:px-5 py-2.5 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                مدارک توسط صدور فاکتور رد شد — لطفاً مجدد عکس بگیرید و ارسال کنید
              </span>
              {order.driverDelivery?.financeRejectedAt && (
                <span className="tabular-nums opacity-95 text-[11px]">
                  {order.driverDelivery.financeRejectedAt}
                </span>
              )}
            </div>
          )}

          {completed && (
            <div className="px-4 sm:px-5 py-2.5 bg-emerald-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {financeVerified
                  ? 'تحویل تکمیل و مدارک توسط واحد صدور فاکتور تایید نهایی شد'
                  : 'اتمام تحویل ثبت شد و مدارک به صدور فاکتور ارسال گردید'}
              </span>
              <span className="tabular-nums opacity-95 text-[11px]">
                {order.driverDelivery?.completedAt}
              </span>
            </div>
          )}

          {/* Header */}
          <div
            className={`px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0 ${
              financeRejected ? 'bg-red-50/70' : 'bg-slate-50'
            }`}
          >
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  بازه تحویل
                </span>
                <span className="font-bold text-[#0f5864] inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {order.deliverySlot}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  کد سفارش
                </span>
                <span
                  className={`tabular-nums text-base font-bold ${
                    financeRejected ? 'text-red-700' : 'text-[#0056b3]'
                  }`}
                >
                  {order.code}
                </span>
              </div>

              <div className="text-[13px] min-w-0">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  محدوده
                </span>
                <span className="font-bold text-slate-900 block truncate">
                  {order.district}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  لوکیشن مشتری
                </span>
                <span
                  className={`font-bold text-xs ${
                    order.customerLocation ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {order.customerLocation ? 'ثبت شده' : 'ثبت نشده'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن جزئیات تحویل"
              className="w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-200">
            {/* Red Rejection Reason Box */}
            {financeRejected && order.driverDelivery?.financeRejectionReason && (
              <div className="px-4 sm:px-5 py-3.5 bg-red-50 text-red-950">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed">
                    <div className="font-bold text-red-800">
                      علت رد مدارک توسط واحد صدور فاکتور:
                    </div>
                    <p className="font-semibold text-red-950">
                      {order.driverDelivery.financeRejectionReason}
                    </p>
                    {hasUnresolvedRejectedDoc && (
                      <p className="text-[11px] text-red-700 font-medium pt-0.5">
                        مورد نیازمند عکاسی مجدد:{' '}
                        {[
                          needsInvoiceRetake ? 'عکس فاکتور' : null,
                          needsReceiptRetake ? 'عکس رسید پرداخت' : null,
                        ]
                          .filter(Boolean)
                          .join(' و ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Address & Direct Customer Call */}
            <div className="px-4 sm:px-5 py-4 bg-white space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 space-y-2.5 text-xs sm:text-[13px] text-slate-800">
                <div className="flex items-start gap-2.5">
                  <MapPin
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      order.customerLocation ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-500">
                      آدرس دقیق تحویل ({order.district})
                    </span>
                    <span className="font-semibold leading-relaxed block">
                      {order.address}
                    </span>
                    {order.customerLocation?.note && (
                      <span className="block text-xs text-[#0f5864] font-medium pt-0.5">
                        توضیح لوکیشن: {order.customerLocation.note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Location / Navigation Controls */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {order.customerLocation ? (
                    <>
                      <span className="text-[11px] text-emerald-800 font-medium tabular-nums">
                        لوکیشن ثبت‌شده ({order.customerLocation.savedAt})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenLocationModal(order, 'pick')}
                          className="min-h-[42px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenLocationModal(order, 'navigate')}
                          className="flex-1 sm:flex-none min-h-[42px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] transition-all whitespace-nowrap"
                        >
                          <Navigation className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          مسیریابی به سمت مشتری
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-amber-800 font-medium">
                        هنوز موقعیت مکانی روی نقشه برای این مشتری ثبت نشده است.
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenLocationModal(order, 'pick')}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-md text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.99] transition-all whitespace-nowrap"
                      >
                        <MapPinPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        ثبت لوکیشن روی نقشه
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#eef2f9]/70 border border-slate-200/80 rounded-xl px-3.5 py-3">
                <div className="text-[13px] flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-slate-600 text-xs">تلفن مشتری:</span>
                  <span
                    dir="ltr"
                    className="tabular-nums font-bold text-sm text-slate-900 inline-block"
                  >
                    {order.customerPhone}
                  </span>
                </div>

                <a
                  href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                  onClick={() => onCallCustomer(order)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all whitespace-nowrap"
                >
                  <Phone className="w-4 h-4" />
                  تماس مستقیم با مشتری
                </a>
              </div>
            </div>

            {/* Cargo Summary */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#0f5864]" />
                  اقلام سفارش جهت تحویل
                </span>
                <span className="tabular-nums text-xs text-slate-600">
                  {toPersianDigits(order.items.length)} قلم · جمع وزن:{' '}
                  <strong className="text-slate-900">
                    {formatWeight(totalWeight)}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
                {order.items.map((item) => (
                  <span key={item.id} className="tabular-nums">
                    <strong className="text-slate-900">{item.productName}</strong>:{' '}
                    {formatWeight(getShippingWeight(item))}
                  </span>
                ))}
              </div>
            </div>

            {/* Two Required Document Capture / Upload Slots */}
            <div className="px-4 sm:px-5 py-4 sm:py-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ثبت و آپلود مدارک تحویل
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {financeRejected
                      ? 'عکس موردنظر را با کیفیت و نور مناسب مجدداً ثبت کنید و سپس ارسال مجدد را بزنید.'
                      : 'پس از عکس گرفتن از فاکتور و رسید پرداخت، دکمه «اتمام تحویل» فعال می‌شود.'}
                  </p>
                </div>
                <span className="tabular-nums text-xs font-bold text-[#0f5864]">
                  {toPersianDigits(
                    (invoicePhoto ? 1 : 0) + (paymentReceiptPhoto ? 1 : 0)
                  )}{' '}
                  از ۲ مدرک
                </span>
              </div>

              {uploadError && (
                <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {uploadError}
                </div>
              )}

              {/* Hidden Native Camera / File Inputs */}
              <input
                ref={invoiceInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange('invoice', e)}
              />
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange('paymentReceipt', e)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Slot 1: Invoice Photo */}
                <div
                  className={`rounded-xl border-2 p-3.5 sm:p-4 flex flex-col justify-between gap-3 transition-colors ${
                    needsInvoiceRetake
                      ? 'border-red-500 bg-red-50/40'
                      : invoicePhoto
                        ? 'border-emerald-300 bg-emerald-50/25'
                        : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0f5864]" />
                      ۱. عکس فاکتور
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        needsInvoiceRetake
                          ? 'text-red-700'
                          : invoicePhoto
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {needsInvoiceRetake
                        ? 'رد شده · نیاز به عکس مجدد'
                        : invoicePhoto
                          ? 'ثبت شد'
                          : 'الزامی'}
                    </span>
                  </div>

                  {invoicePhoto ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            title: `عکس فاکتور سفارش ${order.code}`,
                            photo: invoicePhoto,
                          })
                        }
                        className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <img
                          src={invoicePhoto.dataUrl}
                          alt={`عکس فاکتور سفارش ${order.code}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            مشاهده بزرگ
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="truncate">{invoicePhoto.fileName}</span>
                        <span className="tabular-nums shrink-0">
                          {invoicePhoto.uploadedAt}
                        </span>
                      </div>

                      {!completed && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={uploadingType === 'invoice'}
                            onClick={() => invoiceInputRef.current?.click()}
                            className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl sm:rounded-md text-xs font-bold transition-colors ${
                              needsInvoiceRetake
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white'
                            }`}
                          >
                            {needsInvoiceRetake ? (
                              <Camera className="w-4 h-4" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {uploadingType === 'invoice'
                              ? 'در حال بارگذاری...'
                              : needsInvoiceRetake
                                ? 'گرفتن عکس مجدد از فاکتور'
                                : 'تغییر عکس فاکتور'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveDocument(order.id, 'invoice')}
                            title="حذف عکس فاکتور"
                            aria-label="حذف عکس فاکتور"
                            className="w-11 h-11 rounded-xl sm:rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 border border-dashed border-slate-300 rounded-xl bg-white">
                      <Camera className="w-7 h-7 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        تصویر فاکتور امضاشده مشتری را ثبت یا آپلود کنید
                      </p>
                      <button
                        type="button"
                        disabled={uploadingType === 'invoice'}
                        onClick={() => invoiceInputRef.current?.click()}
                        className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] active:scale-[0.99] transition-all whitespace-nowrap"
                      >
                        <Camera className="w-4 h-4" />
                        {uploadingType === 'invoice'
                          ? 'در حال بارگذاری...'
                          : 'عکس گرفتن از فاکتور'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Slot 2: Payment Receipt Photo */}
                <div
                  className={`rounded-xl border-2 p-3.5 sm:p-4 flex flex-col justify-between gap-3 transition-colors ${
                    needsReceiptRetake
                      ? 'border-red-500 bg-red-50/40'
                      : paymentReceiptPhoto
                        ? 'border-emerald-300 bg-emerald-50/25'
                        : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-[#0f5864]" />
                      ۲. عکس رسید پرداخت
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        needsReceiptRetake
                          ? 'text-red-700'
                          : paymentReceiptPhoto
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {needsReceiptRetake
                        ? 'رد شده · نیاز به عکس مجدد'
                        : paymentReceiptPhoto
                          ? 'ثبت شد'
                          : 'الزامی'}
                    </span>
                  </div>

                  {paymentReceiptPhoto ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            title: `عکس رسید پرداخت سفارش ${order.code}`,
                            photo: paymentReceiptPhoto,
                          })
                        }
                        className="group relative block w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <img
                          src={paymentReceiptPhoto.dataUrl}
                          alt={`عکس رسید پرداخت سفارش ${order.code}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/95 text-slate-900 text-xs font-semibold shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            مشاهده بزرگ
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="truncate">
                          {paymentReceiptPhoto.fileName}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {paymentReceiptPhoto.uploadedAt}
                        </span>
                      </div>

                      {!completed && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={uploadingType === 'paymentReceipt'}
                            onClick={() => receiptInputRef.current?.click()}
                            className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl sm:rounded-md text-xs font-bold transition-colors ${
                              needsReceiptRetake
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white'
                            }`}
                          >
                            {needsReceiptRetake ? (
                              <Camera className="w-4 h-4" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {uploadingType === 'paymentReceipt'
                              ? 'در حال بارگذاری...'
                              : needsReceiptRetake
                                ? 'گرفتن عکس مجدد از رسید'
                                : 'تغییر عکس رسید'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onRemoveDocument(order.id, 'paymentReceipt')
                            }
                            title="حذف عکس رسید پرداخت"
                            aria-label="حذف عکس رسید پرداخت"
                            className="w-11 h-11 rounded-xl sm:rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 border border-dashed border-slate-300 rounded-xl bg-white">
                      <Camera className="w-7 h-7 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        تصویر رسید کارت‌خوان یا واریز مشتری را ثبت یا آپلود کنید
                      </p>
                      <button
                        type="button"
                        disabled={uploadingType === 'paymentReceipt'}
                        onClick={() => receiptInputRef.current?.click()}
                        className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] active:scale-[0.99] transition-all whitespace-nowrap"
                      >
                        <Camera className="w-4 h-4" />
                        {uploadingType === 'paymentReceipt'
                          ? 'در حال بارگذاری...'
                          : 'عکس گرفتن از رسید پرداخت'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Action Footer (Full-Width Thumb CTA on Mobile) */}
          <div className="px-4 sm:px-5 pt-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-modal-safe shrink-0">
            {completed ? (
              <>
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  تحویل تکمیل شد و عکس فاکتور و رسید پرداخت به بخش صدور فاکتور ارسال گردید.
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenReturnToSales(order)}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-600 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Undo2 className="w-3.5 h-3.5 shrink-0" />
                    برگشت سفارش به فروش
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    بستن
                  </button>
                </div>
              </>
            ) : readyToSubmit ? (
              <>
                <span className="text-xs font-semibold text-emerald-800">
                  {financeRejected
                    ? 'مدارک اصلاحی ثبت شدند و آماده ارسال مجدد به واحد صدور فاکتور هستند.'
                    : 'هر دو مدرک بارگذاری شدند و آماده ارسال به بخش صدور فاکتور هستند.'}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenReturnToSales(order)}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-600 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Undo2 className="w-3.5 h-3.5 shrink-0" />
                    برگشت سفارش به فروش
                  </button>
                  <button
                    type="button"
                    onClick={() => onCompleteDelivery(order.id)}
                    className="w-full sm:w-auto min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl sm:rounded-md text-sm sm:text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] shadow-sm transition-all whitespace-nowrap"
                  >
                    <CheckCheck className="w-4 h-4" />
                    {financeRejected
                      ? 'ارسال مجدد مدارک و اتمام تحویل'
                      : 'اتمام تحویل و ارسال به صدور فاکتور'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-slate-600 leading-relaxed">
                  {hasUnresolvedRejectedDoc
                    ? 'برای فعال شدن ارسال مجدد، لطفاً عکس جدید مدرک(های) ردشده با کادر قرمز را ثبت کنید.'
                    : !invoicePhoto && !paymentReceiptPhoto
                      ? 'برای نمایش دکمه اتمام تحویل، لطفاً عکس فاکتور و عکس رسید پرداخت را ثبت کنید.'
                      : !invoicePhoto
                        ? 'عکس رسید پرداخت ثبت شد — لطفاً عکس فاکتور را نیز ثبت کنید.'
                        : 'عکس فاکتور ثبت شد — لطفاً عکس رسید پرداخت را نیز ثبت کنید.'}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenReturnToSales(order)}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-600 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Undo2 className="w-3.5 h-3.5 shrink-0" />
                    برگشت سفارش به فروش
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl sm:rounded-md text-sm sm:text-xs font-semibold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    بستن
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Preview */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewPhoto.title}
          className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
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
                aria-label="بستن پیش‌نمایش تصویر"
                className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4 bg-slate-900 flex items-center justify-center overflow-auto">
              <img
                src={previewPhoto.photo.dataUrl}
                alt={previewPhoto.title}
                referrerPolicy="no-referrer"
                className="max-h-[75dvh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
