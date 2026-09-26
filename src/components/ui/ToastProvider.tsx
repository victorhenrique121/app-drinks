import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastTone } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { IconBan, IconCheck, IconInfo, IconX } from './Icons';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const toneStyles: Record<ToastTone, { box: string; icon: ReactNode; label: string }> = {
  success: { box: 'border-emerald-200', icon: <IconCheck size={18} className="text-emerald-700" />, label: 'Sucesso' },
  error: { box: 'border-rose-200', icon: <IconBan size={18} className="text-rose-700" />, label: 'Erro' },
  info: { box: 'border-stone-200', icon: <IconInfo size={18} className="text-brand-800" />, label: 'Aviso' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:items-end sm:right-4 sm:left-auto"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm text-ink shadow-lg animate-pop-in',
                style.box,
              )}
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {style.icon}
              </span>
              <p className="flex-1 leading-relaxed">
                <span className="sr-only">{style.label}: </span>
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-full p-1 text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                aria-label="Fechar notificação"
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
