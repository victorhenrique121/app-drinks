import type { DrinkFilter, DrinkSort, DrinkType, IngredientCategory, Unit } from '@/types/database';

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  alcool: 'Álcool',
  destilado: 'Destilado',
  licor: 'Licor',
  laticinio: 'Laticínio',
  acido_forte: 'Ácido forte',
  estimulante: 'Estimulante',
  fruta: 'Fruta',
  suco: 'Suco',
  refrigerante: 'Refrigerante',
  xarope: 'Xarope',
  agua: 'Água',
  outro: 'Outro',
};

/** Categorias que tornam uma receita alcoólica. */
export const ALCOHOLIC_CATEGORIES: IngredientCategory[] = ['alcool', 'destilado', 'licor'];

export function isAlcoholicCategory(categoria: IngredientCategory): boolean {
  return ALCOHOLIC_CATEGORIES.includes(categoria);
}

export const UNIT_LABELS: Record<Unit, string> = {
  ml: 'ml',
  cl: 'cl',
  oz: 'oz',
  dash: 'dash',
  gota: 'gota(s)',
  colher_cha: 'colher de chá',
  colher_sopa: 'colher de sopa',
  unidade: 'unidade(s)',
  fatia: 'fatia(s)',
  folha: 'folha(s)',
  g: 'g',
  a_gosto: 'a gosto',
};

/** Conversão aproximada para ml — mantenha em sincronia com public.to_ml() no SQL. */
export const UNIT_TO_ML: Record<Unit, number> = {
  ml: 1,
  cl: 10,
  oz: 30,
  dash: 1,
  gota: 0.05,
  colher_cha: 5,
  colher_sopa: 15,
  unidade: 30,
  fatia: 5,
  folha: 0,
  g: 1,
  a_gosto: 0,
};

export const NON_MEASURABLE_UNITS: Unit[] = ['a_gosto', 'folha'];

export const DRINK_TYPE_LABELS: Record<DrinkType, string> = {
  drink: 'Drink',
  mocktail: 'Mocktail',
};

export const FILTER_OPTIONS: { value: DrinkFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'drink', label: 'Drinks' },
  { value: 'mocktail', label: 'Mocktails' },
  { value: 'com_alcool', label: 'Com álcool' },
  { value: 'sem_alcool', label: 'Sem álcool' },
];

export const SORT_OPTIONS: { value: DrinkSort; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'nome', label: 'Nome (A–Z)' },
  { value: 'menos_ingredientes', label: 'Menos ingredientes' },
];

export function formatQuantity(quantidade: number | null, unidade: Unit): string {
  if (unidade === 'a_gosto' || quantidade === null) return 'a gosto';
  const q = Number.isInteger(quantidade)
    ? String(quantidade)
    : quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `${q} ${UNIT_LABELS[unidade]}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
