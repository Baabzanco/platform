import driverInvoiceImg from '../assets/images/driver_signed_invoice_1795687501947.jpg';
import driverReceiptImg from '../assets/images/driver_payment_receipt_1795687505369.jpg';
import {
  AccountingCashPaymentDetails,
  AccountingChequeDetails,
  AccountingOrderItem,
  AccountingOrderSummary,
  AccountingReturnDetails,
  AccountingReturnItem,
  CustomerAccountingEntry,
  CustomerRecord,
  SettlementMethod,
} from '../types/customer';
import { Order } from '../types/order';
import { formatWeight } from '../utils/formatters';

interface RawLedgerSpec {
  date: string;
  title: string;
  debitRial?: number;
  creditRial?: number;
  kind: 'debit' | 'credit' | 'balance';
  orderCode?: string;
  settlementMethod?: SettlementMethod;
  deliverySlot?: string;
  driverName?: string;
  statusLabel?: string;
  orderNote?: string;
  cheque?: Omit<AccountingChequeDetails, 'amountRial' | 'issuerName'> & {
    amountRial?: number;
    issuerName?: string;
  };
  cash?: Omit<
    AccountingCashPaymentDetails,
    'amountRial' | 'driverName' | 'invoicePhotoUrl' | 'paymentReceiptPhotoUrl'
  > & {
    amountRial?: number;
    driverName?: string;
  };
  returnDetails?: AccountingReturnDetails;
}

const SAMPLE_PRODUCTS: Array<{ name: string; unitPrice: number }> = [
  { name: 'راسته بره ممتاز', unitPrice: 10_500_000 },
  { name: 'ماهیچه گوسفندی', unitPrice: 22_000_000 },
  { name: 'ران معمولی گوسفندی', unitPrice: 16_800_000 },
  { name: 'قلوه‌گاه تکر بره', unitPrice: 14_500_000 },
  { name: 'سردست بدون گردن ممتاز', unitPrice: 18_600_000 },
  { name: 'خورشتی ران ممتاز', unitPrice: 17_400_000 },
  { name: 'خرده بدن بره', unitPrice: 9_200_000 },
];

const SAMPLE_DRIVERS = [
  'رضا احمدی',
  'سعید محمدی',
  'مهدی رضایی',
  'حسین جعفری',
];

const SAMPLE_SLOTS = ['۱۰ تا ۱۲', '۱۲ تا ۱۴', '۱۴ تا ۱۶', '۱۶ تا ۱۸'];

/**
 * Generates realistic meat wholesale items whose line totals sum exactly to targetTotalRial.
 */
function buildOrderItemsForTotal(
  orderCode: string,
  targetTotalRial: number
): AccountingOrderItem[] {
  const seed = parseInt(orderCode.replace(/\D/g, ''), 10) || 103200;
  const p1 = SAMPLE_PRODUCTS[seed % SAMPLE_PRODUCTS.length];
  const p2 = SAMPLE_PRODUCTS[(seed + 2) % SAMPLE_PRODUCTS.length];
  const p3 = SAMPLE_PRODUCTS[(seed + 4) % SAMPLE_PRODUCTS.length];

  if (targetTotalRial <= 0) {
    return [
      {
        id: `${orderCode}-item-1`,
        productName: p1.name,
        weightKg: 10,
        unitPriceRial: p1.unitPrice,
        totalRial: 10 * p1.unitPrice,
      },
    ];
  }

  // Split into 2 or 3 items with exact sum
  const w1 = Math.max(2, Math.floor((targetTotalRial * 0.45) / p1.unitPrice));
  const t1 = w1 * p1.unitPrice;
  const rem1 = targetTotalRial - t1;

  if (rem1 <= 0) {
    const unitPrice = Math.round(targetTotalRial / Math.max(1, w1));
    return [
      {
        id: `${orderCode}-item-1`,
        productName: p1.name,
        weightKg: w1,
        unitPriceRial: unitPrice,
        totalRial: targetTotalRial,
      },
    ];
  }

  const w2 = Math.max(1, Math.floor((rem1 * 0.55) / p2.unitPrice));
  const t2 = w2 * p2.unitPrice;
  const rem2 = rem1 - t2;

  const items: AccountingOrderItem[] = [
    {
      id: `${orderCode}-item-1`,
      productName: p1.name,
      weightKg: w1,
      unitPriceRial: p1.unitPrice,
      totalRial: t1,
    },
  ];

  if (rem2 > 10_000_000) {
    items.push({
      id: `${orderCode}-item-2`,
      productName: p2.name,
      weightKg: w2,
      unitPriceRial: p2.unitPrice,
      totalRial: t2,
    });
    const w3 = Math.max(1, Math.round((rem2 / p3.unitPrice) * 2) / 2);
    const unit3 = Math.round(rem2 / w3);
    items.push({
      id: `${orderCode}-item-3`,
      productName: p3.name,
      weightKg: w3,
      unitPriceRial: unit3,
      totalRial: rem2,
    });
  } else {
    const adjustedW2 = Math.max(1, Math.round((rem1 / p2.unitPrice) * 2) / 2);
    const adjustedUnit2 = Math.round(rem1 / adjustedW2);
    items.push({
      id: `${orderCode}-item-2`,
      productName: p2.name,
      weightKg: adjustedW2,
      unitPriceRial: adjustedUnit2,
      totalRial: rem1,
    });
  }

  return items;
}

function toSortableDateKey(dateStr: string): string {
  const ascii = dateStr
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();
  const parts = ascii.split(/[/-]/);
  if (parts.length === 3) {
    const [y, m, day] = parts;
    return `${y.padStart(4, '0')}/${m.padStart(2, '0')}/${day.padStart(2, '0')}`;
  }
  return ascii;
}

function buildLedger(
  prefix: string,
  customer: CustomerRecord,
  rows: RawLedgerSpec[],
  liveOrders?: Order[]
): CustomerAccountingEntry[] {
  // Sort rows chronologically (oldest -> newest) first so running balance is accurate
  const chronologicalRows = rows
    .map((row, originalIdx) => ({
      row,
      originalIdx,
      dateKey: toSortableDateKey(row.date),
    }))
    .sort(
      (a, b) =>
        a.dateKey.localeCompare(b.dateKey) || a.originalIdx - b.originalIdx
    );

  // Pre-index order totals, settlement methods, cheque & cash details per orderCode
  const orderTotalsByCode = new Map<string, number>();
  const orderDateByCode = new Map<string, string>();
  const orderMetaByCode = new Map<
    string,
    {
      settlementMethod?: SettlementMethod;
      driverName: string;
      deliverySlot: string;
      statusLabel: string;
      orderNote?: string;
      cheque?: AccountingChequeDetails;
      cash?: AccountingCashPaymentDetails;
    }
  >();

  for (const { row } of chronologicalRows) {
    if (!row.orderCode) continue;
    const code = row.orderCode;
    const seed = parseInt(code.replace(/\D/g, ''), 10) || 103000;
    const existing = orderMetaByCode.get(code) ?? {
      driverName: row.driverName ?? SAMPLE_DRIVERS[seed % SAMPLE_DRIVERS.length],
      deliverySlot: row.deliverySlot ?? SAMPLE_SLOTS[seed % SAMPLE_SLOTS.length],
      statusLabel: row.statusLabel ?? 'تحویل‌شده و ثبت در حسابداری',
      orderNote: row.orderNote,
    };

    if (row.kind === 'debit' && (row.debitRial ?? 0) > 0 && !orderTotalsByCode.has(code)) {
      orderTotalsByCode.set(code, row.debitRial ?? 0);
      orderDateByCode.set(code, row.date);
    }

    if (row.settlementMethod) {
      existing.settlementMethod = row.settlementMethod;
    }
    if (row.driverName) existing.driverName = row.driverName;
    if (row.deliverySlot) existing.deliverySlot = row.deliverySlot;
    if (row.statusLabel) existing.statusLabel = row.statusLabel;
    if (row.orderNote) existing.orderNote = row.orderNote;

    const liveMatch = liveOrders?.find((o) => o.code === code);
    const liveInvoiceUrl = liveMatch?.driverDelivery?.invoicePhoto?.dataUrl;
    const liveReceiptUrl = liveMatch?.driverDelivery?.paymentReceiptPhoto?.dataUrl;

    if (row.cheque) {
      existing.cheque = {
        sayadiId: row.cheque.sayadiId,
        chequeNumber: row.cheque.chequeNumber,
        bankName: row.cheque.bankName,
        branchName: row.cheque.branchName,
        dueDate: row.cheque.dueDate,
        amountRial:
          row.cheque.amountRial ??
          row.creditRial ??
          row.debitRial ??
          orderTotalsByCode.get(code) ??
          0,
        issuerName: row.cheque.issuerName ?? customer.managerName,
        status: row.cheque.status,
        statusNote: row.cheque.statusNote,
      };
    }

    if (row.cash) {
      existing.cash = {
        channelLabel: row.cash.channelLabel,
        trackingCode: row.cash.trackingCode,
        paidAt: row.cash.paidAt,
        driverName: row.cash.driverName ?? existing.driverName,
        amountRial:
          row.cash.amountRial ??
          row.creditRial ??
          row.debitRial ??
          orderTotalsByCode.get(code) ??
          0,
        invoicePhotoUrl: liveInvoiceUrl ?? driverInvoiceImg,
        invoicePhotoCaption:
          row.cash.invoicePhotoCaption ??
          `فاکتور امضاشده تحویل سفارش ${code} توسط راننده`,
        paymentReceiptPhotoUrl: liveReceiptUrl ?? driverReceiptImg,
        paymentReceiptPhotoCaption:
          row.cash.paymentReceiptPhotoCaption ??
          `رسید پرداخت ${row.cash.channelLabel} سفارش ${code}`,
      };
    }

    orderMetaByCode.set(code, existing);
  }

  let balance = 0;
  const entriesWithSeq = chronologicalRows.map(({ row, dateKey }, seq) => {
    const debit = row.debitRial ?? 0;
    const credit = row.creditRial ?? 0;
    balance = balance + debit - credit;

    const code = row.orderCode;
    const meta = code ? orderMetaByCode.get(code) : undefined;
    const liveMatch = code ? liveOrders?.find((o) => o.code === code) : undefined;

    let orderDetails: AccountingOrderSummary | undefined;
    if (code && meta) {
      const total = orderTotalsByCode.get(code) ?? (debit || credit);
      const items: AccountingOrderItem[] = liveMatch
        ? liveMatch.items.map((item) => {
            const w =
              item.deliveredWeight ??
              item.revisedWeight ??
              item.producedWeight ??
              item.requestedWeight;
            return {
              id: item.id,
              productName: item.productName,
              weightKg: w,
              unitPriceRial: item.unitPrice,
              totalRial: Math.round(w * item.unitPrice),
            };
          })
        : buildOrderItemsForTotal(code, total);

      orderDetails = {
        orderCode: code,
        orderDate: orderDateByCode.get(code) ?? row.date,
        deliverySlot: liveMatch?.deliverySlot ?? meta.deliverySlot,
        driverName: liveMatch?.driverName ?? meta.driverName,
        salesRep: customer.salesRep,
        address: liveMatch?.address ?? customer.address,
        statusLabel: meta.statusLabel,
        totalRial: total,
        items,
        note: liveMatch?.notes ?? meta.orderNote,
      };
    }

    const rowSettlementMethod = row.settlementMethod ?? meta?.settlementMethod;
    const rowCheque: AccountingChequeDetails | undefined = row.cheque
      ? {
          sayadiId: row.cheque.sayadiId,
          chequeNumber: row.cheque.chequeNumber,
          bankName: row.cheque.bankName,
          branchName: row.cheque.branchName,
          dueDate: row.cheque.dueDate,
          amountRial:
            row.cheque.amountRial ??
            credit ??
            debit ??
            orderTotalsByCode.get(code ?? '') ??
            0,
          issuerName: row.cheque.issuerName ?? customer.managerName,
          status: row.cheque.status,
          statusNote: row.cheque.statusNote,
        }
      : rowSettlementMethod === 'cheque'
        ? meta?.cheque
        : undefined;

    const liveInvoiceUrl = liveMatch?.driverDelivery?.invoicePhoto?.dataUrl;
    const liveReceiptUrl = liveMatch?.driverDelivery?.paymentReceiptPhoto?.dataUrl;

    const rowCash: AccountingCashPaymentDetails | undefined = row.cash
      ? {
          channelLabel: row.cash.channelLabel,
          trackingCode: row.cash.trackingCode,
          paidAt: row.cash.paidAt,
          driverName: row.cash.driverName ?? meta?.driverName ?? 'رضا احمدی',
          amountRial: row.cash.amountRial ?? (credit || debit),
          invoicePhotoUrl: liveInvoiceUrl ?? driverInvoiceImg,
          invoicePhotoCaption:
            row.cash.invoicePhotoCaption ??
            `فاکتور تحویل امضاشده سفارش ${code ?? ''}`,
          paymentReceiptPhotoUrl: liveReceiptUrl ?? driverReceiptImg,
          paymentReceiptPhotoCaption:
            row.cash.paymentReceiptPhotoCaption ??
            `فیش واریزی / رسید ${row.cash.channelLabel}`,
        }
      : rowSettlementMethod === 'cash'
        ? meta?.cash
        : undefined;

    const entry: CustomerAccountingEntry = {
      id: `${prefix}-acc-${seq + 1}`,
      date: row.date,
      title: row.title,
      debitRial: debit,
      creditRial: credit,
      runningBalanceRial: balance,
      kind: row.kind,
      orderCode: code,
      settlementMethod: rowSettlementMethod,
      orderDetails,
      chequeDetails: rowCheque,
      cashDetails: rowCash,
      returnDetails: row.returnDetails,
    };

    return { entry, dateKey, seq };
  });

  // Display newest transaction at the top and oldest at the bottom
  return entriesWithSeq
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.seq - a.seq)
    .map((item) => item.entry);
}

const SEEDED_SPECS_BY_CUSTOMER_ID: Record<string, RawLedgerSpec[]> = {
  // 1. Green Cash — رستوران بورسا کباب اوی (تسویه کامل نقدی)
  'cust-1': [
    {
      date: '1405/08/08',
      title: 'ایجاد فاکتور با شماره سفارش 103205',
      debitRial: 142_500_000,
      kind: 'debit',
      orderCode: '103205',
      settlementMethod: 'cash',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده و تسویه کامل نقدی',
    },
    {
      date: '1405/08/08',
      title: 'دریافت وجه کارت‌خوان در محل بابت سفارش 103205',
      creditRial: 142_500_000,
      kind: 'credit',
      orderCode: '103205',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'کارت‌خوان سیار در محل تحویل',
        trackingCode: 'RRN-884129045',
        paidAt: '۱۴۰۵/۰۸/۰۸ · ساعت ۱۱:۲۸',
        driverName: 'رضا احمدی',
      },
    },
    {
      date: '1405/08/08',
      title: 'مانده بدهی پس از تسویه فاکتور 103205',
      kind: 'balance',
      orderCode: '103205',
      settlementMethod: 'cash',
    },
    {
      date: '1405/08/19',
      title: 'ایجاد فاکتور با شماره سفارش 103348',
      debitRial: 118_000_000,
      kind: 'debit',
      orderCode: '103348',
      settlementMethod: 'cash',
      driverName: 'سعید محمدی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده و تسویه شبا',
    },
    {
      date: '1405/08/19',
      title: 'واریز نقدی شبا بابت تسویه سفارش 103348',
      creditRial: 118_000_000,
      kind: 'credit',
      orderCode: '103348',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز نقدی شبا (در محل تحویل)',
        trackingCode: 'SHB-405081933481',
        paidAt: '۱۴۰۵/۰۸/۱۹ · ساعت ۱۳:۱۴',
        driverName: 'سعید محمدی',
      },
    },
    {
      date: '1405/08/19',
      title: 'مانده بدهی پس از تسویه فاکتور 103348',
      kind: 'balance',
      orderCode: '103348',
      settlementMethod: 'cash',
    },
    {
      date: '1405/08/28',
      title: 'ایجاد فاکتور با شماره سفارش 103512',
      debitRial: 164_000_000,
      kind: 'debit',
      orderCode: '103512',
      settlementMethod: 'cash',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده و تسویه کامل نقدی',
    },
    {
      date: '1405/08/28',
      title: 'دریافت وجه کارت‌خوان در محل بابت سفارش 103512',
      creditRial: 164_000_000,
      kind: 'credit',
      orderCode: '103512',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'کارت‌خوان سیار در محل تحویل',
        trackingCode: 'RRN-902517831',
        paidAt: '۱۴۰۵/۰۸/۲۸ · ساعت ۱۱:۰۵',
        driverName: 'رضا احمدی',
      },
    },
    {
      date: '1405/08/28',
      title: 'مانده بدهی جاری طرف حساب (تسویه کامل)',
      kind: 'balance',
    },
  ],

  // 2. Green Credit — باغ تالار قصر سفید (چک صیادی + واریز نقدی)
  'cust-2': [
    {
      date: '1405/08/04',
      title: 'ایجاد فاکتور با شماره سفارش 103190',
      debitRial: 240_000_000,
      kind: 'debit',
      orderCode: '103190',
      settlementMethod: 'cheque',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'تحویل‌شده — تسویه با چک صیادی',
    },
    {
      date: '1405/08/25',
      title: 'وصول چک صیادی بابت تسویه فاکتور 103190',
      creditRial: 240_000_000,
      kind: 'credit',
      orderCode: '103190',
      settlementMethod: 'cheque',
      cheque: {
        sayadiId: '4105829364017825',
        chequeNumber: '620418 / 84',
        bankName: 'بانک ملت',
        branchName: 'شعبه گرمدره (کد ۶۵۴۲۱)',
        dueDate: '1405/08/25',
        status: 'cleared',
        statusNote: 'چک در سررسید مقرر در سامانه چکاوک ثبت و به‌طور کامل پاس شد.',
      },
    },
    {
      date: '1405/08/25',
      title: 'مانده بدهی پس از وصول چک سفارش 103190',
      kind: 'balance',
      orderCode: '103190',
      settlementMethod: 'cheque',
    },
    {
      date: '1405/08/30',
      title: 'ایجاد فاکتور با شماره سفارش 103560',
      debitRial: 280_000_000,
      kind: 'debit',
      orderCode: '103560',
      settlementMethod: 'cash',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده — پرداخت بخشی نقدی، مانده اعتباری',
    },
    {
      date: '1405/09/01',
      title: 'واریز علی‌الحساب بانکی بابت سفارش 103560',
      creditRial: 100_000_000,
      kind: 'credit',
      orderCode: '103560',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز نقدی کارت‌به‌کارت / فیش بانکی',
        trackingCode: 'TRK-771249003',
        paidAt: '۱۴۰۵/۰۹/۰۱ · ساعت ۱۰:۴۲',
        driverName: 'رضا احمدی',
      },
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (سررسید ۱۹ آذر)',
      kind: 'balance',
    },
  ],

  // 3. Green Credit — هتل آرمان تهران (حواله نقدی پایا + چک صیادی در جریان)
  'cust-3': [
    {
      date: '1405/08/02',
      title: 'ایجاد فاکتور رسمی با شماره سفارش 103144',
      debitRial: 420_000_000,
      kind: 'debit',
      orderCode: '103144',
      settlementMethod: 'cash',
      driverName: 'سعید محمدی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده — تسویه کامل پایا',
    },
    {
      date: '1405/08/18',
      title: 'حواله پایا از حساب شرکتی بابت سفارش 103144',
      creditRial: 420_000_000,
      kind: 'credit',
      orderCode: '103144',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'حواله پایا از حساب شرکتی',
        trackingCode: 'PAYA-9901448210',
        paidAt: '۱۴۰۵/۰۸/۱۸ · ساعت ۱۴:۰۵',
        driverName: 'سعید محمدی',
      },
    },
    {
      date: '1405/08/18',
      title: 'مانده بدهی پس از تسویه فاکتور 103144',
      kind: 'balance',
      orderCode: '103144',
      settlementMethod: 'cash',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور رسمی با شماره سفارش 103610',
      debitRial: 350_000_000,
      kind: 'debit',
      orderCode: '103610',
      settlementMethod: 'cheque',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'تحویل‌شده — تضمین با چک صیادی ۴۵ روزه',
      cheque: {
        sayadiId: '4105992014756108',
        chequeNumber: '741902 / 12',
        bankName: 'بانک سامان',
        branchName: 'شعبه پارک ملت (کد ۸۱۴)',
        dueDate: '1405/09/23',
        amountRial: 350_000_000,
        status: 'pending',
        statusNote: 'چک صیادی در سامانه ثبت و تایید شده؛ در انتظار سررسید ۲۳ آذر.',
      },
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (در مهلت اعتباری ۴۵ روزه)',
      kind: 'balance',
    },
  ],

  // 4. Green Cash — تهیه غذای به‌پخت شعبه ۲ (تسویه نقدی)
  'cust-4': [
    {
      date: '1405/08/22',
      title: 'ایجاد فاکتور با شماره سفارش 103402',
      debitRial: 96_000_000,
      kind: 'debit',
      orderCode: '103402',
      settlementMethod: 'cash',
      driverName: 'حسین جعفری',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده و تسویه آنی نقدی',
    },
    {
      date: '1405/08/22',
      title: 'واریز آنی کارت به کارت بابت سفارش 103402',
      creditRial: 96_000_000,
      kind: 'credit',
      orderCode: '103402',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز آنی کارت‌به‌کارت',
        trackingCode: 'C2C-553402918',
        paidAt: '۱۴۰۵/۰۸/۲۲ · ساعت ۱۱:۴۰',
        driverName: 'حسین جعفری',
      },
    },
    {
      date: '1405/08/22',
      title: 'مانده بدهی پس از تسویه فاکتور 103402',
      kind: 'balance',
      orderCode: '103402',
      settlementMethod: 'cash',
    },
    {
      date: '1405/08/30',
      title: 'ایجاد فاکتور با شماره سفارش 103589',
      debitRial: 112_000_000,
      kind: 'debit',
      orderCode: '103589',
      settlementMethod: 'cash',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده و تسویه کارت‌خوان',
    },
    {
      date: '1405/08/30',
      title: 'دریافت کارت‌خوان بابت سفارش 103589',
      creditRial: 112_000_000,
      kind: 'credit',
      orderCode: '103589',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'کارت‌خوان سیار راننده',
        trackingCode: 'RRN-912035894',
        paidAt: '۱۴۰۵/۰۸/۳۰ · ساعت ۱۳:۲۲',
        driverName: 'رضا احمدی',
      },
    },
    {
      date: '1405/08/30',
      title: 'مانده بدهی جاری طرف حساب',
      kind: 'balance',
    },
  ],

  // 5. Yellow — رستوران قصر ماه منیر (نقدی + چک صیادی در جریان)
  'cust-5': [
    {
      date: '1405/08/10',
      title: 'ایجاد فاکتور با شماره سفارش 103240',
      debitRial: 295_000_000,
      kind: 'debit',
      orderCode: '103240',
      settlementMethod: 'cash',
      driverName: 'سعید محمدی',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'تحویل‌شده — تسویه بخشی نقدی',
    },
    {
      date: '1405/08/16',
      title: 'پرداخت جزئی بانکی بابت سفارش 103240',
      creditRial: 120_000_000,
      kind: 'credit',
      orderCode: '103240',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز بانکی نقدی (فیش واریزی)',
        trackingCode: 'BNK-603240119',
        paidAt: '۱۴۰۵/۰۸/۱۶ · ساعت ۱۵:۱۰',
        driverName: 'سعید محمدی',
      },
    },
    {
      date: '1405/08/16',
      title: 'مانده بدهی پس از پرداخت جزئی سفارش 103240',
      kind: 'balance',
      orderCode: '103240',
      settlementMethod: 'cash',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور با شماره سفارش 103618',
      debitRial: 280_000_000,
      kind: 'debit',
      orderCode: '103618',
      settlementMethod: 'cheque',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده — تسویه چکی (در جریان وصول)',
      cheque: {
        sayadiId: '4105741082953014',
        chequeNumber: '519034 / 20',
        bankName: 'بانک پاسارگاد',
        branchName: 'شعبه بلوار آفریقا جردن (کد ۲۳۹)',
        dueDate: '1405/09/08',
        amountRial: 280_000_000,
        status: 'pending',
        statusNote: 'چک صیادی ۲۰ روزه دریافت و در گاوصندوق مالی ثبت شده است.',
      },
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (۹۱٪ سقف اعتبار مصرف‌شده)',
      kind: 'balance',
    },
  ],

  // 6. Yellow — رستوران کلک‌چال
  'cust-6': [
    {
      date: '1405/08/19',
      title: 'ایجاد فاکتور با شماره سفارش 103355',
      debitRial: 320_000_000,
      kind: 'debit',
      orderCode: '103355',
      settlementMethod: 'cash',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده — پیش‌پرداخت نقدی، مانده در موعد تسویه',
    },
    {
      date: '1405/08/24',
      title: 'واریز پیش‌پرداخت نقدی بابت سفارش 103355',
      creditRial: 50_000_000,
      kind: 'credit',
      orderCode: '103355',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز نقدی در محل (کارت‌خوان)',
        trackingCode: 'RRN-849335512',
        paidAt: '۱۴۰۵/۰۸/۲۴ · ساعت ۱۲:۱۸',
        driverName: 'مهدی رضایی',
      },
    },
    {
      date: '1405/08/24',
      title: 'مانده بدهی جاری طرف حساب (نزدیک به سررسید ۴ آذر)',
      kind: 'balance',
    },
  ],

  // 7. Yellow — کبابی ناب
  'cust-7': [
    {
      date: '1405/08/17',
      title: 'ایجاد فاکتور با شماره سفارش 103329',
      debitRial: 190_000_000,
      kind: 'debit',
      orderCode: '103329',
      settlementMethod: 'cash',
      driverName: 'حسین جعفری',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده — پرداخت بخشی نقدی',
    },
    {
      date: '1405/08/21',
      title: 'واریز بانکی بابت سفارش 103329',
      creditRial: 85_000_000,
      kind: 'credit',
      orderCode: '103329',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'واریز بانکی شبا',
        trackingCode: 'SHB-405082133290',
        paidAt: '۱۴۰۵/۰۸/۲۱ · ساعت ۱۶:۰۴',
        driverName: 'حسین جعفری',
      },
    },
    {
      date: '1405/08/21',
      title: 'مانده بدهی پس از تسویه جزئی سفارش 103329',
      kind: 'balance',
      orderCode: '103329',
      settlementMethod: 'cash',
    },
    {
      date: '1405/08/29',
      title: 'ایجاد فاکتور با شماره سفارش 103540',
      debitRial: 160_000_000,
      kind: 'debit',
      orderCode: '103540',
      settlementMethod: 'cheque',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'تحویل‌شده — چک صیادی ۱۴ روزه',
      cheque: {
        sayadiId: '4105660918432771',
        chequeNumber: '308841 / 15',
        bankName: 'بانک صادرات ایران',
        branchName: 'شعبه ستارخان (کد ۱۰۹۲)',
        dueDate: '1405/09/05',
        amountRial: 160_000_000,
        status: 'pending',
        statusNote: 'چک در جریان وصول؛ ۳ روز تا تاریخ سررسید باقی مانده است.',
      },
    },
    {
      date: '1405/08/29',
      title: 'مانده بدهی جاری طرف حساب (۸۸٪ سقف · ۳ روز تا سررسید)',
      kind: 'balance',
    },
  ],

  // 8. Red — دیزی‌سرای ولیعصر
  'cust-8': [
    {
      date: '1405/08/15',
      title: 'ایجاد فاکتور با شماره سفارش 103298',
      debitRial: 210_000_000,
      kind: 'debit',
      orderCode: '103298',
      settlementMethod: 'cash',
      driverName: 'سعید محمدی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده — واریز جزئی نقدی',
    },
    {
      date: '1405/08/20',
      title: 'پرداخت نقدی بخشی از سفارش 103298',
      creditRial: 60_000_000,
      kind: 'credit',
      orderCode: '103298',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'کارت‌خوان سیار در محل',
        trackingCode: 'RRN-802329811',
        paidAt: '۱۴۰۵/۰۸/۲۰ · ساعت ۱۰:۵۵',
        driverName: 'سعید محمدی',
      },
    },
    {
      date: '1405/08/20',
      title: 'مانده بدهی پس از واریز جزئی سفارش 103298',
      kind: 'balance',
      orderCode: '103298',
      settlementMethod: 'cash',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور با شماره سفارش 103604',
      debitRial: 200_000_000,
      kind: 'debit',
      orderCode: '103604',
      settlementMethod: 'cheque',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده — تسویه چکی در سررسید',
      cheque: {
        sayadiId: '4105883412095542',
        chequeNumber: '449012 / 07',
        bankName: 'بانک تجارت',
        branchName: 'شعبه میدان ولیعصر (کد ۲۱۸)',
        dueDate: '1405/09/02',
        amountRial: 200_000_000,
        status: 'pending',
        statusNote: 'موعد چک امروز است؛ جهت وصول به حساب شرکت واگذار شد.',
      },
    },
    {
      date: '1405/09/02',
      title: 'مانده بدهی جاری طرف حساب (تکمیل ۱۰۰٪ سقف اعتبار)',
      kind: 'balance',
    },
  ],

  // 9. Red — تشریفات بردیا
  'cust-9': [
    {
      date: '1405/07/27',
      title: 'ایجاد فاکتور با شماره سفارش 102914',
      debitRial: 540_000_000,
      kind: 'debit',
      orderCode: '102914',
      settlementMethod: 'cash',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'تحویل‌شده — معوق (پرداخت علی‌الحساب)',
    },
    {
      date: '1405/08/10',
      title: 'ایجاد فاکتور با شماره سفارش 103248',
      debitRial: 400_000_000,
      kind: 'debit',
      orderCode: '103248',
      settlementMethod: 'cheque',
      driverName: 'حسین جعفری',
      deliverySlot: '۱۶ تا ۱۸',
      statusLabel: 'تحویل‌شده — چک صیادی معوق',
      cheque: {
        sayadiId: '4105519023846129',
        chequeNumber: '882104 / 31',
        bankName: 'بانک پارسیان',
        branchName: 'شعبه فرمانیه (کد ۱۰۴۸)',
        dueDate: '1405/08/27',
        amountRial: 400_000_000,
        status: 'pending',
        statusNote: '۵ روز از موعد مقرر گذشته؛ هماهنگی تمدید/تسویه با واحد مالی در جریان است.',
      },
    },
    {
      date: '1405/08/15',
      title: 'واریز بانکی علی‌الحساب بابت سفارش 102914',
      creditRial: 150_000_000,
      kind: 'credit',
      orderCode: '102914',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'حواله شبا از حساب مشتری',
        trackingCode: 'SHB-405081529144',
        paidAt: '۱۴۰۵/۰۸/۱۵ · ساعت ۱۶:۳۰',
        driverName: 'رضا احمدی',
      },
    },
    {
      date: '1405/08/27',
      title: 'مانده بدهی معوق طرف حساب (۵ روز تاخیر سررسید)',
      kind: 'balance',
    },
  ],

  // 10. Red — فست فود بمب علی
  'cust-10': [
    {
      date: '1405/08/14',
      title: 'ایجاد فاکتور با شماره سفارش 103284',
      debitRial: 158_000_000,
      kind: 'debit',
      orderCode: '103284',
      settlementMethod: 'cash',
      driverName: 'سعید محمدی',
      deliverySlot: '۱۲ تا ۱۴',
      statusLabel: 'تحویل‌شده — واریز جزئی کارت‌خوان',
    },
    {
      date: '1405/08/19',
      title: 'واریز جزئی کارت‌خوان بابت سفارش 103284',
      creditRial: 40_000_000,
      kind: 'credit',
      orderCode: '103284',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'کارت‌خوان سیار راننده',
        trackingCode: 'RRN-795328409',
        paidAt: '۱۴۰۵/۰۸/۱۹ · ساعت ۱۳:۵۰',
        driverName: 'سعید محمدی',
      },
    },
    {
      date: '1405/08/19',
      title: 'مانده بدهی پس از واریز جزئی',
      kind: 'balance',
      orderCode: '103284',
      settlementMethod: 'cash',
    },
    {
      date: '1405/08/26',
      title: 'ایجاد فاکتور با شماره سفارش 103495',
      debitRial: 150_000_000,
      kind: 'debit',
      orderCode: '103495',
      settlementMethod: 'cheque',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده — چک صیادی ۱۰ روزه',
      cheque: {
        sayadiId: '4105704219830016',
        chequeNumber: '204195 / 11',
        bankName: 'بانک سپه',
        branchName: 'شعبه گوهردشت کرج (کد ۱۵۷۴)',
        dueDate: '1405/08/29',
        amountRial: 150_000_000,
        status: 'pending',
        statusNote: '۳ روز تاخیر از سررسید؛ پیگیری وصول توسط واحد مالی.',
      },
    },
    {
      date: '1405/08/29',
      title: 'مانده بدهی جاری طرف حساب (۱۰۷٪ سقف — عبور از حد اعتبار)',
      kind: 'balance',
    },
  ],

  // 11. Black — رستوران یگانه (بلک‌لیست + چک برگشتی)
  'cust-11': [
    {
      date: '1405/07/05',
      title: 'ایجاد فاکتور با شماره سفارش 102612',
      debitRial: 242_000_000,
      kind: 'debit',
      orderCode: '102612',
      settlementMethod: 'cheque',
      driverName: 'رضا احمدی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'معوق — چک برگشتی و ارجاع به حقوقی',
    },
    {
      date: '1405/07/12',
      title: 'دریافت چک صیادی بابت سفارش 102612',
      creditRial: 142_000_000,
      kind: 'credit',
      orderCode: '102612',
      settlementMethod: 'cheque',
      cheque: {
        sayadiId: '4105390148227610',
        chequeNumber: '911240 / 09',
        bankName: 'بانک ملی ایران',
        branchName: 'شعبه میدان آزادی (کد ۰۱۲۸)',
        dueDate: '1405/07/20',
        amountRial: 142_000_000,
        status: 'bounced',
        statusNote: 'در تاریخ ۲۰ مهر به دلیل کسری موجودی برگشت خورد و گواهی عدم پرداخت صادر شد.',
      },
    },
    {
      date: '1405/07/20',
      title: 'برگشت چک صیادی (عدم موجودی) — بازگشت به بدهکار',
      debitRial: 142_000_000,
      kind: 'debit',
      orderCode: '102612',
      settlementMethod: 'cheque',
      cheque: {
        sayadiId: '4105390148227610',
        chequeNumber: '911240 / 09',
        bankName: 'بانک ملی ایران',
        branchName: 'شعبه میدان آزادی (کد ۰۱۲۸)',
        dueDate: '1405/07/20',
        amountRial: 142_000_000,
        status: 'bounced',
        statusNote: 'برگشت چک به دلیل عدم موجودی؛ پرونده جهت پیگیری قضایی به واحد حقوقی ارجاع شد.',
      },
    },
    {
      date: '1405/07/20',
      title: 'مانده بدهی پس از برگشت چک سفارش 102612',
      kind: 'balance',
      orderCode: '102612',
      settlementMethod: 'cheque',
    },
    {
      date: '1405/08/02',
      title: 'ایجاد فاکتور با شماره سفارش 103118',
      debitRial: 100_000_000,
      kind: 'debit',
      orderCode: '103118',
      settlementMethod: 'cheque',
      driverName: 'حسین جعفری',
      deliverySlot: '۱۴ تا ۱۶',
      statusLabel: 'معوق — چک برگشتی دوم',
      cheque: {
        sayadiId: '4105390148227994',
        chequeNumber: '911245 / 09',
        bankName: 'بانک ملی ایران',
        branchName: 'شعبه میدان آزادی (کد ۰۱۲۸)',
        dueDate: '1405/08/18',
        amountRial: 100_000_000,
        status: 'bounced',
        statusNote: 'چک دوم نیز برگشت خورد و طرف حساب به فهرست سیاه (بلک‌لیست) منتقل گردید.',
      },
    },
    {
      date: '1405/08/25',
      title: 'مانده بدهی معوق (ارجاع به واحد حقوقی — بلک‌لیست)',
      kind: 'balance',
    },
  ],

  // 12. Black — شرکت سپهر کابل ایرانیان
  'cust-12': [
    {
      date: '1405/07/04',
      title: 'ایجاد فاکتور سلف پرسنلی با شماره سفارش 102590',
      debitRial: 520_000_000,
      kind: 'debit',
      orderCode: '102590',
      settlementMethod: 'cash',
      driverName: 'مهدی رضایی',
      deliverySlot: '۱۰ تا ۱۲',
      statusLabel: 'تحویل‌شده — معوق (پرداخت جزئی نقدی)',
    },
    {
      date: '1405/07/25',
      title: 'واریز جزئی از حساب شرکت بابت سفارش 102590',
      creditRial: 70_000_000,
      kind: 'credit',
      orderCode: '102590',
      settlementMethod: 'cash',
      cash: {
        channelLabel: 'حواله بانکی پایا (جزئی)',
        trackingCode: 'PAYA-771025904',
        paidAt: '۱۴۰۵/۰۷/۲۵ · ساعت ۱۴:۱۲',
        driverName: 'مهدی رضایی',
      },
    },
    {
      date: '1405/08/18',
      title: 'مانده بدهی معوق طرف حساب (مسدود و بلک‌لیست)',
      kind: 'balance',
    },
  ],
};

function orderMatchesCustomer(order: Order, customer: CustomerRecord): boolean {
  if (order.customerId && order.customerId === customer.id) return true;
  const orderName = order.customerName.trim();
  const custName = customer.name.trim();
  if (!orderName || !custName) return false;
  if (orderName === custName) return true;
  const orderBase = orderName.split('/')[0]?.trim();
  const custBase = custName.split('/')[0]?.trim();
  return Boolean(orderBase && custBase && orderBase === custBase);
}

function buildLiveReturnSpecsForCustomer(
  customer: CustomerRecord,
  liveOrders?: Order[]
): RawLedgerSpec[] {
  if (!liveOrders || liveOrders.length === 0) return [];

  const specs: RawLedgerSpec[] = [];

  for (const order of liveOrders) {
    if (order.status !== 'returned' || !order.returnRecord) continue;
    const rec = order.returnRecord;
    const isFinalized =
      rec.stage === 'completed' ||
      (rec.confirmations.production.confirmed &&
        rec.confirmations.finance.confirmed &&
        rec.confirmations.shipping.confirmed);
    if (!isFinalized) continue;
    if (!orderMatchesCustomer(order, customer)) continue;

    const unitPriceById = new Map<string, number>();
    order.items.forEach((it) => unitPriceById.set(it.id, it.unitPrice));

    const returnItems: AccountingReturnItem[] = rec.items.map((ret) => {
      const verifiedKg = Number((ret.shippingWeight ?? ret.weight).toFixed(2));
      const unitPriceRial = ret.unitPrice ?? unitPriceById.get(ret.itemId) ?? 0;
      const totalRial = ret.totalRial ?? Math.round(verifiedKg * unitPriceRial);
      return {
        id: ret.itemId,
        productName: ret.productName,
        driverWeightKg: ret.driverWeight,
        shippingWeightKg: verifiedKg,
        unitPriceRial,
        totalRial,
      };
    });

    const totalWeightKg = Number(
      returnItems.reduce((sum, it) => sum + it.shippingWeightKg, 0).toFixed(2)
    );
    const totalPriceRial = returnItems.reduce((sum, it) => sum + it.totalRial, 0);
    if (totalWeightKg <= 0) continue;

    const scope: 'full_order' | 'partial' = rec.scope ?? 'partial';
    const scopeLabel =
      scope === 'full_order' ? 'مرجوعی کل سفارش' : 'مرجوعی بخشی از سفارش';

    specs.push({
      date: order.deliveryDate.replace(/-/g, '/'),
      title: `مرجوعی سفارش ${order.code} — حجم: ${formatWeight(totalWeightKg)} (${scopeLabel})`,
      creditRial: totalPriceRial,
      kind: 'credit',
      orderCode: order.code,
      driverName: rec.driverName || order.driverName || undefined,
      deliverySlot: order.deliverySlot,
      statusLabel: 'مرجوعی تایید نهایی‌شده (ثبت حجم و قیمت)',
      returnDetails: {
        scope,
        totalWeightKg,
        totalPriceRial,
        driverName: rec.driverName || order.driverName || undefined,
        shippingReceivedAt: rec.shippingReceivedAt ?? rec.timestamp,
        notes: rec.notes,
        items: returnItems,
      },
    });
  }

  return specs;
}

/**
 * Returns read-only Excel-style accounting ledger entries for any customer,
 * enriched with order items, settlement method (cash vs cheque), cheque info,
 * driver invoice/receipt photos, and finalized return volume/price records.
 */
export function getCustomerAccountingEntries(
  customer: CustomerRecord,
  liveOrders?: Order[]
): CustomerAccountingEntry[] {
  const liveReturnSpecs = buildLiveReturnSpecsForCustomer(customer, liveOrders);

  const seeded = SEEDED_SPECS_BY_CUSTOMER_ID[customer.id];
  if (seeded) {
    return buildLedger(
      customer.id,
      customer,
      [...seeded, ...liveReturnSpecs],
      liveOrders
    );
  }

  const baseOrderNum = String(
    103600 + (parseInt(customer.accountCode, 10) % 300 || 25)
  );

  if (
    customer.credit.paymentMode === 'cash' ||
    customer.credit.usedCreditRial <= 0
  ) {
    return buildLedger(
      customer.id,
      customer,
      [
        {
          date: '1405/09/01',
          title: `ایجاد فاکتور با شماره سفارش ${baseOrderNum}`,
          debitRial: 85_000_000,
          kind: 'debit',
          orderCode: baseOrderNum,
          settlementMethod: 'cash',
          driverName: 'رضا احمدی',
          deliverySlot: '۱۰ تا ۱۲',
          statusLabel: 'تحویل‌شده و تسویه کامل نقدی',
        },
        {
          date: '1405/09/01',
          title: `دریافت تسویه نقدی بابت سفارش ${baseOrderNum}`,
          creditRial: 85_000_000,
          kind: 'credit',
          orderCode: baseOrderNum,
          settlementMethod: 'cash',
          cash: {
            channelLabel: 'کارت‌خوان سیار در محل',
            trackingCode: `RRN-90${baseOrderNum}`,
            paidAt: '۱۴۰۵/۰۹/۰۱ · ساعت ۱۱:۲۰',
            driverName: 'رضا احمدی',
          },
        },
        {
          date: '1405/09/01',
          title: 'مانده بدهی جاری طرف حساب',
          kind: 'balance',
        },
        ...liveReturnSpecs,
      ],
      liveOrders
    );
  }

  const paidPart = Math.round(customer.credit.usedCreditRial * 0.35);
  const firstInvoice = customer.credit.usedCreditRial + paidPart;

  return buildLedger(
    customer.id,
    customer,
    [
      {
        date: '1405/08/24',
        title: `ایجاد فاکتور با شماره سفارش ${baseOrderNum}`,
        debitRial: firstInvoice,
        kind: 'debit',
        orderCode: baseOrderNum,
        settlementMethod: 'cheque',
        driverName: 'سعید محمدی',
        deliverySlot: '۱۲ تا ۱۴',
        statusLabel: 'تحویل‌شده — تسویه چکی',
      },
      {
        date: '1405/08/28',
        title: `دریافت چک صیادی بابت سفارش ${baseOrderNum}`,
        creditRial: paidPart,
        kind: 'credit',
        orderCode: baseOrderNum,
        settlementMethod: 'cheque',
        cheque: {
          sayadiId: `41058820${baseOrderNum}41`,
          chequeNumber: `${baseOrderNum.slice(-5)} / 14`,
          bankName: 'بانک ملت',
          branchName: 'شعبه مرکزی تهران',
          dueDate: customer.credit.dueDateJalali ?? '1405/09/25',
          amountRial: paidPart,
          status: 'pending',
          statusNote: 'چک صیادی در سامانه ثبت و تایید شده است.',
        },
      },
      {
        date: '1405/08/28',
        title: 'مانده بدهی جاری طرف حساب',
        kind: 'balance',
      },
      ...liveReturnSpecs,
    ],
    liveOrders
  );
}
