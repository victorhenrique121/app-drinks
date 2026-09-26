import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { IconAlert, IconBan, IconCheck, IconInfo } from './Icons';

export function Spinner({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="animate-spin"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      {label && <span>{label}</span>}
    </span>
  );
}

export function PageLoader({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-stone-600">
      <Spinner label={label} />
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-800">{icon}</div>}
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-md text-stone-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type AlertTone = 'error' | 'warning' | 'info' | 'success';

const alertStyles: Record<AlertTone, { box: string; icon: ReactNode; label: string }> = {
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: <IconBan />, label: 'Erro' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: <IconAlert />, label: 'Atenção' },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-950', icon: <IconInfo />, label: 'Informação' },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: <IconCheck />, label: 'Sucesso' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  id?: string;
}

/** Alerta com ícone + texto (não depende só de cor). */
export function Alert({ tone = 'info', title, children, className, action, id }: AlertProps) {
  const style = alertStyles[tone];
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-2xl border p-4 text-sm', style.box, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          <span className="sr-only">{style.label}: </span>
          {title}
        </p>
        {children && <div className={cn(title && 'mt-1', 'leading-relaxed')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function DrinkCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-stone-200" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}
