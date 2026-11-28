import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Printer,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { Order, OrderItem } from '../../types/order';
import { AccessControlHelpers } from '../../types/permissions';
import {
  buildPreparationSummary,
  formatWeight,
} from '../../utils/formatters';

interface ProductionPageProps {
  orders: Order[];
  printingOrderId: string | null;
  access: AccessControlHelpers;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
  onOpenWeight: (order: Order, item: OrderItem) => void;
}

type ProdTab = 'orders' | 'prep';
type ProdFilter =
  | 'all'
  | 'in_progress'
  | 'completed'
  | 'returned_to_sales'
  | 'returned'
  | 'rejected';

function isAwaitingShippingReturn(order: Order): boolean {
  return (
    order.status === 'returned' &&
    order.returnRecord?.stage === 'awaiting_shipping_receive' &&
    !(order.returnRecord?.confirmations.shipping.confirmed ?? false)
  );
}

function isReturnVisibleToProd(order: Order): boolean {
  return order.status === 'returned' && !isAwaitingShippingReturn(order);
}

function isCompletedInProd(order: Order): boolean {
  return (
    order.status === 'pending_finance_approval' ||
    order.status === 'finance_discrepancy_review' ||
    order.status === 'pending_shipping' ||
    order.status === 'delivered' ||
    isAwaitingShippingReturn(order)
  );
}

function isReadyForFinalApprovalInProd(order: Order): boolean {
  return (
    order.status === 'in_production' &&
    order.items.length > 0 &&
    order.items.every((item) => item.producedWeight !== null)
  );
}

function isPendingReturnConfirmInProd(order: Order): boolean {
  return (
    isReturnVisibleToProd(order) &&
    !(order.returnRecord?.confirmations.production.confirmed ?? false)
  );
}

function isProdPriority(order: Order): boolean {
  return isPendingReturnConfirmInProd(order) || isReadyForFinalApprovalInProd(order);
}

function getProductionSortRank(order: Order): number {
  if (isPendingReturnConfirmInProd(order)) return 0;
  if (isReadyForFinalApprovalInProd(order)) return 1;
  if (order.status === 'in_production') return 2;
  if (isCompletedInProd(order)) return 3;
  if (order.status === 'returned_to_sales') return 4;
  if (isReturnVisibleToProd(order)) return 5;
  return 6;
}

export const ProductionPage: React.FC<ProductionPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
  onOpenWeight,
}) => {
  const [activeTab, setActiveTab] = useState<ProdTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProdFilter>('all');
  const [selectedPrepV2Product, setSelectedPrepV2Product] = useState<string | null>(null);

  const productionVisibleOrders = useMemo(
    () => orders.filter((o) => o.status !== 'pending_management_approval'),
    [orders]
  );

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = productionVisibleOrders.filter((order) => {
      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'in_progress' && order.status === 'in_production') ||
        (statusFilter === 'completed' && isCompletedInProd(order)) ||
        (statusFilter === 'returned_to_sales' &&
          order.status === 'returned_to_sales') ||
        (statusFilter === 'returned' && isReturnVisibleToProd(order)) ||
        (statusFilter === 'rejected' && order.status === 'rejected');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        order.code.toLowerCase().includes(q) ||
        order.notes.toLowerCase().includes(q) ||
        order.items.some((item) => item.productName.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      const rankDiff = getProductionSortRank(a) - getProductionSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      if (isProdPriority(a) && isProdPriority(b)) {
        return b.lastActionAt - a.lastActionAt;
      }
      return 0;
    });
  }, [productionVisibleOrders, searchQuery, statusFilter]);

  const priorityCount = useMemo(
    () => sortedAndFilteredOrders.filter(isProdPriority).length,
    [sortedAndFilteredOrders]
  );

  const readyForFinalApprovalCount = useMemo(
    () => productionVisibleOrders.filter(isReadyForFinalApprovalInProd).length,
    [productionVisibleOrders]
  );

  const prepSummary = useMemo(
    () => buildPreparationSummary(productionVisibleOrders),
    [productionVisibleOrders]
  );

  const activePrepV2Row = useMemo(() => {
    if (prepSummary.rows.length === 0) return null;
    if (selectedPrepV2Product) {
      const match = prepSummary.rows.find(
        (r) => r.productName === selectedPrepV2Product
      );
      if (match) return match;
    }
    return prepSummary.rows[0];
  }, [prepSummary.rows, selectedPrepV2Product]);

  const completedPrepProductsCount = useMemo(
    () =>
      prepSummary.rows.filter(
        (row) =>
          row.allocations.length > 0 &&
          row.allocations.every((alloc) => alloc.producedWeight !== null)
      ).length,
    [prepSummary.rows]
  );

  const handleOpenPrepWeight = (orderId: string, itemId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const targetItem = targetOrder?.items.find((i) => i.id === itemId);
    if (targetOrder && targetItem) {
      onOpenWeight(targetOrder, targetItem);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Top Header */}
      <header className="no-print flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[14px]">
            بخش تولید
          </h1>
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          title="پرینت تمامی سفارشات"
          className="min-h-[40px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">پرینت تمامی سفارشات</span>
          <span className="sm:hidden">پرینت</span>
        </button>
      </header>

      {/* Internal Tabs (Horizontal scroll on tiny screens, clean underline tabs on desktop) */}
      <div className="no-print flex flex-col gap-3">
        <div className="overflow-x-auto no-scrollbar sm:overflow-visible">
          <div className="inline-flex min-w-full sm:flex items-center gap-1.5 sm:gap-2 p-1 sm:p-0 bg-slate-200/75 sm:bg-transparent rounded-xl sm:rounded-none sm:border-b sm:border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`relative min-h-[42px] sm:min-h-0 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 rounded-lg sm:rounded-none transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-white sm:bg-transparent text-[#0f5864] shadow-xs sm:shadow-none'
                  : 'text-slate-600 sm:text-slate-500 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>لیست سفارشات</span>
              <span className="tabular-nums text-[11px] sm:text-xs font-medium text-slate-400">
                ({productionVisibleOrders.length})
              </span>
              {readyForFinalApprovalCount > 0 && (
                <span className="tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                  {readyForFinalApprovalCount} آماده تایید
                </span>
              )}
              {activeTab === 'orders' && (
                <span className="hidden sm:block absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#0f5864]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('prep')}
              className={`relative min-h-[42px] sm:min-h-0 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 rounded-lg sm:rounded-none transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'prep'
                  ? 'bg-white sm:bg-transparent text-[#0f5864] shadow-xs sm:shadow-none'
                  : 'text-slate-600 sm:text-slate-500 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4 shrink-0" />
              <span>نیاز به آماده‌سازی</span>
              <span className="tabular-nums text-[11px] sm:text-xs font-medium text-slate-400">
                ({prepSummary.rows.length})
              </span>
              {activeTab === 'prep' && (
                <span className="hidden sm:block absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#0f5864]" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Scrollable Filters */}
        {activeTab === 'orders' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو کد سفارش یا نام محصول..."
                className="w-full sm:w-64 h-11 sm:h-9 pr-9 sm:pr-8 pl-3 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl sm:rounded-lg focus:outline-none focus:border-[#0f5864]"
              />
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl sm:rounded-lg">
                {(
                  [
                    { id: 'all', label: 'همه' },
                    { id: 'in_progress', label: 'آماده توزین' },
                    { id: 'completed', label: 'ارسال به فاکتور' },
                    { id: 'returned_to_sales', label: 'برگشت به فروش' },
                    { id: 'returned', label: 'مرجوعی' },
                    { id: 'rejected', label: 'رد شده' },
                  ] as Array<{ id: ProdFilter; label: string }>
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === f.id
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
        )}
      </div>

      {/* Tab 1: Mobile-First Collapsed Order Cards */}
      {activeTab === 'orders' && (
        <div className="flex flex-col gap-3">
          {sortedAndFilteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-medium text-slate-600 mb-3">
                {productionVisibleOrders.length === 0
                  ? 'در این تاریخ هیچ سفارشی برای بخش تولید ثبت یا تایید نشده است.'
                  : 'هیچ سفارشی با فیلتر انتخاب‌شده یافت نشد.'}
              </p>
              {productionVisibleOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
                >
                  نمایش همه سفارش‌ها
                </button>
              )}
            </div>
          ) : (
            sortedAndFilteredOrders.map((order, index) => {
              const completed = isCompletedInProd(order);
              const readyForFinalApproval = isReadyForFinalApprovalInProd(order);
              const returnedToSales = order.status === 'returned_to_sales';
              const rejected = order.status === 'rejected';
              const returned = isReturnVisibleToProd(order);
              const pendingReturnConfirm = isPendingReturnConfirmInProd(order);

              const showOtherDivider =
                priorityCount > 0 && index === priorityCount;

              const cardStyle = pendingReturnConfirm
                ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20'
                : readyForFinalApproval
                  ? 'border-2 border-emerald-500 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/20 hover:bg-emerald-100/75'
                  : returnedToSales
                    ? 'border border-amber-400 bg-amber-50/35'
                    : rejected || returned
                      ? 'border border-red-300 bg-red-50/20'
                      : completed
                        ? 'border border-slate-300 bg-slate-50/70'
                        : 'border border-[#7a9cbf] bg-white hover:border-[#0f5864]';

              return (
                <React.Fragment key={order.id}>
                  {showOtherDivider && (
                    <div className="no-print flex items-center gap-3 pt-1">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        سایر سفارش‌ها
                      </span>
                      <div className="h-px bg-slate-300/80 flex-1" />
                    </div>
                  )}

                  <article
                    className={`order-card-printable ${
                      printingOrderId === order.id ? 'print-target' : ''
                    } rounded-2xl sm:rounded-xl overflow-hidden transition-all ${cardStyle}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className="w-full text-right block active:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                    >
                      {returnedToSales && (
                        <div className="no-print px-4 sm:px-5 py-2 bg-amber-100 text-amber-900 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <Undo2 className="w-3.5 h-3.5 shrink-0" />
                            برگشت‌خورده به کارشناس فروش (در انتظار اصلاح)
                          </span>
                          <span className="text-[11px] font-medium truncate max-w-[260px]">
                            {order.salesReturn?.reason}
                          </span>
                        </div>
                      )}

                      {pendingReturnConfirm && (
                        <div className="no-print px-4 sm:px-5 py-2 bg-red-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            اولویت فوری — سفارش مرجوعی نیازمند تایید تولید
                          </span>
                          <span className="opacity-95 text-[11px]">لمس برای تایید</span>
                        </div>
                      )}

                      {readyForFinalApproval && (
                        <div className="no-print px-4 sm:px-5 py-2 bg-emerald-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            تمامی اقلام تکمیل شد — آماده تایید نهایی و ارسال به صدور فاکتور
                          </span>
                          <span className="opacity-95 text-[11px]">باز کردن و تایید نهایی</span>
                        </div>
                      )}

                      {/* Responsive Card Body (Only Order Code & Delivery Slot) */}
                      <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 sm:gap-x-10 gap-y-2.5 flex-1 items-center text-[13px]">
                          <div>
                            <span
                              className={`block text-[11px] mb-0.5 ${
                                readyForFinalApproval
                                  ? 'text-emerald-800/80'
                                  : 'text-slate-500'
                              }`}
                            >
                              کد سفارش
                            </span>
                            <span
                              className={`tabular-nums text-base font-bold ${
                                rejected || returned
                                  ? 'text-red-700'
                                  : readyForFinalApproval
                                    ? 'text-emerald-900'
                                    : 'text-[#0056b3]'
                              }`}
                            >
                              {order.code}
                            </span>
                          </div>

                          <div>
                            <span
                              className={`block text-[11px] mb-0.5 ${
                                readyForFinalApproval
                                  ? 'text-emerald-800/80'
                                  : 'text-slate-500'
                              }`}
                            >
                              بازه ارسال
                            </span>
                            <span
                              className={`font-semibold inline-flex items-center gap-1 ${
                                readyForFinalApproval
                                  ? 'text-emerald-950'
                                  : 'text-slate-800'
                              }`}
                            >
                              <Clock
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  readyForFinalApproval
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              />
                              {order.deliverySlot}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`no-print pt-2.5 sm:pt-0 border-t sm:border-t-0 flex items-center justify-between sm:justify-end gap-1.5 text-xs font-bold shrink-0 ${
                            readyForFinalApproval
                              ? 'border-emerald-200 text-emerald-800'
                              : 'border-slate-100 text-[#0f5864]'
                          }`}
                        >
                          <span>
                            {readyForFinalApproval
                              ? 'تایید نهایی و ارسال به فاکتور'
                              : 'مشاهده و ثبت وزن'}
                          </span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>
                    </button>

                    {/* Print-only Full Detail Table */}
                    <div className="hidden print:block border-t border-slate-200 bg-white">
                      <div className="px-5 py-2 text-xs text-slate-700 border-b border-slate-200">
                        <strong>توضیحات:</strong> {order.notes}
                      </div>
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="text-right px-5 py-2">نام محصول</th>
                            <th className="text-right px-5 py-2">مقدار درخواستی</th>
                            <th className="text-right px-5 py-2">وزن ثبت‌شده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-5 py-2 font-medium">{item.productName}</td>
                              <td className="tabular-nums px-5 py-2">
                                {formatWeight(item.requestedWeight)}
                              </td>
                              <td className="tabular-nums px-5 py-2">
                                {item.producedWeight !== null
                                  ? formatWeight(item.producedWeight)
                                  : 'ثبت نشده'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Preparation Needs — Per-Product Tabs with Vertical Non-Scrolling List */}
      {activeTab === 'prep' && (
        <div className="flex flex-col gap-3.5 w-full">
          {prepSummary.rows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              تمامی سفارش‌های صف تولید تکمیل یا تعیین‌تکلیف شده‌اند؛ موردی برای آماده‌سازی باقی نمانده است.
            </div>
          ) : (
            <>
              {/* Summary line */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  برای ثبت وزن، محصول مورد نظر را انتخاب کنید؛ سفارش‌ها به ترتیب زمان ثبت فاکتور زیر هم نمایش داده می‌شوند.
                </span>
                <span className="tabular-nums font-semibold text-slate-700">
                  {completedPrepProductsCount} از {prepSummary.rows.length} محصول تکمیل شده
                </span>
              </div>

              {/* Wrapping Product Tabs — No Horizontal Scroll */}
              <div
                role="tablist"
                aria-label="تب محصولات نیاز به آماده‌سازی"
                className="flex flex-wrap items-center gap-2"
              >
                {prepSummary.rows.map((row) => {
                  const totalCount = row.allocations.length;
                  const weighedCount = row.allocations.filter(
                    (a) => a.producedWeight !== null
                  ).length;
                  const isComplete = totalCount > 0 && weighedCount === totalCount;
                  const isSelected = activePrepV2Row?.productName === row.productName;

                  const tabStyle = isComplete
                    ? isSelected
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100/80'
                    : isSelected
                      ? 'bg-[#0f5864] border-[#0f5864] text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-[#0f5864]/60 hover:bg-slate-50';

                  return (
                    <button
                      key={row.productName}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedPrepV2Product(row.productName)}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] focus-visible:ring-offset-1 ${tabStyle}`}
                    >
                      {isComplete && (
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-emerald-600'
                          }`}
                        />
                      )}
                      <span>{row.productName}</span>
                      <span
                        className={`tabular-nums text-[11px] font-semibold ${
                          isSelected
                            ? 'text-white/85'
                            : isComplete
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                        }`}
                      >
                        ({weighedCount}/{totalCount})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Product Panel — Vertical Stacked List (Zero Horizontal Scroll) */}
              {activePrepV2Row && (() => {
                const totalCount = activePrepV2Row.allocations.length;
                const weighedCount = activePrepV2Row.allocations.filter(
                  (a) => a.producedWeight !== null
                ).length;
                const isActiveProductComplete =
                  totalCount > 0 && weighedCount === totalCount;

                return (
                  <section
                    role="tabpanel"
                    aria-label={`اقلام ${activePrepV2Row.productName}`}
                    className={`bg-white rounded-xl border overflow-hidden transition-colors ${
                      isActiveProductComplete
                        ? 'border-emerald-400'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Active Product Header */}
                    <div
                      className={`px-4 sm:px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isActiveProductComplete
                          ? 'bg-emerald-50/80 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {isActiveProductComplete && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        <h2
                          className={`text-sm sm:text-base font-bold ${
                            isActiveProductComplete
                              ? 'text-emerald-950'
                              : 'text-slate-900'
                          }`}
                        >
                          {activePrepV2Row.productName}
                        </h2>
                        <span
                          className={`text-xs font-medium ${
                            isActiveProductComplete
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {isActiveProductComplete
                            ? '· تمام وزن‌های این محصول ثبت شد'
                            : `· ${weighedCount} از ${totalCount} سفارش توزین شده`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                        <span className="text-slate-600">
                          مجموع درخواستی:{' '}
                          <strong className="text-slate-900">
                            {activePrepV2Row.totalRequestedWeight} kg
                          </strong>
                        </span>
                        {activePrepV2Row.totalProducedWeight > 0 && (
                          <span className="text-emerald-800">
                            مجموع ثبت‌شده:{' '}
                            <strong>{activePrepV2Row.totalProducedWeight} kg</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desktop/Tablet Column Header */}
                    <div className="hidden sm:grid grid-cols-[44px_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_124px] items-center gap-3 px-5 py-2.5 bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-[#0f5864]">
                      <span className="text-center">#</span>
                      <span>وزن درخواستی / ثبت‌شده</span>
                      <span>بازه ارسال</span>
                      <span>کد سفارش</span>
                      <span className="text-left">توزین</span>
                    </div>

                    {/* Stacked Vertical Allocation Rows */}
                    <div className="divide-y divide-slate-200">
                      {activePrepV2Row.allocations.map((alloc, rowIdx) => {
                        const isWeighed = alloc.producedWeight !== null;
                        const orderTimeOnly = alloc.createdAt.includes(' - ')
                          ? alloc.createdAt.split(' - ')[1]
                          : alloc.createdAt;
                        const openAllocWeight = () =>
                          handleOpenPrepWeight(alloc.orderId, alloc.itemId);

                        return (
                          <button
                            key={`${alloc.orderId}-${alloc.itemId}`}
                            type="button"
                            onClick={openAllocWeight}
                            title={`برای ثبت وزن کلیک کنید · زمان ثبت فاکتور: ${alloc.createdAt}`}
                            className={`w-full text-right block px-4 sm:px-5 py-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864] ${
                              isWeighed
                                ? 'bg-emerald-50/45 hover:bg-emerald-50/85'
                                : 'bg-white hover:bg-sky-50/60'
                            }`}
                          >
                            {/* Desktop / Tablet Row */}
                            <div className="hidden sm:grid grid-cols-[44px_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_124px] items-center gap-3 text-[13px]">
                              <span className="tabular-nums text-center text-xs font-bold text-slate-500">
                                {rowIdx + 1}
                              </span>

                              <div className="tabular-nums min-w-0">
                                <span className="font-bold text-slate-900">
                                  {alloc.requestedWeight} kg
                                </span>
                                {isWeighed && (
                                  <span className="block text-xs font-bold text-emerald-700 mt-0.5">
                                    ثبت‌شده: {alloc.producedWeight} kg
                                  </span>
                                )}
                              </div>

                              <div className="inline-flex items-center gap-1.5 text-slate-700 font-medium min-w-0">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{alloc.deliverySlot}</span>
                              </div>

                              <div className="min-w-0">
                                <span className="tabular-nums text-[#0056b3] font-bold inline-flex items-center gap-2">
                                  <span>{alloc.orderCode}</span>
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {orderTimeOnly}
                                  </span>
                                </span>
                              </div>

                              <div className="flex justify-end">
                                <span
                                  className={`no-print min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                                    isWeighed
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#0f5864] text-white'
                                  }`}
                                >
                                  {isWeighed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                      ثبت شد
                                    </>
                                  ) : (
                                    'ثبت وزن'
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Mobile Compact Stacked Row (Zero Horizontal Scroll) */}
                            <div className="sm:hidden flex flex-col gap-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="tabular-nums text-xs font-bold text-slate-400 shrink-0">
                                    {rowIdx + 1}.
                                  </span>
                                  <div className="tabular-nums min-w-0">
                                    <span className="text-sm font-bold text-slate-900">
                                      {alloc.requestedWeight} kg
                                    </span>
                                    {isWeighed && (
                                      <span className="block text-xs font-bold text-emerald-700">
                                        ثبت‌شده: {alloc.producedWeight} kg
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`no-print min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                                    isWeighed
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#0f5864] text-white'
                                  }`}
                                >
                                  {isWeighed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                      ثبت شد
                                    </>
                                  ) : (
                                    'ثبت وزن'
                                  )}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pr-5">
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  بازه: {alloc.deliverySlot}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="tabular-nums text-[#0056b3] font-bold inline-flex items-center gap-1">
                                  <span>کد {alloc.orderCode}</span>
                                  <span className="text-[11px] font-normal text-slate-400">
                                    ({orderTimeOnly})
                                  </span>
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
};
