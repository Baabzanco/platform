import { CustomerAccountingEntry, CustomerRecord } from '../types/customer';

interface RawLedgerSpec {
  date: string;
  title: string;
  debitRial?: number;
  creditRial?: number;
  kind: 'debit' | 'credit' | 'balance';
}

function buildLedger(
  prefix: string,
  rows: RawLedgerSpec[]
): CustomerAccountingEntry[] {
  let balance = 0;
  return rows.map((row, idx) => {
    const debit = row.debitRial ?? 0;
    const credit = row.creditRial ?? 0;
    balance = balance + debit - credit;
    return {
      id: `${prefix}-acc-${idx + 1}`,
      date: row.date,
      title: row.title,
      debitRial: debit,
      creditRial: credit,
      runningBalanceRial: balance,
      kind: row.kind,
    };
  });
}

const SEEDED_ACCOUNTING_BY_CUSTOMER_ID: Record<
  string,
  CustomerAccountingEntry[]
> = {
  // 1. Green Cash — رستوران بورسا کباب اوی (تسویه کامل نقدی)
  'cust-1': buildLedger('cust-1', [
    {
      date: '1405/08/08',
      title: 'ایجاد فاکتور با شماره سفارش 103205',
      debitRial: 142_500_000,
      kind: 'debit',
    },
    {
      date: '1405/08/08',
      title: 'دریافت وجه کارت‌خوان در محل بابت سفارش 103205',
      creditRial: 142_500_000,
      kind: 'credit',
    },
    {
      date: '1405/08/08',
      title: 'مانده بدهی پس از تسویه فاکتور 103205',
      kind: 'balance',
    },
    {
      date: '1405/08/19',
      title: 'ایجاد فاکتور با شماره سفارش 103348',
      debitRial: 118_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/19',
      title: 'واریز نقدی شبا بابت تسویه سفارش 103348',
      creditRial: 118_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/19',
      title: 'مانده بدهی پس از تسویه فاکتور 103348',
      kind: 'balance',
    },
    {
      date: '1405/08/28',
      title: 'ایجاد فاکتور با شماره سفارش 103512',
      debitRial: 164_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/28',
      title: 'دریافت وجه کارت‌خوان در محل بابت سفارش 103512',
      creditRial: 164_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/28',
      title: 'مانده بدهی جاری طرف حساب (تسویه کامل)',
      kind: 'balance',
    },
  ]),

  // 2. Green Credit — باغ تالار قصر سفید (مانده 180 میلیون ریال)
  'cust-2': buildLedger('cust-2', [
    {
      date: '1405/08/04',
      title: 'ایجاد فاکتور با شماره سفارش 103190',
      debitRial: 240_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/25',
      title: 'وصول چک صیادی بابت تسویه فاکتور 103190',
      creditRial: 240_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/25',
      title: 'مانده بدهی پس از وصول چک سفارش 103190',
      kind: 'balance',
    },
    {
      date: '1405/08/30',
      title: 'ایجاد فاکتور با شماره سفارش 103560',
      debitRial: 280_000_000,
      kind: 'debit',
    },
    {
      date: '1405/09/01',
      title: 'واریز علی‌الحساب بانکی بابت سفارش 103560',
      creditRial: 100_000_000,
      kind: 'credit',
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (سررسید ۱۹ آذر)',
      kind: 'balance',
    },
  ]),

  // 3. Green Credit — هتل آرمان تهران (مانده 350 میلیون ریال)
  'cust-3': buildLedger('cust-3', [
    {
      date: '1405/08/02',
      title: 'ایجاد فاکتور رسمی با شماره سفارش 103144',
      debitRial: 420_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/18',
      title: 'حواله پایا از حساب شرکتی بابت سفارش 103144',
      creditRial: 420_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/18',
      title: 'مانده بدهی پس از تسویه فاکتور 103144',
      kind: 'balance',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور رسمی با شماره سفارش 103610',
      debitRial: 350_000_000,
      kind: 'debit',
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (در مهلت اعتباری ۴۵ روزه)',
      kind: 'balance',
    },
  ]),

  // 4. Green Cash — تهیه غذای به‌پخت شعبه ۲ (تسویه نقدی)
  'cust-4': buildLedger('cust-4', [
    {
      date: '1405/08/22',
      title: 'ایجاد فاکتور با شماره سفارش 103402',
      debitRial: 96_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/22',
      title: 'واریز آنی کارت به کارت بابت سفارش 103402',
      creditRial: 96_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/22',
      title: 'مانده بدهی پس از تسویه فاکتور 103402',
      kind: 'balance',
    },
    {
      date: '1405/08/30',
      title: 'ایجاد فاکتور با شماره سفارش 103589',
      debitRial: 112_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/30',
      title: 'دریافت کارت‌خوان بابت سفارش 103589',
      creditRial: 112_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/30',
      title: 'مانده بدهی جاری طرف حساب',
      kind: 'balance',
    },
  ]),

  // 5. Yellow — رستوران قصر ماه منیر (مانده 455 میلیون از 500 میلیون ریال)
  'cust-5': buildLedger('cust-5', [
    {
      date: '1405/08/10',
      title: 'ایجاد فاکتور با شماره سفارش 103240',
      debitRial: 295_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/16',
      title: 'پرداخت جزئی بانکی بابت سفارش 103240',
      creditRial: 120_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/16',
      title: 'مانده بدهی پس از پرداخت جزئی سفارش 103240',
      kind: 'balance',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور با شماره سفارش 103618',
      debitRial: 280_000_000,
      kind: 'debit',
    },
    {
      date: '1405/09/01',
      title: 'مانده بدهی جاری طرف حساب (۹۱٪ سقف اعتبار مصرف‌شده)',
      kind: 'balance',
    },
  ]),

  // 6. Yellow — رستوران کلک‌چال (مانده 270 میلیون ریال، ۲ روز تا سررسید)
  'cust-6': buildLedger('cust-6', [
    {
      date: '1405/08/19',
      title: 'ایجاد فاکتور با شماره سفارش 103355',
      debitRial: 320_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/24',
      title: 'واریز پیش‌پرداخت نقدی بابت سفارش 103355',
      creditRial: 50_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/24',
      title: 'مانده بدهی جاری طرف حساب (نزدیک به سررسید ۴ آذر)',
      kind: 'balance',
    },
  ]),

  // 7. Yellow — کبابی ناب (مانده 265 میلیون ریال)
  'cust-7': buildLedger('cust-7', [
    {
      date: '1405/08/17',
      title: 'ایجاد فاکتور با شماره سفارش 103329',
      debitRial: 190_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/21',
      title: 'واریز بانکی بابت سفارش 103329',
      creditRial: 85_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/21',
      title: 'مانده بدهی پس از تسویه جزئی سفارش 103329',
      kind: 'balance',
    },
    {
      date: '1405/08/29',
      title: 'ایجاد فاکتور با شماره سفارش 103540',
      debitRial: 160_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/29',
      title: 'مانده بدهی جاری طرف حساب (۸۸٪ سقف · ۳ روز تا سررسید)',
      kind: 'balance',
    },
  ]),

  // 8. Red — دیزی‌سرای ولیعصر (سقف 350 میلیون تکمیل 100%)
  'cust-8': buildLedger('cust-8', [
    {
      date: '1405/08/15',
      title: 'ایجاد فاکتور با شماره سفارش 103298',
      debitRial: 210_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/20',
      title: 'پرداخت نقدی بخشی از سفارش 103298',
      creditRial: 60_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/20',
      title: 'مانده بدهی پس از واریز جزئی سفارش 103298',
      kind: 'balance',
    },
    {
      date: '1405/09/01',
      title: 'ایجاد فاکتور با شماره سفارش 103604',
      debitRial: 200_000_000,
      kind: 'debit',
    },
    {
      date: '1405/09/02',
      title: 'مانده بدهی جاری طرف حساب (تکمیل ۱۰۰٪ سقف اعتبار)',
      kind: 'balance',
    },
  ]),

  // 9. Red — تشریفات بردیا (مانده 790 میلیون ریال، ۵ روز معوق)
  'cust-9': buildLedger('cust-9', [
    {
      date: '1405/07/27',
      title: 'ایجاد فاکتور با شماره سفارش 102914',
      debitRial: 540_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/10',
      title: 'ایجاد فاکتور با شماره سفارش 103248',
      debitRial: 400_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/15',
      title: 'واریز بانکی علی‌الحساب بابت سفارش 102914',
      creditRial: 150_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/27',
      title: 'مانده بدهی معوق طرف حساب (۵ روز تاخیر سررسید)',
      kind: 'balance',
    },
  ]),

  // 10. Red — فست فود بمب علی (مانده 268 میلیون ریال — عبور از سقف)
  'cust-10': buildLedger('cust-10', [
    {
      date: '1405/08/14',
      title: 'ایجاد فاکتور با شماره سفارش 103284',
      debitRial: 158_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/19',
      title: 'واریز جزئی کارت‌خوان بابت سفارش 103284',
      creditRial: 40_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/19',
      title: 'مانده بدهی پس از واریز جزئی',
      kind: 'balance',
    },
    {
      date: '1405/08/26',
      title: 'ایجاد فاکتور با شماره سفارش 103495',
      debitRial: 150_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/29',
      title: 'مانده بدهی جاری طرف حساب (۱۰۷٪ سقف — عبور از حد اعتبار)',
      kind: 'balance',
    },
  ]),

  // 11. Black — رستوران یگانه (بلک‌لیست — 342 میلیون معوق + چک برگشتی)
  'cust-11': buildLedger('cust-11', [
    {
      date: '1405/07/05',
      title: 'ایجاد فاکتور با شماره سفارش 102612',
      debitRial: 242_000_000,
      kind: 'debit',
    },
    {
      date: '1405/07/12',
      title: 'دریافت چک صیادی بابت سفارش 102612',
      creditRial: 142_000_000,
      kind: 'credit',
    },
    {
      date: '1405/07/20',
      title: 'برگشت چک صیادی (عدم موجودی) — بازگشت به بدهکار',
      debitRial: 142_000_000,
      kind: 'debit',
    },
    {
      date: '1405/07/20',
      title: 'مانده بدهی پس از برگشت چک سفارش 102612',
      kind: 'balance',
    },
    {
      date: '1405/08/02',
      title: 'ایجاد فاکتور با شماره سفارش 103118',
      debitRial: 100_000_000,
      kind: 'debit',
    },
    {
      date: '1405/08/25',
      title: 'مانده بدهی معوق (ارجاع به واحد حقوقی — بلک‌لیست)',
      kind: 'balance',
    },
  ]),

  // 12. Black — شرکت سپهر کابل ایرانیان (بلک‌لیست — 450 میلیون معوق)
  'cust-12': buildLedger('cust-12', [
    {
      date: '1405/07/04',
      title: 'ایجاد فاکتور سلف پرسنلی با شماره سفارش 102590',
      debitRial: 520_000_000,
      kind: 'debit',
    },
    {
      date: '1405/07/25',
      title: 'واریز جزئی از حساب شرکت بابت سفارش 102590',
      creditRial: 70_000_000,
      kind: 'credit',
    },
    {
      date: '1405/08/18',
      title: 'مانده بدهی معوق طرف حساب (مسدود و بلک‌لیست)',
      kind: 'balance',
    },
  ]),
};

/**
 * Returns read-only Excel-style accounting ledger entries for any customer.
 * Uses seeded ledgers for built-in accounts and generates a realistic ledger for newly created accounts.
 */
export function getCustomerAccountingEntries(
  customer: CustomerRecord
): CustomerAccountingEntry[] {
  const seeded = SEEDED_ACCOUNTING_BY_CUSTOMER_ID[customer.id];
  if (seeded) return seeded;

  const baseOrderNum = 103600 + (parseInt(customer.accountCode, 10) % 300 || 25);

  if (customer.credit.paymentMode === 'cash' || customer.credit.usedCreditRial <= 0) {
    return buildLedger(customer.id, [
      {
        date: '1405/09/01',
        title: `ایجاد فاکتور با شماره سفارش ${baseOrderNum}`,
        debitRial: 85_000_000,
        kind: 'debit',
      },
      {
        date: '1405/09/01',
        title: `دریافت تسویه نقدی بابت سفارش ${baseOrderNum}`,
        creditRial: 85_000_000,
        kind: 'credit',
      },
      {
        date: '1405/09/01',
        title: 'مانده بدهی جاری طرف حساب',
        kind: 'balance',
      },
    ]);
  }

  const paidPart = Math.round(customer.credit.usedCreditRial * 0.35);
  const firstInvoice = customer.credit.usedCreditRial + paidPart;

  return buildLedger(customer.id, [
    {
      date: '1405/08/24',
      title: `ایجاد فاکتور با شماره سفارش ${baseOrderNum}`,
      debitRial: firstInvoice,
      kind: 'debit',
    },
    {
      date: '1405/08/28',
      title: `دریافت واریزی مشتری بابت سفارش ${baseOrderNum}`,
      creditRial: paidPart,
      kind: 'credit',
    },
    {
      date: '1405/08/28',
      title: 'مانده بدهی جاری طرف حساب',
      kind: 'balance',
    },
  ]);
}
