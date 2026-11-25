import { useCallback, useEffect, useRef, useState } from 'react';
import { TrainingVideo } from '../types/productPhoto';
import { toPersianDigits } from '../utils/jalaliCalendar';

const VIDEOS_META_STORAGE_KEY = 'training_videos_meta_v1';
const VIDEO_DB_NAME = 'training_media_videos_db';
const VIDEO_STORE_NAME = 'video_blobs';

type StoredVideoMeta = Omit<TrainingVideo, 'videoUrl'>;

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(VIDEO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        db.createObjectStore(VIDEO_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open DB'));
  });
}

async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE_NAME, 'readwrite');
    tx.objectStore(VIDEO_STORE_NAME).put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to store video'));
    };
  });
}

async function getVideoBlob(id: string): Promise<Blob | undefined> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE_NAME, 'readonly');
    const req = tx.objectStore(VIDEO_STORE_NAME).get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as Blob | undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Failed to read video'));
    };
  });
}

async function deleteVideoBlob(id: string): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(VIDEO_STORE_NAME, 'readwrite');
      tx.objectStore(VIDEO_STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore storage cleanup errors
  }
}

async function clearAllVideoBlobs(): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(VIDEO_STORE_NAME, 'readwrite');
      tx.objectStore(VIDEO_STORE_NAME).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore
  }
}

function getNowJalaliTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return toPersianDigits(`1405/09/03 - ${hh}:${mm}`);
}

function loadVideoMetadata(): StoredVideoMeta[] {
  try {
    const raw = localStorage.getItem(VIDEOS_META_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredVideoMeta[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return [];
}

function persistVideoMetadata(videos: TrainingVideo[]) {
  try {
    const meta: StoredVideoMeta[] = videos.map(({ videoUrl: _u, ...rest }) => rest);
    localStorage.setItem(VIDEOS_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

export function readVideoDurationSeconds(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : undefined;
      URL.revokeObjectURL(tempUrl);
      resolve(dur);
    };
    video.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(undefined);
    };
    video.src = tempUrl;
  });
}

export function useTrainingVideosStore() {
  const [videos, setVideos] = useState<TrainingVideo[]>(() =>
    loadVideoMetadata().map((m) => ({ ...m, videoUrl: '' }))
  );
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Hydrate Blob object URLs from IndexedDB on initial mount
  useEffect(() => {
    let cancelled = false;

    async function hydrateBlobs() {
      const metaList = loadVideoMetadata();
      if (metaList.length === 0) return;

      const hydrated: TrainingVideo[] = [];
      for (const meta of metaList) {
        let videoUrl = '';
        try {
          const blob = await getVideoBlob(meta.id);
          if (blob) {
            videoUrl = URL.createObjectURL(blob);
            objectUrlsRef.current.add(videoUrl);
          }
        } catch {
          // Leave videoUrl empty so UI renders clean fallback
        }
        hydrated.push({ ...meta, videoUrl });
      }
      if (!cancelled) {
        setVideos(hydrated);
      }
    }

    hydrateBlobs();

    return () => {
      cancelled = true;
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
    };
  }, []);

  const addVideo = useCallback(
    async (
      payload: {
        title: string;
        description: string;
        file: File;
        durationSeconds?: number;
      },
      uploadedBy: string
    ): Promise<TrainingVideo> => {
      const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const videoUrl = URL.createObjectURL(payload.file);
      objectUrlsRef.current.add(videoUrl);

      const newVideo: TrainingVideo = {
        id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        videoUrl,
        fileName: payload.file.name,
        mimeType: payload.file.type || 'video/mp4',
        fileSizeMb: Math.max(
          0.1,
          Math.round((payload.file.size / (1024 * 1024)) * 10) / 10
        ),
        durationSeconds: payload.durationSeconds,
        uploadedBy,
        uploadedAt: getNowJalaliTimestamp(),
      };

      try {
        await saveVideoBlob(id, payload.file);
      } catch {
        // Still keep in-session object URL working even if IndexedDB is restricted
      }

      setVideos((prev) => {
        const next = [newVideo, ...prev];
        persistVideoMetadata(next);
        return next;
      });

      return newVideo;
    },
    []
  );

  const updateVideo = useCallback(
    (id: string, title: string, description: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      setVideos((prev) => {
        const next = prev.map((v) =>
          v.id === id
            ? { ...v, title: trimmedTitle, description: description.trim() }
            : v
        );
        persistVideoMetadata(next);
        return next;
      });
    },
    []
  );

  const deleteVideo = useCallback((id: string) => {
    setVideos((prev) => {
      const target = prev.find((v) => v.id === id);
      if (target?.videoUrl) {
        URL.revokeObjectURL(target.videoUrl);
        objectUrlsRef.current.delete(target.videoUrl);
      }
      const next = prev.filter((v) => v.id !== id);
      persistVideoMetadata(next);
      return next;
    });
    void deleteVideoBlob(id);
  }, []);

  const resetTrainingVideos = useCallback(() => {
    setVideos((prev) => {
      for (const v of prev) {
        if (v.videoUrl) {
          URL.revokeObjectURL(v.videoUrl);
          objectUrlsRef.current.delete(v.videoUrl);
        }
      }
      return [];
    });
    localStorage.removeItem(VIDEOS_META_STORAGE_KEY);
    void clearAllVideoBlobs();
  }, []);

  return {
    videos,
    addVideo,
    updateVideo,
    deleteVideo,
    resetTrainingVideos,
  };
}
