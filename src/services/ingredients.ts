import { getSupabase, isDemoMode } from '@/lib/supabase';
import type { Ingredient } from '@/types/database';
import { toAppError } from '@/utils/errors';
import { demoDb } from './demo/backend';

let cachePromise: Promise<Ingredient[]> | null = null;

/**
 * Lista os ingredientes cadastrados. As categorias (usadas nas regras de
 * segurança) vêm do banco — o usuário só escolhe ingredientes existentes.
 */
export function listIngredients(): Promise<Ingredient[]> {
  if (!cachePromise) {
    cachePromise = fetchIngredients().catch((error) => {
      cachePromise = null; // permite tentar novamente
      throw error;
    });
  }
  return cachePromise;
}

async function fetchIngredients(): Promise<Ingredient[]> {
  try {
    if (isDemoMode) return await demoDb.listIngredients();
    const { data, error } = await getSupabase()
      .from('ingredients')
      .select('id, nome, categoria, descricao')
      .order('nome', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Ingredient[];
  } catch (error) {
    throw toAppError('ingredients.list', error, 'Não foi possível carregar os ingredientes.');
  }
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchIngredients(all: Ingredient[], term: string, limit = 50): Ingredient[] {
  const q = normalizeText(term);
  if (!q) return all.slice(0, limit);
  const starts: Ingredient[] = [];
  const contains: Ingredient[] = [];
  for (const ing of all) {
    const name = normalizeText(ing.nome);
    if (name.startsWith(q)) starts.push(ing);
    else if (name.includes(q)) contains.push(ing);
  }
  return [...starts, ...contains].slice(0, limit);
}
