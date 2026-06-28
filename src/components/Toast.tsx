import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Context ──────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Icons & Colors ───────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; gradient: string; border: string; text: string; iconBg: string }> = {
  success: {
    icon: <CheckCircle size={20} />,
    gradient: 'from-[#34C759]/10 via-surface to-surface',
    border: 'border-[#34C759]/20',
    text: 'text-[#34C759]',
    iconBg: 'bg-[#34C759]',
  },
  error: {
    icon: <XCircle size={20} />,
    gradient: 'from-[#FF3B30]/10 via-surface to-surface',
    border: 'border-[#FF3B30]/20',
    text: 'text-[#FF3B30]',
    iconBg: 'bg-[#FF3B30]',
  },
  warning: {
    icon: <AlertTriangle size={20} />,
    gradient: 'from-[#FF9500]/10 via-surface to-surface',
    border: 'border-[#FF9500]/20',
    text: 'text-[#FF9500]',
    iconBg: 'bg-[#FF9500]',
  },
  info: {
    icon: <Info size={20} />,
    gradient: 'from-[#208AEF]/10 via-surface to-surface',
    border: 'border-[#208AEF]/20',
    text: 'text-[#208AEF]',
    iconBg: 'bg-[#208AEF]',
  },
};

// ─── Single Toast Component ──────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TOAST_CONFIG[toast.type];
  const duration = toast.duration || 3000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 30);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 400);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [toast.id, duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 400);
  };

  return (
    <div
      className={`
        relative flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border glass
        bg-gradient-to-r ${config.gradient} ${config.border}
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
        max-w-[420px] w-full overflow-hidden cursor-default
      `}
      style={{ boxShadow: '0 20px 60px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)' }}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center shadow-lg`}>
        <span className="text-white">{config.icon}</span>
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-semibold text-textPrimary leading-snug pr-2">
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 w-7 h-7 rounded-lg bg-surfaceMuted/80 hover:bg-surfaceMuted flex items-center justify-center transition-colors"
      >
        <X size={14} className="text-textMuted" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-surfaceMuted/50 rounded-b-2xl overflow-hidden">
        <div
          className={`h-full ${config.iconBg} rounded-b-2xl transition-all ease-linear`}
          style={{ width: `${progress}%`, transitionDuration: '30ms' }}
        />
      </div>
    </div>
  );
}

// ─── Toast Provider ──────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container - Fixed at top-right */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes toast-enter {
          0% { opacity: 0; transform: translateX(100%) scale(0.85); }
          50% { opacity: 1; transform: translateX(-8px) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toast-exit {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(120%) scale(0.85); }
        }
        .animate-toast-enter { animation: toast-enter 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-toast-exit { animation: toast-exit 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
      `}</style>
    </ToastContext.Provider>
  );
}
