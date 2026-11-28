import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Scale,
  X,
} from 'lucide-react';
import { ToastNotification, ToastType } from '../types/order';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const STYLE_MAP: Record<
  ToastType,
  { border: string; headerText: string; iconBg: string }
> = {
  danger: {
    border: 'border-red-200',
    headerText: 'text-red-700',
    iconBg: 'bg-red-50 text-red-600',
  },
  warning: {
    border: 'border-amber-200',
    headerText: 'text-amber-800',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  success: {
    border: 'border-emerald-200',
    headerText: 'text-emerald-800',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  info: {
    border: 'border-sky-200',
    headerText: 'text-[#0f5864]',
    iconBg: 'bg-sky-50 text-[#0f5864]',
  },
};

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'danger':
      return <AlertTriangle className="w-4 h-4" />;
    case 'warning':
      return <Scale className="w-4 h-4" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'info':
      return <Info className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
}

interface SwipeableToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const DISMISS_DISTANCE_PX = 85;
const QUICK_FLICK_DISTANCE_PX = 40;
const QUICK_FLICK_VELOCITY = 0.35; // px per ms

const SwipeableToastItem: React.FC<SwipeableToastItemProps> = ({
  toast,
  onDismiss,
}) => {
  const style = STYLE_MAP[toast.type];
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissDirection, setDismissDirection] = useState<-1 | 1 | null>(null);

  const dragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    lockedAxis: 'x' | 'y' | null;
    lastDx: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    lockedAxis: null,
    lastDx: 0,
  });

  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const triggerSwipeDismiss = (direction: -1 | 1) => {
    setDismissDirection(direction);
    setIsDragging(false);
    dismissTimerRef.current = window.setTimeout(() => {
      onDismiss(toast.id);
    }, 180);
  };

  const resetSwipe = () => {
    dragRef.current.pointerId = null;
    dragRef.current.lockedAxis = null;
    dragRef.current.lastDx = 0;
    setIsDragging(false);
    setOffsetX(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dismissDirection !== null) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      lockedAxis: null,
      lastDx: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId || dismissDirection !== null) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.lockedAxis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        drag.lockedAxis = 'x';
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if capture is unavailable on certain touch browsers
        }
      } else {
        drag.lockedAxis = 'y';
        return;
      }
    }

    if (drag.lockedAxis !== 'x') return;

    drag.lastDx = dx;
    setOffsetX(dx);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId || dismissDirection !== null) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    if (drag.lockedAxis !== 'x') {
      resetSwipe();
      return;
    }

    const dx = drag.lastDx;
    const elapsed = Math.max(1, performance.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed;
    const shouldDismiss =
      Math.abs(dx) >= DISMISS_DISTANCE_PX ||
      (Math.abs(dx) >= QUICK_FLICK_DISTANCE_PX &&
        velocity >= QUICK_FLICK_VELOCITY);

    drag.pointerId = null;
    drag.lockedAxis = null;

    if (shouldDismiss) {
      triggerSwipeDismiss(dx >= 0 ? 1 : -1);
    } else {
      setIsDragging(false);
      setOffsetX(0);
    }
  };

  const computedTransform =
    dismissDirection !== null
      ? `translate3d(${dismissDirection * 120}%, 0, 0)`
      : `translate3d(${offsetX}px, 0, 0)`;

  const computedOpacity =
    dismissDirection !== null
      ? 0
      : Math.max(0.15, 1 - Math.abs(offsetX) / 260);

  return (
    <div
      role="status"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={resetSwipe}
      style={{
        transform: computedTransform,
        opacity: computedOpacity,
        transition: isDragging
          ? 'none'
          : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out',
      }}
      className={`bg-white border ${style.border} rounded-lg shadow-lg p-3.5 flex items-start gap-3 touch-pan-y select-none will-change-transform cursor-grab active:cursor-grabbing`}
    >
      <div
        className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${style.iconBg}`}
      >
        <ToastIcon type={toast.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className={`text-[13px] font-bold truncate ${style.headerText}`}>
            {toast.title}
          </h4>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="بستن اعلان"
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mb-1.5">
          {toast.message}
        </p>
        <p className="text-[11px] font-medium text-slate-500">{toast.tag}</p>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-20 md:bottom-5 left-3 right-3 sm:right-auto sm:left-5 z-[60] flex flex-col gap-2.5 sm:w-[370px] max-w-full"
    >
      {toasts.map((toast) => (
        <SwipeableToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
