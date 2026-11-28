import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Banknote,
  Briefcase,
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Info,
  Lock,
  Phone,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Unlock,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ACQUISITION_SOURCES,
  BUSINESS_TYPES,
  CRM_REPS,
  CURRENT_LOGGED_USER,
  PROVINCES_CITIES,
  SALES_REPS,
  STANDING_TIER_STYLES,
} from '../../data/initialCustomers';
import { getCustomerAccountingEntries } from '../../data/customerAccountingData';
import { buildFinancialStatusLabel } from '../../hooks/useCustomerStore';
import {
  CustomerAccountingEntry,
  CustomerCallItem,
  CustomerContact,
  CustomerCreditInfo,
  CustomerEventItem,
  CustomerProfileTab,
  CustomerRecord,
  CustomerRelationshipType,
  CustomerStandingTier,
} from '../../types/customer';
import { Order } from '../../types/order';
import { formatRial, formatWeight } from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';
import { AccountingEntryDetailModal } from '../modals/AccountingEntryDetailModal';

interface CustomerProfilePageProps {
  customer: CustomerRecord;
  allCustomers: CustomerRecord[];
  orders?: Order[];
  onBackToList: () => void;
  onSwitchCustomer: (customerId: string) => void;
  onUpdateCustomer: (
    customerId: string,
    updates: Partial<CustomerRecord>
  ) => void;
  onToggleActive: (customerId: string) => void;
  onAddContact: (
    customerId: string,
    contact: Omit<CustomerContact, 'id'>
  ) => void;
  onUpdateContact: (customerId: string, contact: CustomerContact) => void;
  onDeleteContact: (customerId: string, contactId: string) => void;
  onAddChatMessage: (customerId: string, text: string, toName?: string) => void;
  onReferToCrm: (customerId: string, targetCrmRep: string, note: string) => void;
  onAddEvent: (
    customerId: string,
    event: Omit<CustomerEventItem, 'id' | 'date' | 'by'>
  ) => void;
  onAddCallLog: (
    customerId: string,
    call: Omit<CustomerCallItem, 'id' | 'date' | 'repName'>
  ) => void;
  onSendSms: (customerIds: string[], text: string) => void;
  onNotify: (
    title: string,
    message: string,
    tag: string,
    type?: 'success' | 'warning' | 'info' | 'danger'
  ) => void;
}

const PROFILE_TABS: Array<{
  id: CustomerProfileTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'basic', label: 'اطلاعات پایه', icon: Info },
  { id: 'accounting', label: 'رخداد حسابداری', icon: FileSpreadsheet },
  { id: 'marketer', label: 'بازاریاب', icon: Briefcase },
];

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({
  customer,
  allCustomers,
  orders,
  onBackToList,
  onSwitchCustomer,
  onUpdateCustomer,
  onToggleActive,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onAddChatMessage,
  onReferToCrm,
  onAddEvent,
  onAddCallLog,
  onSendSms,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<CustomerProfileTab>('basic');
  const [quickSearch, setQuickSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Basic Info Form controlled state
  const [businessType, setBusinessType] = useState(customer.businessType);
  const [accountCode, setAccountCode] = useState(customer.accountCode);
  const [name, setName] = useState(customer.name);
  const [province, setProvince] = useState(customer.province);
  const [city, setCity] = useState(customer.city);
  const [acquisitionSource, setAcquisitionSource] = useState(
    customer.acquisitionSource
  );
  const [mainBranch, setMainBranch] = useState(customer.mainBranch);
  const [salesRep, setSalesRep] = useState(customer.salesRep);
  const [crmRep, setCrmRep] = useState(customer.crmRep);
  const [relationshipType, setRelationshipType] =
    useState<CustomerRelationshipType>(customer.relationshipType);
  const [notes, setNotes] = useState(customer.notes);

  // Left Chat composer
  const [chatInput, setChatInput] = useState('');

  // Action Modals
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [referModalOpen, setReferModalOpen] = useState(false);
  const [proformaModalOpen, setProformaModalOpen] = useState(false);
  const [contactModal, setContactModal] = useState<{
    open: boolean;
    editing: CustomerContact | null;
  }>({ open: false, editing: null });

  // Financial Standing Editor state
  const [editStanding, setEditStanding] = useState<CustomerStandingTier>(
    customer.standing
  );
  const [editPaymentMode, setEditPaymentMode] = useState<'cash' | 'credit'>(
    customer.credit.paymentMode
  );
  const [editLimitM, setEditLimitM] = useState(
    String(Math.round(customer.credit.creditLimitRial / 1_000_000))
  );
  const [editUsedM, setEditUsedM] = useState(
    String(Math.round(customer.credit.usedCreditRial / 1_000_000))
  );
  const [editDaysRem, setEditDaysRem] = useState(
    customer.credit.daysRemaining !== null
      ? String(customer.credit.daysRemaining)
      : '15'
  );
  const [editReason, setEditReason] = useState(
    customer.credit.blacklistReason || customer.credit.warningReason || ''
  );

  // Assign / Refer / Proforma / Contact form states
  const [modalSalesRep, setModalSalesRep] = useState(customer.salesRep);
  const [modalCrmRep, setModalCrmRep] = useState(customer.crmRep);
  const [referTargetRep, setReferTargetRep] = useState(
    customer.crmRep || CRM_REPS[0]
  );
  const [referNote, setReferNote] = useState('');
  const [proformaAmountM, setProformaAmountM] = useState('45');
  const [proformaNote, setProformaNote] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Sync local form state whenever switched to a different customer
  useEffect(() => {
    setBusinessType(customer.businessType);
    setAccountCode(customer.accountCode);
    setName(customer.name);
    setProvince(customer.province);
    setCity(customer.city);
    setAcquisitionSource(customer.acquisitionSource);
    setMainBranch(customer.mainBranch);
    setSalesRep(customer.salesRep);
    setCrmRep(customer.crmRep);
    setRelationshipType(customer.relationshipType);
    setNotes(customer.notes);

    setEditStanding(customer.standing);
    setEditPaymentMode(customer.credit.paymentMode);
    setEditLimitM(
      String(Math.round(customer.credit.creditLimitRial / 1_000_000))
    );
    setEditUsedM(
      String(Math.round(customer.credit.usedCreditRial / 1_000_000))
    );
    setEditDaysRem(
      customer.credit.daysRemaining !== null
        ? String(customer.credit.daysRemaining)
        : '15'
    );
    setEditReason(
      customer.credit.blacklistReason || customer.credit.warningReason || ''
    );
    setModalSalesRep(customer.salesRep);
    setModalCrmRep(customer.crmRep);
    setReferTargetRep(customer.crmRep || CRM_REPS[0]);
  }, [customer]);

  const tierStyle = STANDING_TIER_STYLES[customer.standing];

  const creditUsagePercent = useMemo(() => {
    if (
      customer.credit.paymentMode === 'cash' ||
      customer.credit.creditLimitRial <= 0
    ) {
      return 0;
    }
    return Math.round(
      (customer.credit.usedCreditRial / customer.credit.creditLimitRial) * 100
    );
  }, [customer.credit]);

  const remainingCreditRial = Math.max(
    0,
    customer.credit.creditLimitRial - customer.credit.usedCreditRial
  );

  const [selectedAccountingEntry, setSelectedAccountingEntry] =
    useState<CustomerAccountingEntry | null>(null);

  useEffect(() => {
    setSelectedAccountingEntry(null);
  }, [customer.id]);

  const accountingEntries = useMemo(
    () => getCustomerAccountingEntries(customer, orders),
    [customer, orders]
  );

  const accountingTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const row of accountingEntries) {
      totalDebit += row.debitRial;
      totalCredit += row.creditRial;
    }
    const finalBalance = totalDebit - totalCredit;
    return { totalDebit, totalCredit, finalBalance };
  }, [accountingEntries]);

  const quickSearchMatches = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    return allCustomers
      .filter(
        (c) =>
          c.id !== customer.id &&
          (c.name.toLowerCase().includes(q) ||
            c.accountCode.toLowerCase().includes(q) ||
            c.managerName.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [allCustomers, customer.id, quickSearch]);

  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer(customer.id, {
      businessType,
      accountCode: accountCode.trim() || customer.accountCode,
      name: name.trim() || customer.name,
      province,
      city,
      acquisitionSource,
      mainBranch: mainBranch.trim(),
      salesRep,
      crmRep,
      relationshipType,
      notes,
    });
    onNotify(
      'اطلاعات طرف حساب ذخیره شد',
      `تغییرات پرونده «${name.trim() || customer.name}» با موفقیت ثبت گردید.`,
      'پروفایل مشتری',
      'success'
    );
  };

  const handleSaveFinancialStanding = (e: React.FormEvent) => {
    e.preventDefault();
    const isCredit = editStanding !== 'green' || editPaymentMode === 'credit';
    const limitRial = isCredit
      ? Math.max(0, Number(editLimitM) || 0) * 1_000_000
      : 0;
    const usedRial = isCredit
      ? Math.max(0, Number(editUsedM) || 0) * 1_000_000
      : 0;
    const days = isCredit ? Number(editDaysRem) || 0 : null;

    const nextCredit: CustomerCreditInfo = {
      paymentMode: isCredit ? 'credit' : 'cash',
      creditLimitRial: limitRial,
      usedCreditRial: usedRial,
      creditTermDays: isCredit ? customer.credit.creditTermDays || 30 : 0,
      daysRemaining: days,
      dueDateJalali: isCredit
        ? customer.credit.dueDateJalali || '۱۵ آذر ۱۴۰۵'
        : undefined,
      warningReason:
        editStanding === 'yellow' || editStanding === 'red'
          ? editReason.trim() || undefined
          : undefined,
      blacklistReason:
        editStanding === 'black'
          ? editReason.trim() || 'مسدود شده توسط مدیریت مالی'
          : undefined,
    };

    const nextLabel = buildFinancialStatusLabel(editStanding, nextCredit);

    onUpdateCustomer(customer.id, {
      standing: editStanding,
      credit: nextCredit,
      financialStatusLabel: nextLabel,
      isActive: editStanding === 'black' ? false : true,
    });

    onAddEvent(customer.id, {
      title: `تغییر وضعیت مالی به «${STANDING_TIER_STYLES[editStanding].shortTitle}»`,
      description: nextLabel,
      type: 'financial',
    });

    onNotify(
      'وضعیت مالی و اعتباری به‌روزرسانی شد',
      `وضعیت طرف حساب به «${nextLabel}» تغییر یافت.`,
      'وضعیت مالی',
      editStanding === 'green'
        ? 'success'
        : editStanding === 'yellow'
          ? 'warning'
          : 'danger'
    );
    setFinancialModalOpen(false);
  };

  const handleCallPrimary = (phone?: string, contactLabel?: string) => {
    const targetPhone = phone || customer.contacts[0]?.phone;
    if (!targetPhone) {
      onNotify(
        'شماره تماس ثبت نشده',
        'ابتدا از جدول شماره‌های تماس یک شماره همراه اضافه کنید.',
        'تماس با مشتری',
        'warning'
      );
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetPhone).catch(() => {});
    }
    onAddCallLog(customer.id, {
      duration: '۰۰:۴۵',
      direction: 'outgoing',
      summary: `تماس با ${contactLabel || customer.managerName || customer.name} (${targetPhone})`,
    });
    onNotify(
      'تماس با مشتری',
      `شماره ${targetPhone} کپی شد و در تاریخچه تماس‌های مشتری ثبت گردید.`,
      'پروفایل مشتری',
      'info'
    );
  };

  const handleOpenAddContact = () => {
    setContactName('');
    setContactRole('');
    setContactPhone('');
    setContactModal({ open: true, editing: null });
  };

  const handleOpenEditContact = (cnt: CustomerContact) => {
    setContactName(cnt.name);
    setContactRole(cnt.roleOrNote);
    setContactPhone(cnt.phone);
    setContactModal({ open: true, editing: cnt });
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    if (contactModal.editing) {
      onUpdateContact(customer.id, {
        id: contactModal.editing.id,
        name: contactName.trim(),
        roleOrNote: contactRole.trim() || 'مخاطب',
        phone: contactPhone.trim(),
      });
      onNotify(
        'شماره تماس ویرایش شد',
        `اطلاعات تماس «${contactName.trim()}» به‌روزرسانی گردید.`,
        'مخاطبین مشتری',
        'success'
      );
    } else {
      onAddContact(customer.id, {
        name: contactName.trim(),
        roleOrNote: contactRole.trim() || 'مخاطب',
        phone: contactPhone.trim(),
      });
      onNotify(
        'شماره تماس جدید ثبت شد',
        `شماره «${contactName.trim()}» به لیست مخاطبین اضافه شد.`,
        'مخاطبین مشتری',
        'success'
      );
    }
    setContactModal({ open: false, editing: null });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onAddChatMessage(customer.id, chatInput.trim());
    setChatInput('');
  };

  const handleSubmitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer(customer.id, {
      salesRep: modalSalesRep,
      crmRep: modalCrmRep,
    });
    onAddChatMessage(
      customer.id,
      `تخصیص دیتا انجام شد (فروش: ${modalSalesRep || '—'} · CRM: ${modalCrmRep || '—'})`,
      modalSalesRep || modalCrmRep
    );
    onNotify(
      'تخصیص دیتا ثبت شد',
      'کارشناس فروش و CRM این طرف حساب به‌روزرسانی شد.',
      'تخصیص دیتا',
      'success'
    );
    setAssignModalOpen(false);
  };

  const handleSubmitRefer = (e: React.FormEvent) => {
    e.preventDefault();
    onReferToCrm(customer.id, referTargetRep, referNote);
    onNotify(
      'ارجاع به CRM انجام شد',
      `پرونده به «${referTargetRep}» ارجاع داده شد و در پنل گفتگو ثبت گردید.`,
      'واحد CRM',
      'info'
    );
    setReferNote('');
    setReferModalOpen(false);
  };

  const handleSubmitProforma = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer.standing === 'black') {
      onNotify(
        'امکان ثبت پیش‌فاکتور وجود ندارد',
        'این مشتری در فهرست سیاه (بلک‌لیست) قرار دارد و فروش به آن مسدود است.',
        'محدودیت بلک‌لیست',
        'danger'
      );
      return;
    }
    const amountRial = Math.max(1, Number(proformaAmountM) || 0) * 1_000_000;
    onAddEvent(customer.id, {
      title: `ثبت پیش‌فاکتور به مبلغ ${formatRial(amountRial)}`,
      description: proformaNote.trim() || 'پیش‌فاکتور جدید از پروفایل مشتری ثبت شد.',
      type: 'financial',
    });
    onNotify(
      'پیش‌فاکتور ثبت شد',
      `پیش‌فاکتور به مبلغ ${formatRial(amountRial)} برای «${customer.name}» ثبت گردید.`,
      'ثبت پیش‌فاکتور',
      'success'
    );
    setProformaNote('');
    setProformaModalOpen(false);
  };

  const StandingIcon =
    customer.standing === 'green'
      ? CheckCircle2
      : customer.standing === 'yellow'
        ? Clock
        : customer.standing === 'red'
          ? ShieldAlert
          : Ban;

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Top Bar: Back Button + Global Customer Quick Search (matching Screenshot 2) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <button
          type="button"
          onClick={onBackToList}
          className="min-h-[44px] sm:min-h-[42px] inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-[#0f5864] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowRight className="w-4 h-4 text-[#0f5864]" />
          بازگشت به لیست طرف حساب‌ها
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={quickSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="جستجوی پیشرفته و جابه‌جایی سریع بین طرف حساب‌ها..."
            className="w-full h-11 sm:h-[42px] pr-4 pl-11 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0f5864]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          {searchFocused && quickSearchMatches.length > 0 && (
            <div className="absolute top-full inset-x-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
              {quickSearchMatches.map((match) => {
                const matchStyle = STANDING_TIER_STYLES[match.standing];
                return (
                  <button
                    key={match.id}
                    type="button"
                    onMouseDown={() => {
                      setQuickSearch('');
                      onSwitchCustomer(match.id);
                    }}
                    className="w-full px-4 py-2.5 text-right flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {match.name}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        کد {toPersianDigits(match.accountCode)} ·{' '}
                        {match.financialStatusLabel}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${matchStyle.rowBadgeClass}`}
                    >
                      {matchStyle.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* COLOR-CODED PROFILE HEADER CARD (Green / Yellow / Red / Black — matching Screenshot 2) */}
      <section
        className={`rounded-xl p-4 sm:p-5 shadow-xs transition-colors ${tierStyle.headerBgClass}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Right: Customer Logo Box */}
          <div className="flex items-center lg:items-start gap-3.5 shrink-0">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border flex flex-col items-center justify-center text-center p-2 shadow-2xs shrink-0 ${tierStyle.headerLogoBgClass}`}
            >
              <Building2 className="w-7 h-7 mb-1 opacity-85" />
              <span className="text-[10px] font-bold leading-tight opacity-75">
                کد {toPersianDigits(customer.accountCode)}
              </span>
            </div>

            {/* Mobile-only Tier Indicator */}
            <div className="lg:hidden flex-1 min-w-0 space-y-1">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${tierStyle.headerStatusPillClass}`}
              >
                <StandingIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{tierStyle.fullTitle}</span>
              </div>
              <h1
                className={`text-sm sm:text-base font-bold leading-snug ${tierStyle.headerTitleClass}`}
              >
                طرف حساب: {customer.name}
              </h1>
            </div>
          </div>

          {/* Center / Right Metadata Stack (exact fields from Screenshot 2) */}
          <div className="flex-1 min-w-0 space-y-1.5 text-xs sm:text-[13px]">
            <div className="hidden lg:flex flex-wrap items-center justify-between gap-2">
              <h1
                className={`text-base sm:text-lg font-bold leading-snug ${tierStyle.headerTitleClass}`}
              >
                طرف حساب: {customer.name}
              </h1>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 ${tierStyle.headerStatusPillClass}`}
              >
                <StandingIcon className="w-4 h-4 shrink-0" />
                {tierStyle.fullTitle}
              </span>
            </div>

            {/* Explicit Financial / Credit Status Banner Line inside Header */}
            <div
              className={`rounded-lg px-3 py-2 border text-xs leading-relaxed flex flex-wrap items-center justify-between gap-2 ${tierStyle.headerStatusPillClass}`}
            >
              <div className="font-bold flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>وضعیت مالی: {customer.financialStatusLabel}</span>
                {customer.credit.paymentMode === 'credit' &&
                  customer.credit.creditLimitRial > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        سقف: {formatRial(customer.credit.creditLimitRial)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        مصرف‌شده: {formatRial(customer.credit.usedCreditRial)} (
                        {toPersianDigits(creditUsagePercent)}٪)
                      </span>
                    </>
                  )}
              </div>
              {customer.credit.dueDateJalali &&
                customer.credit.paymentMode === 'credit' && (
                  <span className="tabular-nums font-semibold opacity-95">
                    سررسید: {customer.credit.dueDateJalali}
                  </span>
                )}
            </div>

            {(customer.credit.blacklistReason ||
              customer.credit.warningReason) && (
              <p
                className={`text-xs font-semibold leading-relaxed ${tierStyle.headerMetaClass}`}
              >
                {customer.standing === 'black' ? 'علت بلک‌لیست: ' : 'توضیح اعتبار: '}
                {customer.credit.blacklistReason ||
                  customer.credit.warningReason}
              </p>
            )}

            {/* Exact 4 metadata lines from Screenshot 2 */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-1 text-xs tabular-nums ${tierStyle.headerMetaClass}`}
            >
              <div>
                <span className="opacity-80">ایجاد پیگیری: </span>
                <strong className="font-semibold">
                  {customer.followUpCreatedAt}
                </strong>
                <span className="opacity-80"> توسط: </span>
                <strong className="font-semibold">{customer.followUpBy}</strong>
                <span className="opacity-80"> · زمان پیگیری: </span>
                <strong className="font-semibold">
                  {customer.followUpTargetDate}
                </strong>
              </div>
              <div>
                <span className="opacity-80">زمان ایجاد طرف حساب: </span>
                <strong className="font-semibold">{customer.createdAt}</strong>
              </div>
              <div>
                <span className="opacity-80">ایجاد کننده: </span>
                <strong className="font-semibold">
                  {customer.createdBy} — عنوان: {customer.createdByRole}
                </strong>
              </div>
              <div>
                <span className="opacity-80">آخرین ویرایش‌کننده: </span>
                <strong className="font-semibold">
                  {customer.lastEditedBy} — {customer.lastEditedAt}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons Row (exact 6 buttons from Screenshot 2!) */}
        <div
          className={`mt-4 pt-3.5 border-t flex flex-wrap items-center justify-end gap-2 ${tierStyle.headerDividerClass}`}
        >
          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerActionBtnClass}`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            تخصیص دیتا
          </button>

          <button
            type="button"
            onClick={() => setFinancialModalOpen(true)}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerFinancialBtnClass}`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            وضعیت مالی
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleActive(customer.id);
              onNotify(
                customer.isActive ? 'طرف حساب غیرفعال شد' : 'طرف حساب فعال شد',
                `وضعیت فعالیت «${customer.name}» تغییر یافت.`,
                'پروفایل مشتری',
                customer.isActive ? 'warning' : 'success'
              );
            }}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerActionBtnClass}`}
          >
            {customer.isActive ? (
              <>
                <Lock className="w-3.5 h-3.5 shrink-0" />
                غیرفعال کردن
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 shrink-0" />
                فعال کردن
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleCallPrimary()}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerActionBtnClass}`}
          >
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            تماس با مشتری
          </button>

          <button
            type="button"
            onClick={() => setProformaModalOpen(true)}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerActionBtnClass}`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            ثبت پیش‌فاکتور
          </button>

          <button
            type="button"
            onClick={() => setReferModalOpen(true)}
            className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.headerActionBtnClass}`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            ارجاع به CRM
          </button>
        </div>
      </section>

      {/* HORIZONTAL PROFILE TABS (exact 8 tabs from Screenshot 2) */}
      <nav
        aria-label="بخش‌های پروفایل مشتری"
        className="bg-white border border-slate-200 rounded-xl px-2 sm:px-3 overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center gap-1 min-w-max">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[46px] inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'text-[#0f5864] border-[#0f5864]'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* TWO-COLUMN PROFILE WORKSPACE (Right 66%: Active Tab | Left 34%: Referral Chat Feed) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.95fr)_minmax(310px,1fr)] gap-4 items-start">
        {/* RIGHT COLUMN: Main Tab Content */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* TAB 1: اطلاعات پایه (Exact Screenshot 2 Form + Contacts Table) */}
          {activeTab === 'basic' && (
            <>
              <form
                onSubmit={handleSaveBasicInfo}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                  {/* نوع طرف حساب */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      نوع طرف حساب
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* کد حساب */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">کد حساب</label>
                    <input
                      type="text"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#0f5864]"
                    />
                  </div>

                  {/* نام طرف حساب/شعبه */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      نام طرف حساب/شعبه
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#0f5864]"
                    />
                  </div>

                  {/* استان */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">استان</label>
                    <select
                      value={province}
                      onChange={(e) => {
                        const prov = e.target.value;
                        setProvince(prov);
                        setCity(PROVINCES_CITIES[prov]?.[0] ?? '');
                      }}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                    >
                      {Object.keys(PROVINCES_CITIES).map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* طریقه آشنایی */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      طریقه آشنایی
                    </label>
                    <select
                      value={acquisitionSource}
                      onChange={(e) => setAcquisitionSource(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                    >
                      {ACQUISITION_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* شهرستان */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">شهرستان</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                    >
                      {(PROVINCES_CITIES[province] ?? [city]).map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* وضعیت مالی (clickable summary opening credit standing editor) */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      وضعیت مالی
                    </label>
                    <button
                      type="button"
                      onClick={() => setFinancialModalOpen(true)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white hover:border-[#0f5864] text-right flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="font-bold text-slate-800 truncate">
                        {customer.financialStatusLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${tierStyle.rowBadgeClass}`}
                      >
                        تغییر
                      </span>
                    </button>
                  </div>

                  {/* شعبه اصلی */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      شعبه اصلی
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={mainBranch}
                        onChange={(e) => setMainBranch(e.target.value)}
                        placeholder="جستجو یا ثبت شعبه اصلی..."
                        className="w-full h-10 pr-3 pl-9 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* کارشناس + دکمه «خودم» (matching Screenshot 2) */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">کارشناس</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={salesRep}
                        onChange={(e) => setSalesRep(e.target.value)}
                        className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                      >
                        <option value="">انتخاب کارشناس</option>
                        {SALES_REPS.map((rep) => (
                          <option key={rep} value={rep}>
                            {rep}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSalesRep(CURRENT_LOGGED_USER)}
                        className="h-10 px-3 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                      >
                        خودم
                      </button>
                    </div>
                  </div>

                  {/* کارشناس CRM */}
                  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <label className="font-bold text-slate-700">
                      کارشناس CRM
                    </label>
                    <select
                      value={crmRep}
                      onChange={(e) => setCrmRep(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#0f5864]"
                    >
                      <option value="">انتخاب نشده</option>
                      {CRM_REPS.map((rep) => (
                        <option key={rep} value={rep}>
                          {rep}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toggle Switch: مشتری / سرنخ (matching Screenshot 2) */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <span className="text-xs font-bold text-slate-700">
                    {relationshipType === 'customer' ? 'مشتری' : 'سرنخ'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={relationshipType === 'customer'}
                    aria-label="تغییر نوع بین مشتری و سرنخ"
                    onClick={() =>
                      setRelationshipType((prev) =>
                        prev === 'customer' ? 'lead' : 'customer'
                      )
                    }
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                      relationshipType === 'customer'
                        ? 'bg-[#2a8675] justify-start'
                        : 'bg-slate-300 justify-end'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs block" />
                  </button>
                </div>

                {/* Notes Textarea (matching Screenshot 2) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    توضیحات پرونده
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="یادداشت‌ها و توضیحات مربوط به طرف حساب..."
                    className="w-full p-3 rounded-lg border border-slate-300 text-xs sm:text-[13px] text-slate-800 leading-relaxed focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                {/* Save Button: ثبت طرف حساب */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[42px] px-6 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors"
                  >
                    ثبت طرف حساب
                  </button>
                </div>
              </form>

              {/* CONTACTS TABLE CARD (Exact Screenshot 2 bottom-right table) */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="grid grid-cols-3 gap-4 flex-1 text-xs font-bold text-slate-800 min-w-[240px]">
                    <span>نام شخص</span>
                    <span>سمت یا توضیحات</span>
                    <span>شماره همراه</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddContact}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    شماره جدید
                  </button>
                </div>

                {customer.contacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    هنوز شماره تماسی برای این طرف حساب ثبت نشده است.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customer.contacts.map((cnt) => (
                      <div
                        key={cnt.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/70"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 flex-1 items-center">
                          <div className="font-bold text-slate-900">
                            {cnt.name}
                          </div>
                          <div className="text-slate-600">{cnt.roleOrNote}</div>
                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className="tabular-nums font-bold text-slate-900"
                            >
                              {cnt.phone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCallPrimary(cnt.phone, cnt.name)}
                              title="تماس"
                              aria-label={`تماس با ${cnt.name}`}
                              className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleOpenEditContact(cnt)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteContact(customer.id, cnt.id);
                              onNotify(
                                'شماره تماس حذف شد',
                                `شماره «${cnt.name}» از پرونده حذف گردید.`,
                                'مخاطبین مشتری',
                                'warning'
                              );
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB 2: رخداد حسابداری (Read-Only Excel-Style Ledger) */}
          {activeTab === 'accounting' && (
            <section className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              {/* Top Excel Toolbar Header */}
              <div className="px-4 py-3 bg-[#f3f6f4] border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h2 className="text-sm font-bold text-slate-900">
                    رخداد حسابداری (دفتر معین طرف حساب)
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    · برای مشاهده جزئیات سفارش و مدارک تسویه روی عنوان کلیک کنید
                  </span>
                </div>
              </div>

              {/* Compact Summary Formula Bar */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs tabular-nums">
                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                  <span className="text-slate-500">جمع بدهکار:</span>
                  <strong className="text-red-700">
                    {formatRial(accountingTotals.totalDebit)}
                  </strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                  <span className="text-slate-500">جمع بستانکار:</span>
                  <strong className="text-emerald-700">
                    {formatRial(accountingTotals.totalCredit)}
                  </strong>
                </div>
                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                  <span className="text-slate-500">مانده نهایی بر خط:</span>
                  <strong
                    className={
                      accountingTotals.finalBalance > 0
                        ? 'text-slate-950'
                        : 'text-emerald-700'
                    }
                  >
                    {accountingTotals.finalBalance === 0
                      ? '۰ ریال (تسویه)'
                      : formatRial(accountingTotals.finalBalance)}
                  </strong>
                </div>
              </div>

              {/* Excel-Style Grid Table (Read-Only with Linked Order/Settlement Details) */}
              <div className="overflow-x-auto select-text">
                <table className="w-full min-w-[780px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#e8eeea] text-slate-800 font-bold">
                      <th className="w-11 px-2.5 py-2.5 text-center border-b border-l border-slate-300 whitespace-nowrap">
                        #
                      </th>
                      <th className="w-28 px-3 py-2.5 text-center border-b border-l border-slate-300 whitespace-nowrap">
                        تاریخ
                      </th>
                      <th className="px-3.5 py-2.5 text-right border-b border-l border-slate-300">
                        عنوان
                      </th>
                      <th className="w-36 px-3 py-2.5 text-center border-b border-l border-slate-300 whitespace-nowrap">
                        محل تسویه
                      </th>
                      <th className="w-36 px-3 py-2.5 text-left border-b border-l border-slate-300 whitespace-nowrap">
                        بدهکار (ریال)
                      </th>
                      <th className="w-36 px-3 py-2.5 text-left border-b border-l border-slate-300 whitespace-nowrap">
                        بستانکار (ریال)
                      </th>
                      <th className="w-40 px-3 py-2.5 text-left border-b border-slate-300 whitespace-nowrap">
                        مانده بر خط (ریال)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingEntries.map((entry, idx) => {
                      const isBalanceRow = entry.kind === 'balance';
                      const isDebitRow = entry.kind === 'debit';
                      const isCreditRow = entry.kind === 'credit';
                      const hasDetailPopup = Boolean(
                        entry.orderDetails ||
                          entry.chequeDetails ||
                          entry.cashDetails ||
                          entry.returnDetails
                      );

                      const rowBg = isBalanceRow
                        ? 'bg-slate-100/90 font-bold'
                        : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/50';

                      return (
                        <tr
                          key={entry.id}
                          className={`${rowBg} hover:bg-sky-50/55 transition-colors`}
                        >
                          <td className="px-2.5 py-2.5 text-center tabular-nums text-slate-500 bg-slate-50/70 border-b border-l border-slate-300">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-700 border-b border-l border-slate-300 whitespace-nowrap">
                            {toPersianDigits(entry.date)}
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-right border-b border-l border-slate-300 leading-relaxed ${
                              isBalanceRow
                                ? 'text-slate-900 font-bold'
                                : 'text-slate-800 font-medium'
                            }`}
                          >
                            {hasDetailPopup ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAccountingEntry(entry)}
                                className="group text-right text-[#0f5864] hover:text-[#083942] underline decoration-[#0f5864]/45 hover:decoration-[#083942] underline-offset-4 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5864] rounded"
                              >
                                <span>{entry.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ) : (
                              entry.title
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center border-b border-l border-slate-300 whitespace-nowrap">
                            {entry.returnDetails ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAccountingEntry(entry)}
                                className="inline-flex flex-col items-center leading-tight text-red-700 hover:underline cursor-pointer"
                              >
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  مرجوعی کالا
                                </span>
                                <span className="tabular-nums text-[10px] text-slate-600 font-semibold mt-0.5">
                                  حجم: {formatWeight(entry.returnDetails.totalWeightKg)}
                                </span>
                              </button>
                            ) : entry.settlementMethod === 'cheque' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAccountingEntry(entry)}
                                className="inline-flex flex-col items-center leading-tight text-indigo-800 hover:underline cursor-pointer"
                              >
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                                  چک صیادی
                                </span>
                                {entry.chequeDetails && (
                                  <span
                                    className={`text-[10px] font-semibold mt-0.5 ${
                                      entry.chequeDetails.status === 'bounced'
                                        ? 'text-red-700'
                                        : entry.chequeDetails.status ===
                                            'cleared'
                                          ? 'text-emerald-700'
                                          : 'text-amber-700'
                                    }`}
                                  >
                                    {entry.chequeDetails.status === 'bounced'
                                      ? 'برگشتی'
                                      : entry.chequeDetails.status === 'cleared'
                                        ? 'پاس‌شده'
                                        : 'در جریان وصول'}
                                  </span>
                                )}
                              </button>
                            ) : entry.settlementMethod === 'cash' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAccountingEntry(entry)}
                                className="inline-flex flex-col items-center leading-tight text-emerald-800 hover:underline cursor-pointer"
                              >
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <Banknote className="w-3.5 h-3.5 shrink-0" />
                                  نقدی
                                </span>
                                {entry.cashDetails && (
                                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[120px] truncate">
                                    مدارک راننده ثبت شده
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-left tabular-nums border-b border-l border-slate-300 whitespace-nowrap ${
                              isDebitRow && entry.debitRial > 0
                                ? 'text-red-700 font-bold bg-red-50/35'
                                : 'text-slate-400'
                            }`}
                          >
                            {entry.debitRial > 0
                              ? new Intl.NumberFormat('fa-IR').format(
                                  entry.debitRial
                                )
                              : '—'}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-left tabular-nums border-b border-l border-slate-300 whitespace-nowrap ${
                              isCreditRow && entry.creditRial > 0
                                ? 'text-emerald-700 font-bold bg-emerald-50/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {entry.creditRial > 0
                              ? new Intl.NumberFormat('fa-IR').format(
                                  entry.creditRial
                                )
                              : '—'}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-left tabular-nums border-b border-slate-300 whitespace-nowrap ${
                              isBalanceRow
                                ? entry.runningBalanceRial > 0
                                  ? 'text-slate-950 font-bold bg-amber-50/70'
                                  : 'text-emerald-800 font-bold bg-emerald-50/70'
                                : 'text-slate-800 font-semibold'
                            }`}
                          >
                            {entry.runningBalanceRial === 0
                              ? '۰'
                              : `${new Intl.NumberFormat('fa-IR').format(
                                  Math.abs(entry.runningBalanceRial)
                                )} ${entry.runningBalanceRial > 0 ? 'بد' : 'بس'}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#e8eeea] font-bold text-slate-900 tabular-nums">
                      <td
                        colSpan={4}
                        className="px-3.5 py-3 text-right border-t-2 border-l border-slate-400"
                      >
                        جمع کل گردش و مانده نهایی
                      </td>
                      <td className="px-3 py-3 text-left text-red-800 border-t-2 border-l border-slate-400 whitespace-nowrap">
                        {new Intl.NumberFormat('fa-IR').format(
                          accountingTotals.totalDebit
                        )}
                      </td>
                      <td className="px-3 py-3 text-left text-emerald-800 border-t-2 border-l border-slate-400 whitespace-nowrap">
                        {new Intl.NumberFormat('fa-IR').format(
                          accountingTotals.totalCredit
                        )}
                      </td>
                      <td className="px-3 py-3 text-left text-slate-950 border-t-2 border-slate-400 whitespace-nowrap">
                        {accountingTotals.finalBalance === 0
                          ? '۰ (تسویه)'
                          : `${new Intl.NumberFormat('fa-IR').format(
                              Math.abs(accountingTotals.finalBalance)
                            )} ${accountingTotals.finalBalance > 0 ? 'بد' : 'بس'}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* TAB 3: بازاریاب */}
          {activeTab === 'marketer' && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500">کارشناس فروش مسئول</span>
                <div className="text-sm font-bold text-slate-900">
                  {customer.salesRep || 'تخصیص داده نشده'}
                </div>
                <div className="text-slate-600 pt-1">
                  طریقه آشنایی: {customer.acquisitionSource}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500">کارشناس CRM</span>
                <div className="text-sm font-bold text-slate-900">
                  {customer.crmRep || 'تخصیص داده نشده'}
                </div>
                <div className="text-slate-600 pt-1">
                  پیگیری بعدی: {customer.followUpTargetDate}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* LEFT COLUMN: Ice-Blue Referral & Internal Chat Panel (exact Screenshot 2 match) */}
        <aside className="bg-[#e8f4fc] border border-sky-200/90 rounded-xl overflow-hidden flex flex-col min-h-[460px] xl:h-[620px]">
          <div className="px-4 py-3 bg-sky-100/80 border-b border-sky-200/80 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              ارجاعات و گفتگوی داخلی پرونده
            </span>
            <span className="tabular-nums text-[11px] text-slate-600">
              {toPersianDigits(customer.chatMessages.length)} پیام
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
            {customer.chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
                هنوز پیام یا ارجاعی برای این طرف حساب ثبت نشده است.
              </div>
            ) : (
              customer.chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-1.5">
                  <div className="flex justify-center">
                    <span className="tabular-nums px-2.5 py-0.5 rounded-full bg-slate-200/85 text-slate-700 text-[10px] font-semibold">
                      {msg.timestampLabel}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-semibold text-blue-700 mb-1">
                      از {msg.from} به {msg.to}
                    </span>
                    <div className="max-w-[92%] px-3 py-2 rounded-xl rounded-tl-xs bg-[#fdeef2] border border-rose-200/80 text-xs text-slate-800 leading-relaxed shadow-2xs">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            className="p-2.5 bg-white border-t border-sky-200/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="متن پیام خود را وارد کنید..."
              className="flex-1 h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f5864] focus:bg-white"
            />
            <button
              type="submit"
              aria-label="ارسال پیام"
              className="w-10 h-10 rounded-lg bg-[#0f5864] text-white hover:bg-[#0b434d] flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* MODAL 1: Financial & Credit Standing Editor (live-switches Green / Yellow / Red / Black!) */}
      {financialModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="مدیریت وضعیت مالی و دسته‌بندی اعتبار"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFinancialModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSaveFinancialStanding}
            className="bg-white w-full max-w-xl rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-slate-900">
                وضعیت مالی و دسته‌بندی اعتبار مشتری
              </h2>
              <button
                type="button"
                onClick={() => setFinancialModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">
                  انتخاب دسته وضعیت (تغییر آنی رنگ کارت و هدر پروفایل)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    ['green', 'yellow', 'red', 'black'] as CustomerStandingTier[]
                  ).map((tierId) => {
                    const style = STANDING_TIER_STYLES[tierId];
                    const active = editStanding === tierId;
                    return (
                      <button
                        key={tierId}
                        type="button"
                        onClick={() => {
                          setEditStanding(tierId);
                          if (tierId !== 'green') setEditPaymentMode('credit');
                        }}
                        className={`p-3 rounded-xl border text-right transition-colors ${
                          active
                            ? style.filterActiveClass
                            : style.filterInactiveClass
                        }`}
                      >
                        <div className="font-bold">{style.fullTitle}</div>
                        <div className="text-[11px] opacity-85 mt-0.5">
                          {style.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {editStanding === 'green' && (
                <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-emerald-950">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      checked={editPaymentMode === 'cash'}
                      onChange={() => setEditPaymentMode('cash')}
                    />
                    مشتری نقدی (تسویه در محل)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-emerald-950">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      checked={editPaymentMode === 'credit'}
                      onChange={() => setEditPaymentMode('credit')}
                    />
                    مشتری اعتباری با اعتبار کافی
                  </label>
                </div>
              )}

              {(editStanding !== 'green' || editPaymentMode === 'credit') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      سقف اعتبار (میلیون ریال)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editLimitM}
                      onChange={(e) => setEditLimitM(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      مصرف‌شده (میلیون ریال)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editUsedM}
                      onChange={(e) => setEditUsedM(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      روز تا سررسید (منفی = معوق)
                    </label>
                    <input
                      type="number"
                      value={editDaysRem}
                      onChange={(e) => setEditDaysRem(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 tabular-nums"
                    />
                  </div>
                </div>
              )}

              {editStanding !== 'green' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editStanding === 'black'
                      ? 'دلیل قرارگیری در بلک‌لیست'
                      : 'توضیح هشدار / محدودیت اعتبار'}
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="دلیل دقیق وضعیت اعتباری را وارد کنید..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-300"
                  />
                </div>
              )}
            </div>

            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFinancialModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
              >
                ذخیره وضعیت مالی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Add / Edit Contact */}
      {contactModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ثبت شماره تماس"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setContactModal({ open: false, editing: null });
          }}
        >
          <form
            onSubmit={handleSubmitContact}
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {contactModal.editing ? 'ویرایش شماره تماس' : 'افزودن شماره جدید'}
              </h2>
              <button
                type="button"
                onClick={() => setContactModal({ open: false, editing: null })}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  نام شخص *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  سمت یا توضیحات
                </label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="مثلاً: مدیر خرید / حسابداری"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  شماره همراه *
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="09120000000"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-left tabular-nums"
                />
              </div>
            </div>

            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactModal({ open: false, editing: null })}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                ذخیره شماره
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Assign Data */}
      {assignModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تخصیص دیتا"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssignModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmitAssign}
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">تخصیص دیتا</h2>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کارشناس فروش
                </label>
                <select
                  value={modalSalesRep}
                  onChange={(e) => setModalSalesRep(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  {SALES_REPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کارشناس CRM
                </label>
                <select
                  value={modalCrmRep}
                  onChange={(e) => setModalCrmRep(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">انتخاب نشده</option>
                  {CRM_REPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white"
              >
                ذخیره تخصیص
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Refer to CRM */}
      {referModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ارجاع به CRM"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReferModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmitRefer}
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">ارجاع به CRM</h2>
              <button
                type="button"
                onClick={() => setReferModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کارشناس CRM مقصد
                </label>
                <select
                  value={referTargetRep}
                  onChange={(e) => setReferTargetRep(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  {CRM_REPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  توضیح ارجاع
                </label>
                <textarea
                  rows={3}
                  value={referNote}
                  onChange={(e) => setReferNote(e.target.value)}
                  placeholder="دلیل ارجاع به واحد CRM را وارد کنید..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReferModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white"
              >
                ثبت ارجاع
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: Issue Proforma (respects Red/Blacklist standing!) */}
      {proformaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ثبت پیش‌فاکتور"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProformaModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmitProforma}
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                ثبت پیش‌فاکتور جدید
              </h2>
              <button
                type="button"
                onClick={() => setProformaModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {customer.standing === 'black' ? (
                <div className="p-3.5 rounded-xl bg-neutral-950 text-white space-y-1.5">
                  <div className="font-bold text-red-300 inline-flex items-center gap-1.5">
                    <Ban className="w-4 h-4" />
                    مشتری در فهرست بلک‌لیست قرار دارد
                  </div>
                  <p className="text-neutral-200 leading-relaxed">
                    امکان ثبت پیش‌فاکتور برای مشتریان بلک‌لیست مسدود است. دلیل:{' '}
                    {customer.credit.blacklistReason}
                  </p>
                </div>
              ) : (
                <>
                  {customer.standing === 'red' && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-2 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>هشدار اتمام اعتبار:</strong> سقف اعتبار این
                        مشتری تکمیل شده است. پیش‌فاکتور فقط با تسویه نقدی مجاز
                        است.
                      </span>
                    </div>
                  )}
                  {customer.standing === 'yellow' && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2 leading-relaxed">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>هشدار نزدیک شدن به سقف/موعد:</strong> مانده
                        اعتبار قابل استفاده:{' '}
                        <strong className="tabular-nums">
                          {formatRial(remainingCreditRial)}
                        </strong>
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      مبلغ پیش‌فاکتور (میلیون ریال)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={proformaAmountM}
                      onChange={(e) => setProformaAmountM(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      شرح اقلام / توضیحات
                    </label>
                    <textarea
                      rows={2}
                      value={proformaNote}
                      onChange={(e) => setProformaNote(e.target.value)}
                      placeholder="شرح اقلام پیش‌فاکتور..."
                      className="w-full p-2.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProformaModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                بستن
              </button>
              {customer.standing !== 'black' && (
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white"
                >
                  ثبت پیش‌فاکتور
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {/* Accounting Entry Order & Settlement Detail Popup */}
      <AccountingEntryDetailModal
        entry={selectedAccountingEntry}
        customer={customer}
        onClose={() => setSelectedAccountingEntry(null)}
      />
    </div>
  );
};
