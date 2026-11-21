/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import {
  DeliveryModal,
  DiscrepancyModal,
  RejectModal,
  ResetConfirmModal,
  ReturnModal,
  WeightModal,
} from './components/modals/OrderModals';
import { FinancePage } from './components/pages/FinancePage';
import { ProductionPage } from './components/pages/ProductionPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { ShippingPage } from './components/pages/ShippingPage';
import { useOrderStore } from './hooks/useOrderStore';
import { Department, Order, OrderItem, WorkflowDepartment } from './types/order';

export default function App() {
  const {
    orders,
    unreadByDept,
    toasts,
    dismissToast,
    pushToast,
    flushDeptNotifications,
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
    resetDemoData,
  } = useOrderStore();

  const [activePage, setActivePage] = useState<Department>('production');
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  // Modal states
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

  const handleSelectPage = (page: Department) => {
    setActivePage(page);
    if (page === 'production' || page === 'finance' || page === 'shipping') {
      flushDeptNotifications(page);
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
      `تماس با ${order.customerName}`,
      `شماره تماس مشتری (${order.customerPhone}) کپی شد و آماده شماره‌گیری است.`,
      `سفارش کد ${order.code}`,
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
        <div className="max-w-[1380px] mx-auto w-full">
          {activePage === 'production' && (
            <ProductionPage
              orders={orders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onPrintSingle={handlePrintSingle}
              onApproveOrder={approveProductionOrder}
              onOpenReject={(order) =>
                setRejectTarget({ order, source: 'production' })
              }
              onOpenWeight={(order, item) => setWeightTarget({ order, item })}
              onCompleteProduction={completeProduction}
              onConfirmReturn={(orderId) =>
                confirmReturnByDepartment(orderId, 'production')
              }
            />
          )}

          {activePage === 'finance' && (
            <FinancePage
              orders={orders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onPrintSingle={handlePrintSingle}
              onApproveFinance={approveFinance}
              onOpenReject={(order) =>
                setRejectTarget({ order, source: 'finance' })
              }
              onCallCustomer={handleCallCustomer}
              onConfirmReturn={(orderId) =>
                confirmReturnByDepartment(orderId, 'finance')
              }
            />
          )}

          {activePage === 'shipping' && (
            <ShippingPage
              orders={orders}
              printingOrderId={printingOrderId}
              onPrintAll={handlePrintAll}
              onPrintSingle={handlePrintSingle}
              onSelectDriver={setOrderDriver}
              onOpenDiscrepancy={(order) => setDiscrepancyOrder(order)}
              onOpenDelivery={(order) => setDeliveryOrder(order)}
              onOpenReturn={(order) => setReturnOrder(order)}
              onConfirmReturn={(orderId) =>
                confirmReturnByDepartment(orderId, 'shipping')
              }
              onDriverMissingWarning={handleDriverMissingWarning}
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage orders={orders} onPrintAll={handlePrintAll} />
          )}
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Workflow Modals */}
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
        onConfirm={resetDemoData}
      />
    </div>
  );
}
