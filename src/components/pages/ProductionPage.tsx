import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Boxes,
  ChevronLeft,
  ClipboardList,
  Package,
  Printer,
  RotateCcw,
  Search,
  Zap,
} from 'lucide-react';
import { DEPARTMENT_LABELS } from '../../data/initialOrders';
import { Order } from '../../types/order';
import {
  buildPreparationSummary,
  formatWeight,
} from '../../utils/formatters';

interface ProductionPageProps {
  orders: Order[];
  printingOrderId: string | null;
  onPrintAll: () => void;
  onSelectOrder: (orderId: string) => void;
}

type ProdTab = 'orders' | 'prep';
type ProdFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'returned' | 'rejected';

function isCompletedInProd(order: Order): boolean {
  return (
    order.status === 'pending_finance_approval' ||
    order.status === 'finance_discrepancy_review' ||
    order.status === 'pending_shipping' ||
    order.status === 'delivered'
  );
}

function isPendingReturnConfirmInProd(order: Order): boolean {
  return (
    order.status === 'returned' &&
    !(order.returnRecord?.confirmations.production.confirmed ?? false)
  );
}

function isProdPriority(order: Order): boolean {
  return isPendingReturnConfirmInProd(order) || order.status === 'in_production';
}

function getProductionSortRank(order: Order): number {
  if (isPendingReturnConfirmInProd(order)) return 0;
  if (order.status === 'in_production') return 1;
  if (order.status === 'pending_production_approval') return 2;
  if (isCompletedInProd(order)) return 3;
  if (order.status === 'returned') return 4;
  return 5;
}

function getProductionStatusDisplay(order: Order): { label: string; className: string } {
  if (order.status === 'rejected') {
    const src = order.rejection ? DEPARTMENT_LABELS[order.rejection.source] : '';
    return { label: `رد شده (${src})`, className: 'text-red-700' };
  }
  if (order.status === 'returned') {
    const confirmed = order.returnRecord?.confirmations.production.confirmed;
    return confirmed
      ? { label: 'مرجوعی تایید شده', className: 'text-emerald-700' }
      : { label: 'مرجوع شده — نیازمند تایید تولید', className: 'text-red-700' };
  }
  if (order.status === 'in_production') {
    const weighed = order.items.filter((i) => i.producedWeight !== null).length;
    return {
      label: `در حال توزین (${weighed} از ${order.items.length})`,
      className: 'text-[#0f5864]',
    };
  }
  if (isCompletedInProd(order)) {
    return { label: 'تولید تکمیل و ارسال به صدور فاکتور', className: 'text-emerald-700' };
  }
  return { label: 'در انتظار تایید تولید', className: 'text-slate-600' };
}

export const ProductionPage: React.FC<ProductionPageProps> = ({
  orders,
  printingOrderId,
  onPrintAll,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<ProdTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProdFilter>('all');

  const sortedAndFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && order.status === 'pending_production_approval') ||
        (statusFilter === 'in_progress' && order.status === 'in_production') ||
        (statusFilter === 'completed' && isCompletedInProd(order)) ||
        (statusFilter === 'returned' && order.status === 'returned') ||
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
  }, [orders, searchQuery, statusFilter]);

  const priorityCount = useMemo(
    () => sortedAndFilteredOrders.filter(isProdPriority).length,
    [sortedAndFilteredOrders]
  );

  const prepSummary = useMemo(() => buildPreparationSummary(orders), [orders]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>داشبورد مدیریت</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800">بخش تولید</span>
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4" />
          پرینت تمامی سفارشات
        </button>
      </header>

      {/* Internal Tabs */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`relative px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'text-[#0f5864]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>لیست سفارشات</span>
            <span className="tabular-nums text-xs font-medium text-slate-400">
              ({orders.length})
            </span>
            {activeTab === 'orders' && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#0f5864]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prep')}
            className={`relative px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'prep'
                ? 'text-[#0f5864]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>نیاز به آماده سازی</span>
            <span className="tabular-nums text-xs font-medium text-slate-400">
              ({prepSummary.rows.length})
            </span>
            {activeTab === 'prep' && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#0f5864]" />
            )}
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو کد سفارش یا محصول..."
                className="w-56 pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f5864]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  { id: 'all', label: 'همه' },
                  { id: 'in_progress', label: 'در حال توزین' },
                  { id: 'pending', label: 'در انتظار تایید' },
                  { id: 'completed', label: 'ارسال به صدور فاکتور' },
                  { id: 'returned', label: 'مرجوعی' },
                  { id: 'rejected', label: 'رد شده' },
                ] as Array<{ id: ProdFilter; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
        )}
      </div>

      {/* Tab 1: Collapsed Order Cards (Click to open popup) */}
      {activeTab === 'orders' && (
        <div className="flex flex-col gap-3">
          {sortedAndFilteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
              <p className="text-sm font-medium text-slate-600 mb-3">
                {orders.length === 0
                  ? 'در این تاریخ هیچ سفارشی ثبت نشده است.'
                  : 'هیچ سفارشی با فیلتر انتخاب‌شده یافت نشد.'}
              </p>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#0f5864] bg-white border border-[#0f5864] rounded-lg hover:bg-[#0f5864] hover:text-white transition-colors"
                >
                  نمایش همه سفارش‌ها
                </button>
              )}
            </div>
          ) : (
            sortedAndFilteredOrders.map((order, index) => {
              const completed = isCompletedInProd(order);
              const rejected = order.status === 'rejected';
              const returned = order.status === 'returned';
              const pendingReturnConfirm = isPendingReturnConfirmInProd(order);
              const inProduction = order.status === 'in_production';
              const weighedCount = order.items.filter((i) => i.producedWeight !== null).length;
              const totalReqKg = order.items.reduce((s, i) => s + i.requestedWeight, 0);
              const statusDisplay = getProductionStatusDisplay(order);

              const showOtherDivider = priorityCount > 0 && index === priorityCount;

              const cardStyle = pendingReturnConfirm
                ? 'border-2 border-red-500 bg-white shadow-md ring-2 ring-red-500/20 hover:bg-red-50/30'
                : rejected || returned
                  ? 'border border-red-300 bg-red-50/20 hover:border-red-400'
                  : inProduction
                    ? 'border-2 border-[#0f5864] bg-white shadow-md ring-2 ring-[#0f5864]/15 hover:bg-[#f4fafa]'
                    : completed
                      ? 'border border-emerald-400 bg-emerald-50/25 hover:border-emerald-500'
                      : 'border border-[#7a9cbf] bg-white hover:border-[#0f5864] hover:shadow-xs';

              return (
                <React.Fragment key={order.id}>
                  {showOtherDivider && (
                    <div className="no-print flex items-center gap-3 pt-2">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        سایر سفارش‌ها
                      </span>
                      <div className="h-px bg-slate-300/80 flex-1" />
                    </div>
                  )}

                  <article
                    className={`order-card-printable ${
                      printingOrderId === order.id ? 'print-target' : ''
                    } rounded-lg overflow-hidden transition-all ${cardStyle}`}
                  >
                    {/* Clickable Collapsed Summary Surface */}
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className="w-full text-right block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                    >
                      {pendingReturnConfirm && (
                        <div className="no-print px-5 py-1.5 bg-red-600 text-white flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            اولویت فوری — سفارش مرجوع شده و نیازمند تایید مرجوعی در تولید
                          </span>
                          <span className="opacity-95 text-[11px]">کلیک برای اقدام</span>
                        </div>
                      )}

                      {inProduction && (
                        <div className="no-print px-5 py-1.5 bg-[#0f5864] text-white flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="inline-flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 shrink-0" />
                            در پروسه اقدام تولید — اولویت ثبت وزن اقلام
                          </span>
                          <span className="tabular-nums opacity-95 text-[11px]">
                            توزین: {weighedCount} از {order.items.length} قلم
                          </span>
                        </div>
                      )}

                      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 flex-1 items-center text-[13px]">
                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">کد سفارش</span>
                            <span
                              className={`tabular-nums text-[15px] font-bold ${
                                rejected || returned ? 'text-red-700' : 'text-[#0056b3]'
                              }`}
                            >
                              {order.code}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">بازه ارسال</span>
                            <span className="font-semibold text-slate-800">{order.deliverySlot}</span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">اقلام و وزن کل</span>
                            <span className="tabular-nums font-medium text-slate-700 inline-flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {order.items.length} قلم · {formatWeight(totalReqKg)}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[11px] text-slate-500 mb-0.5">وضعیت</span>
                            <span className={`font-bold text-xs ${statusDisplay.className}`}>
                              {statusDisplay.label}
                            </span>
                          </div>
                        </div>

                        <div className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f5864] shrink-0">
                          <span>مشاهده و اقدام</span>
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

      {/* Tab 2: Horizontally Scrollable Preparation Needs Matrix */}
      {activeTab === 'prep' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p className="inline-flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#0f5864] shrink-0" />
              برای مشاهده تمام ستون‌های سفارش‌ها، جدول را به صورت افقی اسکرول کنید (ستون نام محصول و مجموع ثابت می‌مانند).
            </p>
            <span className="tabular-nums font-semibold text-[#0f5864]">
              {prepSummary.rows.length} محصول · حداکثر {prepSummary.maxColumns} سفارش هم‌زمان
            </span>
          </div>

          <div className="bg-white border border-[#7a9cbf] rounded-lg overflow-x-auto shadow-xs">
            {prepSummary.rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                تمامی سفارش‌های صف تولید تکمیل یا تعیین‌تکلیف شده‌اند؛ موردی برای آماده‌سازی باقی نمانده است.
              </div>
            ) : (
              <table className="w-max min-w-full border-collapse text-[13px] text-center">
                <thead>
                  <tr className="bg-slate-50 text-[#0f5864] border-b border-slate-200">
                    <th className="sticky right-0 z-20 bg-slate-50 text-right font-bold px-5 py-3.5 border-l-2 border-slate-200 whitespace-nowrap min-w-[180px]">
                      نام محصول
                    </th>
                    {Array.from({ length: prepSummary.maxColumns }).map((_, colIdx) => (
                      <React.Fragment key={colIdx}>
                        <th className="font-bold px-4 py-3.5 border-l border-slate-100 whitespace-nowrap min-w-[88px]">
                          وزن {colIdx + 1}
                        </th>
                        <th className="font-bold px-4 py-3.5 border-l border-slate-100 whitespace-nowrap min-w-[96px]">
                          بازه {colIdx + 1}
                        </th>
                        <th className="font-bold px-4 py-3.5 border-l-2 border-slate-200 whitespace-nowrap min-w-[96px]">
                          کد {colIdx + 1}
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="sticky left-0 z-20 font-bold px-5 py-3.5 bg-emerald-50 text-emerald-800 border-r-2 border-emerald-200 whitespace-nowrap min-w-[110px]">
                      مجموع (kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prepSummary.rows.map((row) => (
                    <tr key={row.productName} className="group hover:bg-slate-50/90 transition-colors">
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 text-right font-bold px-5 py-3.5 border-l-2 border-slate-200 text-slate-900 whitespace-nowrap">
                        {row.productName}
                      </td>
                      {Array.from({ length: prepSummary.maxColumns }).map((_, colIdx) => {
                        const alloc = row.allocations[colIdx];
                        if (!alloc) {
                          return (
                            <React.Fragment key={colIdx}>
                              <td className="px-4 py-3.5 border-l border-slate-100 text-slate-300">—</td>
                              <td className="px-4 py-3.5 border-l border-slate-100 text-slate-300">—</td>
                              <td className="px-4 py-3.5 border-l-2 border-slate-200 text-slate-300">—</td>
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={alloc.orderId}>
                            <td className="tabular-nums px-4 py-3.5 border-l border-slate-100 font-semibold text-slate-800 whitespace-nowrap">
                              {alloc.requestedWeight} kg
                              {alloc.producedWeight !== null && (
                                <span className="block text-[11px] font-normal text-emerald-700">
                                  توزین: {alloc.producedWeight}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 border-l border-slate-100 text-slate-600 whitespace-nowrap">
                              {alloc.deliverySlot}
                            </td>
                            <td className="tabular-nums px-4 py-3.5 border-l-2 border-slate-200 font-bold text-[#0056b3] whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onSelectOrder(alloc.orderId)}
                                className="hover:underline text-[#0056b3] font-bold"
                              >
                                {alloc.orderCode}
                              </button>
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="sticky left-0 z-10 tabular-nums px-5 py-3.5 bg-emerald-50 text-emerald-800 border-r-2 border-emerald-200 font-bold whitespace-nowrap">
                        {row.totalRequestedWeight} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
