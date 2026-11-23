import { useCallback, useEffect, useState } from 'react';
import {
  CURRENT_LOGGED_USER,
  INITIAL_CUSTOMERS,
} from '../data/initialCustomers';
import {
  CustomerCallItem,
  CustomerContact,
  CustomerCreditInfo,
  CustomerEventItem,
  CustomerRecord,
  CustomerRelationshipType,
  CustomerStandingTier,
} from '../types/customer';
import { formatTimeStamp } from '../utils/formatters';

const CUSTOMER_STORAGE_KEY = 'crm_customers_state_v1';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowJalaliStamp(): string {
  return `۲ آذر ۱۴۰۵ ${formatTimeStamp()}`;
}

export function buildFinancialStatusLabel(
  standing: CustomerStandingTier,
  credit: CustomerCreditInfo
): string {
  if (standing === 'black') {
    return 'بلک‌لیست — فروش مسدود';
  }
  if (standing === 'green') {
    if (credit.paymentMode === 'cash') {
      return 'نقدی — تسویه در محل';
    }
    const remainingM = Math.max(
      0,
      Math.round((credit.creditLimitRial - credit.usedCreditRial) / 1_000_000)
    );
    return `اعتباری فعال — ${new Intl.NumberFormat('fa-IR').format(remainingM)} میلیون ریال مانده`;
  }
  if (standing === 'yellow') {
    const pct =
      credit.creditLimitRial > 0
        ? Math.round((credit.usedCreditRial / credit.creditLimitRial) * 100)
        : 0;
    if (credit.daysRemaining !== null && credit.daysRemaining <= 4 && pct >= 80) {
      return `هشدار سقف و موعد (${new Intl.NumberFormat('fa-IR').format(pct)}٪ · ${new Intl.NumberFormat('fa-IR').format(Math.max(0, credit.daysRemaining))} روز)`;
    }
    if (credit.daysRemaining !== null && credit.daysRemaining <= 5) {
      return `نزدیک به موعد تسویه (${new Intl.NumberFormat('fa-IR').format(Math.max(0, credit.daysRemaining))} روز مانده)`;
    }
    return `هشدار سقف ریالی (${new Intl.NumberFormat('fa-IR').format(pct)}٪ مصرف‌شده)`;
  }
  // red
  const pct =
    credit.creditLimitRial > 0
      ? Math.round((credit.usedCreditRial / credit.creditLimitRial) * 100)
      : 100;
  if (credit.daysRemaining !== null && credit.daysRemaining < 0) {
    return `معوق (${new Intl.NumberFormat('fa-IR').format(Math.abs(credit.daysRemaining))} روز تاخیر · ${new Intl.NumberFormat('fa-IR').format(pct)}٪ سقف)`;
  }
  if (pct > 100) {
    return `عبور از سقف اعتبار (${new Intl.NumberFormat('fa-IR').format(pct)}٪)`;
  }
  return 'سقف اعتبار تکمیل شد (۱۰۰٪)';
}

function loadInitialCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CustomerRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seeded customers
  }
  return INITIAL_CUSTOMERS;
}

export interface CreateCustomerPayload {
  name: string;
  managerName: string;
  businessType: string;
  relationshipType: CustomerRelationshipType;
  phone: string;
  province: string;
  city: string;
  address: string;
  salesRep: string;
  crmRep: string;
  standing: CustomerStandingTier;
  credit: CustomerCreditInfo;
  notes: string;
}

export function useCustomerStore() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(() =>
    loadInitialCustomers()
  );

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
    } catch {
      // Ignore quota errors
    }
  }, [customers]);

  const createCustomer = useCallback(
    (payload: CreateCustomerPayload): CustomerRecord => {
      const stamp = nowJalaliStamp();
      const nextCodeNum = 25360 + Math.floor(Math.random() * 500);
      const financialStatusLabel = buildFinancialStatusLabel(
        payload.standing,
        payload.credit
      );

      const newCustomer: CustomerRecord = {
        id: createId('cust'),
        accountCode: String(nextCodeNum),
        name: payload.name.trim(),
        managerName: payload.managerName.trim(),
        businessType: payload.businessType,
        relationshipType: payload.relationshipType,
        acquisitionSource: 'بازاریابی تلفنی',
        province: payload.province,
        city: payload.city,
        mainBranch: 'شعبه مرکزی',
        address: payload.address.trim() || `${payload.province}، ${payload.city}`,
        economicCode: '—',
        nationalId: '—',
        salesRep: payload.salesRep,
        crmRep: payload.crmRep,
        isActive: payload.standing !== 'black',
        standing: payload.standing,
        financialStatusLabel,
        credit: payload.credit,
        notes: payload.notes.trim(),
        createdAt: stamp,
        createdBy: CURRENT_LOGGED_USER,
        createdByRole: 'مدیر کل سامانه',
        lastEditedBy: CURRENT_LOGGED_USER,
        lastEditedAt: stamp,
        followUpCreatedAt: stamp,
        followUpBy: payload.salesRep || CURRENT_LOGGED_USER,
        followUpTargetDate: '۵ آذر ۱۴۰۵',
        contacts: payload.phone.trim()
          ? [
              {
                id: createId('cnt'),
                name: payload.managerName.trim() || 'مسئول طرف حساب',
                roleOrNote: 'شماره تماس اصلی',
                phone: payload.phone.trim(),
              },
            ]
          : [],
        chatMessages: [
          {
            id: createId('msg'),
            from: CURRENT_LOGGED_USER,
            to: payload.salesRep || CURRENT_LOGGED_USER,
            text: 'طرف حساب جدید ایجاد و اختصاص داده شد.',
            timestampLabel: 'هم‌اکنون',
          },
        ],
        events: [
          {
            id: createId('ev'),
            title: 'ایجاد طرف حساب جدید',
            description: `طرف حساب با وضعیت «${financialStatusLabel}» ثبت شد.`,
            date: '۲ آذر ۱۴۰۵',
            by: CURRENT_LOGGED_USER,
            type: 'followup',
          },
        ],
        products: [],
        calls: [],
        smsHistory: [],
        menus: [],
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    },
    []
  );

  const updateCustomerBasic = useCallback(
    (
      customerId: string,
      updates: Partial<
        Pick<
          CustomerRecord,
          | 'accountCode'
          | 'name'
          | 'managerName'
          | 'businessType'
          | 'relationshipType'
          | 'acquisitionSource'
          | 'province'
          | 'city'
          | 'mainBranch'
          | 'address'
          | 'economicCode'
          | 'nationalId'
          | 'salesRep'
          | 'crmRep'
          | 'notes'
          | 'standing'
          | 'financialStatusLabel'
          | 'credit'
          | 'isActive'
        >
      >
    ) => {
      const stamp = nowJalaliStamp();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          const nextStanding = updates.standing ?? c.standing;
          const nextCredit = updates.credit ?? c.credit;
          const nextFinancialLabel =
            updates.financialStatusLabel ??
            (updates.standing || updates.credit
              ? buildFinancialStatusLabel(nextStanding, nextCredit)
              : c.financialStatusLabel);
          return {
            ...c,
            ...updates,
            standing: nextStanding,
            credit: nextCredit,
            financialStatusLabel: nextFinancialLabel,
            isActive:
              updates.isActive !== undefined
                ? updates.isActive
                : nextStanding === 'black'
                  ? false
                  : c.isActive,
            lastEditedBy: CURRENT_LOGGED_USER,
            lastEditedAt: stamp,
          };
        })
      );
    },
    []
  );

  const toggleCustomerActive = useCallback((customerId: string) => {
    const stamp = nowJalaliStamp();
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              isActive: !c.isActive,
              lastEditedBy: CURRENT_LOGGED_USER,
              lastEditedAt: stamp,
            }
          : c
      )
    );
  }, []);

  const assignRepsBulk = useCallback(
    (customerIds: string[], salesRep: string, crmRep: string) => {
      const idSet = new Set(customerIds);
      const stamp = nowJalaliStamp();
      setCustomers((prev) =>
        prev.map((c) => {
          if (!idSet.has(c.id)) return c;
          return {
            ...c,
            salesRep: salesRep || c.salesRep,
            crmRep: crmRep || c.crmRep,
            lastEditedBy: CURRENT_LOGGED_USER,
            lastEditedAt: stamp,
            chatMessages: [
              ...c.chatMessages,
              {
                id: createId('msg'),
                from: CURRENT_LOGGED_USER,
                to: salesRep || crmRep || c.salesRep,
                text: `تخصیص دیتا انجام شد${salesRep ? ` (کارشناس فروش: ${salesRep})` : ''}${crmRep ? ` (CRM: ${crmRep})` : ''}.`,
                timestampLabel: 'هم‌اکنون',
              },
            ],
          };
        })
      );
    },
    []
  );

  const sendSmsBulk = useCallback((customerIds: string[], messageText: string) => {
    const idSet = new Set(customerIds);
    const stamp = nowJalaliStamp();
    setCustomers((prev) =>
      prev.map((c) => {
        if (!idSet.has(c.id)) return c;
        const primaryPhone = c.contacts[0]?.phone ?? '—';
        return {
          ...c,
          smsHistory: [
            {
              id: createId('sms'),
              date: stamp,
              phone: primaryPhone,
              text: messageText,
              sentBy: CURRENT_LOGGED_USER,
            },
            ...c.smsHistory,
          ],
        };
      })
    );
  }, []);

  const addContact = useCallback(
    (customerId: string, contact: Omit<CustomerContact, 'id'>) => {
      const stamp = nowJalaliStamp();
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                lastEditedBy: CURRENT_LOGGED_USER,
                lastEditedAt: stamp,
                contacts: [
                  ...c.contacts,
                  { ...contact, id: createId('cnt') },
                ],
              }
            : c
        )
      );
    },
    []
  );

  const updateContact = useCallback(
    (customerId: string, contact: CustomerContact) => {
      const stamp = nowJalaliStamp();
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                lastEditedBy: CURRENT_LOGGED_USER,
                lastEditedAt: stamp,
                contacts: c.contacts.map((item) =>
                  item.id === contact.id ? contact : item
                ),
              }
            : c
        )
      );
    },
    []
  );

  const deleteContact = useCallback((customerId: string, contactId: string) => {
    const stamp = nowJalaliStamp();
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              lastEditedBy: CURRENT_LOGGED_USER,
              lastEditedAt: stamp,
              contacts: c.contacts.filter((item) => item.id !== contactId),
            }
          : c
      )
    );
  }, []);

  const addChatMessage = useCallback(
    (customerId: string, text: string, toName?: string) => {
      const clean = text.trim();
      if (!clean) return;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                chatMessages: [
                  ...c.chatMessages,
                  {
                    id: createId('msg'),
                    from: CURRENT_LOGGED_USER,
                    to: toName || c.crmRep || c.salesRep || 'تیم CRM',
                    text: clean,
                    timestampLabel: `امروز - ${formatTimeStamp()}`,
                  },
                ],
              }
            : c
        )
      );
    },
    []
  );

  const referToCrm = useCallback(
    (customerId: string, targetCrmRep: string, note: string) => {
      const stamp = nowJalaliStamp();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          return {
            ...c,
            crmRep: targetCrmRep || c.crmRep,
            lastEditedBy: CURRENT_LOGGED_USER,
            lastEditedAt: stamp,
            chatMessages: [
              ...c.chatMessages,
              {
                id: createId('msg'),
                from: CURRENT_LOGGED_USER,
                to: targetCrmRep || c.crmRep || 'واحد CRM',
                text: note.trim() || 'ارجاع به CRM انجام شد.',
                timestampLabel: `امروز - ${formatTimeStamp()}`,
              },
            ],
            events: [
              {
                id: createId('ev'),
                title: `ارجاع به CRM (${targetCrmRep || c.crmRep || 'تیم CRM'})`,
                description: note.trim() || 'پرونده مشتری جهت پیگیری به واحد CRM ارجاع شد.',
                date: '۲ آذر ۱۴۰۵',
                by: CURRENT_LOGGED_USER,
                type: 'referral',
              },
              ...c.events,
            ],
          };
        })
      );
    },
    []
  );

  const addEvent = useCallback(
    (customerId: string, event: Omit<CustomerEventItem, 'id' | 'date' | 'by'>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                events: [
                  {
                    ...event,
                    id: createId('ev'),
                    date: '۲ آذر ۱۴۰۵',
                    by: CURRENT_LOGGED_USER,
                  },
                  ...c.events,
                ],
              }
            : c
        )
      );
    },
    []
  );

  const addCallLog = useCallback(
    (customerId: string, call: Omit<CustomerCallItem, 'id' | 'date' | 'repName'>) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                calls: [
                  {
                    ...call,
                    id: createId('call'),
                    date: nowJalaliStamp(),
                    repName: CURRENT_LOGGED_USER,
                  },
                  ...c.calls,
                ],
              }
            : c
        )
      );
    },
    []
  );

  const resetCustomers = useCallback(() => {
    setCustomers(INITIAL_CUSTOMERS);
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  }, []);

  return {
    customers,
    createCustomer,
    updateCustomerBasic,
    toggleCustomerActive,
    assignRepsBulk,
    sendSmsBulk,
    addContact,
    updateContact,
    deleteContact,
    addChatMessage,
    referToCrm,
    addEvent,
    addCallLog,
    resetCustomers,
  };
}
