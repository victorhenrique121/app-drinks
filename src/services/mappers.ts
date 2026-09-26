import type { Drink, DrinkAuthor, DrinkRow, IngredientRow, Unit } from '@/types/database';
import { isAlcoholicCategory } from '@/utils/constants';
import { logDevError } from '@/utils/errors';
import { getPublicProfiles } from './profiles';

/** Colunas + joins usados para montar uma receita completa. */
export const DRINK_SELECT = `
  id, autor_id, nome, descricao, modo_preparo, url_imagem, tipo, publico, created_at, updated_at,
  drink_ingredients (
    id, quantidade, unidade, ordem,
    ingredient:ingredients ( id, nome, categoria, descricao )
  )
`;

export interface RawDrink extends Omit<DrinkRow, 'aviso_estimulante_confirmado'> {
  drink_ingredients:
    | {
        id: number;
        quantidade: number | string | null;
        unidade: Unit;
        ordem: number;
        ingredient: IngredientRow | IngredientRow[] | null;
      }[]
    | null;
}

export function mapDrink(raw: RawDrink, authors: Map<string, DrinkAuthor>): Drink {
  const ingredientes = (raw.drink_ingredients ?? [])
    .map((di) => {
      const ing = Array.isArray(di.ingredient) ? di.ingredient[0] : di.ingredient;
      if (!ing) return null;
      return {
        id: ing.id,
        vinculo_id: di.id,
        nome: ing.nome,
        categoria: ing.categoria,
        quantidade: di.quantidade === null ? null : Number(di.quantidade),
        unidade: di.unidade,
        ordem: di.ordem,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.ordem - b.ordem);

  return {
    id: raw.id,
    autor_id: raw.autor_id,
    nome: raw.nome,
    descricao: raw.descricao,
    modo_preparo: raw.modo_preparo,
    url_imagem: raw.url_imagem,
    tipo: raw.tipo,
    publico: raw.publico,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    ingredientes,
    autor: authors.get(raw.autor_id) ?? null,
    contemAlcool: ingredientes.some((i) => isAlcoholicCategory(i.categoria)),
  };
}

/** Busca os autores (view pública) e monta os drinks. Falha nos autores não impede a listagem. */
export async function mapDrinksWithAuthors(rows: RawDrink[]): Promise<Drink[]> {
  let authors = new Map<string, DrinkAuthor>();
  try {
    authors = await getPublicProfiles(rows.map((r) => r.autor_id));
  } catch (error) {
    logDevError('mappers.authors', error);
  }
  return rows.map((r) => mapDrink(r, authors));
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
