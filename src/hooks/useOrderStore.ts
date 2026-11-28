import { useCallback, useEffect, useState } from 'react';
import {
  ALL_DEPARTMENT_LABELS,
  DEPARTMENT_LABELS,
  INITIAL_ORDERS,
} from '../data/initialOrders';
import {
  CreateInPersonSaleInput,
  CreateOrderInput,
  NotificationDepartment,
  Order,
  ReturnItemEntry,
  ReturnScope,
  ReturnToSalesSource,
  ToastNotification,
  ToastType,
  UnreadNotification,
  UploadedDocumentPhoto,
  WorkflowDepartment,
} from '../types/order';
import {
  formatRial,
  formatTimeStamp,
  formatWeight,
} from '../utils/formatters';
import {
  DEFAULT_SELECTED_DATE_KEY,
  toPersianDigits,
} from '../utils/jalaliCalendar';

const STORAGE_KEY = 'order_workflow_ts_state_v4';

interface PersistedState {
  orders: Order[];
  unreadByDept: Record<NotificationDepartment, UnreadNotification[]>;
}

const INITIAL_LOCATION_BY_ID = new Map(
  INITIAL_ORDERS.filter((o) => o.customerLocation).map((o) => [
    o.id,
    o.customerLocation!,
  ])
);

const INITIAL_ORDER_BY_ID = new Map(INITIAL_ORDERS.map((o) => [o.id, o]));

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((order, idx) => {
    const template = INITIAL_ORDER_BY_ID.get(order.id);
    const normalized: Order = {
      ...order,
      status:
        (order.status as string) === 'pending_production_approval'
          ? 'in_production'
          : order.status,
      customerStanding:
        order.customerStanding ?? template?.customerStanding ?? 'green',
      customerStandingLabel:
        order.customerStandingLabel ?? template?.customerStandingLabel,
      managementApproval:
        order.managementApproval ?? template?.managementApproval,
      district: order.district || 'محدوده تهران',
      routeOrder: typeof order.routeOrder === 'number' ? order.routeOrder : idx + 1,
      customerLocation:
        order.customerLocation ?? INITIAL_LOCATION_BY_ID.get(order.id),
      deliveryDate: order.deliveryDate || DEFAULT_SELECTED_DATE_KEY,
      seenByDept: order.seenByDept ?? {
        production: true,
        finance: true,
        shipping: true,
      },
    };
    if (normalized.returnRecord && !normalized.returnRecord.confirmations) {
      normalized.returnRecord = {
        ...normalized.returnRecord,
        confirmations: {
          production: { confirmed: false },
          finance: { confirmed: false },
          shipping: { confirmed: false },
        },
      };
    }
    return normalized;
  });
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.orders) && parsed.unreadByDept) {
        const normalized = normalizeOrders(parsed.orders);
        const hasAnyInPerson = normalized.some((o) => Boolean(o.isInPersonSale));
        const seededInPerson = hasAnyInPerson
          ? []
          : INITIAL_ORDERS.filter((o) => Boolean(o.isInPersonSale));
        return {
          orders: [...seededInPerson, ...normalized],
          unreadByDept: {
            sales: Array.isArray(parsed.unreadByDept.sales)
              ? parsed.unreadByDept.sales
              : [],
            management: Array.isArray(parsed.unreadByDept.management)
              ? parsed.unreadByDept.management
              : [],
            production: Array.isArray(parsed.unreadByDept.production)
              ? parsed.unreadByDept.production
              : [],
            finance: Array.isArray(parsed.unreadByDept.finance)
              ? parsed.unreadByDept.finance
              : [],
            shipping: Array.isArray(parsed.unreadByDept.shipping)
              ? parsed.unreadByDept.shipping
              : [],
          },
        };
      }
    }
  } catch {
    // Fallback to clean initial dataset
  }
  return {
    orders: INITIAL_ORDERS,
    unreadByDept: {
      sales: [],
      management: [],
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
    Record<NotificationDepartment, UnreadNotification[]>
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
    (
      dept: NotificationDepartment,
      title: string,
      message: string,
      type: ToastType
    ) => {
      const entry: UnreadNotification = {
        id: createId('notif'),
        title,
        message,
        deptLabel: `اعلان ویژه ${ALL_DEPARTMENT_LABELS[dept]}`,
        type,
      };
      setUnreadByDept((prev) => ({
        ...prev,
        [dept]: [...(prev[dept] ?? []), entry],
      }));
    },
    []
  );

  const flushDeptNotifications = useCallback(
    (dept: NotificationDepartment) => {
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

  // Mark all orders on a given date as seen for a specific department
  const markDateSeenByDept = useCallback(
    (dateKey: string, dept: WorkflowDepartment) => {
      setOrders((prev) => {
        let changed = false;
        const next = prev.map((order) => {
          if (order.deliveryDate === dateKey && !order.seenByDept[dept]) {
            changed = true;
            return {
              ...order,
              seenByDept: {
                ...order.seenByDept,
                [dept]: true,
              },
            };
          }
          return order;
        });
        return changed ? next : prev;
      });
    },
    []
  );

  // 0a. Sales Specialist: create new invoice/order and send straight to Production
  const createOrder = useCallback(
    (input: CreateOrderInput): Order => {
      const now = Date.now();
      const maxCode = orders.reduce((max, o) => {
        const parsed = parseInt(o.code, 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 39268);
      const nextCode = String(maxCode + 1);
      const orderId = createId('order');

      const dayOrdersCount = orders.filter(
        (o) => o.deliveryDate === input.deliveryDate
      ).length;

      const dateParts = input.deliveryDate.split('-');
      const persianDate =
        dateParts.length === 3
          ? `${toPersianDigits(dateParts[0])}/${toPersianDigits(dateParts[1])}/${toPersianDigits(dateParts[2])}`
          : toPersianDigits(input.deliveryDate);
      const nowDate = new Date();
      const hh = toPersianDigits(String(nowDate.getHours()).padStart(2, '0'));
      const mm = toPersianDigits(String(nowDate.getMinutes()).padStart(2, '0'));

      const standing = input.customerStanding ?? 'green';
      const needsManagementApproval =
        standing === 'yellow' || standing === 'red' || standing === 'black';

      const newOrder: Order = {
        id: orderId,
        code: nextCode,
        deliverySlot: input.deliverySlot,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerStanding: standing,
        customerStandingLabel: input.customerStandingLabel,
        district: input.district.trim() || 'تهران',
        address: input.address.trim(),
        notes: input.notes.trim() || 'ثبت‌شده توسط کارشناس فروش',
        callDurationSeconds: 0,
        status: needsManagementApproval
          ? 'pending_management_approval'
          : 'in_production',
        driverName: '',
        routeOrder: dayOrdersCount + 1,
        deliveryDate: input.deliveryDate,
        seenByDept: {
          production: false,
          finance: false,
          shipping: false,
        },
        createdAt: `${persianDate} - ${hh}:${mm}`,
        createdAtTimestamp: now,
        lastActionAt: now,
        items: input.items.map((item, idx) => ({
          id: `${orderId}-item-${idx + 1}`,
          productName: item.productName.trim(),
          requestedWeight: item.requestedWeight,
          producedWeight: null,
          revisedWeight: null,
          previousWeightBeforeDiscrepancy: null,
          deliveredWeight: null,
          returnedWeight: 0,
          unitPrice: item.unitPrice,
        })),
      };

      setOrders((prev) => [newOrder, ...prev]);

      if (needsManagementApproval) {
        const tierLabel =
          standing === 'red'
            ? 'قرمز'
            : standing === 'yellow'
              ? 'زرد'
              : 'بلک‌لیست';
        const title = `ارسال به مدیریت جهت تایید اعتبار — سفارش ${nextCode}`;
        const message = `سفارش ${nextCode} برای «${newOrder.customerName}» به‌دلیل وضعیت اعتباری ${tierLabel} ابتدا به صفحه مدیریت ارسال شد و پس از تایید مدیریت وارد صف تولید خواهد شد.`;
        pushToast(title, message, 'ارسال به بخش مدیریت', 'warning');
        queueDeptNotification('management', title, message, 'warning');
      } else {
        const title = `ثبت فاکتور جدید — سفارش ${nextCode}`;
        const message = `سفارش ${nextCode} برای «${newOrder.customerName}» ثبت شد و جهت آماده‌سازی و توزین به بخش تولید ارسال گردید.`;
        pushToast(title, message, 'ارسال به بخش تولید', 'success');
        queueDeptNotification('production', title, message, 'info');
      }

      return newOrder;
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 0b. Sales Specialist: edit & re-submit a returned_to_sales order (routes to Management if yellow/red/black, else Production)
  const resubmitOrderToProduction = useCallback(
    (orderId: string, input: CreateOrderInput) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const standing = input.customerStanding ?? target.customerStanding ?? 'green';
      const needsManagementApproval =
        standing === 'yellow' || standing === 'red' || standing === 'black';
      const now = Date.now();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            customerId: input.customerId ?? order.customerId,
            customerName: input.customerName.trim(),
            customerPhone: input.customerPhone.trim(),
            customerStanding: standing,
            customerStandingLabel:
              input.customerStandingLabel ?? order.customerStandingLabel,
            district: input.district.trim() || 'تهران',
            address: input.address.trim(),
            deliveryDate: input.deliveryDate,
            deliverySlot: input.deliverySlot,
            notes: input.notes.trim() || 'اصلاح و ارسال مجدد توسط کارشناس فروش',
            status: needsManagementApproval
              ? 'pending_management_approval'
              : 'in_production',
            driverName: '',
            salesReturn: undefined,
            managementApproval: undefined,
            rejection: undefined,
            discrepancy: undefined,
            returnRecord: undefined,
            driverDelivery: undefined,
            seenByDept: {
              production: false,
              finance: false,
              shipping: false,
            },
            lastActionAt: now,
            items: input.items.map((item, idx) => ({
              id: `${orderId}-rev-${now}-${idx + 1}`,
              productName: item.productName.trim(),
              requestedWeight: item.requestedWeight,
              producedWeight: null,
              revisedWeight: null,
              previousWeightBeforeDiscrepancy: null,
              deliveredWeight: null,
              returnedWeight: 0,
              unitPrice: item.unitPrice,
            })),
          };
        })
      );

      if (needsManagementApproval) {
        const title = `ارسال مجدد سفارش ${target.code} به مدیریت`;
        const message = `سفارش ${target.code} پس از اصلاح توسط کارشناس فروش به‌دلیل وضعیت اعتباری مشتری مجدداً جهت تایید به بخش مدیریت ارسال شد.`;
        pushToast(title, message, 'ارسال به بخش مدیریت', 'warning');
        queueDeptNotification('management', title, message, 'warning');
      } else {
        const title = `ارسال مجدد سفارش ${target.code} به تولید`;
        const message = `سفارش ${target.code} پس از اصلاح توسط کارشناس فروش مجدداً به صف تولید ارسال شد.`;
        pushToast(title, message, 'بخش کارشناس فروش', 'success');
        queueDeptNotification('production', title, message, 'info');
      }
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 0d. Management: approve a yellow/red credit customer's order and release it to Production
  const approveManagementOrder = useCallback(
    (orderId: string, note?: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || target.status !== 'pending_management_approval') return;

      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            status: 'in_production',
            lastActionAt: now,
            seenByDept: {
              ...order.seenByDept,
              production: false,
            },
            managementApproval: {
              approved: true,
              approvedBy: 'امیر مرادصالح',
              approvedAt: stamp,
              note: note?.trim() || undefined,
            },
          };
        })
      );

      const title = `تایید مدیریت و ارسال به تولید — سفارش ${target.code}`;
      const message = `سفارش ${target.code} (${target.customerName}) توسط مدیریت تایید اعتباری شد و برای آماده‌سازی و توزین به بخش تولید ارسال گردید.`;
      pushToast(title, message, 'ارسال به بخش تولید', 'success');
      queueDeptNotification('production', title, message, 'success');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 0c. Any Stage (Production / Finance / Shipping / Driver): return order back to Sales
  const returnOrderToSales = useCallback(
    (orderId: string, source: ReturnToSalesSource, reason: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const sourceName = ALL_DEPARTMENT_LABELS[source];
      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            status: 'returned_to_sales',
            lastActionAt: now,
            salesReturn: {
              source,
              reason,
              timestamp: stamp,
            },
          };
        })
      );

      const title = `برگشت سفارش ${target.code} به فروش`;
      const message = `سفارش ${target.code} (${target.customerName}) از ${sourceName} به کارشناس فروش برگشت داده شد. علت: ${reason}`;
      pushToast(title, message, 'ارجاع به بخش کارشناس فروش', 'warning');
      queueDeptNotification('sales', title, message, 'warning');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 1. Production: record exact produced weight for an item
  const recordItemWeight = useCallback(
    (orderId: string, itemId: string, weight: number) => {
      const target = orders.find((o) => o.id === orderId);
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

      if (target && target.status === 'in_production') {
        const wasAlreadyComplete = target.items.every(
          (item) => item.producedWeight !== null
        );
        const nowComplete = target.items.every((item) =>
          item.id === itemId ? true : item.producedWeight !== null
        );

        if (nowComplete && !wasAlreadyComplete) {
          pushToast(
            `تکمیل اقلام سفارش ${target.code}`,
            `وزن تمامی اقلام سفارش ${target.code} ثبت شد و به رنگ سبز در لیست سفارشات تولید آماده تایید نهایی و ارسال به صدور فاکتور است.`,
            'آماده تایید نهایی تولید',
            'success'
          );
        }
      }
    },
    [orders, pushToast]
  );

  // 3. Production: complete production and unlock Invoice Issuance
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
      const message = `تولید و توزین سفارش ${target.code} تکمیل شد و جهت بررسی و صدور فاکتور در بالای صف بخش صدور فاکتور قرار گرفت.`;
      pushToast(title, message, 'ارسال به بخش صدور فاکتور', 'success');
      queueDeptNotification('finance', title, message, 'info');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 4. Invoice Issuance: approve (or re-approve after discrepancy) and unlock Shipping
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
        : `صدور فاکتور تایید شد — سفارش ${target.code}`;
      const message = wasDiscrepancy
        ? `فاکتور اصلاحی سفارش ${target.code} توسط بخش صدور فاکتور تایید شد و در بالای صف بخش ارسال قرار گرفت.`
        : `فاکتور سفارش ${target.code} صادر و تایید شد و در بالای صف تخصیص راننده بخش ارسال قرار گرفت.`;

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

  // 6. Shipping: submit weight discrepancy back to Invoice Issuance
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
      const message = `واحد ارسال مغایرت وزن سفارش ${target.code} را ثبت و جهت بررسی فوری به بالای صف بخش صدور فاکتور ارجاع داد. توضیحات: ${note}`;
      pushToast(title, message, 'ارجاع به بخش صدور فاکتور انجام شد', 'warning');
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
        `سفارش ${target.code} توسط واحد ارسال تایید و تحویل راننده (${target.driverName}) گردید و در پنل رانندگان نمایش داده می‌شود.`,
        'ثبت خروج انجام شد',
        'success'
      );
    },
    [orders, pushToast]
  );

  // 8. Shipping: register returned items directly and notify ALL departments
  const submitReturn = useCallback(
    (
      orderId: string,
      returnedWeights: Record<string, number>,
      notes: string
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const returnedItemsList: ReturnItemEntry[] = [];
      const now = Date.now();
      const stamp = formatTimeStamp();

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
                shippingWeight: retVal,
                unitPrice: item.unitPrice,
                totalRial: Math.round(retVal * item.unitPrice),
              });
            }
            return { ...item, returnedWeight: retVal };
          });

          const isFullOrder = updatedItems.every((it) => {
            const delivered =
              it.deliveredWeight ??
              it.revisedWeight ??
              it.producedWeight ??
              it.requestedWeight;
            return it.returnedWeight >= delivered - 0.001;
          });

          return {
            ...order,
            status: 'returned',
            lastActionAt: now,
            items: updatedItems,
            returnRecord: {
              initiatedBy: 'shipping',
              driverName: order.driverName || undefined,
              scope: isFullOrder ? 'full_order' : 'partial',
              stage: 'awaiting_prod_and_finance',
              items: returnedItemsList,
              notes,
              timestamp: stamp,
              shippingReceivedAt: stamp,
              confirmations: {
                production: { confirmed: false },
                finance: { confirmed: false },
                shipping: { confirmed: true, confirmedAt: stamp },
              },
            },
          };
        })
      );

      const title = `اعلام مرجوعی سفارش ${target.code}`;
      const message = `سفارش ${target.code} توسط بخش ارسال مرجوع شد و جهت تعیین‌تکلیف و تایید همزمان به تولید و صدور فاکتور اعلام گردید. علت: ${notes}`;
      pushToast(title, message, 'ارسال به تولید و صدور فاکتور', 'danger');
      queueDeptNotification('production', title, message, 'danger');
      queueDeptNotification('finance', title, message, 'danger');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 8b. Driver: initiate full or partial order return -> routed FIRST to Shipping to receive & re-weigh
  const submitDriverReturn = useCallback(
    (
      orderId: string,
      scope: ReturnScope,
      returnedWeights: Record<string, number>,
      notes: string
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const returnedItemsList: ReturnItemEntry[] = [];
      let totalReturnedKg = 0;
      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map((item) => {
            const retVal = Number((returnedWeights[item.id] ?? 0).toFixed(2));
            if (retVal > 0) {
              totalReturnedKg = Number((totalReturnedKg + retVal).toFixed(2));
              returnedItemsList.push({
                itemId: item.id,
                productName: item.productName,
                weight: retVal,
                driverWeight: retVal,
                unitPrice: item.unitPrice,
                totalRial: Math.round(retVal * item.unitPrice),
              });
            }
            return { ...item, returnedWeight: retVal };
          });

          return {
            ...order,
            status: 'returned',
            lastActionAt: now,
            returnRecord: {
              initiatedBy: 'driver',
              driverName: order.driverName || 'راننده',
              scope,
              stage: 'awaiting_shipping_receive',
              items: returnedItemsList,
              notes,
              timestamp: stamp,
              confirmations: {
                production: { confirmed: false },
                finance: { confirmed: false },
                shipping: { confirmed: false },
              },
            },
            items: updatedItems,
          };
        })
      );

      const remainingDeliveredKg = Number(
        target.items
          .reduce((sum, item) => {
            const shipped =
              item.deliveredWeight ??
              item.revisedWeight ??
              item.producedWeight ??
              item.requestedWeight;
            const retVal = Number((returnedWeights[item.id] ?? 0).toFixed(2));
            return sum + Math.max(0, shipped - retVal);
          }, 0)
          .toFixed(2)
      );

      const scopeLabel =
        scope === 'full_order' ? 'مرجوعی کل سفارش' : 'مرجوعی جزئی سفارش';
      const title = `${scopeLabel} — سفارش ${target.code}`;
      const driverToastMsg =
        remainingDeliveredKg > 0.001
          ? `مرجوعی به وزن ${formatWeight(totalReturnedKg)} به بخش ارسال ارجاع شد. لطفاً برای اقلام تحویلی باقی‌مانده (${formatWeight(remainingDeliveredKg)}) عکس فاکتور و رسید پرداخت را نیز ثبت و ارسال کنید.`
          : `راننده (${target.driverName || 'راننده'}) مرجوعی کل سفارش ${target.code} به وزن ${formatWeight(totalReturnedKg)} را ثبت کرد و به بخش ارسال ارجاع شد.`;
      const shippingNotifMsg = `راننده (${target.driverName || 'راننده'}) ${scopeLabel} ${target.code} به وزن ${formatWeight(totalReturnedKg)} را ثبت کرد. سفارش جهت تحویل گرفتن مجدد بار و ثبت وزن دقیق به بخش ارسال ارجاع شد.`;
      pushToast(title, driverToastMsg, 'ارسال به بخش ارسال', 'danger');
      queueDeptNotification('shipping', title, shippingNotifMsg, 'danger');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 8c. Shipping: receive returned cargo from driver, enter verified weights & confirm -> simultaneously notify Production & Finance
  const receiveReturnInShipping = useCallback(
    (
      orderId: string,
      shippingWeights: Record<string, number>,
      shippingNote: string
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.returnRecord) return;

      const now = Date.now();
      const stamp = formatTimeStamp();
      const verifiedItems: ReturnItemEntry[] = [];
      let totalVerifiedKg = 0;
      let totalVerifiedRial = 0;

      const driverWeightByItemId = new Map<string, number>();
      target.returnRecord.items.forEach((it) => {
        driverWeightByItemId.set(it.itemId, it.driverWeight ?? it.weight);
      });

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.returnRecord) return order;

          const updatedItems = order.items.map((item) => {
            const verifiedVal = Number(
              (shippingWeights[item.id] ?? 0).toFixed(2)
            );
            if (verifiedVal > 0) {
              const rowPrice = Math.round(verifiedVal * item.unitPrice);
              totalVerifiedKg = Number((totalVerifiedKg + verifiedVal).toFixed(2));
              totalVerifiedRial += rowPrice;
              verifiedItems.push({
                itemId: item.id,
                productName: item.productName,
                weight: verifiedVal,
                driverWeight: driverWeightByItemId.get(item.id),
                shippingWeight: verifiedVal,
                unitPrice: item.unitPrice,
                totalRial: rowPrice,
              });
            }
            return { ...item, returnedWeight: verifiedVal };
          });

          const isFullOrder = updatedItems.every((it) => {
            const delivered =
              it.deliveredWeight ??
              it.revisedWeight ??
              it.producedWeight ??
              it.requestedWeight;
            return it.returnedWeight >= delivered;
          });

          return {
            ...order,
            lastActionAt: now,
            items: updatedItems,
            returnRecord: {
              ...order.returnRecord,
              scope: isFullOrder ? 'full_order' : 'partial',
              stage: 'awaiting_prod_and_finance',
              items: verifiedItems,
              shippingReceivedAt: stamp,
              shippingNote: shippingNote.trim() || undefined,
              confirmations: {
                ...order.returnRecord.confirmations,
                shipping: { confirmed: true, confirmedAt: stamp },
              },
            },
          };
        })
      );

      const hasDriverDocsReady = Boolean(
        target.driverDelivery?.sentToFinance && !target.driverDelivery?.financeVerified
      );
      const title = `تایید دریافت مرجوعی در ارسال — سفارش ${target.code}`;
      const baseMessage = `بخش ارسال بار مرجوعی سفارش ${target.code} را به وزن ${formatWeight(totalVerifiedKg)} (ارزش ${formatRial(totalVerifiedRial)}) از راننده تحویل گرفت و تایید کرد. مرجوعی همزمان به تولید و صدور فاکتور ارسال شد.`;
      const financeMessage = hasDriverDocsReady
        ? `${baseMessage} مدارک بار تحویل‌داده‌شده (عکس فاکتور و رسید) نیز برای بررسی در بخش صدور فاکتور آماده است.`
        : baseMessage;
      pushToast(title, baseMessage, 'ارسال همزمان به تولید و صدور فاکتور', 'warning');
      queueDeptNotification('production', title, baseMessage, 'danger');
      queueDeptNotification('finance', title, financeMessage, 'danger');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 9. Department confirms & records resolution of a returned order
  const confirmReturnByDepartment = useCallback(
    (orderId: string, dept: WorkflowDepartment) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.returnRecord) return;
      if (target.returnRecord.confirmations[dept]?.confirmed) return;

      if (
        target.returnRecord.stage === 'awaiting_shipping_receive' &&
        dept !== 'shipping'
      ) {
        pushToast(
          'در انتظار تحویل‌گیری بخش ارسال',
          'ابتدا باید بخش ارسال بار مرجوعی را از راننده تحویل بگیرد، وزن مجدد را ثبت کند و تایید نماید.',
          DEPARTMENT_LABELS[dept],
          'warning'
        );
        return;
      }

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

      const totalReturnKg = Number(
        target.returnRecord.items
          .reduce((sum, it) => sum + it.weight, 0)
          .toFixed(2)
      );
      const totalReturnRial = target.returnRecord.items.reduce((sum, it) => {
        if (typeof it.totalRial === 'number') return sum + it.totalRial;
        const matchedItem = target.items.find((oi) => oi.id === it.itemId);
        return sum + Math.round(it.weight * (matchedItem?.unitPrice ?? 0));
      }, 0);

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.returnRecord) return order;
          return {
            ...order,
            returnRecord: {
              ...order.returnRecord,
              stage: allConfirmed ? 'completed' : order.returnRecord.stage,
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
          `تکمیل مرجوعی و ثبت در رخداد حسابداری — سفارش ${target.code}`,
          `مرجوعی سفارش ${target.code} توسط تمام واحدها تایید نهایی شد و حجم (${formatWeight(totalReturnKg)}) و مبلغ (${formatRial(totalReturnRial)}) در رخداد حسابداری طرف حساب ثبت گردید.`,
          'ثبت نهایی مرجوعی',
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

  // 10. Reject order from Production or Invoice Issuance
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

  // 11. Driver: register or update customer map location
  const saveCustomerLocation = useCallback(
    (orderId: string, location: { lat: number; lng: number; note?: string }) => {
      const target = orders.find((o) => o.id === orderId);
      const stamp = formatTimeStamp();
      const hadPrevious = Boolean(target?.customerLocation);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                customerLocation: {
                  lat: Number(location.lat.toFixed(6)),
                  lng: Number(location.lng.toFixed(6)),
                  savedAt: stamp,
                  note: location.note?.trim() || undefined,
                },
              }
            : order
        )
      );

      if (target) {
        pushToast(
          hadPrevious
            ? `لوکیشن مشتری ویرایش شد — سفارش ${target.code}`
            : `لوکیشن مشتری ثبت شد — سفارش ${target.code}`,
          `موقعیت مکانی مشتری در محدوده ${target.district} ذخیره شد و دکمه مسیریابی فعال گردید.`,
          'پنل رانندگان',
          'success'
        );
      }
    },
    [orders, pushToast]
  );

  // 12. Driver: upload invoice or payment receipt photo
  const uploadDriverDocument = useCallback(
    (
      orderId: string,
      docType: 'invoice' | 'paymentReceipt',
      photo: UploadedDocumentPhoto
    ) => {
      const target = orders.find((o) => o.id === orderId);
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const existing = order.driverDelivery ?? { sentToFinance: false };
          const nextRejectedDocs = existing.rejectedDocs
            ? {
                ...existing.rejectedDocs,
                ...(docType === 'invoice'
                  ? { invoice: false }
                  : { paymentReceipt: false }),
              }
            : undefined;
          return {
            ...order,
            driverDelivery: {
              ...existing,
              ...(docType === 'invoice'
                ? { invoicePhoto: photo }
                : { paymentReceiptPhoto: photo }),
              ...(nextRejectedDocs ? { rejectedDocs: nextRejectedDocs } : {}),
            },
          };
        })
      );

      if (target) {
        const label = docType === 'invoice' ? 'عکس فاکتور' : 'عکس رسید پرداخت';
        pushToast(
          `${label} ثبت شد`,
          `${label} سفارش ${target.code} با موفقیت بارگذاری شد.`,
          target.isInPersonSale ? 'فروش حضوری' : 'پنل رانندگان',
          'success'
        );
      }
    },
    [orders, pushToast]
  );

  // 13. Driver: remove uploaded photo before final completion
  const removeDriverDocument = useCallback(
    (orderId: string, docType: 'invoice' | 'paymentReceipt') => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.driverDelivery) return order;
          if (order.driverDelivery.sentToFinance) return order;
          const nextRecord = { ...order.driverDelivery };
          if (docType === 'invoice') {
            delete nextRecord.invoicePhoto;
          } else {
            delete nextRecord.paymentReceiptPhoto;
          }
          return {
            ...order,
            driverDelivery: nextRecord,
          };
        })
      );
    },
    []
  );

  // 14. Driver: complete delivery once location and both photos are recorded and send to Invoice Issuance
  const completeDriverDelivery = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const missing: string[] = [];
      if (!target.customerLocation) missing.push('ثبت لوکیشن مشتری');
      if (!target.driverDelivery?.invoicePhoto) missing.push('عکس فاکتور');
      if (!target.driverDelivery?.paymentReceiptPhoto)
        missing.push('عکس رسید پرداخت');

      if (missing.length > 0) {
        pushToast(
          'امکان نهایی کردن تحویل وجود ندارد',
          `برای اتمام تحویل، تکمیل این موارد الزامی است: ${missing.join('، ')}.`,
          'پنل رانندگان',
          'warning'
        );
        return;
      }

      const wasRejected = Boolean(target.driverDelivery?.financeRejected);
      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            lastActionAt: now,
            driverDelivery: {
              invoicePhoto: order.driverDelivery!.invoicePhoto,
              paymentReceiptPhoto: order.driverDelivery!.paymentReceiptPhoto,
              completedAt: stamp,
              sentToFinance: true,
              financeVerified: false,
              financeRejected: false,
            },
          };
        })
      );

      const isPartialReturn = target.status === 'returned';
      const isAwaitingShippingReturn =
        isPartialReturn &&
        target.returnRecord?.stage === 'awaiting_shipping_receive' &&
        !(target.returnRecord?.confirmations.shipping.confirmed ?? false);

      if (isAwaitingShippingReturn) {
        pushToast(
          `مدارک بخش تحویل‌داده‌شده ثبت شد — سفارش ${target.code}`,
          `عکس فاکتور و رسید پرداخت بخش تحویل‌داده‌شده سفارش ${target.code} ذخیره شد و پس از تحویل گرفتن و تایید بار مرجوعی توسط واحد ارسال، برای بخش صدور فاکتور ارسال خواهد شد.`,
          'در انتظار تایید واحد ارسال',
          'success'
        );
        return;
      }

      const title = wasRejected
        ? `ارسال مجدد مدارک تحویل — سفارش ${target.code}`
        : isPartialReturn
          ? `ارسال مدارک بخش تحویل‌داده‌شده — سفارش ${target.code}`
          : `اتمام تحویل و ارسال مدارک — سفارش ${target.code}`;
      const message = wasRejected
        ? `عکس جدید مدارک سفارش ${target.code} (${target.district}) توسط راننده مجدداً ثبت و جهت بررسی به بخش صدور فاکتور ارسال شد.`
        : isPartialReturn
          ? `عکس فاکتور و رسید پرداخت بخش تحویل‌داده‌شده سفارش ${target.code} (باقی‌مانده پس از مرجوعی جزئی) توسط راننده ثبت و جهت تایید به بخش صدور فاکتور ارسال شد.`
          : `عکس فاکتور و رسید پرداخت سفارش ${target.code} (${target.district}) توسط راننده ثبت و جهت بررسی به بخش صدور فاکتور ارسال شد.`;
      pushToast(title, message, 'ارسال به بخش صدور فاکتور', 'success');
      queueDeptNotification('finance', title, message, 'success');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 15. Invoice Issuance: verify driver-submitted delivery photos
  const verifyDriverDocumentsInFinance = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.driverDelivery?.sentToFinance) return;

      const stamp = formatTimeStamp();
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.driverDelivery) return order;
          return {
            ...order,
            driverDelivery: {
              ...order.driverDelivery,
              financeVerified: true,
              financeVerifiedAt: stamp,
              financeRejected: false,
              financeRejectionReason: undefined,
              rejectedDocs: undefined,
            },
          };
        })
      );

      const isPartialReturn = target.status === 'returned';
      const isInPerson = Boolean(target.isInPersonSale);
      pushToast(
        isInPerson
          ? `مدارک فروش حضوری تایید شد — سفارش ${target.code}`
          : isPartialReturn
            ? `مدارک بخش تحویل‌داده‌شده تایید شد — سفارش ${target.code}`
            : `مدارک تحویل تایید شد — سفارش ${target.code}`,
        isInPerson
          ? `عکس فاکتور و رسید پرداخت فروش حضوری سفارش ${target.code} (${target.customerName}) در بخش صدور فاکتور تایید نهایی شد.`
          : isPartialReturn
            ? `عکس فاکتور و رسید پرداخت مربوط به اقلام تحویل‌داده‌شده سفارش ${target.code} (باقی‌مانده پس از مرجوعی جزئی) در بخش صدور فاکتور تایید نهایی شد.`
            : `عکس فاکتور و رسید پرداخت ارسال‌شده توسط راننده برای سفارش ${target.code} در بخش صدور فاکتور تایید نهایی شد.`,
        'بخش صدور فاکتور',
        'success'
      );
    },
    [orders, pushToast]
  );

  // 15b. Invoice Issuance: reject submitted delivery/in-person photos with reason
  const rejectDriverDocumentsInFinance = useCallback(
    (
      orderId: string,
      reason: string,
      rejectedDocs: { invoice: boolean; paymentReceipt: boolean }
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.driverDelivery) return;

      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || !order.driverDelivery) return order;
          return {
            ...order,
            lastActionAt: now,
            driverDelivery: {
              ...order.driverDelivery,
              sentToFinance: false,
              financeVerified: false,
              financeRejected: true,
              financeRejectionReason: reason,
              financeRejectedAt: stamp,
              rejectedDocs,
            },
          };
        })
      );

      if (target.isInPersonSale) {
        pushToast(
          `مدارک فروش حضوری رد شد — سفارش ${target.code}`,
          `مدارک سفارش فروش حضوری ${target.code} (${target.customerName}) رد شد و در صفحه فروش حضوری جهت ثبت عکس مجدد مشخص گردید. دلیل: ${reason}`,
          'ارجاع به صفحه فروش حضوری',
          'danger'
        );
      } else {
        pushToast(
          `مدارک تحویل رد شد — سفارش ${target.code}`,
          `مدارک سفارش ${target.code} رد شد و به‌صورت قرمز در اولویت اول پنل رانندگان جهت عکاسی مجدد قرار گرفت. دلیل: ${reason}`,
          'ارجاع فوری به راننده',
          'danger'
        );
      }
    },
    [orders, pushToast]
  );

  // 15c. In-Person Sales: create a walk-in order visible ONLY in In-Person Sales & Invoice Issuance
  const createInPersonSale = useCallback(
    (input: CreateInPersonSaleInput): Order => {
      const now = Date.now();
      const maxCode = orders.reduce((max, o) => {
        const parsed = parseInt(o.code, 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 39268);
      const nextCode = String(maxCode + 1);
      const orderId = createId('inperson');
      const stamp = formatTimeStamp();

      const dateParts = input.deliveryDate.split('-');
      const persianDate =
        dateParts.length === 3
          ? `${toPersianDigits(dateParts[0])}/${toPersianDigits(dateParts[1])}/${toPersianDigits(dateParts[2])}`
          : toPersianDigits(input.deliveryDate);
      const nowDate = new Date();
      const hh = toPersianDigits(String(nowDate.getHours()).padStart(2, '0'));
      const mm = toPersianDigits(String(nowDate.getMinutes()).padStart(2, '0'));

      const newOrder: Order = {
        id: orderId,
        code: nextCode,
        deliverySlot: 'فروش حضوری',
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone?.trim() || '',
        district: 'تحویل حضوری',
        address: 'تحویل حضوری در محل واحد فروش',
        notes: input.notes?.trim() || '',
        callDurationSeconds: 0,
        status: 'delivered',
        isInPersonSale: true,
        inPersonPaymentMethod: input.paymentMethod.trim(),
        driverName: '',
        routeOrder: orders.filter((o) => o.deliveryDate === input.deliveryDate).length + 1,
        deliveryDate: input.deliveryDate,
        seenByDept: {
          production: true,
          finance: false,
          shipping: true,
        },
        createdAt: `${persianDate} - ${hh}:${mm}`,
        createdAtTimestamp: now,
        lastActionAt: now,
        driverDelivery: {
          invoicePhoto: input.invoicePhoto,
          paymentReceiptPhoto: input.paymentReceiptPhoto,
          completedAt: stamp,
          sentToFinance: true,
          financeVerified: false,
          financeRejected: false,
        },
        items: input.items.map((item, idx) => ({
          id: `${orderId}-item-${idx + 1}`,
          productName: item.productName.trim(),
          requestedWeight: Number(item.weight.toFixed(2)),
          producedWeight: Number(item.weight.toFixed(2)),
          revisedWeight: null,
          previousWeightBeforeDiscrepancy: null,
          deliveredWeight: Number(item.weight.toFixed(2)),
          returnedWeight: 0,
          unitPrice: Math.round(item.unitPrice),
        })),
      };

      setOrders((prev) => [newOrder, ...prev]);

      const totalWeight = newOrder.items.reduce(
        (sum, it) => sum + it.requestedWeight,
        0
      );
      const totalRial = newOrder.items.reduce(
        (sum, it) => sum + Math.round(it.requestedWeight * it.unitPrice),
        0
      );

      const title = `فروش حضوری جدید ثبت شد — سفارش ${nextCode}`;
      const message = `سفارش حضوری ${nextCode} برای «${newOrder.customerName}» (${formatWeight(totalWeight)} · ${formatRial(totalRial)} · نحوه خرید: ${newOrder.inPersonPaymentMethod}) به همراه عکس فاکتور و رسید جهت بررسی به بخش صدور فاکتور ارسال شد.`;
      pushToast(title, message, 'ارسال به صدور فاکتور', 'success');
      queueDeptNotification('finance', title, message, 'success');

      return newOrder;
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 15d. In-Person Sales: resubmit photos after Finance rejection
  const resubmitInPersonSaleDocs = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId && o.isInPersonSale);
      if (!target) return;

      const missing: string[] = [];
      if (!target.driverDelivery?.invoicePhoto) missing.push('عکس فاکتور');
      if (!target.driverDelivery?.paymentReceiptPhoto)
        missing.push('عکس رسید پرداخت');

      if (missing.length > 0) {
        pushToast(
          'امکان ارسال مجدد مدارک وجود ندارد',
          `برای ارسال مجدد به صدور فاکتور، بارگذاری این موارد الزامی است: ${missing.join('، ')}.`,
          'فروش حضوری',
          'warning'
        );
        return;
      }

      const now = Date.now();
      const stamp = formatTimeStamp();

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            lastActionAt: now,
            seenByDept: {
              ...order.seenByDept,
              finance: false,
            },
            driverDelivery: {
              invoicePhoto: order.driverDelivery!.invoicePhoto,
              paymentReceiptPhoto: order.driverDelivery!.paymentReceiptPhoto,
              completedAt: stamp,
              sentToFinance: true,
              financeVerified: false,
              financeRejected: false,
            },
          };
        })
      );

      const title = `ارسال مجدد مدارک فروش حضوری — سفارش ${target.code}`;
      const message = `عکس جدید فاکتور و رسید پرداخت سفارش فروش حضوری ${target.code} (${target.customerName}) مجدداً ثبت و جهت بررسی به بخش صدور فاکتور ارسال شد.`;
      pushToast(title, message, 'ارسال به صدور فاکتور', 'success');
      queueDeptNotification('finance', title, message, 'success');
    },
    [orders, pushToast, queueDeptNotification]
  );

  // 16. Reset demo dataset
  const resetDemoData = useCallback(() => {
    setOrders(INITIAL_ORDERS);
    setUnreadByDept({
      sales: [],
      management: [],
      production: [],
      finance: [],
      shipping: [],
    });
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
    markDateSeenByDept,
    createOrder,
    resubmitOrderToProduction,
    approveManagementOrder,
    returnOrderToSales,
    recordItemWeight,
    completeProduction,
    approveFinance,
    setOrderDriver,
    submitDiscrepancy,
    submitDelivery,
    submitReturn,
    submitDriverReturn,
    receiveReturnInShipping,
    confirmReturnByDepartment,
    rejectOrder,
    saveCustomerLocation,
    uploadDriverDocument,
    removeDriverDocument,
    completeDriverDelivery,
    verifyDriverDocumentsInFinance,
    rejectDriverDocumentsInFinance,
    createInPersonSale,
    resubmitInPersonSaleDocs,
    resetDemoData,
  };
}
