import { useState } from 'react';
import type { Drink, DrinkType } from '@/types/database';
import { cn } from '@/utils/cn';
import { DRINK_TYPE_LABELS } from '@/utils/constants';
import { useFavorites } from '@/hooks/useFavorites';
import { IconDroplet, IconGlass, IconHeart, IconLeaf, IconLock } from '../ui/Icons';

export function DrinkTypeBadge({ tipo, className }: { tipo: DrinkType; className?: string }) {
  const isMocktail = tipo === 'mocktail';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        isMocktail ? 'bg-lime-100 text-lime-900' : 'bg-amber-100 text-amber-900',
        className,
      )}
    >
      {isMocktail ? <IconLeaf size={13} /> : <IconGlass size={13} />}
      {DRINK_TYPE_LABELS[tipo]}
    </span>
  );
}

export function AlcoholBadge({ contemAlcool, className }: { contemAlcool: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        contemAlcool ? 'bg-stone-100 text-stone-700' : 'bg-sky-50 text-sky-900',
        className,
      )}
    >
      <IconDroplet size={13} />
      {contemAlcool ? 'Com álcool' : 'Sem álcool'}
    </span>
  );
}

export function PrivateBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-white', className)}>
      <IconLock size={12} /> Privado
    </span>
  );
}

export function DrinkImage({ drink, className, sizes }: { drink: Pick<Drink, 'nome' | 'url_imagem' | 'tipo'>; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  if (!drink.url_imagem || failed) {
    const isMocktail = drink.tipo === 'mocktail';
    return (
      <div
        role="img"
        aria-label={`Sem foto de ${drink.nome}`}
        className={cn(
          'flex h-full w-full items-center justify-center',
          isMocktail ? 'bg-lime-50 text-lime-700' : 'bg-amber-50 text-amber-700',
          className,
        )}
      >
        <IconGlass size={48} strokeWidth={1.2} />
      </div>
    );
  }
  return (
    <img
      src={drink.url_imagem}
      alt={`Foto do drink ${drink.nome}`}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

interface FavoriteButtonProps {
  drinkId: string;
  drinkName: string;
  variant?: 'floating' | 'full';
  className?: string;
}

export function FavoriteButton({ drinkId, drinkName, variant = 'floating', className }: FavoriteButtonProps) {
  const { isFavorite, isPending, toggleFavorite } = useFavorites();
  const active = isFavorite(drinkId);
  const pending = isPending(drinkId);
  const label = active ? `Remover ${drinkName} dos favoritos` : `Salvar ${drinkName} nos favoritos`;

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => void toggleFavorite(drinkId, drinkName)}
        disabled={pending}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-60',
          active ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100' : 'border-stone-300 bg-white text-ink hover:bg-stone-50',
          className,
        )}
      >
        <IconHeart size={18} filled={active} className={active ? 'text-rose-600' : ''} />
        {pending ? 'Salvando...' : active ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggleFavorite(drinkId, drinkName)}
      disabled={pending}
      aria-pressed={active}
      aria-label={label}
      title={active ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform',
        'hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-60',
        active ? 'text-rose-600' : 'text-stone-700',
        className,
      )}
    >
      <IconHeart size={19} filled={active} />
    </button>
  );
}
