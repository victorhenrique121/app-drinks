import { useCallback, useEffect, useMemo, useState } from 'react';
import { DrinkGrid } from '@/components/drinks/DrinkGrid';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { IconHeart } from '@/components/ui/Icons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFavorites } from '@/hooks/useFavorites';
import { getSavedDrinks } from '@/services/favorites';
import type { Drink } from '@/types/database';
import { toUserMessage } from '@/utils/errors';

export default function Favorites() {
  useDocumentTitle('Favoritos');
  const { favoriteIds } = useFavorites();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSavedDrinks()
      .then(setDrinks)
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar seus favoritos.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Ao desfavoritar nesta página, o card sai da lista imediatamente.
  const visible = useMemo(() => drinks.filter((d) => favoriteIds.has(d.id)), [drinks, favoriteIds]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Favoritos</h1>
        <p className="mt-2 text-stone-600">
          {loading ? 'Carregando favoritos...' : `${visible.length} ${visible.length === 1 ? 'receita salva' : 'receitas salvas'}`}
        </p>
      </header>
      <DrinkGrid
        drinks={visible}
        loading={loading}
        error={error}
        onRetry={load}
        showIngredients
        loadingLabel="Carregando favoritos..."
        empty={
          <EmptyState
            icon={<IconHeart />}
            title="Você ainda não salvou nenhum drink."
            description="Explore as receitas e salve suas favoritas."
            action={<ButtonLink to="/drinks">Explorar receitas</ButtonLink>}
          />
        }
      />
    </div>
  );
}
