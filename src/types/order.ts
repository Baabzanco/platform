export type Department = 'production' | 'finance' | 'shipping' | 'reports';

export type WorkflowDepartment = 'production' | 'finance' | 'shipping';

export type OrderStatus =
  | 'pending_production_approval'
  | 'in_production'
  | 'pending_finance_approval'
  | 'finance_discrepancy_review'
  | 'pending_shipping'
  | 'delivered'
  | 'returned'
  | 'rejected';

export interface OrderItem {
  id: string;
  productName: string;
  requestedWeight: number;
  producedWeight: number | null;
  revisedWeight: number | null;
  previousWeightBeforeDiscrepancy: number | null;
  deliveredWeight: number | null;
  returnedWeight: number;
  unitPrice: number; // Rials per kg
}

export interface RejectionRecord {
  source: WorkflowDepartment;
  reason: string;
  timestamp: string;
}

export interface DiscrepancyRecord {
  note: string;
  changes: Array<{
    productName: string;
    oldWeight: number;
    newWeight: number;
  }>;
  timestamp: string;
}

export interface ReturnDepartmentConfirmation {
  confirmed: boolean;
  confirmedAt?: string;
}

export interface ReturnRecord {
  items: Array<{
    itemId: string;
    productName: string;
    weight: number;
  }>;
  notes: string;
  timestamp: string;
  confirmations: Record<WorkflowDepartment, ReturnDepartmentConfirmation>;
}

export interface Order {
  id: string;
  code: string;
  deliverySlot: string;
  customerName: string;
  customerPhone: string;
  address: string;
  notes: string;
  callDurationSeconds: number;
  status: OrderStatus;
  items: OrderItem[];
  driverName: string;
  rejection?: RejectionRecord;
  discrepancy?: DiscrepancyRecord;
  returnRecord?: ReturnRecord;
  createdAt: string;
  lastActionAt: number;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
}

export interface ProductCatalogItem {
  name: string;
  defaultUnitPrice: number;
}

export type ToastType = 'danger' | 'warning' | 'success' | 'info';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  tag: string;
  type: ToastType;
}

export interface UnreadNotification {
  id: string;
  title: string;
  message: string;
  deptLabel: string;
  type: ToastType;
}

export interface PrepAllocation {
  orderId: string;
  orderCode: string;
  deliverySlot: string;
  requestedWeight: number;
  producedWeight: number | null;
}

export interface PrepProductRow {
  productName: string;
  allocations: PrepAllocation[];
  totalRequestedWeight: number;
  totalProducedWeight: number;
}
