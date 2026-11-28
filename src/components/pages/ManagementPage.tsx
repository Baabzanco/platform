import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  Undo2,
  Wallet,
} from 'lucide-react';
import { CustomerRecord } from '../../types/customer';
import { Order } from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
import {
  calculateItemTotal,
  calculateOrderTotal,
  formatRial,
  formatWeight,
  getFinanceWeight,
  getStatusLabel,
} from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';
import { CreditStandingTag } from '../CreditStandingTag';

interface ManagementPageProps {
  orders: Order[];
  customers: CustomerRecord[];
  printingOrderId: string | null;
  access: AccessControlHelpers;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onApproveOrder: (orderId: string) => void;
  onOpenReturnToSales: (order: Order) => void;
  onCallCustomer: (order: Order) => void;
  onOpenCustomerProfile: (order: Order) => void;
}

type ManagementFilter =
  | 'all'
  | 'pending'
  | 'red'
  | 'yellow'
  | 'approved'
  | 'returned_to_sales';

function isManagementRelevantOrder(order: Order): boolean {
  const standing = order.customerStanding ?? 'green';
  return (
    order.status === 'pending_management_approval' ||
    Boolean(order.managementApproval?.approved) ||
    standing === 'yellow' ||
    standing === 'red' ||
    standing === 'black'
  );
}

function getManagementSortRank(order: Order): number {
  if (order.status === 'pending_management_approval') {
    if (order.customerStanding === 'red' || order.customerStanding === 'black') {
      return 0;
    }
    return 1;
  }
  if (order.status === 'returned_to_sales') return 2;
  if (order.managementApproval?.approved) return 3;
  return 4;
}

export const ManagementPage: React.FC<ManagementPageProps> = ({
  orders,
  customers,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onApproveOrder,
  onOpenReturnToSales,
  onCallCustomer,
  onOpenCustomerProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ManagementFilter>('all');

  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const relevantOrders = useMemo(
    () => orders.filter(isManagementRelevantOrder),
    [orders]
  );

  const metrics = useMemo(() => {
    const pending = relevantOrders.filter(
      (o) => o.status === 'pending_management_approval'
    );
    const pendingYellow = pending.filter(
      (o) => o.customerStanding === 'yellow'
    ).length;
    const pendingRed = pending.filter(
      (o) => o.customerStanding === 'red' || o.customerStanding === 'black'
    ).length;
    const approvedCount = relevantOrders.filter((o) =>
      Boolean(o.managementApproval?.approved)
    ).length;
    const pendingAmountRial = pending.reduce(
      (sum, o) => sum + calculateOrderTotal(o),
      0
    );

    return {
      pendingCount: pending.length,
      pendingYellow,
      pendingRed,
      approvedCount,
      pendingAmountRial,
    };
  }, [relevantOrders]);

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = relevantOrders.filter((order) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'pending' &&
          order.status === 'pending_management_approval') ||
        (filter === 'red' &&
          (order.customerStanding === 'red' ||
            order.customerStanding === 'black')) ||
        (filter === 'yellow' && order.customerStanding === 'yellow') ||
        (filter === 'approved' && Boolean(order.managementApproval?.approved)) ||
        (filter === 'returned_to_sales' &&
          order.status === 'returned_to_sales');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q) ||
        order.district.toLowerCase().includes(q) ||
        order.notes.toLowerCase().includes(q) ||
        order.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      const rankDiff = getManagementSortRank(a) - getManagementSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return b.lastActionAt - a.lastActionAt;
    });
  }, [relevantOrders, searchQuery, filter]);

  const pendingSectionCount = useMemo(
    () =>
      sortedAndFilteredOrders.filter(
        (o) => o.status === 'pending_management_approval'
      ).length,
    [sortedAndFilteredOrders]
  );

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            بخش مدیریت (تایید اعتباری سفارش‌ها)
          </h1>
          {metrics.pendingCount > 0 && (
            <span className="tabular-nums px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
              {toPersianDigits(metrics.pendingCount)} منتظر تایید
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          title="پرینت سفارش‌های مدیریت"
          className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">پرینت لیست</span>
          <span className="sm:hidden">پرینت</span>
        </button>
      </header>

      {/* Compact Executive KPI Strip */}
      <section className="no-print grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500">
              در انتظار تایید مدیریت
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular-nums text-xl font-bold text-slate-900">
                {toPersianDigits(metrics.pendingCount)}
              </span>
              <span className="text-[11px] text-slate-500">
                ({toPersianDigits(metrics.pendingRed)} قرمز ·{' '}
                {toPersianDigits(metrics.pendingYellow)} زرد)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500">
              تایید شده و ارسال به تولید
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular-nums text-xl font-bold text-emerald-700">
                {toPersianDigits(metrics.approvedCount)}
              </span>
              <span className="text-[11px] text-slate-500">سفارش اعتباری</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold text-slate-500">
              ارزش سفارش‌های منتظر تایید
            </span>
            <div className="mt-1 tabular-nums text-base sm:text-lg font-bold text-[#0f5864] truncate">
              {formatRial(metrics.pendingAmountRial)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#0f5864]/10 border border-[#0f5864]/20 text-[#0f5864] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد سفارش، طرف حساب یا محصول..."
            className="w-full sm:w-72 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
            {(
              [
                { id: 'all', label: 'همه سفارش‌های اعتباری' },
                { id: 'pending', label: 'در انتظار تایید' },
                { id: 'red', label: 'وضعیت قرمز' },
                { id: 'yellow', label: 'وضعیت زرد' },
                { id: 'approved', label: 'تایید شده' },
                { id: 'returned_to_sales', label: 'برگشت به فروش' },
              ] as Array<{ id: ManagementFilter; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === f.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-600 mb-2">
              {relevantOrders.length === 0
                ? 'در این تاریخ سفارشی با وضعیت اعتباری زرد یا قرمز برای بررسی مدیریت ثبت نشده است.'
                : 'سفارشی با فیلتر انتخاب‌شده یافت نشد.'}
            </p>
            <p className="text-xs text-slate-500">
              سفارش مشتریان دارای وضعیت اعتباری زرد یا قرمز پس از ثبت توسط کارشناس فروش به‌صورت خودکار به این صفحه ارسال می‌شوند.
            </p>
          </div>
        ) : (
          sortedAndFilteredOrders.map((order, index) => {
            const isPending = order.status === 'pending_management_approval';
            const isApproved = Boolean(order.managementApproval?.approved);
            const isReturnedToSales = order.status === 'returned_to_sales';
            const standing = order.customerStanding ?? 'green';
            const isRedOrBlack = standing === 'red' || standing === 'black';
            const orderTotal = calculateOrderTotal(order);
            const totalRequestedWeight = order.items.reduce(
              (sum, i) => sum + i.requestedWeight,
              0
            );

            const linkedCustomer = order.customerId
              ? customerById.get(order.customerId)
              : undefined;

            const showOtherDivider =
              pendingSectionCount > 0 && index === pendingSectionCount;

            const cardBorder = isPending
              ? isRedOrBlack
                ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/15'
                : 'border-2 border-amber-500 bg-white shadow-md ring-2 ring-amber-500/15'
              : isReturnedToSales
                ? 'border border-amber-300 bg-white'
                : 'border border-slate-200 bg-white hover:border-[#0f5864]/50';

            return (
              <React.Fragment key={order.id}>
                {showOtherDivider && (
                  <div className="no-print flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      سوابق تایید شده و تعیین‌تکلیف‌شده
                    </span>
                    <div className="h-px bg-slate-300/80 flex-1" />
                  </div>
                )}

                <article
                  className={`order-card-printable ${
                    printingOrderId === order.id ? 'print-target' : ''
                  } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardBorder}`}
                >
                  {/* Top Priority Strip for Pending Management Approval */}
                  {isPending && (
                    <div
                      className={`px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white ${
                        isRedOrBlack ? 'bg-red-600' : 'bg-amber-600'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        نیازمند تایید مدیریت پیش از ارسال به تولید —{' '}
                        {standing === 'red'
                          ? 'مشتری با وضعیت اعتباری قرمز'
                          : standing === 'black'
                            ? 'مشتری بلک‌لیست'
                            : 'مشتری با وضعیت اعتباری زرد'}
                      </span>
                      <span className="tabular-nums opacity-95 text-[11px]">
                        ثبت فروش: {order.createdAt}
                      </span>
                    </div>
                  )}

                  {!isPending && isApproved && (
                    <div className="px-4 sm:px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        تایید مدیریت انجام شد ({order.managementApproval?.approvedAt})
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        مرحله فعلی: <strong>{getStatusLabel(order.status)}</strong>
                      </span>
                    </div>
                  )}

                  {isReturnedToSales && (
                    <div className="px-4 sm:px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <Undo2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        برگشت‌خورده به کارشناس فروش
                      </span>
                      <span className="text-[11px] text-amber-900 truncate max-w-[320px]">
                        {order.salesReturn?.reason}
                      </span>
                    </div>
                  )}

                  {/* Order Summary Header */}
                  <div className="p-4 sm:px-5 sm:py-4 space-y-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tabular-nums text-base font-bold text-[#0056b3]">
                            کد {order.code}
                          </span>
                          <CreditStandingTag
                            standing={standing}
                            standingLabel={order.customerStandingLabel}
                            size="sm"
                          />
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            بازه {order.deliverySlot}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCustomerProfile(order);
                            }}
                            title="مشاهده پروفایل طرف حساب"
                            className="group inline-flex items-center gap-1.5 max-w-full text-sm sm:text-[15px] font-bold text-[#0f5864] hover:text-[#083942] underline decoration-[#0f5864]/40 hover:decoration-[#083942] underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] rounded"
                          >
                            <span className="truncate">{order.customerName}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>

                        {(order.customerStandingLabel || linkedCustomer) && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            {order.customerStandingLabel && (
                              <span className="font-semibold text-slate-700">
                                شرح اعتبار: {order.customerStandingLabel}
                              </span>
                            )}
                            {linkedCustomer &&
                              linkedCustomer.credit.creditLimitRial > 0 && (
                                <span className="tabular-nums">
                                  سقف اعتبار:{' '}
                                  <strong className="text-slate-900">
                                    {formatRial(
                                      linkedCustomer.credit.creditLimitRial
                                    )}
                                  </strong>{' '}
                                  · مصرف‌شده:{' '}
                                  <strong
                                    className={
                                      isRedOrBlack
                                        ? 'text-red-700'
                                        : 'text-amber-800'
                                    }
                                  >
                                    {formatRial(
                                      linkedCustomer.credit.usedCreditRial
                                    )}
                                  </strong>
                                </span>
                              )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {order.district} — {order.address}
                          </span>
                          <a
                            href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                            onClick={() => onCallCustomer(order)}
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span dir="ltr" className="tabular-nums">
                              {order.customerPhone}
                            </span>
                          </a>
                        </div>
                      </div>

                      {/* Order Financial Total Box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500">
                          جمع کل فاکتور ({toPersianDigits(order.items.length)}{' '}
                          قلم · {formatWeight(Number(totalRequestedWeight.toFixed(2)))})
                        </span>
                        <span className="tabular-nums text-base sm:text-lg font-bold text-[#0f5864]">
                          {formatRial(orderTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Sales Notes */}
                    {order.notes && (
                      <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">
                          توضیحات کارشناس فروش:
                        </strong>{' '}
                        {order.notes}
                      </div>
                    )}

                    {/* Compact Items Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="text-right font-semibold px-3.5 py-2">
                              نام محصول
                            </th>
                            <th className="text-right font-semibold px-3.5 py-2">
                              وزن درخواستی
                            </th>
                            <th className="text-right font-semibold px-3.5 py-2">
                              فی واحد (ریال)
                            </th>
                            <th className="text-right font-semibold px-3.5 py-2">
                              جمع ردیف
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3.5 py-2 font-semibold text-slate-900">
                                {item.productName}
                              </td>
                              <td className="tabular-nums px-3.5 py-2 text-slate-700">
                                {formatWeight(getFinanceWeight(item))}
                              </td>
                              <td className="tabular-nums px-3.5 py-2 text-slate-600">
                                {new Intl.NumberFormat('fa-IR').format(
                                  item.unitPrice
                                )}
                              </td>
                              <td className="tabular-nums px-3.5 py-2 font-bold text-slate-900">
                                {formatRial(calculateItemTotal(item))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Footer */}
                    <div className="no-print pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectOrder(order.id)}
                        className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        مشاهده پرونده کامل
                      </button>

                      {isPending && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenReturnToSales(order)}
                            className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-600 hover:text-white transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            برگشت سفارش به فروش
                          </button>

                          <button
                            type="button"
                            onClick={() => onApproveOrder(order.id)}
                            className="min-h-[42px] sm:min-h-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold text-white bg-[#0f5864] hover:bg-[#0b434d] shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            تایید مدیریت و ارسال به تولید
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
