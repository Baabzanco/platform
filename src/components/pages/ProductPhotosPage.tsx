import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Images,
  Lock,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { compressImageFileToDataUrl } from '../../hooks/useProductPhotosStore';
import { ProductPhoto } from '../../types/productPhoto';
import { toPersianDigits } from '../../utils/jalaliCalendar';

interface ProductPhotosPageProps {
  photos: ProductPhoto[];
  currentUserName: string;
  canUpload: boolean;
  canManage: boolean;
  onAddPhotos: (
    items: Array<{
      title: string;
      imageUrl: string;
      fileName: string;
      fileSizeKb?: number;
    }>,
    uploadedBy: string
  ) => ProductPhoto[];
  onUpdatePhotoTitle: (id: string, nextTitle: string) => void;
  onDeletePhoto: (id: string) => void;
  onNotify: (
    title: string,
    message: string,
    tag: string,
    type?: 'success' | 'warning' | 'info' | 'danger'
  ) => void;
}

interface PendingUploadItem {
  tempId: string;
  title: string;
  imageUrl: string;
  fileName: string;
  fileSizeKb: number;
}

function cleanFileNameToTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/[-_]+/g, ' ').trim();
}

export const ProductPhotosPage: React.FC<ProductPhotosPageProps> = ({
  photos,
  currentUserName,
  canUpload,
  canManage,
  onAddPhotos,
  onUpdatePhotoTitle,
  onDeletePhoto,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Lightbox & inline title edit state
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPhotos = useMemo(() => {
    if (!normalizedQuery) return photos;
    return photos.filter((photo) =>
      photo.title.toLowerCase().includes(normalizedQuery)
    );
  }, [photos, normalizedQuery]);

  const activePhotoIndex = useMemo(() => {
    if (!activePhotoId) return -1;
    return filteredPhotos.findIndex((p) => p.id === activePhotoId);
  }, [filteredPhotos, activePhotoId]);

  const activePhoto =
    activePhotoIndex >= 0 ? filteredPhotos[activePhotoIndex] : null;

  // Keyboard navigation for Lightbox & Escape for Upload Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (uploadModalOpen) {
          setUploadModalOpen(false);
        } else if (activePhotoId) {
          setActivePhotoId(null);
        }
      } else if (activePhoto && filteredPhotos.length > 1) {
        if (e.key === 'ArrowRight') {
          const prevIdx =
            (activePhotoIndex - 1 + filteredPhotos.length) %
            filteredPhotos.length;
          setActivePhotoId(filteredPhotos[prevIdx].id);
        } else if (e.key === 'ArrowLeft') {
          const nextIdx = (activePhotoIndex + 1) % filteredPhotos.length;
          setActivePhotoId(filteredPhotos[nextIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadModalOpen, activePhotoId, activePhoto, activePhotoIndex, filteredPhotos]);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError('');
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );
    if (imageFiles.length === 0) {
      setUploadError('لطفاً فقط فایل‌های تصویری (JPG، PNG، WebP) انتخاب کنید.');
      return;
    }

    setIsReadingFiles(true);
    try {
      const processed: PendingUploadItem[] = [];
      for (const file of imageFiles) {
        const { dataUrl, fileSizeKb } = await compressImageFileToDataUrl(file);
        processed.push({
          tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: cleanFileNameToTitle(file.name),
          imageUrl: dataUrl,
          fileName: file.name,
          fileSizeKb,
        });
      }
      setPendingItems((prev) => [...prev, ...processed]);
    } catch {
      setUploadError('خطایی هنگام پردازش یکی از تصاویر رخ داد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsReadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingItems.length === 0) {
      setUploadError('لطفاً حداقل یک عکس انتخاب کنید.');
      return;
    }
    const missingTitle = pendingItems.find((item) => !item.title.trim());
    if (missingTitle) {
      setUploadError('لطفاً برای تمامی عکس‌های انتخاب‌شده یک تایتل وارد کنید.');
      return;
    }

    const added = onAddPhotos(
      pendingItems.map((item) => ({
        title: item.title.trim(),
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        fileSizeKb: item.fileSizeKb,
      })),
      currentUserName
    );

    setPendingItems([]);
    setUploadError('');
    setUploadModalOpen(false);
    onNotify(
      'عکس محصولات ثبت شد',
      `${toPersianDigits(added.length)} تصویر جدید با تایتل اختصاصی در گالری عکس محصولات ذخیره شد.`,
      'عکس محصولات',
      'success'
    );
  };

  const startInlineEdit = (photo: ProductPhoto) => {
    setEditingPhotoId(photo.id);
    setEditingTitleValue(photo.title);
  };

  const saveInlineEdit = (photoId: string) => {
    if (!editingTitleValue.trim()) return;
    onUpdatePhotoTitle(photoId, editingTitleValue);
    setEditingPhotoId(null);
    onNotify(
      'تایتل عکس ویرایش شد',
      `عنوان تصویر به «${editingTitleValue.trim()}» تغییر یافت.`,
      'عکس محصولات',
      'info'
    );
  };

  const handleDelete = (photo: ProductPhoto) => {
    if (activePhotoId === photo.id) {
      setActivePhotoId(null);
    }
    onDeletePhoto(photo.id);
    onNotify(
      'عکس محصول حذف شد',
      `تصویر «${photo.title}» از گالری عکس محصولات حذف گردید.`,
      'عکس محصولات',
      'warning'
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Bar: Breadcrumb + Single Primary CTA */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[15px]">
            عکس محصولات
          </h1>
          <span aria-hidden="true" className="text-slate-300 mx-1">
            ·
          </span>
          <span className="tabular-nums text-xs text-slate-500">
            {toPersianDigits(photos.length)} تصویر ثبت‌شده
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canUpload ? (
            <button
              type="button"
              onClick={() => {
                setUploadError('');
                setUploadModalOpen(true);
              }}
              className="min-h-[42px] sm:min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4 shrink-0" />
              آپلود عکس جدید
            </button>
          ) : (
            <div className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              دسترسی آپلود برای گروه شما غیرفعال است
            </div>
          )}
        </div>
      </header>

      {/* Title Search Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس تایتل عکس محصول (مثلاً: راسته بره، سردست، ران...)"
            aria-label="جستجوی تایتل عکس محصول"
            className="w-full h-11 sm:h-10 pr-10 pl-10 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f5864] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="پاک کردن جستجو"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center absolute left-1.5 top-1/2 -translate-y-1/2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 tabular-nums shrink-0">
          {normalizedQuery ? (
            <span>
              نتیجه جستجو:{' '}
              <strong className="text-[#0f5864]">
                {toPersianDigits(filteredPhotos.length)}
              </strong>{' '}
              از {toPersianDigits(photos.length)} عکس
            </span>
          ) : (
            <span>نمایش تمام {toPersianDigits(photos.length)} عکس محصول</span>
          )}
        </div>
      </section>

      {/* Gallery Grid / Empty States */}
      {photos.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Images className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-sm font-bold text-slate-900">
              هنوز عکسی برای محصولات ثبت نشده است
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              می‌توانید چند عکس محصول را هم‌زمان آپلود کرده و برای هر تصویر تایتل اختصاصی ثبت کنید تا با جستجوی تایتل سریعاً نمایش داده شود.
            </p>
          </div>
          {canUpload && (
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="mt-1 min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors"
            >
              <Upload className="w-4 h-4" />
              آپلود اولین عکس محصولات
            </button>
          )}
        </section>
      ) : filteredPhotos.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl py-14 px-6 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900">
              عکسی با تایتل «{searchQuery}» یافت نشد
            </h2>
            <p className="text-xs text-slate-500">
              عبارت دیگری جستجو کنید یا جستجو را پاک کنید تا همه عکس‌ها نمایش داده شوند.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            نمایش همه عکس‌ها
          </button>
        </section>
      ) : (
        <section
          aria-label="گالری عکس محصولات"
          className={`grid gap-4 ${
            filteredPhotos.length === 1 && normalizedQuery
              ? 'grid-cols-1 max-w-xl mx-auto w-full'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}
        >
          {filteredPhotos.map((photo) => {
            const isEditing = editingPhotoId === photo.id;
            const isBroken = Boolean(brokenImages[photo.id]);

            return (
              <article
                key={photo.id}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-[#0f5864]/50"
              >
                {/* 4:3 Image Frame */}
                <button
                  type="button"
                  onClick={() => setActivePhotoId(photo.id)}
                  aria-label={`مشاهده بزرگ‌نمایی ${photo.title}`}
                  className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden block text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5864]"
                >
                  {isBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 p-4">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 text-center">
                        {photo.title}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({
                          ...prev,
                          [photo.id]: true,
                        }))
                      }
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  )}
                  <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-semibold">
                    <ZoomIn className="w-3.5 h-3.5" />
                    مشاهده کامل
                  </span>
                </button>

                {/* Title & Quiet Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineEdit(photo.id);
                          if (e.key === 'Escape') setEditingPhotoId(null);
                        }}
                        autoFocus
                        className="flex-1 min-w-0 h-9 px-2.5 text-xs font-semibold bg-white border border-[#0f5864] rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveInlineEdit(photo.id)}
                        aria-label="ذخیره تایتل"
                        className="w-9 h-9 rounded-lg bg-[#0f5864] text-white hover:bg-[#0b434d] flex items-center justify-center shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPhotoId(null)}
                        aria-label="انصراف"
                        className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {photo.title}
                    </h2>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 tabular-nums truncate">
                      <span>{photo.uploadedBy}</span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">
                        ·
                      </span>
                      <span>{photo.uploadedAt}</span>
                    </div>

                    {canManage && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startInlineEdit(photo)}
                          title="ویرایش تایتل"
                          aria-label={`ویرایش تایتل ${photo.title}`}
                          className="w-8 h-8 rounded-lg text-slate-500 hover:text-[#0f5864] hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          title="حذف عکس"
                          aria-label={`حذف عکس ${photo.title}`}
                          className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ================= MULTI-PHOTO UPLOAD MODAL ================= */}
      {uploadModalOpen && canUpload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="آپلود عکس محصولات"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUploadModalOpen(false);
          }}
        >
          <form
            onSubmit={handleConfirmUpload}
            className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0f5864]" />
                <h2 className="text-sm font-bold text-slate-900">
                  آپلود عکس محصولات و ثبت تایتل
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                aria-label="بستن پنجره"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-[#0f5864] bg-[#0f5864]/5'
                    : 'border-slate-300 bg-slate-50/70 hover:border-[#0f5864]/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                  id="product-photos-file-input"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#0f5864] flex items-center justify-center">
                    <Images className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    عکس‌های محصولات را اینجا بکشید و رها کنید یا از دستگاه انتخاب نمایید
                  </p>
                  <p className="text-[11px] text-slate-500">
                    امکان انتخاب هم‌زمان چند تصویر وجود دارد — پس از انتخاب، تایتل هر عکس را مشخص کنید
                  </p>
                  <label
                    htmlFor="product-photos-file-input"
                    className="mt-1 min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:border-[#0f5864] hover:text-[#0f5864] cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {isReadingFiles
                      ? 'در حال آماده‌سازی تصاویر...'
                      : 'انتخاب یک یا چند عکس'}
                  </label>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}

              {/* Selected Pending Photos Queue */}
              {pendingItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      عکس‌های آماده ثبت ({toPersianDigits(pendingItems.length)} مورد)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingItems([])}
                      className="text-red-600 hover:underline font-medium"
                    >
                      پاک کردن همه
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {pendingItems.map((item, idx) => (
                      <div
                        key={item.tempId}
                        className="p-3 bg-white flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title || item.fileName}
                          referrerPolicy="no-referrer"
                          className="w-20 h-15 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <label
                            htmlFor={`pending-title-${item.tempId}`}
                            className="block text-[11px] font-bold text-slate-600"
                          >
                            تایتل عکس {toPersianDigits(idx + 1)} (برای جستجو)
                          </label>
                          <input
                            id={`pending-title-${item.tempId}`}
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadError('');
                              setPendingItems((prev) =>
                                prev.map((p) =>
                                  p.tempId === item.tempId
                                    ? { ...p, title: val }
                                    : p
                                )
                              );
                            }}
                            placeholder="مثلاً: راسته بره ممتاز بسته‌بندی وکیوم"
                            className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-[#0f5864]"
                          />
                          <div className="text-[11px] text-slate-400 tabular-nums truncate">
                            {item.fileName} · {toPersianDigits(item.fileSizeKb)} کیلوبایت
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPendingItems((prev) =>
                              prev.filter((p) => p.tempId !== item.tempId)
                            )
                          }
                          aria-label="حذف از لیست آپلود"
                          className="self-end sm:self-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with generous bottom margin */}
            <div className="px-5 pt-3.5 pb-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={pendingItems.length === 0 || isReadingFiles}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4" />
                ثبت و آپلود{' '}
                {pendingItems.length > 0
                  ? `(${toPersianDigits(pendingItems.length)} عکس)`
                  : 'عکس‌ها'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= FULL-SCREEN LIGHTBOX VIEWER ================= */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`نمایش عکس ${activePhoto.title}`}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePhotoId(null);
          }}
        >
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {activePhoto.title}
                </h2>
                <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                  آپلود توسط {activePhoto.uploadedBy} · {activePhoto.uploadedAt}
                  {filteredPhotos.length > 1 && (
                    <>
                      {' '}
                      · تصویر {toPersianDigits(activePhotoIndex + 1)} از{' '}
                      {toPersianDigits(filteredPhotos.length)}
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePhotoId(null)}
                aria-label="بستن نمایش کامل"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-slate-100 flex items-center justify-center overflow-hidden flex-1 min-h-[280px] max-h-[70dvh]">
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70dvh] object-contain"
              />

              {filteredPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (activePhotoIndex - 1 + filteredPhotos.length) %
                        filteredPhotos.length;
                      setActivePhotoId(filteredPhotos[prevIdx].id);
                    }}
                    aria-label="عکس قبلی"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx =
                        (activePhotoIndex + 1) % filteredPhotos.length;
                      setActivePhotoId(filteredPhotos[nextIdx].id);
                    }}
                    aria-label="عکس بعدی"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="px-5 pt-3 pb-5 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate">
                نام فایل: {activePhoto.fileName}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(activePhoto)}
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف تصویر
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActivePhotoId(null)}
                  className="min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
