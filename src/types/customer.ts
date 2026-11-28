export type CustomerStandingTier = 'green' | 'yellow' | 'red' | 'black';

export type CustomerPaymentMode = 'cash' | 'credit';

export type CustomerRelationshipType = 'customer' | 'lead';

export type CustomerProfileTab = 'basic' | 'accounting' | 'marketer';

export type AccountingRowKind = 'debit' | 'credit' | 'balance';

export type SettlementMethod = 'cash' | 'cheque';

export interface AccountingOrderItem {
  id: string;
  productName: string;
  weightKg: number;
  unitPriceRial: number;
  totalRial: number;
}

export interface AccountingOrderSummary {
  orderCode: string;
  orderDate: string;
  deliverySlot: string;
  driverName: string;
  salesRep: string;
  address: string;
  statusLabel: string;
  totalRial: number;
  items: AccountingOrderItem[];
  note?: string;
}

export interface AccountingChequeDetails {
  sayadiId: string;
  chequeNumber: string;
  bankName: string;
  branchName: string;
  dueDate: string;
  amountRial: number;
  issuerName: string;
  status: 'cleared' | 'pending' | 'bounced';
  statusNote?: string;
}

export interface AccountingCashPaymentDetails {
  channelLabel: string;
  trackingCode: string;
  paidAt: string;
  driverName: string;
  amountRial: number;
  invoicePhotoUrl: string;
  invoicePhotoCaption?: string;
  paymentReceiptPhotoUrl: string;
  paymentReceiptPhotoCaption?: string;
}

export interface CustomerAccountingEntry {
  id: string;
  date: string;
  title: string;
  debitRial: number;
  creditRial: number;
  runningBalanceRial: number;
  kind: AccountingRowKind;
  orderCode?: string;
  settlementMethod?: SettlementMethod;
  orderDetails?: AccountingOrderSummary;
  chequeDetails?: AccountingChequeDetails;
  cashDetails?: AccountingCashPaymentDetails;
}

export interface CustomerContact {
  id: string;
  name: string;
  roleOrNote: string;
  phone: string;
}

export interface CustomerChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestampLabel: string;
}

export interface CustomerEventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  by: string;
  type: 'followup' | 'financial' | 'visit' | 'referral';
}

export interface CustomerProductItem {
  id: string;
  productName: string;
  avgWeeklyKg: number;
  agreedPriceRial: number;
  lastOrderDate: string;
}

export interface CustomerCallItem {
  id: string;
  date: string;
  duration: string;
  repName: string;
  direction: 'outgoing' | 'incoming';
  summary: string;
}

export interface CustomerSmsItem {
  id: string;
  date: string;
  phone: string;
  text: string;
  sentBy: string;
}

export interface CustomerMenuCard {
  id: string;
  title: string;
  updatedAt: string;
  itemsSummary: string;
  accentColor: string;
}

export interface CustomerCreditInfo {
  paymentMode: CustomerPaymentMode;
  creditLimitRial: number; // 0 for pure cash
  usedCreditRial: number;
  creditTermDays: number; // e.g. 30 days
  daysRemaining: number | null; // negative means overdue
  dueDateJalali?: string;
  warningReason?: string;
  blacklistReason?: string;
}

export interface CustomerRecord {
  id: string;
  accountCode: string;
  name: string;
  managerName: string;
  businessType: string; // e.g. رستوران، هتل، تالار پذیرایی...
  relationshipType: CustomerRelationshipType; // مشتری | سرنخ
  acquisitionSource: string; // طریقه آشنایی
  province: string;
  city: string;
  mainBranch: string;
  address: string;
  economicCode: string;
  nationalId: string;
  salesRep: string;
  crmRep: string;
  isActive: boolean;
  standing: CustomerStandingTier;
  financialStatusLabel: string;
  credit: CustomerCreditInfo;
  notes: string;
  createdAt: string;
  createdBy: string;
  createdByRole: string;
  lastEditedBy: string;
  lastEditedAt: string;
  followUpCreatedAt: string;
  followUpBy: string;
  followUpTargetDate: string;
  contacts: CustomerContact[];
  chatMessages: CustomerChatMessage[];
  events: CustomerEventItem[];
  products: CustomerProductItem[];
  calls: CustomerCallItem[];
  smsHistory: CustomerSmsItem[];
  menus: CustomerMenuCard[];
}
