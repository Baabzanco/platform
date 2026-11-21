import { Order, OrderItem, OrderStatus, PrepProductRow } from '../types/order';

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatWeight(weight: number): string {
  const clean = Number.isInteger(weight) ? weight.toString() : Number(weight.toFixed(2)).toString();
  return `${clean} kg`;
}

export function formatRial(amount: number): string {
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Math.round(amount))} ریال`;
}

export function getFinanceWeight(item: OrderItem): number {
  return item.revisedWeight ?? item.producedWeight ?? item.requestedWeight;
}

export function getShippingWeight(item: OrderItem): number {
  return item.deliveredWeight ?? item.revisedWeight ?? item.producedWeight ?? item.requestedWeight;
}

export function calculateItemTotal(item: OrderItem): number {
  return getFinanceWeight(item) * item.unitPrice;
}

export function calculateOrderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}

export function formatTimeStamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `امروز - ${hh}:${mm}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending_production_approval':
      return 'در انتظار تایید تولید';
    case 'in_production':
      return 'در حال تولید و توزین';
    case 'pending_finance_approval':
      return 'در انتظار تایید مالی';
    case 'finance_discrepancy_review':
      return 'بررسی مجدد مالی (مغایرت وزن)';
    case 'pending_shipping':
      return 'آماده تخصیص راننده';
    case 'delivered':
      return 'تحویل شده به راننده';
    case 'returned':
      return 'مرجوع شده';
    case 'rejected':
      return 'رد شده';
  }
}

export function buildPreparationSummary(orders: Order[]): {
  rows: PrepProductRow[];
  maxColumns: number;
} {
  const activeOrders = orders.filter(
    (order) =>
      order.status === 'pending_production_approval' || order.status === 'in_production'
  );

  const grouped = new Map<string, PrepProductRow>();

  for (const order of activeOrders) {
    for (const item of order.items) {
      const existing = grouped.get(item.productName);
      const allocation = {
        orderId: order.id,
        orderCode: order.code,
        deliverySlot: order.deliverySlot,
        requestedWeight: item.requestedWeight,
        producedWeight: item.producedWeight,
      };

      if (existing) {
        existing.allocations.push(allocation);
        existing.totalRequestedWeight = Number(
          (existing.totalRequestedWeight + item.requestedWeight).toFixed(2)
        );
        existing.totalProducedWeight = Number(
          (existing.totalProducedWeight + (item.producedWeight ?? 0)).toFixed(2)
        );
      } else {
        grouped.set(item.productName, {
          productName: item.productName,
          allocations: [allocation],
          totalRequestedWeight: item.requestedWeight,
          totalProducedWeight: item.producedWeight ?? 0,
        });
      }
    }
  }

  const rows = Array.from(grouped.values()).sort(
    (a, b) => b.totalRequestedWeight - a.totalRequestedWeight
  );

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.allocations.length), 1);

  return { rows, maxColumns };
}
