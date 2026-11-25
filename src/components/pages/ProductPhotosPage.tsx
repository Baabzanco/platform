import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Film,
  Image as ImageIcon,
  Images,
  Lock,
  Maximize2,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
  ZoomIn,
} from 'lucide-react';
import { compressImageFileToDataUrl } from '../../hooks/useProductPhotosStore';
import { readVideoDurationSeconds } from '../../hooks/useTrainingVideosStore';
import { ProductPhoto, TrainingVideo } from '../../types/productPhoto';
import { toPersianDigits } from '../../utils/jalaliCalendar';

type MediaTab = 'videos' | 'photos';

interface ProductPhotosPageProps {
  photos: ProductPhoto[];
  videos: TrainingVideo[];
  currentUserName: string;
  canViewPhotos: boolean;
  canUploadPhotos: boolean;
  canManagePhotos: boolean;
  canViewVideos: boolean;
  canUploadVideos: boolean;
  canManageVideos: boolean;
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
  onAddVideo: (
    payload: {
      title: string;
      description: string;
      file: File;
      durationSeconds?: number;
    },
    uploadedBy: string
  ) => Promise<TrainingVideo>;
  onUpdateVideo: (id: string, title: string, description: string) => void;
  onDeleteVideo: (id: string) => void;
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

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return toPersianDigits(
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  );
}

export const ProductPhotosPage: React.FC<ProductPhotosPageProps> = ({
  photos,
  videos,
  currentUserName,
  canViewPhotos,
  canUploadPhotos,
  canManagePhotos,
  canViewVideos,
  canUploadVideos,
  canManageVideos,
  onAddPhotos,
  onUpdatePhotoTitle,
  onDeletePhoto,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<MediaTab>(() =>
    canViewVideos ? 'videos' : 'photos'
  );

  // ==================== PHOTOS TAB STATE ====================
  const [photoSearch, setPhotoSearch] = useState('');
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingUploadItem[]>([]);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isReadingPhotos, setIsReadingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingPhotoTitle, setEditingPhotoTitle] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // ==================== VIDEOS TAB STATE ====================
  const [videoSearch, setVideoSearch] = useState('');
  const [videoUploadModalOpen, setVideoUploadModalOpen] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingVideoPreviewUrl, setPendingVideoPreviewUrl] = useState('');
  const [pendingVideoDuration, setPendingVideoDuration] = useState<
    number | undefined
  >(undefined);
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoDescInput, setVideoDescInput] = useState('');
  const [videoUploadError, setVideoUploadError] = useState('');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoDesc, setEditVideoDesc] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up temporary video preview URL on modal close / file change
  useEffect(() => {
    return () => {
      if (pendingVideoPreviewUrl) {
        URL.revokeObjectURL(pendingVideoPreviewUrl);
      }
    };
  }, [pendingVideoPreviewUrl]);

  // Filtered Photos
  const normalizedPhotoQuery = photoSearch.trim().toLowerCase();
  const filteredPhotos = useMemo(() => {
    if (!normalizedPhotoQuery) return photos;
    return photos.filter((photo) =>
      photo.title.toLowerCase().includes(normalizedPhotoQuery)
    );
  }, [photos, normalizedPhotoQuery]);

  const activePhotoIndex = useMemo(() => {
    if (!activePhotoId) return -1;
    return filteredPhotos.findIndex((p) => p.id === activePhotoId);
  }, [filteredPhotos, activePhotoId]);

  const activePhoto =
    activePhotoIndex >= 0 ? filteredPhotos[activePhotoIndex] : null;

  // Filtered Videos
  const normalizedVideoQuery = videoSearch.trim().toLowerCase();
  const filteredVideos = useMemo(() => {
    if (!normalizedVideoQuery) return videos;
    return videos.filter(
      (video) =>
        video.title.toLowerCase().includes(normalizedVideoQuery) ||
        video.description.toLowerCase().includes(normalizedVideoQuery)
    );
  }, [videos, normalizedVideoQuery]);

  const activeVideo = useMemo(
    () => (activeVideoId ? videos.find((v) => v.id === activeVideoId) ?? null : null),
    [videos, activeVideoId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoUploadModalOpen) {
          setPhotoUploadModalOpen(false);
        } else if (videoUploadModalOpen) {
          setVideoUploadModalOpen(false);
        } else if (activePhotoId) {
          setActivePhotoId(null);
        } else if (activeVideoId) {
          setActiveVideoId(null);
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
  }, [
    photoUploadModalOpen,
    videoUploadModalOpen,
    activePhotoId,
    activeVideoId,
    activePhoto,
    activePhotoIndex,
    filteredPhotos,
  ]);

  // ==================== PHOTO HANDLERS ====================
  const handlePhotoFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoUploadError('');
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );
    if (imageFiles.length === 0) {
      setPhotoUploadError(
        'لطفاً فقط فایل‌های تصویری (JPG، PNG، WebP) انتخاب کنید.'
      );
      return;
    }

    setIsReadingPhotos(true);
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
      setPendingPhotos((prev) => [...prev, ...processed]);
    } catch {
      setPhotoUploadError(
        'خطایی هنگام پردازش یکی از تصاویر رخ داد. لطفاً دوباره تلاش کنید.'
      );
    } finally {
      setIsReadingPhotos(false);
      if (photoFileInputRef.current) {
        photoFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmPhotoUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingPhotos.length === 0) {
      setPhotoUploadError('لطفاً حداقل یک عکس انتخاب کنید.');
      return;
    }
    const missingTitle = pendingPhotos.find((item) => !item.title.trim());
    if (missingTitle) {
      setPhotoUploadError('لطفاً برای تمامی عکس‌های انتخاب‌شده یک تایتل وارد کنید.');
      return;
    }

    const added = onAddPhotos(
      pendingPhotos.map((item) => ({
        title: item.title.trim(),
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        fileSizeKb: item.fileSizeKb,
      })),
      currentUserName
    );

    setPendingPhotos([]);
    setPhotoUploadError('');
    setPhotoUploadModalOpen(false);
    onNotify(
      'عکس محصولات ثبت شد',
      `${toPersianDigits(added.length)} تصویر جدید با تایتل اختصاصی در مدیا آموزشی ذخیره شد.`,
      'مدیا آموزشی',
      'success'
    );
  };

  const saveInlinePhotoEdit = (photoId: string) => {
    if (!editingPhotoTitle.trim()) return;
    onUpdatePhotoTitle(photoId, editingPhotoTitle);
    setEditingPhotoId(null);
    onNotify(
      'تایتل عکس ویرایش شد',
      `عنوان تصویر به «${editingPhotoTitle.trim()}» تغییر یافت.`,
      'مدیا آموزشی',
      'info'
    );
  };

  const handleDeletePhoto = (photo: ProductPhoto) => {
    if (activePhotoId === photo.id) {
      setActivePhotoId(null);
    }
    onDeletePhoto(photo.id);
    onNotify(
      'عکس محصول حذف شد',
      `تصویر «${photo.title}» از تب عکس محصولات حذف گردید.`,
      'مدیا آموزشی',
      'warning'
    );
  };

  // ==================== VIDEO HANDLERS ====================
  const resetVideoUploadForm = () => {
    if (pendingVideoPreviewUrl) {
      URL.revokeObjectURL(pendingVideoPreviewUrl);
    }
    setPendingVideoFile(null);
    setPendingVideoPreviewUrl('');
    setPendingVideoDuration(undefined);
    setVideoTitleInput('');
    setVideoDescInput('');
    setVideoUploadError('');
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  const handleVideoFileSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setVideoUploadError('');
    const file = fileList[0];
    if (!file.type.startsWith('video/')) {
      setVideoUploadError(
        'لطفاً یک فایل ویدیویی معتبر (MP4، WebM، MOV و...) انتخاب کنید.'
      );
      return;
    }

    if (pendingVideoPreviewUrl) {
      URL.revokeObjectURL(pendingVideoPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingVideoFile(file);
    setPendingVideoPreviewUrl(previewUrl);
    if (!videoTitleInput.trim()) {
      setVideoTitleInput(cleanFileNameToTitle(file.name));
    }
    const duration = await readVideoDurationSeconds(file);
    setPendingVideoDuration(duration);
  };

  const handleConfirmVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVideoFile) {
      setVideoUploadError('لطفاً ابتدا فایل ویدیو را انتخاب کنید.');
      return;
    }
    if (!videoTitleInput.trim()) {
      setVideoUploadError('وارد کردن تایتل برای ویدیوی آموزشی الزامی است.');
      return;
    }

    setIsSavingVideo(true);
    try {
      const saved = await onAddVideo(
        {
          title: videoTitleInput.trim(),
          description: videoDescInput.trim(),
          file: pendingVideoFile,
          durationSeconds: pendingVideoDuration,
        },
        currentUserName
      );
      resetVideoUploadForm();
      setVideoUploadModalOpen(false);
      onNotify(
        'ویدیوی آموزشی آپلود شد',
        `ویدیو «${saved.title}» با موفقیت در تب ویدیوهای آموزشی ثبت گردید.`,
        'مدیا آموزشی',
        'success'
      );
    } catch {
      setVideoUploadError('خطا در ذخیره ویدیو. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const startInlineVideoEdit = (video: TrainingVideo) => {
    setEditingVideoId(video.id);
    setEditVideoTitle(video.title);
    setEditVideoDesc(video.description);
  };

  const saveInlineVideoEdit = (videoId: string) => {
    if (!editVideoTitle.trim()) return;
    onUpdateVideo(videoId, editVideoTitle, editVideoDesc);
    setEditingVideoId(null);
    onNotify(
      'اطلاعات ویدیو ویرایش شد',
      `تایتل و توضیحات «${editVideoTitle.trim()}» به‌روزرسانی گردید.`,
      'مدیا آموزشی',
      'info'
    );
  };

  const handleDeleteVideo = (video: TrainingVideo) => {
    if (activeVideoId === video.id) {
      setActiveVideoId(null);
    }
    onDeleteVideo(video.id);
    onNotify(
      'ویدیوی آموزشی حذف شد',
      `ویدیو «${video.title}» از تب ویدیوهای آموزشی حذف گردید.`,
      'مدیا آموزشی',
      'warning'
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Bar: Breadcrumb + Contextual Primary Upload Action */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm sm:text-[13px] text-slate-500">
          <span className="hidden sm:inline">داشبورد مدیریت</span>
          <ChevronLeft className="hidden sm:inline w-4 h-4 text-slate-400" />
          <h1 className="font-bold text-slate-900 text-base sm:text-[15px]">
            مدیا آموزشی
          </h1>
          <span aria-hidden="true" className="text-slate-300 mx-1">
            ·
          </span>
          <span className="tabular-nums text-xs text-slate-500">
            {toPersianDigits(videos.length)} ویدیو ·{' '}
            {toPersianDigits(photos.length)} عکس محصول
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'videos' ? (
            canUploadVideos ? (
              <button
                type="button"
                onClick={() => {
                  resetVideoUploadForm();
                  setVideoUploadModalOpen(true);
                }}
                className="min-h-[42px] sm:min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-4 h-4 shrink-0" />
                آپلود ویدیو آموزشی
              </button>
            ) : (
              <div className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                دسترسی آپلود ویدیو برای گروه شما غیرفعال است
              </div>
            )
          ) : canUploadPhotos ? (
            <button
              type="button"
              onClick={() => {
                setPhotoUploadError('');
                setPhotoUploadModalOpen(true);
              }}
              className="min-h-[42px] sm:min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4 shrink-0" />
              آپلود عکس جدید
            </button>
          ) : (
            <div className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              دسترسی آپلود عکس برای گروه شما غیرفعال است
            </div>
          )}
        </div>
      </header>

      {/* Two-Tab Segmented Switcher: ویدیوهای آموزشی & عکس محصولات */}
      <div className="grid grid-cols-2 sm:inline-flex sm:self-start gap-1.5 p-1 bg-slate-200/75 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-white text-[#0f5864] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-4 h-4 shrink-0" />
          <span>ویدیوهای آموزشی ({toPersianDigits(videos.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'photos'
              ? 'bg-white text-[#0f5864] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Images className="w-4 h-4 shrink-0" />
          <span>عکس محصولات ({toPersianDigits(photos.length)})</span>
        </button>
      </div>

      {/* ==================== TAB 1: ویدیوهای آموزشی ==================== */}
      {activeTab === 'videos' && (
        <>
          {!canViewVideos ? (
            <section className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                دسترسی مشاهده ویدیوهای آموزشی غیرفعال است
              </h2>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                مجوز مشاهده این تب از بخش «سطح دسترسی کاربران → مدیا آموزشی» برای گروه کاربری شما غیرفعال شده است.
              </p>
            </section>
          ) : (
            <>
              {/* Video Search Bar */}
              <section className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    placeholder="جستجو در تایتل یا توضیحات ویدیوهای آموزشی..."
                    aria-label="جستجوی ویدیوهای آموزشی"
                    className="w-full h-11 sm:h-10 pr-10 pl-10 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f5864] transition-colors"
                  />
                  {videoSearch && (
                    <button
                      type="button"
                      onClick={() => setVideoSearch('')}
                      aria-label="پاک کردن جستجو"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center absolute left-1.5 top-1/2 -translate-y-1/2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 tabular-nums shrink-0">
                  {normalizedVideoQuery ? (
                    <span>
                      نتیجه جستجو:{' '}
                      <strong className="text-[#0f5864]">
                        {toPersianDigits(filteredVideos.length)}
                      </strong>{' '}
                      از {toPersianDigits(videos.length)} ویدیو
                    </span>
                  ) : (
                    <span>
                      نمایش تمام {toPersianDigits(videos.length)} ویدیو آموزشی
                    </span>
                  )}
                </div>
              </section>

              {/* Videos Grid / Empty States */}
              {videos.length === 0 ? (
                <section className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Film className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h2 className="text-sm font-bold text-slate-900">
                      هنوز ویدیوی آموزشی بارگذاری نشده است
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ویدیوهای آموزشی واحد تولید، توزین، بسته‌بندی یا پخش را همراه با تایتل و توضیحات کامل آپلود کنید تا تیم به سادگی آن‌ها را مشاهده کند.
                    </p>
                  </div>
                  {canUploadVideos && (
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoUploadForm();
                        setVideoUploadModalOpen(true);
                      }}
                      className="mt-1 min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      آپلود اولین ویدیوی آموزشی
                    </button>
                  )}
                </section>
              ) : filteredVideos.length === 0 ? (
                <section className="bg-white border border-slate-200 rounded-xl py-14 px-6 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-900">
                      ویدیویی با عبارت «{videoSearch}» یافت نشد
                    </h2>
                    <p className="text-xs text-slate-500">
                      عبارت دیگری جستجو کنید یا جستجو را پاک نمایید.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideoSearch('')}
                    className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    نمایش همه ویدیوها
                  </button>
                </section>
              ) : (
                <section
                  aria-label="فهرست ویدیوهای آموزشی"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {filteredVideos.map((video) => {
                    const isEditing = editingVideoId === video.id;
                    const durationText = formatDuration(video.durationSeconds);

                    return (
                      <article
                        key={video.id}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-[#0f5864]/50"
                      >
                        {/* 16:9 Video Player Area */}
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          {video.videoUrl ? (
                            <video
                              src={video.videoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain bg-slate-950"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300 p-4 text-center">
                              <PlayCircle className="w-9 h-9 text-slate-400" />
                              <span className="text-xs font-medium">
                                فایل ویدیو در حال بارگذاری است یا در حافظه مرورگر موجود نیست
                              </span>
                            </div>
                          )}

                          {video.videoUrl && (
                            <button
                              type="button"
                              onClick={() => setActiveVideoId(video.id)}
                              title="نمایش در پنجره بزرگ"
                              aria-label={`نمایش بزرگ ویدیو ${video.title}`}
                              className="absolute top-2.5 left-2.5 w-8 h-8 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title, Description & Quiet Metadata */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          {isEditing ? (
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  تایتل ویدیو
                                </label>
                                <input
                                  type="text"
                                  value={editVideoTitle}
                                  onChange={(e) =>
                                    setEditVideoTitle(e.target.value)
                                  }
                                  autoFocus
                                  className="w-full h-9 px-2.5 text-xs font-semibold bg-white border border-[#0f5864] rounded-lg focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  توضیحات
                                </label>
                                <textarea
                                  rows={3}
                                  value={editVideoDesc}
                                  onChange={(e) =>
                                    setEditVideoDesc(e.target.value)
                                  }
                                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864] resize-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingVideoId(null)}
                                  className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveInlineVideoEdit(video.id)}
                                  className="h-8 px-3 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] inline-flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  ذخیره
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                                {video.title}
                              </h2>
                              {video.description ? (
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                                  {video.description}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400">
                                  توضیحی برای این ویدیو ثبت نشده است.
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                            <div className="text-[11px] text-slate-500 tabular-nums truncate flex items-center gap-1.5">
                              <span>{video.uploadedBy}</span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span>{video.uploadedAt}</span>
                              {durationText && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="text-slate-300"
                                  >
                                    ·
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {durationText}
                                  </span>
                                </>
                              )}
                            </div>

                            {canManageVideos && !isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startInlineVideoEdit(video)}
                                  title="ویرایش تایتل و توضیحات"
                                  aria-label={`ویرایش ویدیو ${video.title}`}
                                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-[#0f5864] hover:bg-slate-100 flex items-center justify-center transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVideo(video)}
                                  title="حذف ویدیو"
                                  aria-label={`حذف ویدیو ${video.title}`}
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
            </>
          )}
        </>
      )}

      {/* ==================== TAB 2: عکس محصولات ==================== */}
      {activeTab === 'photos' && (
        <>
          {!canViewPhotos ? (
            <section className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                دسترسی مشاهده عکس محصولات غیرفعال است
              </h2>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                مجوز مشاهده این تب از بخش «سطح دسترسی کاربران → مدیا آموزشی» برای گروه کاربری شما غیرفعال شده است.
              </p>
            </section>
          ) : (
            <>
              {/* Title Search Bar */}
              <section className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={photoSearch}
                    onChange={(e) => setPhotoSearch(e.target.value)}
                    placeholder="جستجو بر اساس تایتل عکس محصول (مثلاً: راسته بره، سردست، ران...)"
                    aria-label="جستجوی تایتل عکس محصول"
                    className="w-full h-11 sm:h-10 pr-10 pl-10 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f5864] transition-colors"
                  />
                  {photoSearch && (
                    <button
                      type="button"
                      onClick={() => setPhotoSearch('')}
                      aria-label="پاک کردن جستجو"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center absolute left-1.5 top-1/2 -translate-y-1/2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 tabular-nums shrink-0">
                  {normalizedPhotoQuery ? (
                    <span>
                      نتیجه جستجو:{' '}
                      <strong className="text-[#0f5864]">
                        {toPersianDigits(filteredPhotos.length)}
                      </strong>{' '}
                      از {toPersianDigits(photos.length)} عکس
                    </span>
                  ) : (
                    <span>
                      نمایش تمام {toPersianDigits(photos.length)} عکس محصول
                    </span>
                  )}
                </div>
              </section>

              {/* Photo Gallery Grid / Empty States */}
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
                  {canUploadPhotos && (
                    <button
                      type="button"
                      onClick={() => setPhotoUploadModalOpen(true)}
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
                      عکسی با تایتل «{photoSearch}» یافت نشد
                    </h2>
                    <p className="text-xs text-slate-500">
                      عبارت دیگری جستجو کنید یا جستجو را پاک کنید تا همه عکس‌ها نمایش داده شوند.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoSearch('')}
                    className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    نمایش همه عکس‌ها
                  </button>
                </section>
              ) : (
                <section
                  aria-label="گالری عکس محصولات"
                  className={`grid gap-4 ${
                    filteredPhotos.length === 1 && normalizedPhotoQuery
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

                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingPhotoTitle}
                                onChange={(e) =>
                                  setEditingPhotoTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    saveInlinePhotoEdit(photo.id);
                                  if (e.key === 'Escape')
                                    setEditingPhotoId(null);
                                }}
                                autoFocus
                                className="flex-1 min-w-0 h-9 px-2.5 text-xs font-semibold bg-white border border-[#0f5864] rounded-lg focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveInlinePhotoEdit(photo.id)}
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
                              <span
                                aria-hidden="true"
                                className="mx-1.5 text-slate-300"
                              >
                                ·
                              </span>
                              <span>{photo.uploadedAt}</span>
                            </div>

                            {canManagePhotos && !isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPhotoId(photo.id);
                                    setEditingPhotoTitle(photo.title);
                                  }}
                                  title="ویرایش تایتل"
                                  aria-label={`ویرایش تایتل ${photo.title}`}
                                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-[#0f5864] hover:bg-slate-100 flex items-center justify-center transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(photo)}
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
            </>
          )}
        </>
      )}

      {/* ================= UPLOAD VIDEO MODAL ================= */}
      {videoUploadModalOpen && canUploadVideos && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="آپلود ویدیوی آموزشی"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoUploadModalOpen(false);
          }}
        >
          <form
            onSubmit={handleConfirmVideoUpload}
            className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0f5864]" />
                <h2 className="text-sm font-bold text-slate-900">
                  آپلود ویدیوی آموزشی جدید
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVideoUploadModalOpen(false)}
                aria-label="بستن پنجره"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Video Dropzone / Preview */}
              {!pendingVideoFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingVideo(true);
                  }}
                  onDragLeave={() => setIsDraggingVideo(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingVideo(false);
                    void handleVideoFileSelected(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    isDraggingVideo
                      ? 'border-[#0f5864] bg-[#0f5864]/5'
                      : 'border-slate-300 bg-slate-50/70 hover:border-[#0f5864]/60'
                  }`}
                >
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => void handleVideoFileSelected(e.target.files)}
                    className="hidden"
                    id="training-video-file-input"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#0f5864] flex items-center justify-center">
                      <Film className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      فایل ویدیوی آموزشی را اینجا بکشید یا از دستگاه انتخاب کنید
                    </p>
                    <p className="text-[11px] text-slate-500">
                      پشتیبانی از فرمت‌های MP4، WebM، MOV و سایر ویدیوهای استاندارد
                    </p>
                    <label
                      htmlFor="training-video-file-input"
                      className="mt-1 min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:border-[#0f5864] hover:text-[#0f5864] cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      انتخاب فایل ویدیو
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="aspect-video bg-slate-950">
                    <video
                      src={pendingVideoPreviewUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {pendingVideoFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {toPersianDigits(
                          Math.max(
                            0.1,
                            Math.round(
                              (pendingVideoFile.size / (1024 * 1024)) * 10
                            ) / 10
                          )
                        )}{' '}
                        مگابایت
                        {pendingVideoDuration
                          ? ` · مدت زمان ${formatDuration(pendingVideoDuration)}`
                          : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingVideoPreviewUrl) {
                          URL.revokeObjectURL(pendingVideoPreviewUrl);
                        }
                        setPendingVideoFile(null);
                        setPendingVideoPreviewUrl('');
                        setPendingVideoDuration(undefined);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      تغییر ویدیو
                    </button>
                  </div>
                </div>
              )}

              {/* Video Title */}
              <div>
                <label
                  htmlFor="video-title-input"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  تایتل ویدیو <span className="text-red-500">*</span>
                </label>
                <input
                  id="video-title-input"
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => {
                    setVideoTitleInput(e.target.value);
                    setVideoUploadError('');
                  }}
                  placeholder="مثلاً: آموزش اصول برش و آماده‌سازی راسته بره"
                  className="w-full h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864]"
                />
              </div>

              {/* Video Description */}
              <div>
                <label
                  htmlFor="video-desc-input"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  توضیحات ویدیو
                </label>
                <textarea
                  id="video-desc-input"
                  rows={3}
                  value={videoDescInput}
                  onChange={(e) => setVideoDescInput(e.target.value)}
                  placeholder="توضیحات، نکات کلیدی و راهنمای مشاهده این ویدیو آموزشی را بنویسید..."
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f5864] leading-relaxed"
                />
              </div>

              {videoUploadError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {videoUploadError}
                </p>
              )}
            </div>

            <div className="px-5 pt-3.5 pb-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setVideoUploadModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!pendingVideoFile || isSavingVideo}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4" />
                {isSavingVideo ? 'در حال ذخیره ویدیو...' : 'ثبت و انتشار ویدیو'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MULTI-PHOTO UPLOAD MODAL ================= */}
      {photoUploadModalOpen && canUploadPhotos && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="آپلود عکس محصولات"
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhotoUploadModalOpen(false);
          }}
        >
          <form
            onSubmit={handleConfirmPhotoUpload}
            className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0f5864]" />
                <h2 className="text-sm font-bold text-slate-900">
                  آپلود عکس محصولات و ثبت تایتل
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPhotoUploadModalOpen(false)}
                aria-label="بستن پنجره"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(false);
                  void handlePhotoFilesSelected(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  isDraggingPhoto
                    ? 'border-[#0f5864] bg-[#0f5864]/5'
                    : 'border-slate-300 bg-slate-50/70 hover:border-[#0f5864]/60'
                }`}
              >
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handlePhotoFilesSelected(e.target.files)}
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
                    {isReadingPhotos
                      ? 'در حال آماده‌سازی تصاویر...'
                      : 'انتخاب یک یا چند عکس'}
                  </label>
                </div>
              </div>

              {photoUploadError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {photoUploadError}
                </p>
              )}

              {pendingPhotos.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      عکس‌های آماده ثبت ({toPersianDigits(pendingPhotos.length)}{' '}
                      مورد)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingPhotos([])}
                      className="text-red-600 hover:underline font-medium"
                    >
                      پاک کردن همه
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {pendingPhotos.map((item, idx) => (
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
                              setPhotoUploadError('');
                              setPendingPhotos((prev) =>
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
                            {item.fileName} · {toPersianDigits(item.fileSizeKb)}{' '}
                            کیلوبایت
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPendingPhotos((prev) =>
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

            <div className="px-5 pt-3.5 pb-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPhotoUploadModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={pendingPhotos.length === 0 || isReadingPhotos}
                className="min-h-[42px] inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-[#0f5864] text-white hover:bg-[#0b434d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4" />
                ثبت و آپلود{' '}
                {pendingPhotos.length > 0
                  ? `(${toPersianDigits(pendingPhotos.length)} عکس)`
                  : 'عکس‌ها'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= FULL-SCREEN VIDEO LIGHTBOX ================= */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`پخش ویدیو ${activeVideo.title}`}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveVideoId(null);
          }}
        >
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {activeVideo.title}
                </h2>
                <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                  آپلود توسط {activeVideo.uploadedBy} · {activeVideo.uploadedAt}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoId(null)}
                aria-label="بستن پخش‌کننده"
                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 flex items-center justify-center overflow-hidden">
              <video
                src={activeVideo.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[60dvh] object-contain"
              />
            </div>

            {activeVideo.description && (
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                {activeVideo.description}
              </div>
            )}

            <div className="px-5 pt-3 pb-5 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate tabular-nums">
                {activeVideo.fileName} ·{' '}
                {toPersianDigits(activeVideo.fileSizeMb)} مگابایت
              </span>
              <button
                type="button"
                onClick={() => setActiveVideoId(null)}
                className="min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FULL-SCREEN PHOTO LIGHTBOX ================= */}
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
                {canManagePhotos && (
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(activePhoto)}
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
