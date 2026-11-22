import React, { useMemo } from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { Order, OrderStatus } from '../../types/order';
import {
  calculateOrderTotal,
  formatNumber,
  formatRial,
  formatWeight,
  getFinanceWeight,
  getStatusLabel,
} from '../../utils/formatters';

interface ReportsPageProps {
  orders: Order[];
  onPrintAll: () => void;
}

const STAGE_ORDER: Array<{ status: OrderStatus; color: string }> = [
  { status: 'pending_production_approval', color: 'bg-slate-400' },
  { status: 'in_production', color: 'bg-sky-500' },
  { status: 'pending_finance_approval', color: 'bg-indigo-500' },
  { status: 'finance_discrepancy_review', color: 'bg-amber-500' },
  { status: 'pending_shipping', color: 'bg-[#0f5864]' },
  { status: 'delivered', color: 'bg-emerald-600' },
  { status: 'returned', color: 'bg-orange-600' },
  { status: 'rejected', color: 'bg-red-600' },
];

export const ReportsPage: React.FC<ReportsPageProps> = ({ orders, onPrintAll }) => {
  const stats = useMemo(() => {
    let totalRequestedKg = 0;
    let totalDeliveredOrProducedKg = 0;
    let totalReturnedKg = 0;
    let approvedRevenue = 0;
    let totalPipelineRevenue = 0;
    let discrepancyCount = 0;
    let rejectedCount = 0;
    let deliveredCount = 0;

    const statusCounts: Record<OrderStatus, number> = {
      pending_production_approval: 0,
      in_production: 0,
      pending_finance_approval: 0,
      finance_discrepancy_review: 0,
      pending_shipping: 0,
      delivered: 0,
      returned: 0,
      rejected: 0,
    };

    for (const order of orders) {
      statusCounts[order.status] += 1;
      if (order.discrepancy) discrepancyCount += 1;
      if (order.status === 'rejected') rejectedCount += 1;
      if (order.status === 'delivered' || order.status === 'returned') deliveredCount += 1;

      const orderValue = calculateOrderTotal(order);
      if (order.status !== 'rejected') {
        totalPipelineRevenue += orderValue;
      }
      if (
        order.status === 'pending_shipping' ||
        order.status === 'delivered' ||
        order.status === 'returned'
      ) {
        approvedRevenue += orderValue;
      }

      for (const item of order.items) {
        totalRequestedKg += item.requestedWeight;
        totalDeliveredOrProducedKg +=
          item.deliveredWeight ?? item.revisedWeight ?? item.producedWeight ?? 0;
        totalReturnedKg += item.returnedWeight;
      }
    }

    return {
      totalOrders: orders.length,
      totalRequestedKg,
      totalDeliveredOrProducedKg,
      totalReturnedKg,
      approvedRevenue,
      totalPipelineRevenue,
      discrepancyCount,
      rejectedCount,
      deliveredCount,
      statusCounts,
    };
  }, [orders]);

  return (
    <div className="flex flex-col gap-5 w-full">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>داشبورد مدیریت</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800">گزارش‌ها و آمار زنده</span>
        </div>

        <button
          type="button"
          onClick={onPrintAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          پرینت گزارش
        </button>
      </header>

      {/* KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1.5">کل سفارش‌های ثبت‌شده</div>
          <div className="tabular-nums text-2xl font-bold text-slate-900">
            {formatNumber(stats.totalOrders)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            تحویل‌شده: {formatNumber(stats.deliveredCount)} · ردشده: {formatNumber(stats.rejectedCount)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1.5">وزن کل درخواستی / توزین‌شده</div>
          <div className="tabular-nums text-2xl font-bold text-[#0f5864]">
            {formatWeight(stats.totalRequestedKg)}
          </div>
          <div className="tabular-nums text-xs text-slate-500 mt-1.5">
            توزین‌شده تا این لحظه: {formatWeight(stats.totalDeliveredOrProducedKg)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1.5">ارزش فاکتورهای صادرشده</div>
          <div className="tabular-nums text-xl font-bold text-emerald-700 leading-8">
            {formatRial(stats.approvedRevenue)}
          </div>
          <div className="tabular-nums text-xs text-slate-500 mt-1.5">
            کل جریان فعال: {formatRial(stats.totalPipelineRevenue)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1.5">مغایرت وزن و مرجوعی</div>
          <div className="tabular-nums text-2xl font-bold text-amber-700">
            {formatNumber(stats.discrepancyCount)} مغایرت
          </div>
          <div className="tabular-nums text-xs text-red-700 mt-1.5">
            جمع وزن مرجوعی: {formatWeight(stats.totalReturnedKg)}
          </div>
        </div>
      </section>

      {/* Workflow Stage Distribution */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4">توزیع وضعیت سفارش‌ها در چرخه عملیات</h2>

        <div className="w-full h-3 rounded-md overflow-hidden bg-slate-100 flex mb-4">
          {STAGE_ORDER.map(({ status, color }) => {
            const count = stats.statusCounts[status];
            if (count === 0 || stats.totalOrders === 0) return null;
            const pct = (count / stats.totalOrders) * 100;
            return (
              <div
                key={status}
                style={{ width: `${pct}%` }}
                title={`${getStatusLabel(status)}: ${count}`}
                className={`${color} h-full transition-all duration-300`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {STAGE_ORDER.map(({ status, color }) => (
            <div
              key={status}
              className="flex items-center justify-between border-b border-slate-100 pb-2"
            >
              <span className="text-slate-600 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${color}`} />
                {getStatusLabel(status)}
              </span>
              <span className="tabular-nums font-bold text-slate-900">
                {formatNumber(stats.statusCounts[status])}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Full Audit Summary Table */}
      <section className="bg-white border border-[#7a9cbf] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">جدول جامع رهگیری سفارش‌ها</h2>
          <span className="tabular-nums text-xs text-slate-500">
            {formatNumber(orders.length)} رکورد
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500">
                <th className="text-right font-normal px-4 py-3">کد</th>
                <th className="text-right font-normal px-4 py-3">طرف حساب</th>
                <th className="text-right font-normal px-4 py-3">وضعیت فعلی</th>
                <th className="text-right font-normal px-4 py-3">وزن درخواستی</th>
                <th className="text-right font-normal px-4 py-3">وزن مؤثر</th>
                <th className="text-right font-normal px-4 py-3">مبلغ فاکتور</th>
                <th className="text-right font-normal px-4 py-3">راننده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const reqTotal = order.items.reduce((s, i) => s + i.requestedWeight, 0);
                const effTotal = order.items.reduce((s, i) => s + getFinanceWeight(i), 0);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="tabular-nums px-4 py-3 font-bold text-[#0056b3]">
                      {order.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {getStatusLabel(order.status)}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-slate-600">
                      {formatWeight(reqTotal)}
                    </td>
                    <td className="tabular-nums px-4 py-3 font-medium text-slate-900">
                      {formatWeight(effTotal)}
                    </td>
                    <td className="tabular-nums px-4 py-3 font-semibold text-[#0f5864]">
                      {formatRial(calculateOrderTotal(order))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.driverName || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
