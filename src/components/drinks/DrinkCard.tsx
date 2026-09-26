import { Link } from 'react-router-dom';
import type { Drink } from '@/types/database';
import { cn } from '@/utils/cn';
import { AlcoholBadge, DrinkImage, DrinkTypeBadge, FavoriteButton, PrivateBadge } from './DrinkBits';

interface DrinkCardProps {
  drink: Drink;
  showIngredients?: boolean;
  className?: string;
}

export function DrinkCard({ drink, showIngredients, className }: DrinkCardProps) {
  const count = drink.ingredientes.length;
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_12px_30px_-18px_rgba(28,25,23,0.35)]',
        'focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-2 focus-within:ring-offset-cream',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <DrinkImage drink={drink} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <DrinkTypeBadge tipo={drink.tipo} className="bg-white/95" />
          {!drink.publico && <PrivateBadge />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          {/* Link cobre o card inteiro (pseudo-elemento) sem aninhar o botão de favorito */}
          <Link to={`/drinks/${drink.id}`} className="after:absolute after:inset-0 focus:outline-none">
            {drink.nome}
          </Link>
        </h3>
        {drink.descricao && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">{drink.descricao}</p>}

        {showIngredients && count > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Ingredientes">
            {drink.ingredientes.slice(0, 5).map((i) => (
              <li key={i.vinculo_id} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700">
                {i.nome}
              </li>
            ))}
            {count > 5 && <li className="px-1 text-xs text-stone-500">+{count - 5}</li>}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-xs text-stone-500">
          <span>
            {count} {count === 1 ? 'ingrediente' : 'ingredientes'}
          </span>
          <span aria-hidden="true">·</span>
          <AlcoholBadge contemAlcool={drink.contemAlcool} className="px-2 py-0.5" />
        </div>
        <p className="mt-2 truncate text-xs text-stone-500">
          por <span className="font-medium text-stone-700">{drink.autor?.nome ?? 'Autor desconhecido'}</span>
        </p>
      </div>

      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton drinkId={drink.id} drinkName={drink.nome} />
      </div>
    </article>
  );
}
