import { useCallback, useEffect, useState } from 'react';
import { DEPARTMENT_LABELS, INITIAL_ORDERS } from '../data/initialOrders';
import {
  Order,
  ToastNotification,
  ToastType,
  UnreadNotification,
  WorkflowDepartment,
} from '../types/order';
import { formatTimeStamp } from '../utils/formatters';

const STORAGE_KEY = 'order_workflow_ts_state_v2';

interface PersistedState {
  orders: Order[];
  unreadByDept: Record<WorkflowDepartment, UnreadNotification[]>;
}

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((order) => {
    if (order.returnRecord && !order.returnRecord.confirmations) {
      return {
        ...order,
        returnRecord: {
          ...order.returnRecord,
          confirmations: {
            production: { confirmed: false },
            finance: { confirmed: false },
            shipping: { confirmed: false },
          },
        },
      };
    }
    return order;
  });
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed.orders) && parsed.unreadByDept) {
        return {
          orders: normalizeOrders(parsed.orders),
          unreadByDept: parsed.unreadByDept,
        };
      }
    }
  } catch {
    // Fallback to clean initial dataset
  }
  return {
    orders: INITIAL_ORDERS,
    unreadByDept: {
      production: [],
      finance: [],
      shipping: [],
    },
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useOrderStore() {
  const [orders, setOrders] = useState<Order[]>(() => loadInitialState().orders);
  const [unreadByDept, setUnreadByDept] = useState<
    Record<WorkflowDepartment, UnreadNotification[]>
  >(() => loadInitialState().unreadByDept);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    try {
      const payload: PersistedState = { orders, unreadByDept };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [orders, unreadByDept]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, message: string, tag: string, type: ToastType = 'info') => {
      const id = createId('toast');
      setToasts((prev) => [...prev, { id, title, message, tag, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
    },
    []
  );

  const queueDeptNotification = useCallback(
    (dept: WorkflowDepartment, title: string, message: string, type: ToastType) => {
      const entry: UnreadNotification = {
        id: createId('notif'),
        title,
        message,
        deptLabel: `اعلان ویژه ${DEPARTMENT_LABELS[dept]}`,
        type,
      };
      setUnreadByDept((prev) => ({
        ...prev,
        [dept]: [...prev[dept], entry],
      }));
    },
    []
  );

  const flushDeptNotifications = useCallback(
    (dept: WorkflowDepartment) => {
      setUnreadByDept((prev) => {
        const queued = prev[dept];
        if (!queued || queued.length === 0) return prev;
        queued.forEach((n) => {
          pushToast(n.title, n.message, n.deptLabel, n.type);
        });
        return {
          ...prev,
          [dept]: [],
        };
      });
    },
    [pushToast]
  );

  // 1. Production: approve order for weighing (moves to top priority in production)
  const approveProductionOrder = useCallback((orderId: string) => {
    const now = Date.now();
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && order.status === 'pending_production_approval'
          ? { ...order, status: 'in_production', lastActionAt: now }
          : order
      )
    );
  }, []);

  // 2. Production: record exact produced weight for an item
  const recordItemWeight = useCallback(
    (orderId: string, itemId: string, weight: number) => {
      const now = Date.now();
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            lastActionAt: now,
            items: order.items.map((item) =>
              item.id === itemId ? { ...item, producedWeight: weight } : item
            ),
          };
        })
      );
    },
    []
  );

  // 3. Production: complete production and unlock Finance
  const completeProduction = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const now = Date.now();
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: 'pending_finance_approval', lastActionAt: now }
            : order
        )
      );

      const title = `اتمام تولید — سفارش ${target.code}`;
      const message = `تولید و توزین سفارش ${target.code} تکمیل شد و جهت بررسی و تایید حسابداری در بالای صف بخش مالی قرار گرفت.`;
      pushToast(title, message, 'ارسال به بخش مالی', 'success');
      queueDeptNotification('finance', title, message, 'info');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 4. Finance: approve (or re-approve after discrepancy) and unlock Shipping
  const approveFinance = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const wasDiscrepancy = target.status === 'finance_discrepancy_review';
      const now = Date.now();

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: 'pending_shipping', lastActionAt: now }
            : order
        )
      );

      const title = wasDiscrepancy
        ? `تایید مجدد فاکتور اصلاحی — سفارش ${target.code}`
        : `تایید مالی — سفارش ${target.code}`;
      const message = wasDiscrepancy
        ? `فاکتور اصلاحی سفارش ${target.code} توسط واحد مالی تایید شد و در بالای صف بخش ارسال قرار گرفت.`
        : `سفارش ${target.code} توسط واحد مالی تایید شد و در بالای صف تخصیص راننده بخش ارسال قرار گرفت.`;

      pushToast(title, message, 'ارسال به بخش ارسال', 'success');
      queueDeptNotification('shipping', title, message, 'info');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 5. Shipping: select driver
  const setOrderDriver = useCallback((orderId: string, driverName: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, driverName } : order
      )
    );
  }, []);

  // 6. Shipping: submit weight discrepancy back to Finance
  const submitDiscrepancy = useCallback(
    (
      orderId: string,
      updatedWeights: Record<string, number>,
      note: string
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const changes: Array<{ productName: string; oldWeight: number; newWeight: number }> = [];
      const now = Date.now();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map((item) => {
            const currentWeight =
              item.revisedWeight ?? item.producedWeight ?? item.requestedWeight;
            const newWeight = updatedWeights[item.id] ?? currentWeight;
            if (newWeight !== currentWeight) {
              changes.push({
                productName: item.productName,
                oldWeight: currentWeight,
                newWeight,
              });
              return {
                ...item,
                previousWeightBeforeDiscrepancy: currentWeight,
                revisedWeight: newWeight,
              };
            }
            return item;
          });

          return {
            ...order,
            status: 'finance_discrepancy_review',
            lastActionAt: now,
            items: updatedItems,
            discrepancy: {
              note,
              changes,
              timestamp: formatTimeStamp(),
            },
          };
        })
      );

      const title = `ارجاع مغایرت وزن — سفارش ${target.code}`;
      const message = `واحد ارسال مغایرت وزن سفارش ${target.code} را ثبت و جهت بررسی فوری به بالای صف واحد مالی ارجاع داد. توضیحات: ${note}`;
      pushToast(title, message, 'ارجاع به بخش مالی انجام شد', 'warning');
      queueDeptNotification('finance', title, message, 'warning');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 7. Shipping: record final delivered weights and hand over to driver
  const submitDelivery = useCallback(
    (orderId: string, deliveredWeights: Record<string, number>) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const now = Date.now();
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            status: 'delivered',
            lastActionAt: now,
            items: order.items.map((item) => ({
              ...item,
              deliveredWeight:
                deliveredWeights[item.id] ??
                item.revisedWeight ??
                item.producedWeight ??
                item.requestedWeight,
            })),
          };
        })
      );

      pushToast(
        `تحویل موفق — سفارش ${target.code}`,
        `سفارش ${target.code} با موفقیت تحویل راننده (${target.driverName}) گردید.`,
        'ثبت خروج انجام شد',
        'success'
      );
    },
    [orders, pushToast]
  );

  // 8. Shipping: register returned items and notify ALL departments to confirm & resolve
  const submitReturn = useCallback(
    (
      orderId: string,
      returnedWeights: Record<string, number>,
      notes: string
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const returnedItemsList: Array<{
        itemId: string;
        productName: string;
        weight: number;
      }> = [];
      const now = Date.now();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map((item) => {
            const retVal = returnedWeights[item.id] ?? 0;
            if (retVal > 0) {
              returnedItemsList.push({
                itemId: item.id,
                productName: item.productName,
                weight: retVal,
              });
            }
            return { ...item, returnedWeight: retVal };
          });

          return {
            ...order,
            status: 'returned',
            lastActionAt: now,
            items: updatedItems,
            returnRecord: {
              items: returnedItemsList,
              notes,
              timestamp: formatTimeStamp(),
              confirmations: {
                production: { confirmed: false },
                finance: { confirmed: false },
                shipping: { confirmed: false },
              },
            },
          };
        })
      );

      const title = `اعلام مرجوعی سفارش ${target.code}`;
      const message = `سفارش ${target.code} توسط بخش ارسال مرجوع شد و جهت تعیین‌تکلیف و تایید مرجوعی به تمامی واحدها اعلام گردید. علت: ${notes}`;
      pushToast(title, message, 'اعلام به تمام واحدها (تولید، مالی، ارسال)', 'danger');
      queueDeptNotification('production', title, message, 'danger');
      queueDeptNotification('finance', title, message, 'danger');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 9. Department confirms & records resolution of a returned order
  const confirmReturnByDepartment = useCallback(
    (orderId: string, dept: WorkflowDepartment) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.returnRecord) return;
      if (target.returnRecord.confirmations[dept]?.confirmed) return;

      const stamp = formatTimeStamp();
      const deptName = DEPARTMENT_LABELS[dept];

      const nextConfirmations = {
        ...target.returnRecord.confirmations,
        [dept]: { confirmed: true, confirmedAt: stamp },
      };

      const allConfirmed =
        nextConfirmations.production.confirmed &&
        nextConfirmations.finance.confirmed &&
        nextConfirmations.shipping.confirmed;

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.returnRecord) return order;
          return {
            ...order,
            returnRecord: {
              ...order.returnRecord,
              confirmations: {
                ...order.returnRecord.confirmations,
                [dept]: { confirmed: true, confirmedAt: stamp },
              },
            },
          };
        })
      );

      if (allConfirmed) {
        pushToast(
          `تکمیل تعیین‌تکلیف مرجوعی — سفارش ${target.code}`,
          `مرجوعی سفارش ${target.code} توسط ${deptName} و سایر واحدها به طور کامل تایید و ثبت نهایی شد.`,
          'تایید کامل تمام واحدها',
          'success'
        );
      } else {
        pushToast(
          `تایید مرجوعی ثبت شد — سفارش ${target.code}`,
          `مرجوعی سفارش ${target.code} در ${deptName} تایید و ثبت گردید.`,
          deptName,
          'success'
        );
      }

      (['production', 'finance', 'shipping'] as WorkflowDepartment[]).forEach(
        (otherDept) => {
          if (otherDept !== dept) {
            queueDeptNotification(
              otherDept,
              `تایید مرجوعی سفارش ${target.code} توسط ${deptName}`,
              `${deptName} مرجوعی سفارش ${target.code} را تایید و تعیین‌تکلیف کرد.`,
              'info'
            );
          }
        }
      );
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 10. Reject order from Production or Finance (syncs across all departments)
  const rejectOrder = useCallback(
    (orderId: string, source: WorkflowDepartment, reason: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const sourceName = DEPARTMENT_LABELS[source];
      const now = Date.now();

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: 'rejected',
                lastActionAt: now,
                rejection: {
                  source,
                  reason,
                  timestamp: formatTimeStamp(),
                },
              }
            : order
        )
      );

      const title = `رد سفارش کد ${target.code}`;
      const message = `سفارش ${target.code} توسط ${sourceName} رد شد. توضیحات: ${reason}`;
      pushToast(title, message, 'اعلان به تمام بخش‌ها ارسال شد', 'danger');

      (['production', 'finance', 'shipping'] as WorkflowDepartment[]).forEach(
        (dept) => {
          if (dept !== source) {
            queueDeptNotification(dept, title, message, 'danger');
          }
        }
      );
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 11. Reset demo dataset
  const resetDemoData = useCallback(() => {
    setOrders(INITIAL_ORDERS);
    setUnreadByDept({ production: [], finance: [], shipping: [] });
    localStorage.removeItem(STORAGE_KEY);
    pushToast(
      'بازنشانی داده‌ها انجام شد',
      'تمامی سفارش‌ها و وضعیت‌های سامانه به حالت اولیه بازگردانده شدند.',
      'داده‌های نمونه بارگذاری شد',
      'info'
    );
  }, [pushToast]);

  return {
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
  };
}
