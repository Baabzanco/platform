import React from 'react';
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
      {toasts.map((toast) => {
        const style = STYLE_MAP[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={`bg-white border ${style.border} rounded-lg shadow-lg p-3.5 flex items-start gap-3 transition-all duration-200`}
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
              <p className="text-[11px] font-medium text-slate-500">
                {toast.tag}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
