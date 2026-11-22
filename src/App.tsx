/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { DailyCalendarBar, DayBadgeMetrics } from './components/DailyCalendarBar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { DriverOrderModal } from './components/modals/DriverOrderModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import {
  DeliveryModal,
  DiscrepancyModal,
  RejectModal,
  ResetConfirmModal,
  ReturnModal,
  WeightModal,
} from './components/modals/OrderModals';
import { DriverPage } from './components/pages/DriverPage';
import { FinancePage } from './components/pages/FinancePage';
import { ProductionPage } from './components/pages/ProductionPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { ShippingPage } from './components/pages/ShippingPage';
import { useOrderStore } from './hooks/useOrderStore';
import { Department, Order, OrderItem, WorkflowDepartment } from './types/order';
import {
  DEFAULT_SELECTED_DATE_KEY,
  getWeekDays,
} from './utils/jalaliCalendar';

export default function App() {
  const {
    orders,
    unreadByDept,
    toasts,
    dismissToast,
    pushToast,
    flushDeptNotifications,
    markDateSeenByDept,
    approveProductionOrder,
    recordItemWeight,
    completeProduction,
    approveFinance,
    setOrderDriver,
    submitDiscrepancy,
    submitDelivery,
    submitReturn,
    confirmReturnByDepartment,
    rejectOrder,
    reorderDriverOrders,
    uploadDriverDocument,
    removeDriverDocument,
    completeDriverDelivery,
    verifyDriverDocumentsInFinance,
    resetDemoData,
  } = useOrderStore();

  const [activePage, setActivePage] = useState<Department>('production');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    DEFAULT_SELECTED_DATE_KEY
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  // Action Sub-Modal states
  const [weightTarget, setWeightTarget] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    order: Order;
    source: WorkflowDepartment;
  } | null>(null);
  const [discrepancyOrder, setDiscrepancyOrder] = useState<Order | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const activeWorkflowDept: WorkflowDepartment | null =
    activePage === 'production' ||
    activePage === 'finance' ||
    activePage === 'shipping'
      ? activePage
      : null;

  // Mark selected day as seen when switching departments onto a day with unseen orders
  useEffect(() => {
    if (activeWorkflowDept) {
      markDateSeenByDept(selectedDateKey, activeWorkflowDept);
    }
  }, [activeWorkflowDept, selectedDateKey, markDateSeenByDept]);

  // Compute daily order counts & unseen counts for the calendar bar
  const metricsByDate = useMemo<Record<string, DayBadgeMetrics>>(() => {
    const map: Record<string, DayBadgeMetrics> = {};
    const deptForSeen: WorkflowDepartment = activeWorkflowDept ?? 'production';

    for (const order of orders) {
      const key = order.deliveryDate;
      if (!map[key]) {
        map[key] = { totalCount: 0, unseenCount: 0 };
      }
      map[key].totalCount += 1;
      if (!order.seenByDept[deptForSeen]) {
        map[key].unseenCount += 1;
      }
    }
    return map;
  }, [orders, activeWorkflowDept]);

  // Orders belonging to the selected calendar date
  const dayOrders = useMemo(
    () => orders.filter((order) => order.deliveryDate === selectedDateKey),
    [orders, selectedDateKey]
  );

  const selectedOrder =
    selectedOrderId !== null
      ? orders.find((o) => o.id === selectedOrderId) ?? null
      : null;

  const selectedDriverStopNumber = useMemo(() => {
    if (!selectedOrder || activePage !== 'driver') return 1;
    const sorted = dayOrders
      .filter((o) => o.status !== 'rejected')
      .slice()
      .sort((a, b) => a.routeOrder - b.routeOrder);
    const idx = sorted.findIndex((o) => o.id === selectedOrder.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [selectedOrder, activePage, dayOrders]);

  const hasSubModalOpen =
    weightTarget !== null ||
    rejectTarget !== null ||
    discrepancyOrder !== null ||
    deliveryOrder !== null ||
    returnOrder !== null ||
    resetOpen;

  const handleSelectPage = (page: Department) => {
    setSelectedOrderId(null);
    setActivePage(page);
    if (page === 'production' || page === 'finance' || page === 'shipping') {
      flushDeptNotifications(page);
    }
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedOrderId(null);
    setSelectedDateKey(dateKey);
    if (activeWorkflowDept) {
      markDateSeenByDept(dateKey, activeWorkflowDept);
    }
  };

  const handlePrintAll = () => {
    setPrintingOrderId(null);
    document.body.classList.remove('printing-single');
    window.setTimeout(() => window.print(), 50);
  };

  const handlePrintSingle = (orderId: string) => {
    setPrintingOrderId(orderId);
    document.body.classList.add('printing-single');
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.body.classList.remove('printing-single');
        setPrintingOrderId(null);
      }, 300);
    }, 60);
  };

  const handleCallCustomer = (order: Order) => {
    if (navigator.clipboard && order.customerPhone) {
      navigator.clipboard.writeText(order.customerPhone).catch(() => {});
    }
    pushToast(
      `تماس با مشتری — سفارش ${order.code}`,
      `شماره تماس مشتری (${order.customerPhone}) کپی شد و آماده شماره‌گیری است.`,
      order.district,
      'info'
    );
  };

  const handleDriverMissingWarning = (orderCode: string) => {
    pushToast(
      'انتخاب راننده الزامی است',
      `برای ثبت تحویل سفارش ${orderCode}، لطفاً ابتدا راننده را از فهرست انتخاب کنید.`,
      'بخش ارسال',
      'warning'
    );
  };

  const unreadCounts: Record<WorkflowDepartment, number> = {
    production: unreadByDept.production.length,
    finance: unreadByDept.finance.length,
    shipping: unreadByDept.shipping.length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f4f7] text-slate-900">
      <Sidebar
        activePage={activePage}
        onSelectPage={handleSelectPage}
        unreadCounts={unreadCounts}
        onRequestReset={() => setResetOpen(true)}
      />

      <main className="print-container flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="max-w-[1380px] mx-auto w-full flex flex-col gap-4">
          {/* Top Weekly Daily Calendar Bar */}
          <DailyCalendarBar
            days={weekDays}
            selectedDateKey={selectedDateKey}
            metricsByDate={metricsByDate}
            onSelectDate={handleSelectDate}
            onPrevWeek={() => setWeekOffset((w) => w - 1)}
            onNextWeek={() => setWeekOffset((w) => w + 1)}
          />

          {activePage === 'production' && (
            <ProductionPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'finance' && (
            <FinancePage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'shipping' && (
            <ShippingPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'driver' && (
            <DriverPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
              onReorderOrders={reorderDriverOrders}
              onCallCustomer={handleCallCustomer}
              onSortByDistrictToast={() =>
                pushToast(
                  'اولویت‌بندی بر اساس محدوده انجام شد',
                  'سفارش‌های مسیر روز بر اساس محدوده جغرافیایی مرتب شدند.',
                  'پنل رانندگان',
                  'info'
                )
              }
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage orders={dayOrders} onPrintAll={handlePrintAll} />
          )}
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Order Detail & Action Popup Modal (Production / Finance / Shipping) */}
      {activeWorkflowDept && (
        <OrderDetailModal
          order={selectedOrder}
          department={activeWorkflowDept}
          disableEscape={hasSubModalOpen}
          onClose={() => setSelectedOrderId(null)}
          onPrintSingle={handlePrintSingle}
          onApproveProduction={approveProductionOrder}
          onOpenWeight={(order, item) => setWeightTarget({ order, item })}
          onCompleteProduction={completeProduction}
          onApproveFinance={approveFinance}
          onVerifyDriverDocuments={verifyDriverDocumentsInFinance}
          onCallCustomer={handleCallCustomer}
          onSelectDriver={setOrderDriver}
          onOpenDiscrepancy={(order) => setDiscrepancyOrder(order)}
          onOpenDelivery={(order) => setDeliveryOrder(order)}
          onOpenReturn={(order) => setReturnOrder(order)}
          onDriverMissingWarning={handleDriverMissingWarning}
          onOpenReject={(order, source) => setRejectTarget({ order, source })}
          onConfirmReturn={confirmReturnByDepartment}
        />
      )}

      {/* Driver Panel Order Action Popup Modal */}
      {activePage === 'driver' && (
        <DriverOrderModal
          order={selectedOrder}
          stopNumber={selectedDriverStopNumber}
          onClose={() => setSelectedOrderId(null)}
          onCallCustomer={handleCallCustomer}
          onUploadDocument={uploadDriverDocument}
          onRemoveDocument={removeDriverDocument}
          onCompleteDelivery={completeDriverDelivery}
        />
      )}

      {/* Action Sub-Modals */}
      <WeightModal
        open={weightTarget !== null}
        item={weightTarget?.item ?? null}
        orderCode={weightTarget?.order.code ?? ''}
        onClose={() => setWeightTarget(null)}
        onSubmit={(weight) => {
          if (weightTarget) {
            recordItemWeight(weightTarget.order.id, weightTarget.item.id, weight);
          }
        }}
      />

      <RejectModal
        open={rejectTarget !== null}
        source={rejectTarget?.source ?? 'production'}
        orderCode={rejectTarget?.order.code ?? ''}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason) => {
          if (rejectTarget) {
            rejectOrder(rejectTarget.order.id, rejectTarget.source, reason);
          }
        }}
      />

      <DiscrepancyModal
        open={discrepancyOrder !== null}
        order={discrepancyOrder}
        onClose={() => setDiscrepancyOrder(null)}
        onSubmit={(weights, note) => {
          if (discrepancyOrder) {
            submitDiscrepancy(discrepancyOrder.id, weights, note);
          }
        }}
      />

      <DeliveryModal
        open={deliveryOrder !== null}
        order={deliveryOrder}
        onClose={() => setDeliveryOrder(null)}
        onSubmit={(weights) => {
          if (deliveryOrder) {
            submitDelivery(deliveryOrder.id, weights);
          }
        }}
      />

      <ReturnModal
        open={returnOrder !== null}
        order={returnOrder}
        onClose={() => setReturnOrder(null)}
        onSubmit={(returnedWeights, notes) => {
          if (returnOrder) {
            submitReturn(returnOrder.id, returnedWeights, notes);
          }
        }}
      />

      <ResetConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setSelectedOrderId(null);
          setWeekOffset(0);
          setSelectedDateKey(DEFAULT_SELECTED_DATE_KEY);
          resetDemoData();
        }}
      />
    </div>
  );
}
