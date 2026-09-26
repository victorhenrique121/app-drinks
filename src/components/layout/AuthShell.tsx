import type { ReactNode } from 'react';
import { LogoMark } from './Logo';

const IMAGE =
  'https://images.pexels.com/photos/1189261/pexels-photo-1189261.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden rounded-[2rem] lg:block">
        <img src={IMAGE} alt="Bartender servindo drinks em um balcão" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" aria-hidden="true" />
        <blockquote className="absolute inset-x-8 bottom-8 text-white">
          <p className="font-display text-2xl leading-snug">“A medida certa faz toda a diferença no copo.”</p>
          <footer className="mt-2 text-sm text-white/80">Copo Certo</footer>
        </blockquote>
      </div>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-stone-500">
      <span className="h-px flex-1 bg-stone-200" aria-hidden="true" />
      {label}
      <span className="h-px flex-1 bg-stone-200" aria-hidden="true" />
    </div>
  );
}
