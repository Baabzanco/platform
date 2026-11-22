import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Order, UploadedDocumentPhoto } from '../../types/order';
import { formatWeight, getShippingWeight } from '../../utils/formatters';
import { processDocumentImageFile } from '../../utils/imageUpload';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface DriverOrderModalProps {
  order: Order | null;
  stopNumber: number;
  onClose: () => void;
  onCallCustomer: (order: Order) => void;
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
}

export const DriverOrderModal: React.FC<DriverOrderModalProps> = ({
  order,
  stopNumber,
  onClose,
  onCallCustomer,
  onUploadDocument,
  onRemoveDocument,
  onCompleteDelivery,
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
    if (!order) return;
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
  }, [order, previewPhoto, onClose]);

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
        className="no-print fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[1.5px] flex items-center justify-center p-3 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[780px] rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top Status Banner */}
          {completed && (
            <div className="px-5 py-2 bg-emerald-600 text-white flex items-center justify-between gap-2 text-xs font-bold shrink-0">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {financeVerified
                  ? 'تحویل تکمیل و مدارک توسط واحد صدور فاکتور تایید نهایی شد'
                  : 'اتمام تحویل ثبت شد و مدارک برای واحد صدور فاکتور ارسال گردید'}
              </span>
              <span className="tabular-nums opacity-95">
                {order.driverDelivery?.completedAt}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 flex-1">
              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  اولویت مسیر
                </span>
                <span className="tabular-nums text-sm font-bold text-[#0f5864]">
                  مسیر {toPersianDigits(stopNumber)}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  کد سفارش
                </span>
                <span className="tabular-nums text-base font-bold text-[#0056b3]">
                  {order.code}
                </span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  محدوده
                </span>
                <span className="font-bold text-slate-900">{order.district}</span>
              </div>

              <div className="text-[13px]">
                <span className="block text-[11px] text-slate-500 mb-0.5">
                  بازه تحویل
                </span>
                <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {order.deliverySlot}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن جزئیات تحویل"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-200">
            {/* Address & Customer Call Section */}
            <div className="px-5 py-4 bg-white space-y-3">
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 text-[13px] text-slate-800">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[11px] text-slate-500 mb-0.5">
                    آدرس دقیق تحویل ({order.district})
                  </span>
                  <span className="font-medium leading-relaxed">
                    {order.address}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#eef2f9]/65 border border-slate-200/80 rounded-lg px-3.5 py-2.5">
                <div className="text-[13px]">
                  <span className="text-slate-500 text-xs ml-2">تلفن مشتری:</span>
                  <span
                    dir="ltr"
                    className="tabular-nums font-bold text-slate-900 inline-block"
                  >
                    {order.customerPhone}
                  </span>
                </div>

                <a
                  href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                  onClick={() => onCallCustomer(order)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5" />
                  تماس با مشتری
                </a>
              </div>
            </div>

            {/* Cargo Summary */}
            <div className="px-5 py-3.5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#0f5864]" />
                  اقلام سفارش جهت تحویل
                </span>
                <span className="tabular-nums text-xs text-slate-500">
                  {toPersianDigits(order.items.length)} قلم · جمع وزن:{' '}
                  <strong className="text-slate-800">
                    {formatWeight(totalWeight)}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-700">
                {order.items.map((item) => (
                  <span key={item.id} className="tabular-nums">
                    <strong className="text-slate-900">{item.productName}</strong>:{' '}
                    {formatWeight(getShippingWeight(item))}
                  </span>
                ))}
              </div>
            </div>

            {/* Two Required Document Capture / Upload Slots */}
            <div className="px-5 py-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ثبت و آپلود مدارک تحویل
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    پس از عکس گرفتن و آپلود هر دو مدرک زیر، دکمه «اتمام تحویل» نمایش داده می‌شود.
                  </p>
                </div>
                <span className="tabular-nums text-xs font-bold text-[#0f5864]">
                  {toPersianDigits(
                    (invoicePhoto ? 1 : 0) + (paymentReceiptPhoto ? 1 : 0)
                  )}{' '}
                  از ۲ مدرک ثبت شده
                </span>
              </div>

              {uploadError && (
                <div className="mb-3 px-3.5 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Slot 1: Invoice Photo */}
                <div
                  className={`rounded-lg border p-4 flex flex-col justify-between gap-3 transition-colors ${
                    invoicePhoto
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
                        invoicePhoto ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {invoicePhoto ? 'ثبت شد' : 'الزامی'}
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
                        className="group relative block w-full h-40 rounded-md overflow-hidden border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <img
                          src={invoicePhoto.dataUrl}
                          alt={`عکس فاکتور سفارش ${order.code}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-slate-900 text-xs font-semibold shadow-sm">
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            تغییر عکس فاکتور
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveDocument(order.id, 'invoice')}
                            title="حذف عکس فاکتور"
                            aria-label="حذف عکس فاکتور"
                            className="p-2 rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 px-3 border border-dashed border-slate-300 rounded-md bg-white">
                      <Camera className="w-7 h-7 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 mb-3">
                        تصویر فاکتور امضاشده مشتری را با دوربین ثبت یا آپلود کنید
                      </p>
                      <button
                        type="button"
                        disabled={uploadingType === 'invoice'}
                        onClick={() => invoiceInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:opacity-60 transition-colors whitespace-nowrap"
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
                  className={`rounded-lg border p-4 flex flex-col justify-between gap-3 transition-colors ${
                    paymentReceiptPhoto
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
                        paymentReceiptPhoto ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {paymentReceiptPhoto ? 'ثبت شد' : 'الزامی'}
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
                        className="group relative block w-full h-40 rounded-md overflow-hidden border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <img
                          src={paymentReceiptPhoto.dataUrl}
                          alt={`عکس رسید پرداخت سفارش ${order.code}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-slate-900 text-xs font-semibold shadow-sm">
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            تغییر عکس رسید
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onRemoveDocument(order.id, 'paymentReceipt')
                            }
                            title="حذف عکس رسید پرداخت"
                            aria-label="حذف عکس رسید پرداخت"
                            className="p-2 rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 px-3 border border-dashed border-slate-300 rounded-md bg-white">
                      <Camera className="w-7 h-7 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 mb-3">
                        تصویر رسید دستگاه کارت‌خوان یا واریز مشتری را ثبت یا آپلود کنید
                      </p>
                      <button
                        type="button"
                        disabled={uploadingType === 'paymentReceipt'}
                        onClick={() => receiptInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:opacity-60 transition-colors whitespace-nowrap"
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

          {/* Sticky Action Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {completed ? (
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  تحویل تکمیل شد و عکس فاکتور و رسید پرداخت به بخش صدور فاکتور ارسال گردید.
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  بستن
                </button>
              </div>
            ) : bothUploaded ? (
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <span className="text-xs font-semibold text-emerald-800">
                  هر دو مدرک (فاکتور و رسید پرداخت) بارگذاری شدند و آماده ارسال به بخش صدور فاکتور هستند.
                </span>
                <button
                  type="button"
                  onClick={() => onCompleteDelivery(order.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-4 h-4" />
                  اتمام تحویل و ارسال به واحد صدور فاکتور
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <span className="text-xs text-slate-600">
                  {!invoicePhoto && !paymentReceiptPhoto
                    ? 'برای نمایش دکمه اتمام تحویل، لطفاً عکس فاکتور و عکس رسید پرداخت را ثبت و آپلود کنید.'
                    : !invoicePhoto
                      ? 'عکس رسید پرداخت ثبت شد — برای نمایش دکمه اتمام تحویل، عکس فاکتور را نیز ثبت کنید.'
                      : 'عکس فاکتور ثبت شد — برای نمایش دکمه اتمام تحویل، عکس رسید پرداخت را نیز ثبت کنید.'}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  بستن
                </button>
              </div>
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
          className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
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
                className="p-1 text-slate-500 hover:text-slate-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto">
              <img
                src={previewPhoto.photo.dataUrl}
                alt={previewPhoto.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
