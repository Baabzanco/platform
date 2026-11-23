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
  DriverDocsRejectModal,
  RejectModal,
  ResetConfirmModal,
  ReturnModal,
  WeightModal,
} from './components/modals/OrderModals';
import { AccessControlPage } from './components/pages/AccessControlPage';
import { DriverPage } from './components/pages/DriverPage';
import { FinancePage } from './components/pages/FinancePage';
import { ProductionPage } from './components/pages/ProductionPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { ShippingPage } from './components/pages/ShippingPage';
import { useAccessControl } from './hooks/useAccessControl';
import { useOrderStore } from './hooks/useOrderStore';
import { Department, Order, OrderItem, WorkflowDepartment } from './types/order';
import { AccessControlHelpers } from './types/permissions';
import {
  DEFAULT_SELECTED_DATE_KEY,
  getWeekDays,
} from './utils/jalaliCalendar';

// Access control is in view/configuration mode only right now (not enforced on pages)
const FULL_ACCESS: AccessControlHelpers = {
  canView: () => true,
  canEdit: () => true,
};

export default function App() {
  const {
    orders,
    unreadByDept,
    toasts,
    dismissToast,
    pushToast,
    flushDeptNotifications,
    markDateSeenByDept,
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
    rejectDriverDocumentsInFinance,
    resetDemoData,
  } = useOrderStore();

  const {
    groups,
    users,
    toggleGroupPermission,
    setGroupSubgroupPermissions,
    setGroupCategoryPermissions,
    applyPresetToGroup,
    createGroup,
    deleteGroup,
    createUser,
    assignUserToGroup,
    deleteUser,
    resetAccessControl,
  } = useAccessControl();

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
  const [rejectDriverDocsOrder, setRejectDriverDocsOrder] =
    useState<Order | null>(null);
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

  // Count of orders with Finance-rejected driver photos (for red Driver nav badge)
  const rejectedDriverDocsCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.driverDelivery?.financeRejected &&
          !order.driverDelivery?.sentToFinance
      ).length,
    [orders]
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
      .sort((a, b) => {
        const aRej =
          a.driverDelivery?.financeRejected && !a.driverDelivery?.sentToFinance
            ? 0
            : 1;
        const bRej =
          b.driverDelivery?.financeRejected && !b.driverDelivery?.sentToFinance
            ? 0
            : 1;
        if (aRej !== bRej) return aRej - bRej;
        return a.routeOrder - b.routeOrder;
      });
    const idx = sorted.findIndex((o) => o.id === selectedOrder.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [selectedOrder, activePage, dayOrders]);

  const hasSubModalOpen =
    weightTarget !== null ||
    rejectTarget !== null ||
    rejectDriverDocsOrder !== null ||
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
    <div className="flex h-[100dvh] overflow-hidden bg-[#f2f4f7] text-slate-900">
      <Sidebar
        activePage={activePage}
        onSelectPage={handleSelectPage}
        unreadCounts={unreadCounts}
        rejectedDriverDocsCount={rejectedDriverDocsCount}
        onRequestReset={() => setResetOpen(true)}
      />

      <main className="print-container flex-1 overflow-y-auto px-3 py-3.5 pb-24 md:p-5 lg:p-6 md:pb-6">
        <div className="max-w-[1380px] mx-auto w-full flex flex-col gap-3.5 sm:gap-4">
          {/* Top Weekly Daily Calendar Bar */}
          {activePage !== 'access' && (
            <DailyCalendarBar
              days={weekDays}
              selectedDateKey={selectedDateKey}
              metricsByDate={metricsByDate}
              onSelectDate={handleSelectDate}
              onPrevWeek={() => setWeekOffset((w) => w - 1)}
              onNextWeek={() => setWeekOffset((w) => w + 1)}
            />
          )}

          {activePage === 'production' && (
            <ProductionPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              access={FULL_ACCESS}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'finance' && (
            <FinancePage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              access={FULL_ACCESS}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'shipping' && (
            <ShippingPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              access={FULL_ACCESS}
              onPrintAll={handlePrintAll}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
            />
          )}

          {activePage === 'driver' && (
            <DriverPage
              orders={dayOrders}
              printingOrderId={printingOrderId}
              access={FULL_ACCESS}
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
            <ReportsPage
              orders={dayOrders}
              access={FULL_ACCESS}
              onPrintAll={handlePrintAll}
            />
          )}

          {activePage === 'access' && (
            <AccessControlPage
              groups={groups}
              users={users}
              onToggleGroupPermission={toggleGroupPermission}
              onSetGroupSubgroupPermissions={setGroupSubgroupPermissions}
              onSetGroupCategoryPermissions={setGroupCategoryPermissions}
              onApplyPresetToGroup={(groupId, preset) => {
                applyPresetToGroup(groupId, preset);
                pushToast(
                  'الگوی دسترسی گروه اعمال شد',
                  'مجوزهای مشاهده و ویرایش گروه کاربری مطابق الگوی انتخابی به‌روزرسانی شدند.',
                  'گروه‌های کاربری',
                  'success'
                );
              }}
              onCreateGroup={(name, description, preset) => {
                const created = createGroup(name, description, preset);
                pushToast(
                  'گروه کاربری جدید ایجاد شد',
                  `گروه «${created.name}» ایجاد شد و آماده اتصال کاربران است.`,
                  'گروه‌های کاربری',
                  'success'
                );
                return created;
              }}
              onDeleteGroup={(groupId) => {
                const target = groups.find((g) => g.id === groupId);
                deleteGroup(groupId);
                if (target) {
                  pushToast(
                    'گروه کاربری حذف شد',
                    `گروه «${target.name}» حذف شد و اعضای آن به گروه پیش‌فرض منتقل گردیدند.`,
                    'گروه‌های کاربری',
                    'warning'
                  );
                }
              }}
              onCreateUser={(fullName, roleTitle, phone, groupId) => {
                const created = createUser(fullName, roleTitle, phone, groupId);
                const groupName =
                  groups.find((g) => g.id === groupId)?.name ?? '';
                pushToast(
                  'کاربر جدید اضافه شد',
                  `کاربر «${created.fullName}» به گروه «${groupName}» متصل گردید.`,
                  'گروه‌های کاربری',
                  'success'
                );
                return created;
              }}
              onAssignUserToGroup={(userId, groupId) => {
                const user = users.find((u) => u.id === userId);
                const group = groups.find((g) => g.id === groupId);
                assignUserToGroup(userId, groupId);
                if (user && group) {
                  pushToast(
                    'اتصال کاربر به گروه به‌روزرسانی شد',
                    `کاربر «${user.fullName}» به گروه «${group.name}» متصل گردید.`,
                    'گروه‌های کاربری',
                    'info'
                  );
                }
              }}
              onDeleteUser={(userId) => {
                const target = users.find((u) => u.id === userId);
                deleteUser(userId);
                if (target) {
                  pushToast(
                    'کاربر حذف شد',
                    `کاربر «${target.fullName}» از فهرست کاربران حذف گردید.`,
                    'گروه‌های کاربری',
                    'warning'
                  );
                }
              }}
            />
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
          access={FULL_ACCESS}
          disableEscape={hasSubModalOpen}
          onClose={() => setSelectedOrderId(null)}
          onPrintSingle={handlePrintSingle}
          onOpenWeight={(order, item) => setWeightTarget({ order, item })}
          onCompleteProduction={completeProduction}
          onApproveFinance={approveFinance}
          onVerifyDriverDocuments={verifyDriverDocumentsInFinance}
          onOpenRejectDriverDocs={(order) => setRejectDriverDocsOrder(order)}
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
          access={FULL_ACCESS}
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

      <DriverDocsRejectModal
        open={rejectDriverDocsOrder !== null}
        order={rejectDriverDocsOrder}
        onClose={() => setRejectDriverDocsOrder(null)}
        onSubmit={(reason, rejectedDocs) => {
          if (rejectDriverDocsOrder) {
            rejectDriverDocumentsInFinance(
              rejectDriverDocsOrder.id,
              reason,
              rejectedDocs
            );
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
          resetAccessControl();
        }}
      />
    </div>
  );
}
