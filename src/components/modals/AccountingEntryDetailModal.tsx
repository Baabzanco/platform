import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package,
  Receipt,
  Truck,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  CustomerAccountingEntry,
  CustomerRecord,
} from '../../types/customer';
import { formatRial, formatWeight } from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface AccountingEntryDetailModalProps {
  entry: CustomerAccountingEntry | null;
  customer: CustomerRecord;
  onClose: () => void;
}

function formatSayadiId(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '');
  const grouped = cleaned.replace(/(.{4})/g, '$1 ').trim();
  return toPersianDigits(grouped);
}

const CHEQUE_STATUS_CONFIG = {
  cleared: {
    label: 'پاس شده (وصول کامل)',
    textClass: 'text-emerald-800',
    surfaceClass: 'bg-emerald-50 border-emerald-200',
    Icon: CheckCircle2,
  },
  pending: {
    label: 'در جریان وصول (نزد مالی)',
    textClass: 'text-amber-900',
    surfaceClass: 'bg-amber-50 border-amber-200',
    Icon: Clock,
  },
  bounced: {
    label: 'برگشتی (عدم موجودی)',
    textClass: 'text-red-800',
    surfaceClass: 'bg-red-50 border-red-200',
    Icon: AlertTriangle,
  },
} as const;

export const AccountingEntryDetailModal: React.FC<
  AccountingEntryDetailModalProps
> = ({ entry, customer, onClose }) => {
  const [zoomedPhoto, setZoomedPhoto] = useState<{
    url: string;
    title: string;
    caption?: string;
  } | null>(null);
  const [copiedSayadi, setCopiedSayadi] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!entry) return;
    setZoomedPhoto(null);
    setCopiedSayadi(false);
    setFailedImages({});
  }, [entry?.id]);

  useEffect(() => {
    if (!entry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedPhoto) {
          setZoomedPhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entry, zoomedPhoto, onClose]);

  if (!entry) return null;

  const order = entry.orderDetails;
  const cheque = entry.chequeDetails;
  const cash = entry.cashDetails;
  const settlementMethod = entry.settlementMethod;

  const handleCopySayadi = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).catch(() => {});
    }
    setCopiedSayadi(true);
    window.setTimeout(() => setCopiedSayadi(false), 1800);
  };

  const totalWeightKg =
    order?.items.reduce((sum, item) => sum + item.weightKg, 0) ?? 0;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`جزئیات رخداد حسابداری ${entry.title}`}
        className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-[#0f5864]">
                  جزئیات سند و سفارش حسابداری
                </span>
                {entry.orderCode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-bold text-slate-800">
                      شماره سفارش {toPersianDigits(entry.orderCode)}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{toPersianDigits(entry.date)}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {entry.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                <span>{customer.name}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-slate-500">
                  کد حساب {toPersianDigits(customer.accountCode)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن پنجره"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Compact Ledger Row Financial Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-200 text-xs tabular-nums">
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-slate-500">مبلغ بدهکار (فاکتور)</span>
                <strong
                  className={
                    entry.debitRial > 0
                      ? 'text-sm text-red-700'
                      : 'text-sm text-slate-400'
                  }
                >
                  {entry.debitRial > 0 ? formatRial(entry.debitRial) : '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-slate-500">مبلغ بستانکار (تسویه)</span>
                <strong
                  className={
                    entry.creditRial > 0
                      ? 'text-sm text-emerald-700'
                      : 'text-sm text-slate-400'
                  }
                >
                  {entry.creditRial > 0 ? formatRial(entry.creditRial) : '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-slate-500">مانده بر خط پس از این ردیف</span>
                <strong
                  className={
                    entry.runningBalanceRial > 0
                      ? 'text-sm text-slate-950'
                      : 'text-sm text-emerald-700'
                  }
                >
                  {entry.runningBalanceRial === 0
                    ? '۰ ریال (تسویه کامل)'
                    : `${formatRial(Math.abs(entry.runningBalanceRial))} ${
                        entry.runningBalanceRial > 0 ? '(بدهکار)' : '(بستانکار)'
                      }`}
                </strong>
              </div>
            </div>

            {/* SECTION 1: محل تسویه (چک یا نقدی) */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {settlementMethod === 'cheque' ? (
                    <FileCheck2 className="w-4 h-4 text-indigo-700 shrink-0" />
                  ) : (
                    <Banknote className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                  <h3 className="text-sm font-bold text-slate-900">
                    محل تسویه و مدارک پرداخت
                  </h3>
                </div>

                {settlementMethod && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      settlementMethod === 'cheque'
                        ? 'text-indigo-800'
                        : 'text-emerald-800'
                    }`}
                  >
                    {settlementMethod === 'cheque' ? (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        محل تسویه: چک صیادی
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        محل تسویه: نقدی (تایید راننده)
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* CHEQUE DETAILS VIEW */}
              {settlementMethod === 'cheque' && cheque && (() => {
                const statusInfo = CHEQUE_STATUS_CONFIG[cheque.status];
                const StatusIcon = statusInfo.Icon;
                return (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-200/70">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                        <Building2 className="w-4 h-4 text-indigo-700 shrink-0" />
                        <span>
                          {cheque.bankName} — {cheque.branchName}
                        </span>
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${statusInfo.surfaceClass} ${statusInfo.textClass}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-xs">
                      <div className="space-y-1">
                        <div className="text-slate-500">شناسه صیادی (۱۶ رقمی)</div>
                        <div className="flex items-center gap-1.5">
                          <span
                            dir="ltr"
                            className="font-mono tabular-nums font-bold text-slate-900 tracking-wide"
                          >
                            {formatSayadiId(cheque.sayadiId)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopySayadi(cheque.sayadiId)}
                            title="کپی شناسه صیادی"
                            className="p-1 rounded text-slate-500 hover:text-[#0f5864] hover:bg-white transition-colors"
                          >
                            {copiedSayadi ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-slate-500">شماره سریال چک</div>
                        <div
                          dir="ltr"
                          className="font-mono tabular-nums font-bold text-slate-900 text-right"
                        >
                          {toPersianDigits(cheque.chequeNumber)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-slate-500">تاریخ سررسید چک</div>
                        <div className="tabular-nums font-bold text-slate-900">
                          {toPersianDigits(cheque.dueDate)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-slate-500">مبلغ چک</div>
                        <div className="tabular-nums font-bold text-indigo-900">
                          {formatRial(cheque.amountRial)}
                        </div>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-slate-500">صادرکننده / صاحب حساب</div>
                        <div className="font-semibold text-slate-900">
                          {cheque.issuerName} ({customer.name})
                        </div>
                      </div>
                    </div>

                    {cheque.statusNote && (
                      <div className="pt-2.5 border-t border-indigo-200/70 text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">
                          توضیحات وضعیت چک:{' '}
                        </span>
                        {cheque.statusNote}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CASH PAYMENT + DRIVER PHOTOS VIEW */}
              {settlementMethod === 'cash' && cash && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
                  {/* Cash Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-3.5 border-b border-emerald-200/70 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-500">روش پرداخت نقدی</div>
                      <div className="font-bold text-emerald-950">
                        {cash.channelLabel}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">شماره پیگیری / مرجع</div>
                      <div
                        dir="ltr"
                        className="font-mono tabular-nums font-bold text-slate-900 text-right"
                      >
                        {cash.trackingCode}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">زمان ثبت و تحویل</div>
                      <div className="tabular-nums font-semibold text-slate-800">
                        {cash.paidAt}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">راننده ثبت‌کننده مدارک</div>
                      <div className="font-semibold text-slate-900">
                        {cash.driverName}
                      </div>
                    </div>
                  </div>

                  {/* Driver-Captured Photos: Invoice + Payment Receipt */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-800">
                        مدارک تصویری ثبت‌شده توسط راننده ({cash.driverName})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        برای مشاهده با کیفیت کامل روی هر تصویر کلیک کنید
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Photo 1: Signed Delivery Invoice */}
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedPhoto({
                            url: cash.invoicePhotoUrl,
                            title: 'عکس فاکتور تحویل‌شده (ثبت راننده)',
                            caption: cash.invoicePhotoCaption,
                          })
                        }
                        className="group text-right rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-[#0f5864] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                          {failedImages['invoice'] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
                              <FileText className="w-8 h-8" />
                              <span className="text-xs font-medium">
                                تصویر فاکتور ثبت‌شده
                              </span>
                            </div>
                          ) : (
                            <img
                              src={cash.invoicePhotoUrl}
                              alt={
                                cash.invoicePhotoCaption ??
                                'عکس فاکتور تحویل‌شده توسط راننده'
                              }
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  invoice: true,
                                }))
                              }
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              عکس فاکتور تحویل
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded">
                              <ZoomIn className="w-3 h-3" />
                              بزرگ‌نمایی
                            </span>
                          </div>
                        </div>
                        <div className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {cash.invoicePhotoCaption ??
                            'فاکتور امضاشده در محل تحویل توسط راننده'}
                        </div>
                      </button>

                      {/* Photo 2: Payment Receipt / Transfer Slip */}
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedPhoto({
                            url: cash.paymentReceiptPhotoUrl,
                            title: 'عکس فیش واریزی / رسید پرداخت (ثبت راننده)',
                            caption: cash.paymentReceiptPhotoCaption,
                          })
                        }
                        className="group text-right rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-[#0f5864] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864]"
                      >
                        <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                          {failedImages['receipt'] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
                              <Receipt className="w-8 h-8" />
                              <span className="text-xs font-medium">
                                تصویر فیش واریزی ثبت‌شده
                              </span>
                            </div>
                          ) : (
                            <img
                              src={cash.paymentReceiptPhotoUrl}
                              alt={
                                cash.paymentReceiptPhotoCaption ??
                                'عکس فیش واریزی یا رسید کارت‌خوان'
                              }
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  receipt: true,
                                }))
                              }
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5" />
                              عکس فیش واریزی / رسید
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded">
                              <ZoomIn className="w-3 h-3" />
                              بزرگ‌نمایی
                            </span>
                          </div>
                        </div>
                        <div className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {cash.paymentReceiptPhotoCaption ??
                            'رسید پرداخت نقدی ثبت‌شده توسط راننده'}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!settlementMethod && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  این ردیف مربوط به گزارش مانده حساب طرف حساب است و سند تسویه مستقلی ندارد.
                </div>
              )}
            </section>

            {/* SECTION 2: جزئیات سفارش و اقلام فاکتور */}
            {order && (
              <section className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0f5864] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      جزئیات سفارش {toPersianDigits(order.orderCode)}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {order.statusLabel}
                  </span>
                </div>

                {/* Order Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="space-y-0.5">
                    <div className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      تاریخ و بازه تحویل
                    </div>
                    <div className="tabular-nums font-bold text-slate-900">
                      {toPersianDigits(order.orderDate)} · ساعت {order.deliverySlot}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-slate-500 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      راننده تحویل‌دهنده
                    </div>
                    <div className="font-bold text-slate-900">
                      {order.driverName}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      کارشناس فروش
                    </div>
                    <div className="font-bold text-slate-900">
                      {order.salesRep}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-slate-500 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      مجموع وزن تحویلی
                    </div>
                    <div className="tabular-nums font-bold text-[#0f5864]">
                      {formatWeight(totalWeightKg)}
                    </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-200/80 flex items-start gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{order.address}</span>
                  </div>
                </div>

                {/* Order Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px] border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold">
                        <th className="w-10 px-2.5 py-2.5 text-center border-b border-slate-200">
                          #
                        </th>
                        <th className="px-3 py-2.5 text-right border-b border-slate-200">
                          نام محصول
                        </th>
                        <th className="w-28 px-3 py-2.5 text-center border-b border-slate-200 whitespace-nowrap">
                          وزن تحویلی
                        </th>
                        <th className="w-32 px-3 py-2.5 text-left border-b border-slate-200 whitespace-nowrap">
                          فی واحد (ریال)
                        </th>
                        <th className="w-36 px-3 py-2.5 text-left border-b border-slate-200 whitespace-nowrap">
                          جمع کل ردیف
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="px-2.5 py-2.5 text-center tabular-nums text-slate-500">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {item.productName}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums font-medium text-slate-800 whitespace-nowrap">
                            {formatWeight(item.weightKg)}
                          </td>
                          <td className="px-3 py-2.5 text-left tabular-nums text-slate-700 whitespace-nowrap">
                            {new Intl.NumberFormat('fa-IR').format(
                              item.unitPriceRial
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-left tabular-nums font-bold text-slate-900 whitespace-nowrap">
                            {formatRial(item.totalRial)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-slate-950 border-t border-slate-200 tabular-nums">
                        <td colSpan={2} className="px-3 py-2.5 text-right">
                          جمع کل فاکتور ({toPersianDigits(order.items.length)}{' '}
                          قلم)
                        </td>
                        <td className="px-3 py-2.5 text-center text-[#0f5864] whitespace-nowrap">
                          {formatWeight(totalWeightKg)}
                        </td>
                        <td className="px-3 py-2.5 text-left text-slate-400">
                          —
                        </td>
                        <td className="px-3 py-2.5 text-left text-[#0f5864] whitespace-nowrap">
                          {formatRial(order.totalRial)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {order.note && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                    <span className="font-bold text-slate-800">یادداشت سفارش: </span>
                    {order.note}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
            >
              بستن
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox for Driver Photos */}
      {zoomedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomedPhoto.title}
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomedPhoto(null);
          }}
        >
          <div className="w-full max-w-2xl flex items-center justify-between gap-3 mb-3 text-white">
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{zoomedPhoto.title}</div>
              {zoomedPhoto.caption && (
                <div className="text-xs text-slate-300 truncate mt-0.5">
                  {zoomedPhoto.caption}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              aria-label="بستن پیش‌نمایش تصویر"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-2xl w-full max-h-[80vh] rounded-xl overflow-hidden border border-white/15 bg-slate-900 flex items-center justify-center">
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[78vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
