import {
  AccessPresetId,
  AppUser,
  PermissionCategory,
  PermissionCategoryId,
  PermissionGroup,
  PermissionKey,
  PermissionMap,
  UserGroup,
} from '../types/permissions';

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'orders',
    title: 'سفارشات',
    description:
      'تمامی صفحات، فیلدهای نمایشی، وزن‌ها، مبالغ، مدارک رانندگان و عملیات واحدهای تولید، صدور فاکتور، ارسال و گزارش‌ها در این کتگوری قرار دارند.',
    subgroups: [
      {
        id: 'sections',
        title: 'بخش‌ها و صفحات سفارشات',
        description: 'دسترسی به صفحات منو و اجزای ساختاری اصلی در بخش سفارشات',
        items: [
          {
            key: 'section_calendar',
            label: 'تقویم روزانه سفارش‌ها',
            description:
              'نوار هفتگی بالای صفحه، شمارشگر سفارش‌ها و تغییر روز/هفته',
          },
          {
            key: 'section_sales',
            label: 'صفحه بخش کارشناس فروش',
            description:
              'مشاهده فهرست سفارشات با تمام جزئیات، ثبت فاکتور جدید و رسیدگی به سفارش‌های برگشت‌خورده به فروش',
          },
          {
            key: 'section_production',
            label: 'صفحه بخش تولید',
            description: 'مشاهده صف سفارش‌های تولید و مدیریت عملیات توزین',
          },
          {
            key: 'section_prep_matrix',
            label: 'جدول نیاز به آماده‌سازی',
            description: 'تب ماتریس تجمیعی محصولات و ثبت مستقیم وزن اقلام',
          },
          {
            key: 'section_finance',
            label: 'صفحه بخش صدور فاکتور',
            description:
              'مشاهده و بررسی فاکتورها، مبالغ و مدارک تحویل رانندگان',
          },
          {
            key: 'section_shipping',
            label: 'صفحه بخش ارسال',
            description:
              'مشاهده صف ارسال، تخصیص راننده، مغایرت وزن و مرجوعی',
          },
          {
            key: 'section_driver',
            label: 'صفحه پنل رانندگان',
            description:
              'لیست مسیر رانندگان، تماس با مشتری و ثبت مدارک تحویل',
          },
          {
            key: 'section_reports',
            label: 'صفحه گزارش‌ها و آمار زنده',
            description:
              'کارت‌های آماری، نمودار وضعیت و جدول جامع رهگیری سفارش‌ها',
          },
          {
            key: 'section_access_control',
            label: 'صفحه سطح دسترسی و گروه‌های کاربری',
            description:
              'مشاهده و تعریف گروه‌های کاربری، مجوزها و اتصال کاربران به گروه‌ها',
          },
        ],
      },
      {
        id: 'order_customer_fields',
        title: 'مشخصات پایه و اطلاعات مشتری سفارش',
        description: 'فیلدهای هویتی، زمانی، مکانی و ارتباطی هر سفارش',
        items: [
          {
            key: 'field_order_code',
            label: 'کد سفارش',
            description:
              'نمایش شناسه و کد یکتای سفارش در کارت‌ها، جداول و پنجره جزئیات',
          },
          {
            key: 'field_delivery_slot',
            label: 'بازه زمانی ارسال',
            description: 'نمایش ساعت و بازه تحویل سفارش (مثلاً ۱۴ تا ۱۶)',
          },
          {
            key: 'field_order_status',
            label: 'وضعیت سفارش و نوار اولویت',
            description:
              'نمایش مرحله فعلی سفارش و بنرهای اولویت اقدام واحدها',
          },
          {
            key: 'field_customer_name',
            label: 'نام طرف حساب / مشتری',
            description:
              'نمایش نام مجموعه یا شخص خریدار در صدور فاکتور و گزارش‌ها',
          },
          {
            key: 'field_customer_phone',
            label: 'تلفن و دکمه تماس با مشتری',
            description:
              'مشاهده شماره تماس و امکان برقراری تماس یا کپی شماره',
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
            description:
              'یادداشت‌های اختصاصی سفارش در تولید و توضیحات تکمیلی',
          },
          {
            key: 'field_call_recording',
            label: 'فایل صوتی مکالمه سفارش',
            description:
              'پخش‌کننده صدای ضبط‌شده مکالمه مشتری در بخش صدور فاکتور',
          },
        ],
      },
      {
        id: 'items_weights_amounts',
        title: 'اقلام، وزن‌ها و مبالغ مالی',
        description:
          'جزئیات محصولات، وزن‌های مراحل مختلف و قیمت‌گذاری فاکتور',
        items: [
          {
            key: 'field_product_name',
            label: 'نام محصول و تعداد اقلام',
            description:
              'نمایش نام کالاها و شمارش اقلام سفارش در جداول و کارت‌ها',
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
            description:
              'نمایش اقلام و وزن‌های برگشت‌خورده در بخش‌ها و گزارش‌ها',
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
            description:
              'جمع کل فاکتور، کسر مرجوعی و آمار ریالی در صدور فاکتور و گزارش‌ها',
          },
        ],
      },
      {
        id: 'sales_and_production_actions',
        title: 'عملیات فروش و بخش تولید',
        description:
          'ثبت فاکتور جدید، برگشت سفارش به فروش در تمامی مراحل و عملیات توزین تولید',
        items: [
          {
            key: 'action_sales_create_order',
            label: 'ثبت فاکتور جدید و ارسال به تولید',
            description:
              'ایجاد سفارش و فاکتور جدید توسط کارشناس فروش و ارسال مستقیم آن به صف تولید',
          },
          {
            key: 'action_return_to_sales',
            label: 'برگشت سفارش به فروش (در تمامی مراحل)',
            description:
              'امکان بازگرداندن سفارش از مراحل تولید، صدور فاکتور، ارسال و پنل رانندگان به کارشناس فروش',
          },
          {
            key: 'action_production_weigh',
            label: 'ثبت و ویرایش وزن محصول',
            description:
              'باز کردن پنجره توزین و ثبت یا تغییر وزن هر قلم کالا',
          },
          {
            key: 'action_production_complete',
            label: 'اتمام تولید و ارسال به صدور فاکتور',
            description:
              'تکمیل فرآیند تولید و ارسال سفارش به صف صدور فاکتور',
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
        description:
          'تایید فاکتور، رد سفارش، تایید یا رد عکس مدارک راننده',
        items: [
          {
            key: 'action_finance_approve',
            label: 'تایید و صدور فاکتور',
            description:
              'صدور نهایی فاکتور یا تایید مجدد فاکتور اصلاحی مغایرت وزن',
          },
          {
            key: 'action_finance_reject',
            label: 'رد سفارش در بخش صدور فاکتور',
            description:
              'امکان رد کردن سفارش از واحد صدور فاکتور با ثبت دلیل',
          },
          {
            key: 'action_finance_verify_driver_docs',
            label: 'بررسی و تایید مدارک تحویل راننده',
            description:
              'مشاهده عکس فاکتور و رسید ارسالی راننده و دکمه تایید نهایی',
          },
          {
            key: 'action_finance_reject_driver_docs',
            label: 'رد عکس فاکتور/رسید و درخواست عکس مجدد',
            description:
              'رد مدارک بی‌کیفیت یا اشتباه با ثبت دلیل و ارجاع قرمز به اولویت راننده',
          },
        ],
      },
      {
        id: 'shipping_returns_actions',
        title: 'عملیات بخش ارسال و مرجوعی',
        description:
          'تخصیص راننده، تحویل بار، ارجاع مغایرت و مدیریت مرجوعی',
        items: [
          {
            key: 'field_driver_assignment',
            label: 'راننده سفارش و تخصیص راننده',
            description:
              'مشاهده نام راننده و امکان انتخاب یا تغییر راننده سفارش',
          },
          {
            key: 'action_shipping_discrepancy',
            label: 'ثبت مغایرت وزن و ارجاع به صدور فاکتور',
            description:
              'ثبت اختلاف وزن در ارسال و بازگشت سفارش به واحد صدور فاکتور',
          },
          {
            key: 'action_shipping_deliver',
            label: 'ثبت وزن و تحویل به راننده',
            description: 'ثبت وزن خروجی نهایی و تحویل رسمی سفارش به راننده',
          },
          {
            key: 'action_shipping_return',
            label: 'ثبت مرجوعی سفارش',
            description:
              'اعلام مرجوعی اقلام از بخش ارسال و اطلاع‌رسانی به کل واحدها',
          },
          {
            key: 'action_return_confirm',
            label: 'تایید و تعیین‌تکلیف مرجوعی واحدها',
            description:
              'مشاهده کادر مرجوعی و کلیک روی دکمه تایید مرجوعی در هر واحد',
          },
        ],
      },
      {
        id: 'driver_and_general',
        title: 'عملیات پنل رانندگان و امکانات عمومی',
        description:
          'ثبت لوکیشن مشتری، مسیریابی، آپلود عکس مدارک تحویل، پرینت و بازنشانی',
        items: [
          {
            key: 'action_driver_route_priority',
            label: 'ثبت لوکیشن مشتری و مسیریابی',
            description:
              'مشاهده نقشه، ثبت موقعیت مکانی مشتری و شروع مسیریابی به سمت مقصد',
          },
          {
            key: 'field_driver_invoice_photo',
            label: 'عکس فاکتور تحویل',
            description:
              'مشاهده پیش‌نمایش و امکان عکاسی، آپلود، تغییر یا حذف عکس فاکتور',
          },
          {
            key: 'field_driver_receipt_photo',
            label: 'عکس رسید پرداخت',
            description:
              'مشاهده پیش‌نمایش و امکان عکاسی، آپلود، تغییر یا حذف عکس رسید',
          },
          {
            key: 'action_driver_complete',
            label: 'اتمام تحویل و ارسال به صدور فاکتور',
            description:
              'نمایش و کلیک روی دکمه اتمام تحویل پس از تکمیل هر دو عکس',
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
    ],
  },
  {
    id: 'customers',
    title: 'لیست طرف حساب‌ها',
    description:
      'مدیریت دسترسی کاربران به فهرست طرف حساب‌ها، رنگ‌بندی وضعیت اعتباری، پروفایل مشتری، رخداد حسابداری و ابزارهای CRM.',
    subgroups: [
      {
        id: 'customers_list_ops',
        title: 'فهرست طرف حساب‌ها و عملیات گروهی',
        description:
          'مشاهده جدول مشتریان، فیلتر دسته‌بندی اعتباری، ایجاد طرف حساب جدید و اقدامات گروهی',
        items: [
          {
            key: 'section_customers_list',
            label: 'صفحه لیست طرف حساب‌ها',
            description:
              'مشاهده فهرست مشتریان، جستجوی پیشرفته و فیلتر دسته‌بندی سبز، زرد، قرمز و بلک‌لیست',
          },
          {
            key: 'action_customer_create',
            label: 'افزودن طرف حساب جدید',
            description:
              'دسترسی به دکمه و فرم ثبت مشتری یا سرنخ جدید با تعیین وضعیت اعتباری',
          },
          {
            key: 'action_customer_assign_rep',
            label: 'تخصیص دیتا به کارشناس فروش و CRM',
            description:
              'انتصاب یا تغییر کارشناس فروش و کارشناس CRM به‌صورت تکی یا گروهی',
          },
          {
            key: 'action_customer_send_sms',
            label: 'ارسال پیامک به طرف حساب‌ها',
            description:
              'ارسال پیامک گروهی یا تکی برای مشتریان انتخاب‌شده در فهرست یا پروفایل',
          },
          {
            key: 'action_customer_toggle_active',
            label: 'فعال‌سازی و غیرفعال کردن طرف حساب',
            description:
              'تغییر وضعیت فعالیت پرونده مشتری (فعال / غیرفعال) از هدر پروفایل',
          },
        ],
      },
      {
        id: 'customers_profile_finance',
        title: 'پروفایل طرف حساب، اعتبار و رخداد حسابداری',
        description:
          'جزئیات پرونده هر مشتری، وضعیت مالی، جدول اکسلی حسابداری، مخاطبین و پنل گفتگو',
        items: [
          {
            key: 'section_customer_profile',
            label: 'پروفایل طرف حساب و تب اطلاعات پایه',
            description:
              'مشاهده و ویرایش اطلاعات پایه، کد حساب، استان، شعبه اصلی و یادداشت پرونده',
          },
          {
            key: 'field_customer_financial_standing',
            label: 'وضعیت مالی و سقف اعتبار طرف حساب',
            description:
              'مشاهده وضعیت اعتباری (نقدی/سبز/زرد/قرمز/بلک‌لیست) و ویرایش سقف یا موعد اعتبار',
          },
          {
            key: 'section_customer_accounting',
            label: 'تب رخداد حسابداری (فقط نمایش)',
            description:
              'مشاهده جدول اکسلی تاریخ، عنوان، بدهکار، بستانکار و مانده بر خط طرف حساب',
          },
          {
            key: 'section_customer_contacts',
            label: 'شماره‌های تماس و مخاطبین طرف حساب',
            description:
              'مشاهده، افزودن، ویرایش و حذف شماره همراه و سمت مخاطبین مشتری',
          },
          {
            key: 'section_customer_events_chat',
            label: 'رخداد مشتری، پیش‌فاکتور و ارجاع به CRM',
            description:
              'مشاهده و ثبت رخداد مشتری، پیش‌فاکتور، تماس‌ها و پیام‌های ارجاع داخلی',
          },
        ],
      },
    ],
  },
  {
    id: 'product_photos',
    title: 'مدیا آموزشی',
    description:
      'مدیریت دسترسی کاربران به صفحه مدیا آموزشی شامل دو تب عکس محصولات (جستجوی تایتل و آپلود عکس) و ویدیوهای آموزشی (پخش، آپلود ویدیو با تایتل و توضیحات).',
    subgroups: [
      {
        id: 'product_photos_management',
        title: 'تب عکس محصولات',
        description:
          'تعیین مجوز مشاهده، آپلود عکس جدید و مدیریت تایتل یا حذف تصاویر در تب عکس محصولات',
        items: [
          {
            key: 'section_product_photos',
            label: 'مشاهده تب عکس محصولات و جستجوی تایتل',
            description:
              'دسترسی به تب عکس محصولات، جستجو بر اساس تایتل و مشاهده بزرگ‌نمایی تصاویر',
          },
          {
            key: 'action_product_photos_upload',
            label: 'آپلود عکس محصولات',
            description:
              'دسترسی آپلود یک یا چند تصویر محصول همراه با تعیین تایتل اختصاصی برای هر عکس',
          },
          {
            key: 'action_product_photos_manage',
            label: 'ویرایش تایتل و حذف عکس محصولات',
            description:
              'امکان تغییر عنوان تصاویر ثبت‌شده یا حذف عکس از گالری عکس محصولات',
          },
        ],
      },
      {
        id: 'training_videos_management',
        title: 'تب ویدیوهای آموزشی',
        description:
          'تعیین مجوز مشاهده، آپلود ویدیو آموزشی همراه با تایتل و توضیحات، و مدیریت ویدیوها',
        items: [
          {
            key: 'section_training_videos',
            label: 'مشاهده و پخش ویدیوهای آموزشی',
            description:
              'دسترسی به تب ویدیوهای آموزشی، جستجو در تایتل و توضیحات و پخش ویدیوها',
          },
          {
            key: 'action_training_videos_upload',
            label: 'آپلود ویدیوی آموزشی',
            description:
              'دسترسی آپلود فایل ویدیوی آموزشی همراه با ثبت تایتل و توضیحات کامل',
          },
          {
            key: 'action_training_videos_manage',
            label: 'ویرایش و حذف ویدیوی آموزشی',
            description:
              'امکان ویرایش تایتل و توضیحات یا حذف ویدیوهای ثبت‌شده در تب ویدیوهای آموزشی',
          },
        ],
      },
    ],
  },
];

export const PERMISSION_GROUPS: PermissionGroup[] =
  PERMISSION_CATEGORIES.flatMap((cat) => cat.subgroups);

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.items.map((item) => item.key)
);

export function getCategoryPermissionKeys(
  categoryId: PermissionCategoryId
): PermissionKey[] {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  return cat.subgroups.flatMap((sg) => sg.items.map((item) => item.key));
}

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
        action_product_photos_upload: { view: false, edit: false },
        action_product_photos_manage: { view: false, edit: false },
        action_training_videos_upload: { view: false, edit: false },
        action_training_videos_manage: { view: false, edit: false },
      },
      { view: true, edit: false }
    );
  }

  if (preset === 'sales_specialist') {
    return createPermissionMap({
      // Orders & Sales
      section_calendar: { view: true, edit: true },
      section_sales: { view: true, edit: true },
      field_order_code: { view: true, edit: false },
      field_delivery_slot: { view: true, edit: true },
      field_order_status: { view: true, edit: false },
      field_customer_name: { view: true, edit: true },
      field_customer_phone: { view: true, edit: true },
      field_district: { view: true, edit: true },
      field_address: { view: true, edit: true },
      field_notes: { view: true, edit: true },
      field_call_recording: { view: true, edit: false },
      field_product_name: { view: true, edit: true },
      field_requested_weight: { view: true, edit: true },
      field_produced_weight: { view: true, edit: false },
      field_revised_weight: { view: true, edit: false },
      field_delivered_weight: { view: true, edit: false },
      field_returned_weight: { view: true, edit: false },
      field_unit_price: { view: true, edit: true },
      field_item_total: { view: true, edit: false },
      field_order_total: { view: true, edit: false },
      field_driver_assignment: { view: true, edit: false },
      action_sales_create_order: { view: true, edit: true },
      action_print: { view: true, edit: true },
      // Customers
      section_customers_list: { view: true, edit: true },
      action_customer_create: { view: true, edit: true },
      action_customer_send_sms: { view: true, edit: true },
      section_customer_profile: { view: true, edit: true },
      field_customer_financial_standing: { view: true, edit: false },
      section_customer_accounting: { view: true, edit: false },
      section_customer_contacts: { view: true, edit: true },
      section_customer_events_chat: { view: true, edit: true },
      // Training Media (view only)
      section_product_photos: { view: true, edit: false },
      section_training_videos: { view: true, edit: false },
    });
  }

  if (preset === 'production_operator') {
    return createPermissionMap({
      // Orders
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
      action_return_to_sales: { view: true, edit: true },
      action_production_weigh: { view: true, edit: true },
      action_production_complete: { view: true, edit: true },
      action_production_reject: { view: true, edit: true },
      action_return_confirm: { view: true, edit: true },
      action_print: { view: true, edit: true },
      // Training Media (production can view & upload product photos and training videos)
      section_product_photos: { view: true, edit: false },
      action_product_photos_upload: { view: true, edit: true },
      action_product_photos_manage: { view: true, edit: false },
      section_training_videos: { view: true, edit: false },
      action_training_videos_upload: { view: true, edit: true },
      action_training_videos_manage: { view: true, edit: false },
    });
  }

  if (preset === 'finance_specialist') {
    return createPermissionMap({
      // Orders
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
      action_return_to_sales: { view: true, edit: true },
      action_finance_approve: { view: true, edit: true },
      action_finance_reject: { view: true, edit: true },
      action_finance_verify_driver_docs: { view: true, edit: true },
      action_finance_reject_driver_docs: { view: true, edit: true },
      field_driver_invoice_photo: { view: true, edit: false },
      field_driver_receipt_photo: { view: true, edit: false },
      action_return_confirm: { view: true, edit: true },
      action_print: { view: true, edit: true },
      // Customers List & Accounting
      section_customers_list: { view: true, edit: false },
      section_customer_profile: { view: true, edit: true },
      field_customer_financial_standing: { view: true, edit: true },
      section_customer_accounting: { view: true, edit: false },
      section_customer_contacts: { view: true, edit: true },
      section_customer_events_chat: { view: true, edit: true },
      // Training Media (view only)
      section_product_photos: { view: true, edit: false },
      section_training_videos: { view: true, edit: false },
    });
  }

  if (preset === 'shipping_coordinator') {
    return createPermissionMap({
      // Orders
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
      action_return_to_sales: { view: true, edit: true },
      action_shipping_discrepancy: { view: true, edit: true },
      action_shipping_deliver: { view: true, edit: true },
      action_shipping_return: { view: true, edit: true },
      action_return_confirm: { view: true, edit: true },
      action_driver_route_priority: { view: true, edit: false },
      action_print: { view: true, edit: true },
      // Customers (basic view)
      section_customers_list: { view: true, edit: false },
      section_customer_contacts: { view: true, edit: false },
      // Training Media (view only)
      section_product_photos: { view: true, edit: false },
      section_training_videos: { view: true, edit: false },
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
    action_return_to_sales: { view: true, edit: true },
    action_driver_route_priority: { view: true, edit: true },
    field_driver_invoice_photo: { view: true, edit: true },
    field_driver_receipt_photo: { view: true, edit: true },
    action_driver_complete: { view: true, edit: true },
    action_print: { view: true, edit: true },
    section_product_photos: { view: true, edit: false },
    section_training_videos: { view: true, edit: false },
  });
}

export const ACCESS_PRESET_LABELS: Record<AccessPresetId, string> = {
  admin_full: 'دسترسی کامل (مدیران سیستم)',
  sales_specialist: 'الگوی گروه کارشناسان فروش',
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
    description:
      'دسترسی کامل مشاهده و ویرایش به تمام بخش‌های سفارشات، لیست طرف حساب‌ها و مدیا آموزشی',
    isSystemGroup: true,
    permissions: buildPresetPermissions('admin_full'),
  },
  {
    id: 'group-sales',
    name: 'گروه کارشناسان فروش',
    description:
      'دسترسی به صفحه کارشناس فروش، مشاهده کامل جزئیات سفارشات، ثبت فاکتور جدید و پیگیری مشتریان',
    permissions: buildPresetPermissions('sales_specialist'),
  },
  {
    id: 'group-production',
    name: 'گروه تولید و توزین',
    description:
      'دسترسی به صف تولید، ماتریس نیاز به آماده‌سازی، ثبت وزن و آپلود عکس و ویدیو در مدیا آموزشی',
    permissions: buildPresetPermissions('production_operator'),
  },
  {
    id: 'group-finance',
    name: 'گروه صدور فاکتور',
    description:
      'دسترسی به صدور فاکتور، لیست طرف حساب‌ها، وضعیت مالی، رخداد حسابداری و مشاهده مدیا آموزشی',
    permissions: buildPresetPermissions('finance_specialist'),
  },
  {
    id: 'group-shipping',
    name: 'گروه ارسال و توزیع',
    description:
      'دسترسی به تخصیص راننده، ثبت مغایرت وزن، تحویل بار، مرجوعی و مشاهده مدیا آموزشی',
    permissions: buildPresetPermissions('shipping_coordinator'),
  },
  {
    id: 'group-drivers',
    name: 'گروه رانندگان پخش',
    description:
      'دسترسی به پنل رانندگان، ثبت لوکیشن و مسیریابی، آپلود مدارک تحویل و مشاهده مدیا آموزشی',
    permissions: buildPresetPermissions('driver_role'),
  },
  {
    id: 'group-viewers',
    name: 'گروه ناظرین (فقط مشاهده)',
    description:
      'مشاهده سفارش‌ها، لیست طرف حساب‌ها و مدیا آموزشی بدون امکان ویرایش یا آپلود',
    permissions: buildPresetPermissions('read_only_viewer'),
  },
];

export const INITIAL_APP_USERS: AppUser[] = [
  {
    id: 'user-admin',
    fullName: 'امیر مرادصالح',
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
