import React, { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  PlusSquare,
  Search,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import {
  BUSINESS_TYPES,
  CRM_REPS,
  CURRENT_LOGGED_USER,
  PROVINCES_CITIES,
  SALES_REPS,
  STANDING_TIER_STYLES,
} from '../../data/initialCustomers';
import { CreateCustomerPayload } from '../../hooks/useCustomerStore';
import {
  CustomerRecord,
  CustomerRelationshipType,
  CustomerStandingTier,
} from '../../types/customer';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface CustomersListPageProps {
  customers: CustomerRecord[];
  onSelectCustomer: (customerId: string) => void;
  onCreateCustomer: (payload: CreateCustomerPayload) => CustomerRecord;
  onAssignRepsBulk: (
    customerIds: string[],
    salesRep: string,
    crmRep: string
  ) => void;
  onSendSmsBulk: (customerIds: string[], messageText: string) => void;
  onNotify: (
    title: string,
    message: string,
    tag: string,
    type?: 'success' | 'warning' | 'info' | 'danger'
  ) => void;
}

type OwnershipScope = 'all' | 'mine';
type StandingFilter = 'all' | CustomerStandingTier;

function getStandingStatusLabel(customer: CustomerRecord): string {
  if (customer.standing === 'black') return 'بلک‌لیست';
  if (customer.standing === 'red') return 'اتمام اعتبار';
  if (customer.standing === 'yellow') return 'هشدار اعتبار';
  return customer.isActive ? 'فعال' : 'غیرفعال';
}

export const CustomersListPage: React.FC<CustomersListPageProps> = ({
  customers,
  onSelectCustomer,
  onCreateCustomer,
  onAssignRepsBulk,
  onSendSmsBulk,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<OwnershipScope>('all');
  const [standingFilter, setStandingFilter] = useState<StandingFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Working Action Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  // Assign Modal state
  const [assignSalesRep, setAssignSalesRep] = useState(SALES_REPS[0]);
  const [assignCrmRep, setAssignCrmRep] = useState('');

  // SMS Modal state
  const [smsText, setSmsText] = useState('');

  // Create Customer Modal state
  const [newName, setNewName] = useState('');
  const [newManager, setNewManager] = useState('');
  const [newBusinessType, setNewBusinessType] = useState(BUSINESS_TYPES[0]);
  const [newRelType, setNewRelType] =
    useState<CustomerRelationshipType>('customer');
  const [newPhone, setNewPhone] = useState('');
  const [newProvince, setNewProvince] = useState('تهران');
  const [newCity, setNewCity] = useState('تهران');
  const [newAddress, setNewAddress] = useState('');
  const [newSalesRep, setNewSalesRep] = useState(CURRENT_LOGGED_USER);
  const [newCrmRep, setNewCrmRep] = useState(CRM_REPS[0]);
  const [newStanding, setNewStanding] = useState<CustomerStandingTier>('green');
  const [newPaymentMode, setNewPaymentMode] = useState<'cash' | 'credit'>('cash');
  const [newCreditLimitM, setNewCreditLimitM] = useState('500');
  const [newUsedCreditM, setNewUsedCreditM] = useState('150');
  const [newDaysRemaining, setNewDaysRemaining] = useState('15');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const scopedCustomers = useMemo(() => {
    if (scope === 'mine') {
      return customers.filter(
        (c) =>
          c.salesRep === CURRENT_LOGGED_USER ||
          c.createdBy === CURRENT_LOGGED_USER
      );
    }
    return customers;
  }, [customers, scope]);

  const countsByStanding = useMemo(() => {
    const counts: Record<CustomerStandingTier, number> = {
      green: 0,
      yellow: 0,
      red: 0,
      black: 0,
    };
    for (const c of scopedCustomers) {
      counts[c.standing] += 1;
    }
    return counts;
  }, [scopedCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedCustomers.filter((customer) => {
      if (standingFilter !== 'all' && customer.standing !== standingFilter) {
        return false;
      }
      if (!q) return true;
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.accountCode.toLowerCase().includes(q) ||
        customer.managerName.toLowerCase().includes(q) ||
        customer.salesRep.toLowerCase().includes(q) ||
        customer.crmRep.toLowerCase().includes(q) ||
        customer.financialStatusLabel.toLowerCase().includes(q) ||
        customer.contacts.some((cnt) => cnt.phone.includes(q))
      );
    });
  }, [scopedCustomers, standingFilter, searchQuery]);

  const allVisibleSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenAssign = () => {
    if (selectedIds.length === 0) {
      onNotify(
        'انتخاب طرف حساب الزامی است',
        'لطفاً ابتدا حداقل یک طرف حساب را از لیست انتخاب کنید تا تخصیص دیتا انجام شود.',
        'لیست طرف حساب‌ها',
        'warning'
      );
      return;
    }
    setAssignModalOpen(true);
  };

  const handleOpenSms = () => {
    if (selectedIds.length === 0) {
      onNotify(
        'انتخاب مخاطب الزامی است',
        'برای ارسال پیامک گروهی، حداقل یک طرف حساب را با تیک کنار ردیف انتخاب کنید.',
        'لیست طرف حساب‌ها',
        'warning'
      );
      return;
    }
    setSmsText('');
    setSmsModalOpen(true);
  };

  const handleSubmitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    onAssignRepsBulk(selectedIds, assignSalesRep, assignCrmRep);
    onNotify(
      'تخصیص دیتا انجام شد',
      `${toPersianDigits(selectedIds.length)} طرف حساب با موفقیت به‌روزرسانی شد.`,
      'لیست طرف حساب‌ها',
      'success'
    );
    setSelectedIds([]);
    setAssignModalOpen(false);
  };

  const handleSubmitSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim()) return;
    onSendSmsBulk(selectedIds, smsText.trim());
    onNotify(
      'پیامک ارسال شد',
      `پیامک برای ${toPersianDigits(selectedIds.length)} طرف حساب ثبت و ارسال گردید.`,
      'سامانه پیامک',
      'success'
    );
    setSelectedIds([]);
    setSmsModalOpen(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const isCredit = newStanding !== 'green' || newPaymentMode === 'credit';
    const limitRial = isCredit
      ? Math.max(0, Number(newCreditLimitM) || 0) * 1_000_000
      : 0;
    const usedRial = isCredit
      ? Math.max(0, Number(newUsedCreditM) || 0) * 1_000_000
      : 0;
    const days = isCredit ? Number(newDaysRemaining) || 0 : null;

    const created = onCreateCustomer({
      name: newName,
      managerName: newManager,
      businessType: newBusinessType,
      relationshipType: newRelType,
      phone: newPhone,
      province: newProvince,
      city: newCity,
      address: newAddress,
      salesRep: newSalesRep,
      crmRep: newCrmRep,
      standing: newStanding,
      credit: {
        paymentMode: isCredit ? 'credit' : 'cash',
        creditLimitRial: limitRial,
        usedCreditRial: usedRial,
        creditTermDays: isCredit ? 30 : 0,
        daysRemaining: days,
        dueDateJalali: isCredit ? '۱۵ آذر ۱۴۰۵' : undefined,
        warningReason:
          newStanding === 'yellow'
            ? 'نزدیک به سقف اعتبار یا موعد تسویه'
            : newStanding === 'red'
              ? 'حد اعتبار ریالی یا زمانی تکمیل شده است'
              : undefined,
        blacklistReason:
          newStanding === 'black'
            ? newBlacklistReason.trim() || 'ثبت مستقیم در فهرست سیاه'
            : undefined,
      },
      notes: newNotes,
    });

    onNotify(
      'طرف حساب جدید ثبت شد',
      `«${created.name}» با کد حساب ${created.accountCode} به لیست اضافه شد.`,
      'لیست طرف حساب‌ها',
      'success'
    );

    setNewName('');
    setNewManager('');
    setNewPhone('');
    setNewAddress('');
    setNewNotes('');
    setNewBlacklistReason('');
    setNewModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {/* Top Advanced Search Bar (matching Screenshot 1) */}
      <div className="relative w-full">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجوی پیشرفته (نام طرف حساب، کد حساب، مسئول، کارشناس، وضعیت مالی یا تلفن)..."
          className="w-full h-12 pr-4 pl-12 text-sm bg-white border border-slate-300 rounded-xl shadow-2xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0f5864] focus:ring-2 focus:ring-[#0f5864]/15 transition-all"
        />
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Main Toolbar Row (matching Screenshot 1: Title right, Controls left) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center justify-between xl:justify-start gap-3">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              اطلاعات مشتریان
            </h1>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(filteredCustomers.length)} از{' '}
              {toPersianDigits(customers.length)} طرف حساب
            </span>
          </div>

          {selectedIds.length > 0 && (
            <span className="text-xs font-bold text-[#0f5864] tabular-nums">
              {toPersianDigits(selectedIds.length)} مورد انتخاب شده
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Toggle: همه حساب‌ها | طرف حساب‌های خودم */}
          <div className="inline-flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300/60">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              همه حساب‌ها
            </button>
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                scope === 'mine'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              طرف حساب‌های خودم
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAssign}
            className="min-h-[42px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            تخصیص دیتا
          </button>

          <button
            type="button"
            onClick={handleOpenSms}
            className="min-h-[42px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            ارسال پیامک
          </button>

          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="min-h-[42px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-white text-[#0f5864] border border-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap"
          >
            <PlusSquare className="w-4 h-4 shrink-0" />
            طرف حساب جدید
          </button>
        </div>
      </div>

      {/* 4-Category Credit Standing Interactive Filter Bar */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="inline-flex items-center gap-2 py-0.5">
          <button
            type="button"
            onClick={() => setStandingFilter('all')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap tabular-nums ${
              standingFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            همه دسته‌ها ({toPersianDigits(scopedCustomers.length)})
          </button>

          {(
            [
              {
                id: 'green' as CustomerStandingTier,
                label: 'سبز · نقدی و اعتبار فعال',
                icon: CheckCircle2,
              },
              {
                id: 'yellow' as CustomerStandingTier,
                label: 'زرد · نزدیک سقف یا موعد',
                icon: Clock,
              },
              {
                id: 'red' as CustomerStandingTier,
                label: 'قرمز · اتمام اعتبار',
                icon: ShieldAlert,
              },
              {
                id: 'black' as CustomerStandingTier,
                label: 'مشکی · بلک‌لیست',
                icon: Ban,
              },
            ] as const
          ).map((tier) => {
            const Icon = tier.icon;
            const style = STANDING_TIER_STYLES[tier.id];
            const isActive = standingFilter === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setStandingFilter(tier.id)}
                className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap tabular-nums ${
                  isActive ? style.filterActiveClass : style.filterInactiveClass
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tier.label}</span>
                <span className="opacity-85">
                  ({toPersianDigits(countsByStanding[tier.id])})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Surface (Desktop Column Grid + Color-Coded Cards / Mobile Cards) */}
      <section className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3.5 shadow-2xs">
        {/* Desktop Column Headers (matching Screenshot 1 column order RTL) */}
        <div className="hidden lg:grid lg:grid-cols-[48px_minmax(220px,2.2fr)_minmax(115px,1fr)_82px_minmax(110px,1fr)_minmax(125px,1.1fr)_minmax(160px,1.35fr)_96px_126px] items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-600 border-b border-slate-200 mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="انتخاب همه طرف حساب‌ها"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-[#0f5864] focus:ring-[#0f5864]"
            />
            <span>#</span>
          </div>
          <div>طرف حساب</div>
          <div>نام مسئول</div>
          <div>نوع طرف حساب</div>
          <div>کارشناس فروش</div>
          <div>کارشناس CRM</div>
          <div>وضعیت مالی</div>
          <div className="text-center">وضعیت</div>
          <div className="text-center">عملیات</div>
        </div>

        {/* Customer Rows */}
        {filteredCustomers.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-sm font-medium text-slate-600 mb-3">
              طرف حسابی مطابق جستجو یا فیلتر انتخابی یافت نشد.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStandingFilter('all');
                setScope('all');
              }}
              className="min-h-[42px] px-5 py-2 text-xs font-bold text-[#0f5864] bg-white border border-[#0f5864] rounded-xl hover:bg-[#0f5864] hover:text-white transition-colors"
            >
              نمایش همه طرف حساب‌ها
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredCustomers.map((customer, idx) => {
              const tierStyle = STANDING_TIER_STYLES[customer.standing];
              const isSelected = selectedIds.includes(customer.id);
              const statusLabel = getStandingStatusLabel(customer);
              const relLabel =
                customer.relationshipType === 'customer' ? 'مشتری' : 'سرنخ';

              return (
                <article
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className={`rounded-xl lg:rounded-lg transition-all cursor-pointer ${tierStyle.rowCardClass}`}
                >
                  {/* Desktop Row Layout (matches Screenshot 1) */}
                  <div className="hidden lg:grid lg:grid-cols-[48px_minmax(220px,2.2fr)_minmax(115px,1fr)_82px_minmax(110px,1fr)_minmax(125px,1.1fr)_minmax(160px,1.35fr)_96px_126px] items-center gap-2 px-3 py-2.5 text-[13px]">
                    <div
                      className="flex items-center gap-2 tabular-nums font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`انتخاب ${customer.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(customer.id)}
                        className="w-4 h-4 rounded border-slate-400 text-[#0f5864] focus:ring-[#0f5864]"
                      />
                      <span className={tierStyle.rowMutedClass}>
                        {toPersianDigits(idx + 1)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`font-bold truncate ${tierStyle.rowTitleClass}`}
                        title={customer.name}
                      >
                        {customer.name}
                      </div>
                      <div
                        className={`text-[11px] tabular-nums mt-0.5 ${tierStyle.rowMutedClass}`}
                      >
                        کد حساب: {toPersianDigits(customer.accountCode)} ·{' '}
                        {customer.businessType}
                      </div>
                    </div>

                    <div className={`truncate text-xs font-medium ${tierStyle.rowTextClass}`}>
                      {customer.managerName || '—'}
                    </div>

                    <div className={`text-xs font-semibold ${tierStyle.rowTextClass}`}>
                      {relLabel}
                    </div>

                    <div className={`truncate text-xs font-medium ${tierStyle.rowTextClass}`}>
                      {customer.salesRep || '—'}
                    </div>

                    <div className={`truncate text-xs font-medium ${tierStyle.rowTextClass}`}>
                      {customer.crmRep || '—'}
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold block truncate ${tierStyle.rowTitleClass}`}
                        title={customer.financialStatusLabel}
                      >
                        {customer.financialStatusLabel}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[74px] px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${tierStyle.rowBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(customer.id);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tierStyle.rowButtonClass}`}
                      >
                        مشاهده پروفایل
                      </button>
                    </div>
                  </div>

                  {/* Mobile / Tablet Color-Coded Card Layout */}
                  <div className="lg:hidden p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className="pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${customer.name}`}
                            checked={isSelected}
                            onChange={() => toggleSelectOne(customer.id)}
                            className="w-4 h-4 rounded border-slate-400 text-[#0f5864]"
                          />
                        </div>
                        <div className="min-w-0">
                          <h2
                            className={`text-sm font-bold leading-snug ${tierStyle.rowTitleClass}`}
                          >
                            {customer.name}
                          </h2>
                          <div
                            className={`text-[11px] tabular-nums mt-0.5 ${tierStyle.rowMutedClass}`}
                          >
                            کد {toPersianDigits(customer.accountCode)} · {relLabel} ·{' '}
                            {customer.businessType}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap ${tierStyle.rowBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs pt-2 border-t ${
                        customer.standing === 'black'
                          ? 'border-neutral-800'
                          : 'border-black/8'
                      }`}
                    >
                      <div>
                        <span className={`block text-[10px] ${tierStyle.rowMutedClass}`}>
                          نام مسئول
                        </span>
                        <span className={`font-semibold ${tierStyle.rowTextClass}`}>
                          {customer.managerName || '—'}
                        </span>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${tierStyle.rowMutedClass}`}>
                          کارشناس فروش
                        </span>
                        <span className={`font-semibold ${tierStyle.rowTextClass}`}>
                          {customer.salesRep || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`block text-[10px] ${tierStyle.rowMutedClass}`}>
                          وضعیت مالی و اعتبار
                        </span>
                        <span className={`font-bold ${tierStyle.rowTitleClass}`}>
                          {customer.financialStatusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(customer.id);
                        }}
                        className={`w-full min-h-[42px] py-2 px-4 rounded-xl text-xs font-bold transition-colors ${tierStyle.rowButtonClass}`}
                      >
                        مشاهده پروفایل
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal 1: Create New Customer */}
      {newModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ایجاد طرف حساب جدید"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
        >
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f5864]" />
                <h2 className="text-sm font-bold text-slate-900">
                  افزودن طرف حساب جدید
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                aria-label="بستن"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    نام طرف حساب / شعبه *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثلاً: رستوران ارکیده / شعبه اقدسیه"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0f5864]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    نام مسئول
                  </label>
                  <input
                    type="text"
                    value={newManager}
                    onChange={(e) => setNewManager(e.target.value)}
                    placeholder="مثلاً: آقای محمدی"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    شماره تماس اصلی
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="09121234567"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-left focus:outline-none focus:border-[#0f5864]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    نوع کسب‌وکار و وضعیت
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newBusinessType}
                      onChange={(e) => setNewBusinessType(e.target.value)}
                      className="h-10 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0f5864]"
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newRelType}
                      onChange={(e) =>
                        setNewRelType(e.target.value as CustomerRelationshipType)
                      }
                      className="h-10 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0f5864]"
                    >
                      <option value="customer">مشتری</option>
                      <option value="lead">سرنخ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    کارشناس فروش
                  </label>
                  <select
                    value={newSalesRep}
                    onChange={(e) => setNewSalesRep(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0f5864]"
                  >
                    {SALES_REPS.map((rep) => (
                      <option key={rep} value={rep}>
                        {rep}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    کارشناس CRM
                  </label>
                  <select
                    value={newCrmRep}
                    onChange={(e) => setNewCrmRep(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0f5864]"
                  >
                    {CRM_REPS.map((rep) => (
                      <option key={rep} value={rep}>
                        {rep}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    استان / شهر
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newProvince}
                      onChange={(e) => {
                        const prov = e.target.value;
                        setNewProvince(prov);
                        setNewCity(PROVINCES_CITIES[prov]?.[0] ?? '');
                      }}
                      className="h-10 px-2.5 rounded-lg border border-slate-300 bg-white"
                    >
                      {Object.keys(PROVINCES_CITIES).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="h-10 px-2.5 rounded-lg border border-slate-300 bg-white"
                    >
                      {(PROVINCES_CITIES[newProvince] ?? []).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    آدرس
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="آدرس کامل طرف حساب..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0f5864]"
                  />
                </div>
              </div>

              {/* 4-Tier Credit Standing Selection */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <label className="block font-bold text-slate-800">
                  دسته‌بندی وضعیت مالی و اعتبار (تعیین رنگ کارت و هدر پروفایل)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'green', label: 'سبز · نقدی / اعتبار فعال' },
                      { id: 'yellow', label: 'زرد · نزدیک سقف / موعد' },
                      { id: 'red', label: 'قرمز · اتمام اعتبار' },
                      { id: 'black', label: 'مشکی · بلک‌لیست' },
                    ] as Array<{ id: CustomerStandingTier; label: string }>
                  ).map((opt) => {
                    const style = STANDING_TIER_STYLES[opt.id];
                    const active = newStanding === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setNewStanding(opt.id);
                          if (opt.id !== 'green') setNewPaymentMode('credit');
                        }}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
                          active
                            ? style.filterActiveClass
                            : style.filterInactiveClass
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {newStanding === 'green' && (
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newPaymentMode"
                        checked={newPaymentMode === 'cash'}
                        onChange={() => setNewPaymentMode('cash')}
                      />
                      <span className="font-semibold text-slate-800">
                        مشتری نقدی (تسویه در محل)
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newPaymentMode"
                        checked={newPaymentMode === 'credit'}
                        onChange={() => setNewPaymentMode('credit')}
                      />
                      <span className="font-semibold text-slate-800">
                        مشتری اعتباری با اعتبار کافی
                      </span>
                    </label>
                  </div>
                )}

                {(newStanding !== 'green' || newPaymentMode === 'credit') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        سقف اعتبار (میلیون ریال)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newCreditLimitM}
                        onChange={(e) => setNewCreditLimitM(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اعتبار مصرف‌شده (میلیون ریال)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newUsedCreditM}
                        onChange={(e) => setNewUsedCreditM(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        روز مانده تا سررسید (منفی = معوق)
                      </label>
                      <input
                        type="number"
                        value={newDaysRemaining}
                        onChange={(e) => setNewDaysRemaining(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {newStanding === 'black' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-red-700 mb-1">
                      دلیل قرارگیری در بلک‌لیست
                    </label>
                    <input
                      type="text"
                      value={newBlacklistReason}
                      onChange={(e) => setNewBlacklistReason(e.target.value)}
                      placeholder="مثلاً: چک برگشتی یا بدهی معوق حقوقی..."
                      className="w-full h-9 px-3 rounded-lg border border-red-300 focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  توضیحات پرونده
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="توضیحات تکمیلی طرف حساب..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0f5864]"
                />
              </div>
            </div>

            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
              >
                ثبت طرف حساب جدید
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Bulk Assign Data */}
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
              <h2 className="text-sm font-bold text-slate-900">
                تخصیص دیتا ({toPersianDigits(selectedIds.length)} طرف حساب)
              </h2>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کارشناس فروش جدید
                </label>
                <select
                  value={assignSalesRep}
                  onChange={(e) => setAssignSalesRep(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">بدون تغییر</option>
                  {SALES_REPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کارشناس CRM جدید
                </label>
                <select
                  value={assignCrmRep}
                  onChange={(e) => setAssignCrmRep(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">بدون تغییر</option>
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
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
              >
                ثبت تخصیص دیتا
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Bulk Send SMS */}
      {smsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ارسال پیامک گروهی"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSmsModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmitSms}
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                ارسال پیامک به {toPersianDigits(selectedIds.length)} طرف حساب
              </h2>
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-2 text-xs">
              <label className="block font-bold text-slate-700">
                متن پیامک
              </label>
              <textarea
                rows={4}
                required
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="متن پیامک جهت ارسال به مشتریان انتخاب‌شده..."
                className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0f5864]"
              />
            </div>

            <div className="px-5 pt-3.5 pb-modal-safe bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl sm:rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d]"
              >
                ارسال پیامک
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
