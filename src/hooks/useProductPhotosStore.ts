import { useCallback, useEffect, useState } from 'react';
import { ProductPhoto } from '../types/productPhoto';
import { toPersianDigits } from '../utils/jalaliCalendar';

const PRODUCT_PHOTOS_STORAGE_KEY = 'product_photos_gallery_v1';

function buildCatalogArtworkDataUri(
  title: string,
  subtitle: string,
  accentA: string,
  accentB: string,
  cutPath: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="meat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentA}"/>
      <stop offset="100%" stop-color="${accentB}"/>
    </linearGradient>
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect x="44" y="44" width="712" height="512" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <ellipse cx="400" cy="405" rx="225" ry="42" fill="#e2e8f0" opacity="0.65"/>
  <g filter="url(#shadow)">
    <path d="${cutPath}" fill="url(#meat)" stroke="#fff1f2" stroke-width="5"/>
    <path d="M295 275 Q375 245 465 280 M315 315 Q395 295 490 325 M345 352 Q420 340 480 362" fill="none" stroke="#ffe4e6" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
  </g>
  <text x="400" y="114" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="22" font-weight="600" fill="#64748b">${subtitle}</text>
  <text x="400" y="512" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="30" font-weight="800" fill="#0f172a">${title}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const INITIAL_PRODUCT_PHOTOS: ProductPhoto[] = [
  {
    id: 'photo-seed-1',
    title: 'راسته بره ممتاز',
    imageUrl: buildCatalogArtworkDataUri(
      'راسته بره ممتاز',
      'کاتالوگ نمونه محصول',
      '#b91c1c',
      '#7f1d1d',
      'M220 325 C220 235, 340 190, 480 205 C565 215, 600 280, 580 355 C558 422, 445 432, 330 418 C252 408, 220 375, 220 325 Z'
    ),
    fileName: 'raste-bareh-momtaz.jpg',
    uploadedBy: 'امیر مرادصالح',
    uploadedAt: '۱۴۰۵/۰۹/۰۱ - ۱۰:۱۵',
    fileSizeKb: 245,
  },
  {
    id: 'photo-seed-2',
    title: 'سردست بدون گردن ممتاز',
    imageUrl: buildCatalogArtworkDataUri(
      'سردست بدون گردن ممتاز',
      'کاتالوگ نمونه محصول',
      '#9f1239',
      '#6b1028',
      'M235 300 C250 225, 360 195, 470 215 C555 230, 595 295, 565 368 C535 430, 410 432, 305 405 C242 388, 224 352, 235 300 Z'
    ),
    fileName: 'sardast-bedoon-gardan.jpg',
    uploadedBy: 'مهدی کریمی',
    uploadedAt: '۱۴۰۵/۰۹/۰۱ - ۱۱:۰۰',
    fileSizeKb: 310,
  },
  {
    id: 'photo-seed-3',
    title: 'ران معمولی تازه',
    imageUrl: buildCatalogArtworkDataUri(
      'ران معمولی تازه',
      'کاتالوگ نمونه محصول',
      '#be123c',
      '#881337',
      'M215 330 C218 250, 315 202, 430 202 C535 202, 595 255, 585 330 C575 398, 488 430, 385 426 C278 422, 212 392, 215 330 Z'
    ),
    fileName: 'ran-mamooli-tazeh.jpg',
    uploadedBy: 'امیر مرادصالح',
    uploadedAt: '۱۴۰۵/۰۹/۰۲ - ۰۹:۳۰',
    fileSizeKb: 278,
  },
  {
    id: 'photo-seed-4',
    title: 'قلوه‌گاه تکر بره',
    imageUrl: buildCatalogArtworkDataUri(
      'قلوه‌گاه تکر بره',
      'کاتالوگ نمونه محصول',
      '#a21caf',
      '#701a75',
      'M240 315 C248 242, 345 208, 460 220 C548 230, 588 286, 562 355 C536 418, 432 428, 330 412 C265 400, 234 365, 240 315 Z'
    ),
    fileName: 'gholvegah-takar.jpg',
    uploadedBy: 'مهدی کریمی',
    uploadedAt: '۱۴۰۵/۰۹/۰۲ - ۱۴:۲۰',
    fileSizeKb: 196,
  },
];

function getNowJalaliTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return toPersianDigits(`1405/09/03 - ${hh}:${mm}`);
}

export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; fileSizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = () => {
      const rawResult = typeof reader.result === 'string' ? reader.result : '';
      if (!rawResult) {
        reject(new Error('فایل تصویر معتبر نیست'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        resolve({
          dataUrl: rawResult,
          fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
        });
      };
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawResult,
              fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
            });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const approxBytes = Math.round((compressed.length * 3) / 4);
          resolve({
            dataUrl: compressed,
            fileSizeKb: Math.max(1, Math.round(approxBytes / 1024)),
          });
        } catch {
          resolve({
            dataUrl: rawResult,
            fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          });
        }
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

function loadInitialPhotos(): ProductPhoto[] {
  try {
    const raw = localStorage.getItem(PRODUCT_PHOTOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProductPhoto[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seeded photos
  }
  return INITIAL_PRODUCT_PHOTOS;
}

export function useProductPhotosStore() {
  const [photos, setPhotos] = useState<ProductPhoto[]>(() =>
    loadInitialPhotos()
  );

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCT_PHOTOS_STORAGE_KEY, JSON.stringify(photos));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [photos]);

  const addPhotos = useCallback(
    (
      items: Array<{
        title: string;
        imageUrl: string;
        fileName: string;
        fileSizeKb?: number;
      }>,
      uploadedBy: string
    ) => {
      const timestamp = getNowJalaliTimestamp();
      const created: ProductPhoto[] = items.map((item, index) => ({
        id: `photo-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        title: item.title.trim(),
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        uploadedBy,
        uploadedAt: timestamp,
        fileSizeKb: item.fileSizeKb,
      }));
      setPhotos((prev) => [...created, ...prev]);
      return created;
    },
    []
  );

  const updatePhotoTitle = useCallback((id: string, nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id ? { ...photo, title: trimmed } : photo
      )
    );
  }, []);

  const deletePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const resetProductPhotos = useCallback(() => {
    setPhotos(INITIAL_PRODUCT_PHOTOS);
    localStorage.removeItem(PRODUCT_PHOTOS_STORAGE_KEY);
  }, []);

  return {
    photos,
    addPhotos,
    updatePhotoTitle,
    deletePhoto,
    resetProductPhotos,
  };
}
