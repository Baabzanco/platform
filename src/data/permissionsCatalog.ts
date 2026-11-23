import {
  AccessPresetId,
  AppUser,
  PermissionGroup,
  PermissionKey,
  PermissionMap,
  UserGroup,
} from '../types/permissions';

export const ROOT_PERMISSION_CATEGORY = {
  id: 'orders',
  title: 'سفارشات',
  description:
    'تمامی بخش‌ها، فیلدهای نمایشی، مبالغ، مدارک و عملیات پلتفرم در دسته‌بندی واحد «سفارشات» تعریف شده‌اند. برای هر گروه کاربری می‌توانید مجوز مشاهده و در صورت فعال بودن مشاهده، مجوز ویرایش یا اقدام را مشخص کنید.',
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'sections',
    title: 'بخش‌ها و صفحات سامانه',
    description: 'دسترسی به صفحات منو و اجزای ساختاری اصلی در بخش سفارشات',
    items: [
      {
        key: 'section_calendar',
        label: 'تقویم روزانه سفارش‌ها',
        description: 'نوار هفتگی بالای صفحه، شمارشگر سفارش‌ها و تغییر روز/هفته',
      },
      {
        key: 'section_production',
        label: 'صفحه بخش تولید',
        description: 'مشاهده صف سفارش‌های تولید و مدیریت عملیات توزین',
      },
      {
        key: 'section_prep_matrix',
        label: 'جدول نیاز به آماده‌سازی',
        description: 'تب ماتریس تجمیعی محصولات و سفارش‌های آماده تولید',
      },
      {
        key: 'section_finance',
        label: 'صفحه بخش صدور فاکتور',
        description: 'مشاهده و بررسی فاکتورها، مبالغ و مدارک تحویل رانندگان',
      },
      {
        key: 'section_shipping',
        label: 'صفحه بخش ارسال',
        description: 'مشاهده صف ارسال، تخصیص راننده، مغایرت وزن و مرجوعی',
      },
      {
        key: 'section_driver',
        label: 'صفحه پنل رانندگان',
        description: 'لیست مسیر رانندگان، تماس با مشتری و ثبت مدارک تحویل',
      },
      {
        key: 'section_reports',
        label: 'صفحه گزارش‌ها و آمار زنده',
        description: 'کارت‌های آماری، نمودار وضعیت و جدول جامع رهگیری سفارش‌ها',
      },
      {
        key: 'section_access_control',
        label: 'صفحه سطح دسترسی و گروه‌های کاربری',
        description: 'مشاهده و تعریف گروه‌های کاربری، مجوزها و اتصال کاربران به گروه‌ها',
      },
    ],
  },
  {
    id: 'order_customer_fields',
    title: 'مشخصات پایه و اطلاعات مشتری',
    description: 'فیلدهای هویتی، زمانی، مکانی و ارتباطی هر سفارش',
    items: [
      {
        key: 'field_order_code',
        label: 'کد سفارش',
        description: 'نمایش شناسه و کد یکتای سفارش در کارت‌ها، جداول و پنجره جزئیات',
      },
      {
        key: 'field_delivery_slot',
        label: 'بازه زمانی ارسال',
        description: 'نمایش ساعت و بازه تحویل سفارش (مثلاً ۱۴ تا ۱۶)',
      },
      {
        key: 'field_order_status',
        label: 'وضعیت سفارش و نوار اولویت',
        description: 'نمایش مرحله فعلی سفارش و بنرهای اولویت اقدام واحدها',
      },
      {
        key: 'field_customer_name',
        label: 'نام طرف حساب / مشتری',
        description: 'نمایش نام مجموعه یا شخص خریدار در صدور فاکتور و گزارش‌ها',
      },
      {
        key: 'field_customer_phone',
        label: 'تلفن و دکمه تماس با مشتری',
        description: 'مشاهده شماره تماس و امکان برقراری تماس یا کپی شماره',
      },
      {
        key: 'field_district',
        label: 'محدوده جغرافیایی',
        description: 'نمایش نام محدوده و محله تحویل در پنل رانندگان',
      },
      {
        key: 'field_address',
        label: 'آدرس دقیق تحویل',
        description: 'نمایش نشانی کامل مشتری در بخش ارسال و پنل رانندگان',
      },
      {
        key: 'field_notes',
        label: 'توضیحات سفارش',
        description: 'یادداشت‌های اختصاصی سفارش در تولید و توضیحات تکمیلی',
      },
      {
        key: 'field_call_recording',
        label: 'فایل صوتی مکالمه سفارش',
        description: 'پخش‌کننده صدای ضبط‌شده مکالمه مشتری در بخش صدور فاکتور',
      },
    ],
  },
  {
    id: 'items_weights_amounts',
    title: 'اقلام، وزن‌ها و مبالغ مالی',
    description: 'جزئیات محصولات، وزن‌های مراحل مختلف و قیمت‌گذاری فاکتور',
    items: [
      {
        key: 'field_product_name',
        label: 'نام محصول و تعداد اقلام',
        description: 'نمایش نام کالاها و شمارش اقلام سفارش در جداول و کارت‌ها',
      },
      {
        key: 'field_requested_weight',
        label: 'مقدار / وزن درخواستی',
        description: 'وزن اولیه ثبت‌شده توسط مشتری برای هر قلم محصول',
      },
      {
        key: 'field_produced_weight',
        label: 'وزن تولیدشده (توزین)',
        description: 'وزن واقعی ثبت‌شده پس از توزین در واحد تولید',
      },
      {
        key: 'field_revised_weight',
        label: 'وزن اصلاحی (مغایرت وزن)',
        description: 'نمایش اختلاف و وزن اصلاح‌شده ارجاعی از واحد ارسال',
      },
      {
        key: 'field_delivered_weight',
        label: 'وزن تحویلی نهایی',
        description: 'وزن تحویل‌داده‌شده به راننده در مرحله خروج کالا',
      },
      {
        key: 'field_returned_weight',
        label: 'مقدار و وزن مرجوعی',
        description: 'نمایش اقلام و وزن‌های برگشت‌خورده در بخش‌ها و گزارش‌ها',
      },
      {
        key: 'field_unit_price',
        label: 'قیمت واحد (ریال)',
        description: 'فی هر کیلوگرم محصول در جدول فاکتور',
      },
      {
        key: 'field_item_total',
        label: 'مبلغ کل هر ردیف',
        description: 'جمع ریالی هر ردیف محصول در جدول صدور فاکتور',
      },
      {
        key: 'field_order_total',
        label: 'مبلغ کل فاکتور و مانده خالص',
        description: 'جمع کل فاکتور، کسر مرجوعی و آمار ریالی در صدور فاکتور و گزارش‌ها',
      },
    ],
  },
  {
    id: 'production_actions',
    title: 'عملیات بخش تولید',
    description: 'دکمه‌ها و اقدامات اجرایی مرحله تولید و توزین',
    items: [
      {
        key: 'action_production_weigh',
        label: 'ثبت و ویرایش وزن محصول',
        description: 'باز کردن پنجره توزین و ثبت یا تغییر وزن هر قلم کالا',
      },
      {
        key: 'action_production_complete',
        label: 'اتمام تولید و ارسال به صدور فاکتور',
        description: 'تکمیل فرآیند تولید و ارسال سفارش به صف صدور فاکتور',
      },
      {
        key: 'action_production_reject',
        label: 'رد سفارش در بخش تولید',
        description: 'امکان رد کردن سفارش با ثبت دلیل در واحد تولید',
      },
    ],
  },
  {
    id: 'finance_actions',
    title: 'عملیات بخش صدور فاکتور',
    description: 'تایید فاکتور، رد سفارش، تایید یا رد عکس مدارک راننده',
    items: [
      {
        key: 'action_finance_approve',
        label: 'تایید و صدور فاکتور',
        description: 'صدور نهایی فاکتور یا تایید مجدد فاکتور اصلاحی مغایرت وزن',
      },
      {
        key: 'action_finance_reject',
        label: 'رد سفارش در بخش صدور فاکتور',
        description: 'امکان رد کردن سفارش از واحد صدور فاکتور با ثبت دلیل',
      },
      {
        key: 'action_finance_verify_driver_docs',
        label: 'بررسی و تایید مدارک تحویل راننده',
        description: 'مشاهده عکس فاکتور و رسید ارسالی راننده و دکمه تایید نهایی',
      },
      {
        key: 'action_finance_reject_driver_docs',
        label: 'رد عکس فاکتور/رسید و درخواست عکس مجدد',
        description: 'رد مدارک بی‌کیفیت یا اشتباه با ثبت دلیل و ارجاع قرمز به اولویت راننده',
      },
    ],
  },
  {
    id: 'shipping_returns_actions',
    title: 'عملیات بخش ارسال و مرجوعی',
    description: 'تخصیص راننده، تحویل بار، ارجاع مغایرت و مدیریت مرجوعی',
    items: [
      {
        key: 'field_driver_assignment',
        label: 'راننده سفارش و تخصیص راننده',
        description: 'مشاهده نام راننده و امکان انتخاب یا تغییر راننده سفارش',
      },
      {
        key: 'action_shipping_discrepancy',
        label: 'ثبت مغایرت وزن و ارجاع به صدور فاکتور',
        description: 'ثبت اختلاف وزن در ارسال و بازگشت سفارش به واحد صدور فاکتور',
      },
      {
        key: 'action_shipping_deliver',
        label: 'ثبت وزن و تحویل به راننده',
        description: 'ثبت وزن خروجی نهایی و تحویل رسمی سفارش به راننده',
      },
      {
        key: 'action_shipping_return',
        label: 'ثبت مرجوعی سفارش',
        description: 'اعلام مرجوعی اقلام از بخش ارسال و اطلاع‌رسانی به کل واحدها',
      },
      {
        key: 'action_return_confirm',
        label: 'تایید و تعیین‌تکلیف مرجوعی واحدها',
        description: 'مشاهده کادر مرجوعی و کلیک روی دکمه تایید مرجوعی در هر واحد',
      },
    ],
  },
  {
    id: 'driver_and_general',
    title: 'عملیات پنل رانندگان و امکانات عمومی',
    description: 'ثبت لوکیشن مشتری، مسیریابی، آپلود عکس مدارک تحویل، پرینت و بازنشانی',
    items: [
      {
        key: 'action_driver_route_priority',
        label: 'ثبت لوکیشن مشتری و مسیریابی',
        description: 'مشاهده نقشه، ثبت موقعیت مکانی مشتری و شروع مسیریابی به سمت مقصد',
      },
      {
        key: 'field_driver_invoice_photo',
        label: 'عکس فاکتور تحویل',
        description: 'مشاهده پیش‌نمایش و امکان عکاسی، آپلود، تغییر یا حذف عکس فاکتور',
      },
      {
        key: 'field_driver_receipt_photo',
        label: 'عکس رسید پرداخت',
        description: 'مشاهده پیش‌نمایش و امکان عکاسی، آپلود، تغییر یا حذف عکس رسید',
      },
      {
        key: 'action_driver_complete',
        label: 'اتمام تحویل و ارسال به صدور فاکتور',
        description: 'نمایش و کلیک روی دکمه اتمام تحویل پس از تکمیل هر دو عکس',
      },
      {
        key: 'action_print',
        label: 'پرینت سفارش‌ها و گزارش‌ها',
        description: 'مشاهده و استفاده از دکمه‌های پرینت تکی و پرینت گروهی',
      },
      {
        key: 'action_reset_data',
        label: 'بازنشانی داده‌های نمونه',
        description: 'دکمه ریست کامل اطلاعات آزمایشی در منوی سامانه',
      },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((item) => item.key)
);

export function createPermissionMap(
  overrides: Partial<Record<PermissionKey, { view: boolean; edit: boolean }>>,
  defaultVal: { view: boolean; edit: boolean } = { view: false, edit: false }
): PermissionMap {
  const map = {} as PermissionMap;
  for (const key of ALL_PERMISSION_KEYS) {
    const raw = overrides[key] ?? defaultVal;
    map[key] = {
      view: raw.view,
      edit: raw.view ? raw.edit : false,
    };
  }
  return map;
}

export function buildPresetPermissions(preset: AccessPresetId): PermissionMap {
  if (preset === 'admin_full') {
    return createPermissionMap({}, { view: true, edit: true });
  }

  if (preset === 'read_only_viewer') {
    return createPermissionMap(
      {
        section_access_control: { view: false, edit: false },
        action_reset_data: { view: false, edit: false },
      },
      { view: true, edit: false }
    );
  }

  if (preset === 'production_operator') {
    return createPermissionMap({
      section_calendar: { view: true, edit: true },
      section_production: { view: true, edit: true },
      section_prep_matrix: { view: true, edit: true },
      field_order_code: { view: true, edit: false },
      field_delivery_slot: { view: true, edit: false },
      field_order_status: { view: true, edit: false },
      field_notes: { view: true, edit: false },
      field_product_name: { view: true, edit: false },
      field_requested_weight: { view: true, edit: false },
      field_produced_weight: { view: true, edit: true },
      field_returned_weight: { view: true, edit: false },
      action_production_weigh: { view: true, edit: true },
      action_production_complete: { view: true, edit: true },
      action_production_reject: { view: true, edit: true },
      action_return_confirm: { view: true, edit: true },
      action_print: { view: true, edit: true },
    });
  }

  if (preset === 'finance_specialist') {
    return createPermissionMap({
      section_calendar: { view: true, edit: true },
      section_finance: { view: true, edit: true },
      section_reports: { view: true, edit: false },
      field_order_code: { view: true, edit: false },
      field_delivery_slot: { view: true, edit: false },
      field_order_status: { view: true, edit: false },
      field_customer_name: { view: true, edit: false },
      field_customer_phone: { view: true, edit: true },
      field_call_recording: { view: true, edit: true },
      field_product_name: { view: true, edit: false },
      field_requested_weight: { view: true, edit: false },
      field_produced_weight: { view: true, edit: false },
      field_revised_weight: { view: true, edit: false },
      field_returned_weight: { view: true, edit: false },
      field_unit_price: { view: true, edit: false },
      field_item_total: { view: true, edit: false },
      field_order_total: { view: true, edit: false },
      field_driver_assignment: { view: true, edit: false },
      action_finance_approve: { view: true, edit: true },
      action_finance_reject: { view: true, edit: true },
      action_finance_verify_driver_docs: { view: true, edit: true },
      action_finance_reject_driver_docs: { view: true, edit: true },
      field_driver_invoice_photo: { view: true, edit: false },
      field_driver_receipt_photo: { view: true, edit: false },
      action_return_confirm: { view: true, edit: true },
      action_print: { view: true, edit: true },
    });
  }

  if (preset === 'shipping_coordinator') {
    return createPermissionMap({
      section_calendar: { view: true, edit: true },
      section_shipping: { view: true, edit: true },
      section_driver: { view: true, edit: false },
      field_order_code: { view: true, edit: false },
      field_delivery_slot: { view: true, edit: false },
      field_order_status: { view: true, edit: false },
      field_district: { view: true, edit: false },
      field_address: { view: true, edit: false },
      field_product_name: { view: true, edit: false },
      field_requested_weight: { view: true, edit: false },
      field_produced_weight: { view: true, edit: false },
      field_revised_weight: { view: true, edit: true },
      field_delivered_weight: { view: true, edit: true },
      field_returned_weight: { view: true, edit: true },
      field_driver_assignment: { view: true, edit: true },
      action_shipping_discrepancy: { view: true, edit: true },
      action_shipping_deliver: { view: true, edit: true },
      action_shipping_return: { view: true, edit: true },
      action_return_confirm: { view: true, edit: true },
      action_driver_route_priority: { view: true, edit: false },
      action_print: { view: true, edit: true },
    });
  }

  // driver_role
  return createPermissionMap({
    section_calendar: { view: true, edit: true },
    section_driver: { view: true, edit: true },
    field_order_code: { view: true, edit: false },
    field_delivery_slot: { view: true, edit: false },
    field_order_status: { view: true, edit: false },
    field_customer_phone: { view: true, edit: true },
    field_district: { view: true, edit: false },
    field_address: { view: true, edit: false },
    field_product_name: { view: true, edit: false },
    field_delivered_weight: { view: true, edit: false },
    field_driver_assignment: { view: true, edit: false },
    action_driver_route_priority: { view: true, edit: true },
    field_driver_invoice_photo: { view: true, edit: true },
    field_driver_receipt_photo: { view: true, edit: true },
    action_driver_complete: { view: true, edit: true },
    action_print: { view: true, edit: true },
  });
}

export const ACCESS_PRESET_LABELS: Record<AccessPresetId, string> = {
  admin_full: 'دسترسی کامل (مدیران سیستم)',
  production_operator: 'الگوی گروه تولید',
  finance_specialist: 'الگوی گروه صدور فاکتور',
  shipping_coordinator: 'الگوی گروه ارسال',
  driver_role: 'الگوی گروه رانندگان',
  read_only_viewer: 'گروه ناظرین (فقط مشاهده)',
};

export const INITIAL_USER_GROUPS: UserGroup[] = [
  {
    id: 'group-admins',
    name: 'مدیران کل سیستم',
    description: 'دسترسی کامل مشاهده و ویرایش به تمام بخش‌ها و فیلدهای کتگوری سفارشات',
    isSystemGroup: true,
    permissions: buildPresetPermissions('admin_full'),
  },
  {
    id: 'group-production',
    name: 'گروه تولید و توزین',
    description: 'دسترسی به صف تولید، ماتریس نیاز به آماده‌سازی، ثبت وزن و تایید مرجوعی تولید',
    permissions: buildPresetPermissions('production_operator'),
  },
  {
    id: 'group-finance',
    name: 'گروه صدور فاکتور',
    description: 'دسترسی به مبالغ، طرف حساب، تایید فاکتور و تایید/رد مدارک تحویل رانندگان',
    permissions: buildPresetPermissions('finance_specialist'),
  },
  {
    id: 'group-shipping',
    name: 'گروه ارسال و توزیع',
    description: 'دسترسی به تخصیص راننده، ثبت مغایرت وزن، تحویل بار و اعلام مرجوعی',
    permissions: buildPresetPermissions('shipping_coordinator'),
  },
  {
    id: 'group-drivers',
    name: 'گروه رانندگان پخش',
    description: 'دسترسی به پنل رانندگان، اولویت‌بندی مسیر، تماس با مشتری و ثبت عکس فاکتور و رسید',
    permissions: buildPresetPermissions('driver_role'),
  },
  {
    id: 'group-viewers',
    name: 'گروه ناظرین (فقط مشاهده)',
    description: 'مشاهده اطلاعات سفارش‌ها و گزارش‌ها بدون امکان تغییر یا انجام عملیات',
    permissions: buildPresetPermissions('read_only_viewer'),
  },
];

export const INITIAL_APP_USERS: AppUser[] = [
  {
    id: 'user-admin',
    fullName: 'امیر مرادصالحی',
    roleTitle: 'مدیر کل سامانه',
    phone: '0912-100-1001',
    groupId: 'group-admins',
    isSystemAdmin: true,
  },
  {
    id: 'user-prod-1',
    fullName: 'مهدی کریمی',
    roleTitle: 'سرپرست تولید',
    phone: '0912-234-5501',
    groupId: 'group-production',
  },
  {
    id: 'user-prod-2',
    fullName: 'حسین رضایی',
    roleTitle: 'اپراتور باسکول و توزین',
    phone: '0912-234-5502',
    groupId: 'group-production',
  },
  {
    id: 'user-finance-1',
    fullName: 'سارا محمدی',
    roleTitle: 'کارشناس صدور فاکتور',
    phone: '0912-345-6601',
    groupId: 'group-finance',
  },
  {
    id: 'user-shipping-1',
    fullName: 'علیرضا حسینی',
    roleTitle: 'مسئول واحد ارسال',
    phone: '0912-456-7701',
    groupId: 'group-shipping',
  },
  {
    id: 'user-driver-1',
    fullName: 'رضا احمدی',
    roleTitle: 'راننده وانت یخچال‌دار',
    phone: '0912-567-8801',
    groupId: 'group-drivers',
  },
  {
    id: 'user-driver-2',
    fullName: 'سعید محمدی',
    roleTitle: 'راننده پخش منطقه شمال',
    phone: '0912-567-8802',
    groupId: 'group-drivers',
  },
];
