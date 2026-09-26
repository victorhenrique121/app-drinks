import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { listIngredients, searchIngredients } from '@/services/ingredients';
import { UNITS, type Ingredient, type IngredientDraft, type IngredientCategory, type Unit } from '@/types/database';
import { cn } from '@/utils/cn';
import { CATEGORY_LABELS, UNIT_LABELS } from '@/utils/constants';
import { toUserMessage } from '@/utils/errors';
import { Button } from '../ui/Button';
import { Alert, Spinner } from '../ui/Feedback';
import { inputClasses } from '../ui/Field';
import { IconChevronDown, IconChevronUp, IconSearch, IconTrash } from '../ui/Icons';

interface IngredientSelectorProps {
  value: IngredientDraft[];
  onChange: (next: IngredientDraft[]) => void;
  rowErrors: Record<string, string>;
  error?: string;
  inputId?: string;
}

const CATEGORY_TONE: Partial<Record<IngredientCategory, string>> = {
  alcool: 'bg-amber-100 text-amber-900',
  destilado: 'bg-amber-100 text-amber-900',
  licor: 'bg-amber-100 text-amber-900',
  laticinio: 'bg-sky-100 text-sky-900',
  acido_forte: 'bg-yellow-100 text-yellow-900',
  estimulante: 'bg-rose-100 text-rose-900',
};

export function CategoryTag({ categoria }: { categoria: IngredientCategory }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', CATEGORY_TONE[categoria] ?? 'bg-stone-100 text-stone-700')}>
      {CATEGORY_LABELS[categoria]}
    </span>
  );
}

function defaultUnit(ing: Ingredient): Unit {
  if (ing.categoria === 'fruta') return 'unidade';
  if (ing.nome === 'Gelo') return 'a_gosto';
  return 'ml';
}

let keySeq = 0;
const newKey = () => `ing-${Date.now().toString(36)}-${++keySeq}`;

export function IngredientSelector({ value, onChange, rowErrors, error, inputId }: IngredientSelectorProps) {
  const autoId = useId();
  const comboId = inputId ?? `${autoId}-search`;
  const listboxId = `${autoId}-listbox`;
  const [all, setAll] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const qtyRefs = useRef(new Map<string, HTMLInputElement>());
  const focusKeyRef = useRef<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listIngredients()
      .then(setAll)
      .catch((e) => setLoadError(toUserMessage(e, 'Não foi possível carregar os ingredientes.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (focusKeyRef.current) {
      qtyRefs.current.get(focusKeyRef.current)?.focus();
      focusKeyRef.current = null;
    }
  }, [value]);

  const selectedIds = useMemo(() => new Set(value.map((d) => d.ingredient.id)), [value]);
  const results = useMemo(() => searchIngredients(all, query, 40), [all, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const add = (ing: Ingredient) => {
    if (selectedIds.has(ing.id)) {
      setNotice(`${ing.nome} já está na receita. Ajuste a quantidade na lista abaixo.`);
      return;
    }
    const key = newKey();
    focusKeyRef.current = key;
    onChange([...value, { key, ingredient: ing, quantidade: '', unidade: defaultUnit(ing) }]);
    setAnnouncement(`${ing.nome} adicionado. Informe a quantidade.`);
    setNotice(null);
    setQuery('');
    setOpen(false);
  };

  const update = (key: string, patch: Partial<IngredientDraft>) => {
    onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  const remove = (key: string) => {
    const item = value.find((d) => d.key === key);
    onChange(value.filter((d) => d.key !== key));
    if (item) setAnnouncement(`${item.ingredient.nome} removido.`);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setAnnouncement(`${next[target].ingredient.nome} movido para a posição ${target + 1}.`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[activeIndex]) {
        e.preventDefault();
        add(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  const activeOptionId = open && results[activeIndex] ? `${listboxId}-opt-${results[activeIndex].id}` : undefined;

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {loadError ? (
        <Alert
          tone="error"
          title={loadError}
          action={
            <Button size="sm" variant="outline" onClick={load}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <div ref={wrapperRef} className="relative">
          <label htmlFor={comboId} className="mb-1.5 block text-sm font-medium text-stone-800">
            Buscar ingrediente
          </label>
          <div className="relative">
            <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id={comboId}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-describedby={error ? `${comboId}-error` : `${comboId}-hint`}
              aria-invalid={error ? true : undefined}
              placeholder={loading ? 'Carregando ingredientes...' : 'Ex.: limão, vodka, hortelã'}
              disabled={loading}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setNotice(null);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className={cn(inputClasses(Boolean(error)), 'pl-10')}
            />
            {loading && <Spinner size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />}
          </div>
          <p id={`${comboId}-hint`} className="mt-1.5 text-xs text-stone-500">
            Escolha ingredientes do catálogo — a categoria de cada um define os alertas de segurança.
          </p>

          {open && !loading && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Ingredientes disponíveis"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg"
            >
              {results.length === 0 ? (
                <li role="option" aria-disabled="true" aria-selected="false" className="px-3 py-4 text-center text-sm text-stone-500">
                  Nenhum ingrediente encontrado.
                </li>
              ) : (
                results.map((ing, index) => {
                  const already = selectedIds.has(ing.id);
                  const active = index === activeIndex;
                  return (
                    <li
                      key={ing.id}
                      id={`${listboxId}-opt-${ing.id}`}
                      role="option"
                      aria-selected={active}
                      aria-disabled={already || undefined}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(ing)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm',
                        active && 'bg-brand-50',
                        already && 'cursor-default text-stone-400',
                      )}
                    >
                      <span className="truncate">{ing.nome}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {already && <span className="text-xs">já adicionado</span>}
                        <CategoryTag categoria={ing.categoria} />
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      )}

      {notice && (
        <p className="mt-2 text-sm text-amber-800" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p id={`${comboId}-error`} className="mt-2 flex items-start gap-1 text-sm text-rose-700">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}

      {value.length > 0 && (
        <ol className="mt-4 space-y-2.5" aria-label="Ingredientes da receita">
          {value.map((draft, index) => {
            const rowError = rowErrors[draft.key];
            const qtyId = `${autoId}-qty-${draft.key}`;
            const unitId = `${autoId}-unit-${draft.key}`;
            const errId = `${autoId}-err-${draft.key}`;
            const isToTaste = draft.unidade === 'a_gosto';
            return (
              <li
                key={draft.key}
                className={cn(
                  'rounded-2xl border bg-white p-3 sm:p-3.5',
                  rowError ? 'border-rose-300 bg-rose-50/40' : 'border-stone-200',
                )}
              >
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{draft.ingredient.nome}</p>
                    <CategoryTag categoria={draft.ingredient.categoria} />
                  </div>

                  <div className="flex w-full items-end gap-2 sm:w-auto">
                    <div className="w-24">
                      <label htmlFor={qtyId} className="sr-only">
                        Quantidade de {draft.ingredient.nome}
                      </label>
                      <input
                        ref={(el) => {
                          if (el) qtyRefs.current.set(draft.key, el);
                          else qtyRefs.current.delete(draft.key);
                        }}
                        id={qtyId}
                        type="text"
                        inputMode="decimal"
                        placeholder={isToTaste ? '—' : 'Qtd.'}
                        disabled={isToTaste}
                        value={isToTaste ? '' : draft.quantidade}
                        onChange={(e) => update(draft.key, { quantidade: e.target.value.replace(/[^0-9.,]/g, '') })}
                        aria-invalid={rowError ? true : undefined}
                        aria-describedby={rowError ? errId : undefined}
                        className={cn(inputClasses(Boolean(rowError)), 'py-2 text-center')}
                      />
                    </div>
                    <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
                      <label htmlFor={unitId} className="sr-only">
                        Unidade de {draft.ingredient.nome}
                      </label>
                      <select
                        id={unitId}
                        value={draft.unidade}
                        onChange={(e) => {
                          const unidade = e.target.value as Unit;
                          update(draft.key, { unidade, quantidade: unidade === 'a_gosto' ? '' : draft.quantidade });
                        }}
                        className={cn(inputClasses(false), 'cursor-pointer py-2')}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {UNIT_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Mover ${draft.ingredient.nome} para cima`}
                        className="rounded-full p-2 text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-30"
                      >
                        <IconChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === value.length - 1}
                        aria-label={`Mover ${draft.ingredient.nome} para baixo`}
                        className="rounded-full p-2 text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-30"
                      >
                        <IconChevronDown size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(draft.key)}
                        aria-label={`Remover ${draft.ingredient.nome}`}
                        className="rounded-full p-2 text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                {rowError && (
                  <p id={errId} className="mt-2 flex items-start gap-1 pl-10 text-sm text-rose-700">
                    <span aria-hidden="true">⚠</span> {rowError}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
