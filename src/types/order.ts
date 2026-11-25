export type Department =
  | 'sales'
  | 'production'
  | 'finance'
  | 'shipping'
  | 'driver'
  | 'reports'
  | 'access'
  | 'customers'
  | 'product_photos';

export type WorkflowDepartment = 'production' | 'finance' | 'shipping';

export type NotificationDepartment = 'sales' | WorkflowDepartment;

export type ReturnToSalesSource = 'production' | 'finance' | 'shipping' | 'driver';

export type OrderStatus =
  | 'returned_to_sales'
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

export interface SalesReturnRecord {
  source: ReturnToSalesSource;
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

export interface UploadedDocumentPhoto {
  dataUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface DriverDeliveryRecord {
  invoicePhoto?: UploadedDocumentPhoto;
  paymentReceiptPhoto?: UploadedDocumentPhoto;
  completedAt?: string;
  sentToFinance: boolean;
  financeVerified?: boolean;
  financeVerifiedAt?: string;
  financeRejected?: boolean;
  financeRejectionReason?: string;
  financeRejectedAt?: string;
  rejectedDocs?: {
    invoice?: boolean;
    paymentReceipt?: boolean;
  };
}

export interface CustomerLocation {
  lat: number;
  lng: number;
  savedAt: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  deliverySlot: string;
  customerName: string;
  customerPhone: string;
  district: string;
  address: string;
  notes: string;
  callDurationSeconds: number;
  status: OrderStatus;
  items: OrderItem[];
  driverName: string;
  routeOrder: number;
  customerLocation?: CustomerLocation;
  driverDelivery?: DriverDeliveryRecord;
  rejection?: RejectionRecord;
  salesReturn?: SalesReturnRecord;
  discrepancy?: DiscrepancyRecord;
  returnRecord?: ReturnRecord;
  deliveryDate: string; // e.g. "1405-09-01"
  seenByDept: Record<WorkflowDepartment, boolean>;
  createdAt: string;
  lastActionAt: number;
}

export interface CreateOrderItemInput {
  productName: string;
  requestedWeight: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  district: string;
  address: string;
  deliveryDate: string;
  deliverySlot: string;
  notes: string;
  items: CreateOrderItemInput[];
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
  itemId: string;
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
