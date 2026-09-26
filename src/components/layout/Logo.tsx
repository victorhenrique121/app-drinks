import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="10" className="fill-brand-800" />
      <path d="M9 8h14l-1.8 14.5a2 2 0 0 1-2 1.7h-6.4a2 2 0 0 1-2-1.7L9 8Z" fill="none" stroke="#FAF7F2" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.2 14.5h11.6l-1 8a1.4 1.4 0 0 1-1.4 1.2h-6.8a1.4 1.4 0 0 1-1.4-1.2l-1-8Z" className="fill-amber-400" />
      <circle cx="21.5" cy="7.5" r="2.6" className="fill-lime-400" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        className,
      )}
      aria-label="Copo Certo — página inicial"
    >
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Copo <span className="italic text-brand-800">Certo</span>
      </span>
    </Link>
  );
}
