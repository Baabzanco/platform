import { useCallback, useEffect, useState } from 'react';
import { DEPARTMENT_LABELS, INITIAL_ORDERS } from '../data/initialOrders';
import {
  Order,
  ToastNotification,
  ToastType,
  UnreadNotification,
  UploadedDocumentPhoto,
  WorkflowDepartment,
} from '../types/order';
import { formatTimeStamp } from '../utils/formatters';
import { DEFAULT_SELECTED_DATE_KEY } from '../utils/jalaliCalendar';

const STORAGE_KEY = 'order_workflow_ts_state_v4';

interface PersistedState {
  orders: Order[];
  unreadByDept: Record<WorkflowDepartment, UnreadNotification[]>;
}

const INITIAL_LOCATION_BY_ID = new Map(
  INITIAL_ORDERS.filter((o) => o.customerLocation).map((o) => [
    o.id,
    o.customerLocation!,
  ])
);

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((order, idx) => {
    const normalized: Order = {
      ...order,
      status:
        (order.status as string) === 'pending_production_approval'
          ? 'in_production'
          : order.status,
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

  // 8. Shipping: register returned items and notify ALL departments
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
      pushToast(title, message, 'اعلام به تمام واحدها (تولید، صدور فاکتور، ارسال)', 'danger');
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
          'پنل رانندگان',
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

  // 14. Driver: complete delivery once both photos are uploaded and send to Invoice Issuance
  const completeDriverDelivery = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      if (
        !target.driverDelivery?.invoicePhoto ||
        !target.driverDelivery?.paymentReceiptPhoto
      ) {
        pushToast(
          'مدارک تحویل کامل نیست',
          'برای اتمام تحویل، لطفاً هم عکس فاکتور و هم عکس رسید پرداخت را آپلود کنید.',
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

      const title = wasRejected
        ? `ارسال مجدد مدارک تحویل — سفارش ${target.code}`
        : `اتمام تحویل و ارسال مدارک — سفارش ${target.code}`;
      const message = wasRejected
        ? `عکس جدید مدارک سفارش ${target.code} (${target.district}) توسط راننده مجدداً ثبت و جهت بررسی به بخش صدور فاکتور ارسال شد.`
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

      pushToast(
        `مدارک تحویل تایید شد — سفارش ${target.code}`,
        `عکس فاکتور و رسید پرداخت ارسال‌شده توسط راننده برای سفارش ${target.code} در بخش صدور فاکتور تایید نهایی شد.`,
        'بخش صدور فاکتور',
        'success'
      );
    },
    [orders, pushToast]
  );

  // 15b. Invoice Issuance: reject driver-submitted delivery photos with reason -> red priority in Driver Panel
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

      pushToast(
        `مدارک تحویل رد شد — سفارش ${target.code}`,
        `مدارک سفارش ${target.code} رد شد و به‌صورت قرمز در اولویت اول پنل رانندگان جهت عکاسی مجدد قرار گرفت. دلیل: ${reason}`,
        'ارجاع فوری به راننده',
        'danger'
      );
    },
    [orders, pushToast]
  );

  // 16. Reset demo dataset
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
    saveCustomerLocation,
    uploadDriverDocument,
    removeDriverDocument,
    completeDriverDelivery,
    verifyDriverDocumentsInFinance,
    rejectDriverDocumentsInFinance,
    resetDemoData,
  };
}
