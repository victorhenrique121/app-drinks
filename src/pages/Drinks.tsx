import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DrinkGrid } from '@/components/drinks/DrinkGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { SelectField } from '@/components/ui/Field';
import { IconSearch, IconX } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { applyDrinkQuery, listDrinks } from '@/services/drinks';
import type { Drink, DrinkFilter, DrinkSort } from '@/types/database';
import { cn } from '@/utils/cn';
import { FILTER_OPTIONS, SORT_OPTIONS } from '@/utils/constants';
import { toUserMessage } from '@/utils/errors';

const isFilter = (v: string | null): v is DrinkFilter => FILTER_OPTIONS.some((o) => o.value === v);
const isSort = (v: string | null): v is DrinkSort => SORT_OPTIONS.some((o) => o.value === v);

export default function Drinks() {
  useDocumentTitle('Explorar drinks');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter: DrinkFilter = isFilter(params.get('filtro')) ? (params.get('filtro') as DrinkFilter) : 'todos';
  const sort: DrinkSort = isSort(params.get('ordem')) ? (params.get('ordem') as DrinkSort) : 'recentes';
  const q = params.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);
  const [all, setAll] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === defaultValue) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listDrinks()
      .then(setAll)
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar os drinks.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load, user?.id]);

  // Sincroniza campo quando a URL muda externamente (ex.: busca da Home).
  useEffect(() => setSearchInput(q), [q]);

  // Debounce da pesquisa para a URL.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchInput.trim() !== q) updateParam('q', searchInput.trim(), '');
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput, q, updateParam]);

  const results = useMemo(() => applyDrinkQuery(all, { search: q, filter, sort }), [all, q, filter, sort]);
  const hasActiveFilters = q !== '' || filter !== 'todos';

  const clearAll = () => {
    setSearchInput('');
    setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Explorar receitas</h1>
        <p className="mt-2 text-stone-600">Pesquise por nome, descrição ou ingrediente e filtre pelo que combina com o seu momento.</p>
      </header>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="relative flex-1" role="search">
            <label htmlFor="drinks-search" className="mb-1.5 block text-sm font-medium text-stone-800">
              Pesquisar
            </label>
            <IconSearch size={18} className="pointer-events-none absolute bottom-3.5 left-4 text-stone-400" />
            <input
              id="drinks-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ex.: caipirinha, gin, morango"
              className="h-12 w-full rounded-full border border-stone-300 bg-white pl-11 pr-4 text-[15px] placeholder:text-stone-400 hover:border-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </div>
          <SelectField
            label="Ordenar por"
            value={sort}
            onChange={(e) => updateParam('ordem', e.target.value, 'recentes')}
            wrapperClassName="md:w-56"
            className="h-12 rounded-full px-4"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div role="group" aria-label="Filtrar drinks" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTER_OPTIONS.map((o) => {
            const active = filter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => updateParam('filtro', o.value, 'todos')}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
                  active ? 'border-brand-800 bg-brand-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400',
                )}
              >
                {active && <span className="sr-only">Filtro ativo: </span>}
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 mt-8 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600" role="status" aria-live="polite">
          {loading ? 'Carregando drinks...' : error ? '' : `${results.length} ${results.length === 1 ? 'receita encontrada' : 'receitas encontradas'}`}
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} icon={<IconX size={14} />}>
            Limpar filtros
          </Button>
        )}
      </div>

      <DrinkGrid
        drinks={results}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={<IconSearch />}
            title="Nenhum drink encontrado."
            description={hasActiveFilters ? 'Tente outros termos ou remova alguns filtros.' : 'Ainda não há receitas publicadas.'}
            action={
              hasActiveFilters && (
                <Button variant="outline" onClick={clearAll}>
                  Limpar filtros
                </Button>
              )
            }
          />
        }
      />
    </div>
  );
}
