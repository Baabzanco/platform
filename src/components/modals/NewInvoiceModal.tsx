import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  FilePlus2,
  Plus,
  Send,
  Trash2,
  Undo2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ALL_DEPARTMENT_LABELS,
  DELIVERY_SLOTS,
  PRODUCT_CATALOG,
} from '../../data/initialOrders';
import { CustomerRecord } from '../../types/customer';
import { CreateOrderInput, Order } from '../../types/order';
import { formatRial, formatWeight } from '../../utils/formatters';
import { CalendarDayInfo, toPersianDigits } from '../../utils/jalaliCalendar';

interface InvoiceDraftRow {
  rowId: string;
  productName: string;
  isCustomProduct: boolean;
  requestedWeight: string;
  unitPrice: string;
}

interface NewInvoiceModalProps {
  open: boolean;
  editingOrder: Order | null;
  defaultDateKey: string;
  weekDays: CalendarDayInfo[];
  customers: CustomerRecord[];
  onClose: () => void;
  onCreateOrder: (input: CreateOrderInput) => void;
  onResubmitOrder: (orderId: string, input: CreateOrderInput) => void;
}

function makeEmptyRow(idx: number): InvoiceDraftRow {
  const defaultProd = PRODUCT_CATALOG[idx % PRODUCT_CATALOG.length];
  return {
    rowId: `row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    productName: defaultProd.name,
    isCustomProduct: false,
    requestedWeight: '10',
    unitPrice: String(defaultProd.defaultUnitPrice),
  };
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  open,
  editingOrder,
  defaultDateKey,
  weekDays,
  customers,
  onClose,
  onCreateOrder,
  onResubmitOrder,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(defaultDateKey);
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[2]);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<InvoiceDraftRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (editingOrder) {
      setSelectedCustomerId('');
      setCustomerName(editingOrder.customerName);
      setCustomerPhone(editingOrder.customerPhone);
      setDistrict(editingOrder.district);
      setAddress(editingOrder.address);
      setDeliveryDate(editingOrder.deliveryDate || defaultDateKey);
      setDeliverySlot(editingOrder.deliverySlot || DELIVERY_SLOTS[2]);
      setNotes(editingOrder.notes);
      setRows(
        editingOrder.items.map((item, idx) => {
          const inCatalog = PRODUCT_CATALOG.some(
            (p) => p.name === item.productName
          );
          return {
            rowId: `edit-row-${idx}-${item.id}`,
            productName: item.productName,
            isCustomProduct: !inCatalog,
            requestedWeight: String(item.requestedWeight),
            unitPrice: String(item.unitPrice),
          };
        })
      );
      setError('');
    } else {
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setDistrict('');
      setAddress('');
      setDeliveryDate(defaultDateKey);
      setDeliverySlot(DELIVERY_SLOTS[2]);
      setNotes('');
      setRows([makeEmptyRow(0)]);
      setError('');
    }
  }, [open, editingOrder, defaultDateKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedCustomerRecord = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const totals = useMemo(() => {
    let totalWeight = 0;
    let totalAmount = 0;
    for (const row of rows) {
      const w = parseFloat(row.requestedWeight);
      const p = parseFloat(row.unitPrice);
      if (Number.isFinite(w) && w > 0) {
        totalWeight += w;
        if (Number.isFinite(p) && p > 0) {
          totalAmount += w * p;
        }
      }
    }
    return { totalWeight, totalAmount };
  }, [rows]);

  const dateOptions = useMemo(() => {
    const exists = weekDays.some((d) => d.dateKey === deliveryDate);
    if (exists) return weekDays;
    return [
      {
        dateKey: deliveryDate,
        weekdayName: 'تاریخ سفارش',
        dateLabel: toPersianDigits(deliveryDate.replace(/-/g, '/')),
        isToday: false,
      },
      ...weekDays,
    ];
  }, [weekDays, deliveryDate]);

  if (!open) return null;

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setError('');
    if (!customerId) return;
    const found = customers.find((c) => c.id === customerId);
    if (!found) return;

    const fullLabel = found.managerName
      ? `${found.name} / ${found.managerName}`
      : found.name;
    const primaryPhone = found.contacts[0]?.phone ?? '';
    setCustomerName(fullLabel);
    setCustomerPhone(primaryPhone);
    setDistrict(found.mainBranch || found.city || 'تهران');
    setAddress(found.address || '');
  };

  const handleProductSelectChange = (rowId: string, value: string) => {
    setError('');
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        if (value === '__custom__') {
          return {
            ...row,
            isCustomProduct: true,
            productName: '',
          };
        }
        const catalogItem = PRODUCT_CATALOG.find((p) => p.name === value);
        return {
          ...row,
          isCustomProduct: false,
          productName: value,
          unitPrice: catalogItem
            ? String(catalogItem.defaultUnitPrice)
            : row.unitPrice,
        };
      })
    );
  };

  const handleRowChange = (
    rowId: string,
    field: 'productName' | 'requestedWeight' | 'unitPrice',
    value: string
  ) => {
    setError('');
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, makeEmptyRow(prev.length)]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('لطفاً نام مشتری / طرف حساب را وارد یا انتخاب کنید.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('لطفاً شماره تماس مشتری را وارد کنید.');
      return;
    }
    if (!address.trim()) {
      setError('لطفاً آدرس تحویل سفارش را وارد کنید.');
      return;
    }

    const parsedItems = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const weight = parseFloat(row.requestedWeight);
      const price = parseFloat(row.unitPrice);
      if (!row.productName.trim()) {
        setError(`لطفاً نام محصول ردیف ${toPersianDigits(i + 1)} را مشخص کنید.`);
        return;
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        setError(
          `لطفاً وزن درخواستی معتبر (بزرگتر از صفر) برای «${row.productName}» وارد کنید.`
        );
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        setError(
          `لطفاً قیمت واحد معتبر (ریال) برای «${row.productName}» وارد کنید.`
        );
        return;
      }
      parsedItems.push({
        productName: row.productName.trim(),
        requestedWeight: Number(weight.toFixed(2)),
        unitPrice: Math.round(price),
      });
    }

    if (parsedItems.length === 0) {
      setError('لطفاً حداقل یک قلم کالا به فاکتور اضافه کنید.');
      return;
    }

    const payload: CreateOrderInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      district: district.trim() || 'تهران',
      address: address.trim(),
      deliveryDate,
      deliverySlot,
      notes: notes.trim(),
      items: parsedItems,
    };

    if (editingOrder) {
      onResubmitOrder(editingOrder.id, payload);
    } else {
      onCreateOrder(payload);
    }
    onClose();
  };

  const isEditing = editingOrder !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? `اصلاح فاکتور سفارش ${editingOrder.code}` : 'ثبت فاکتور جدید'}
      className="no-print fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[820px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0f5864]/10 text-[#0f5864] flex items-center justify-center shrink-0">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] sm:text-base font-bold text-slate-900 truncate">
                {isEditing
                  ? `اصلاح فاکتور سفارش ${editingOrder.code} و ارسال مجدد به تولید`
                  : 'ثبت فاکتور جدید (ارسال به بخش تولید)'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                پس از ثبت نهایی، سفارش بلافاصله در صف آماده‌سازی و توزین بخش تولید قرار می‌گیرد.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          id="new-invoice-form"
          noValidate
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5"
        >
          {/* If editing a returned_to_sales order, show why it was returned */}
          {editingOrder?.salesReturn && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-[13px] flex items-start gap-2.5">
              <Undo2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <div className="font-bold text-amber-900">
                  علت برگشت از {ALL_DEPARTMENT_LABELS[editingOrder.salesReturn.source]} ({editingOrder.salesReturn.timestamp}):
                </div>
                <p>{editingOrder.salesReturn.reason}</p>
              </div>
            </div>
          )}

          {/* Customer Quick Picker */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#0f5864]" />
                اطلاعات طرف حساب و تحویل
              </h3>
              <span className="text-[11px] text-slate-500">
                می‌توانید از فهرست مشتریان انتخاب کنید یا دستی وارد نمایید
              </span>
            </div>

            {customers.length > 0 && (
              <div>
                <label
                  htmlFor="invoice-customer-picker"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  انتخاب سریع از لیست طرف حساب‌ها (اختیاری)
                </label>
                <select
                  id="invoice-customer-picker"
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-[13px] bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864] focus:bg-white"
                >
                  <option value="">— انتخاب از مشتریان ثبت‌شده —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.managerName ? ` (${c.managerName})` : ''} — {c.financialStatusLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedCustomerRecord &&
              (selectedCustomerRecord.standing === 'red' ||
                selectedCustomerRecord.standing === 'black') && (
                <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    توجه: وضعیت اعتباری این طرف حساب{' '}
                    <strong>{selectedCustomerRecord.financialStatusLabel}</strong> است.
                    {selectedCustomerRecord.credit.blacklistReason
                      ? ` (${selectedCustomerRecord.credit.blacklistReason})`
                      : selectedCustomerRecord.credit.warningReason
                        ? ` (${selectedCustomerRecord.credit.warningReason})`
                        : ''}
                  </span>
                </div>
              )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="invoice-customer-name"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  نام طرف حساب / مشتری <span className="text-red-500">*</span>
                </label>
                <input
                  id="invoice-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setError('');
                  }}
                  placeholder="مثلاً: رستوران سنتی الوند / آقای صادقی"
                  className="w-full h-10 px-3 text-sm sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>

              <div>
                <label
                  htmlFor="invoice-customer-phone"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  شماره تماس مشتری <span className="text-red-500">*</span>
                </label>
                <input
                  id="invoice-customer-phone"
                  type="tel"
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="021-88712405"
                  className="tabular-nums text-left w-full h-10 px-3 text-sm sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>

              <div>
                <label
                  htmlFor="invoice-district"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  محدوده جغرافیایی
                </label>
                <input
                  id="invoice-district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مثلاً: سعادت‌آباد / بلوار دریا"
                  className="w-full h-10 px-3 text-sm sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="invoice-date"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    تاریخ ارسال
                  </label>
                  <select
                    id="invoice-date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  >
                    {dateOptions.map((d) => (
                      <option key={d.dateKey} value={d.dateKey}>
                        {d.weekdayName} {d.dateLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="invoice-slot"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    بازه ارسال
                  </label>
                  <select
                    id="invoice-slot"
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                  >
                    {DELIVERY_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="invoice-address"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  آدرس کامل تحویل <span className="text-red-500">*</span>
                </label>
                <input
                  id="invoice-address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError('');
                  }}
                  placeholder="نشانی دقیق محل تحویل بار..."
                  className="w-full h-10 px-3 text-sm sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="invoice-notes"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  توضیحات برای واحد تولید و ارسال
                </label>
                <textarea
                  id="invoice-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثلاً: بسته‌بندی وکیوم، بار سرخ و تازه، ارسال با ماشین یخچالدار..."
                  className="w-full px-3 py-2 text-sm sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>
            </div>
          </div>

          {/* Invoice Product Items */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800">
                اقلام فاکتور ({toPersianDigits(rows.length)} ردیف)
              </h3>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f5864]/10 text-[#0f5864] hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن ردیف کالا
              </button>
            </div>

            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const w = parseFloat(row.requestedWeight);
                const p = parseFloat(row.unitPrice);
                const rowTotal =
                  Number.isFinite(w) && w > 0 && Number.isFinite(p) && p > 0
                    ? w * p
                    : 0;

                return (
                  <div
                    key={row.rowId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          محصول ردیف {toPersianDigits(idx + 1)}
                        </label>
                        {!row.isCustomProduct ? (
                          <select
                            value={row.productName}
                            onChange={(e) =>
                              handleProductSelectChange(row.rowId, e.target.value)
                            }
                            className="w-full h-10 px-2.5 text-xs sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                          >
                            {PRODUCT_CATALOG.map((item) => (
                              <option key={item.name} value={item.name}>
                                {item.name}
                              </option>
                            ))}
                            <option value="__custom__">+ وارد کردن نام محصول دلخواه...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={row.productName}
                              onChange={(e) =>
                                handleRowChange(row.rowId, 'productName', e.target.value)
                              }
                              placeholder="نام محصول را تایپ کنید..."
                              className="flex-1 h-10 px-2.5 text-xs sm:text-[13px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleProductSelectChange(
                                  row.rowId,
                                  PRODUCT_CATALOG[0].name
                                )
                              }
                              className="h-10 px-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap"
                            >
                              فهرست
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          وزن (kg)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={row.requestedWeight}
                          onChange={(e) =>
                            handleRowChange(row.rowId, 'requestedWeight', e.target.value)
                          }
                          className="tabular-nums w-full h-10 px-2.5 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          قیمت واحد (ریال / kg)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleRowChange(row.rowId, 'unitPrice', e.target.value)
                          }
                          className="tabular-nums w-full h-10 px-2.5 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          disabled={rows.length <= 1}
                          onClick={() => handleRemoveRow(row.rowId)}
                          title="حذف ردیف"
                          aria-label="حذف ردیف"
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-red-600 bg-white border border-red-200 hover:bg-red-600 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/70">
                      <span>جمع مبلغ ردیف {toPersianDigits(idx + 1)}</span>
                      <span className="tabular-nums font-bold text-slate-800">
                        {formatRial(rowTotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Invoice Summary Strip */}
            <div className="px-4 py-3 rounded-xl bg-[#0f5864]/8 border border-[#0f5864]/20 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]">
              <div className="flex items-center gap-3 text-slate-700">
                <span>
                  مجموع وزن درخواستی:{' '}
                  <strong className="tabular-nums text-slate-900">
                    {formatWeight(Number(totals.totalWeight.toFixed(2)))}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>
                  تعداد اقلام:{' '}
                  <strong className="tabular-nums text-slate-900">
                    {toPersianDigits(rows.length)}
                  </strong>
                </span>
              </div>
              <div className="font-bold text-[#0f5864] tabular-nums text-sm">
                جمع کل فاکتور: {formatRial(totals.totalAmount)}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 pt-3.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pb-modal-safe shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="new-invoice-form"
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-[#0f5864] rounded-xl sm:rounded-lg hover:bg-[#0b434d] transition-colors whitespace-nowrap"
          >
            <Send className="w-4 h-4 shrink-0" />
            {isEditing
              ? 'ذخیره اصلاحات و ارسال مجدد به تولید'
              : 'ثبت فاکتور و ارسال به تولید'}
          </button>
        </div>
      </div>
    </div>
  );
};
