import { getSupabase, isDemoMode } from '@/lib/supabase';
import type { Drink, DrinkFilter, DrinkInput, DrinkSort } from '@/types/database';
import { AppError, logDevError, toAppError } from '@/utils/errors';
import { blobToDataUrl, prepareDrinkImage } from '@/utils/image';
import { getAuthenticatedUserId } from './auth';
import { demoDb } from './demo/backend';
import { normalizeText } from './ingredients';
import { DRINK_SELECT, mapDrinksWithAuthors, UUID_REGEX, type RawDrink } from './mappers';
import { removeDrinkImage, uploadDrinkImage } from './storage';

export type SaveStage = 'imagem-preparo' | 'salvando' | 'enviando-imagem' | 'finalizando';

export const SAVE_STAGE_LABELS: Record<SaveStage, string> = {
  'imagem-preparo': 'Preparando imagem...',
  salvando: 'Salvando drink...',
  'enviando-imagem': 'Enviando imagem...',
  finalizando: 'Finalizando...',
};

export interface ListDrinksOptions {
  search?: string;
  filter?: DrinkFilter;
  sort?: DrinkSort;
  limit?: number;
}

const MAX_FETCH = 200;

/** Pesquisa (nome, descrição e ingredientes), filtro e ordenação. */
export function applyDrinkQuery(drinks: Drink[], options: ListDrinksOptions): Drink[] {
  const q = normalizeText(options.search ?? '');
  let result = drinks.filter((d) => {
    switch (options.filter ?? 'todos') {
      case 'drink':
        return d.tipo === 'drink';
      case 'mocktail':
        return d.tipo === 'mocktail';
      case 'com_alcool':
        return d.contemAlcool;
      case 'sem_alcool':
        return !d.contemAlcool;
      default:
        return true;
    }
  });

  if (q) {
    result = result.filter((d) => {
      const haystack = normalizeText(
        [d.nome, d.descricao ?? '', ...d.ingredientes.map((i) => i.nome)].join(' '),
      );
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }

  const sorted = [...result];
  switch (options.sort ?? 'recentes') {
    case 'antigos':
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case 'nome':
      sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      break;
    case 'menos_ingredientes':
      sorted.sort((a, b) => a.ingredientes.length - b.ingredientes.length || a.nome.localeCompare(b.nome, 'pt-BR'));
      break;
    default:
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

export async function listDrinks(options: ListDrinksOptions = {}): Promise<Drink[]> {
  try {
    if (isDemoMode) return applyDrinkQuery(await demoDb.listDrinks(), options);

    let query = getSupabase().from('drinks').select(DRINK_SELECT);
    if (options.filter === 'drink' || options.filter === 'mocktail') query = query.eq('tipo', options.filter);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(MAX_FETCH);
    if (error) throw error;
    const drinks = await mapDrinksWithAuthors((data ?? []) as unknown as RawDrink[]);
    return applyDrinkQuery(drinks, options);
  } catch (error) {
    throw toAppError('drinks.list', error, 'Não foi possível carregar os drinks. Tente novamente.');
  }
}

export function getRecentDrinks(limit = 8): Promise<Drink[]> {
  return listDrinks({ sort: 'recentes', limit });
}

/** Drinks mais favoritados (contagem agregada pela view drink_popularity). */
export async function getPopularDrinks(limit = 4): Promise<Drink[]> {
  try {
    if (isDemoMode) {
      const [drinks, counts] = await Promise.all([demoDb.listDrinks(), demoDb.popularity()]);
      return drinks
        .filter((d) => (counts[d.id] ?? 0) > 0)
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
        .slice(0, limit);
    }
    const sb = getSupabase();
    const { data: ranking, error } = await sb
      .from('drink_popularity')
      .select('drink_id, total_favoritos')
      .order('total_favoritos', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const ids = (ranking ?? []).map((r) => r.drink_id as string);
    if (ids.length === 0) return [];
    const { data, error: drinksError } = await sb.from('drinks').select(DRINK_SELECT).in('id', ids);
    if (drinksError) throw drinksError;
    const drinks = await mapDrinksWithAuthors((data ?? []) as unknown as RawDrink[]);
    return ids.map((id) => drinks.find((d) => d.id === id)).filter((d): d is Drink => Boolean(d));
  } catch (error) {
    throw toAppError('drinks.popular', error, 'Não foi possível carregar os drinks populares.');
  }
}

export async function getDrinkById(id: string): Promise<Drink | null> {
  try {
    if (isDemoMode) return await demoDb.getDrink(id);
    if (!UUID_REGEX.test(id)) return null;
    const { data, error } = await getSupabase().from('drinks').select(DRINK_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [drink] = await mapDrinksWithAuthors([data as unknown as RawDrink]);
    return drink;
  } catch (error) {
    throw toAppError('drinks.get', error, 'Não foi possível carregar o drink. Tente novamente.');
  }
}

export async function listMyDrinks(): Promise<Drink[]> {
  try {
    const uid = await getAuthenticatedUserId();
    if (isDemoMode) return await demoDb.listDrinks({ autorId: uid });
    const { data, error } = await getSupabase()
      .from('drinks')
      .select(DRINK_SELECT)
      .eq('autor_id', uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return await mapDrinksWithAuthors((data ?? []) as unknown as RawDrink[]);
  } catch (error) {
    throw toAppError('drinks.mine', error, 'Não foi possível carregar seus drinks.');
  }
}

function rpcParams(input: DrinkInput) {
  return {
    p_nome: input.nome.trim(),
    p_descricao: input.descricao.trim() || null,
    p_modo_preparo: input.modo_preparo.trim(),
    p_tipo: input.tipo,
    p_publico: input.publico,
    p_confirmou_aviso: input.confirmouAviso,
    p_ingredientes: input.ingredientes.map((i) => ({
      ingredient_id: i.ingredient_id,
      quantidade: i.unidade === 'a_gosto' ? null : i.quantidade,
      unidade: i.unidade,
    })),
  };
}

/**
 * Criação consistente:
 *  1. prepara/valida a imagem ANTES de tocar no banco;
 *  2. RPC create_drink grava drink + ingredientes em UMA transação
 *     (validações de compatibilidade rodam no Postgres);
 *  3. envia a imagem para {user_id}/{drink_id}.jpg;
 *  4. atualiza drinks.url_imagem.
 * Se 3 ou 4 falharem, o arquivo e o drink são removidos (rollback compensatório).
 */
export async function createDrink(
  input: DrinkInput,
  imageFile: File | null,
  onStage?: (stage: SaveStage) => void,
): Promise<string> {
  const fallback = 'Não foi possível criar o drink. Tente novamente.';

  if (isDemoMode) {
    try {
      let dataUrl: string | null = null;
      if (imageFile) {
        onStage?.('imagem-preparo');
        dataUrl = await blobToDataUrl(await prepareDrinkImage(imageFile, 900, 0.78));
      }
      onStage?.('salvando');
      const id = await demoDb.createDrink(input);
      if (dataUrl) {
        onStage?.('enviando-imagem');
        try {
          await demoDb.setImage(id, dataUrl);
        } catch (error) {
          await demoDb.deleteDrink(id).catch((e) => logDevError('demo.rollback', e));
          throw error;
        }
      }
      return id;
    } catch (error) {
      throw toAppError('drinks.create(demo)', error, fallback);
    }
  }

  const sb = getSupabase();
  let blob: Blob | null = null;
  try {
    if (imageFile) {
      onStage?.('imagem-preparo');
      blob = await prepareDrinkImage(imageFile);
    }
  } catch (error) {
    throw toAppError('drinks.create.prepareImage', error, 'Não foi possível processar a imagem. Tente outro arquivo.');
  }

  const uid = await getAuthenticatedUserId();

  onStage?.('salvando');
  const { data: drinkId, error: rpcError } = await sb.rpc('create_drink', rpcParams(input));
  if (rpcError || typeof drinkId !== 'string') {
    throw toAppError('drinks.create.rpc', rpcError ?? new Error('ID não retornado'), fallback);
  }

  if (blob) {
    let uploaded = false;
    try {
      onStage?.('enviando-imagem');
      const url = await uploadDrinkImage(uid, drinkId, blob);
      uploaded = true;
      onStage?.('finalizando');
      const { error: updateError } = await sb.from('drinks').update({ url_imagem: url }).eq('id', drinkId);
      if (updateError) throw updateError;
    } catch (error) {
      logDevError('drinks.create.image', error);
      if (uploaded) await removeDrinkImage(uid, drinkId);
      const { error: rollbackError } = await sb.from('drinks').delete().eq('id', drinkId);
      if (rollbackError) logDevError('drinks.create.rollback', rollbackError);
      throw new AppError('Não foi possível enviar a imagem, então o drink não foi salvo. Tente novamente.', {
        cause: error,
      });
    }
  }

  return drinkId;
}

export interface ImageChange {
  file: File | null;
  remove: boolean;
}

/**
 * Edição: RPC update_drink altera dados + ingredientes atomicamente
 * (RLS garante que só o autor consegue). A imagem é tratada em seguida.
 */
export async function updateDrink(
  drinkId: string,
  input: DrinkInput,
  image: ImageChange,
  onStage?: (stage: SaveStage) => void,
): Promise<void> {
  const fallback = 'Não foi possível salvar as alterações. Tente novamente.';
  const partial = 'As alterações foram salvas, mas não foi possível atualizar a imagem. Tente enviá-la novamente.';

  if (isDemoMode) {
    let dataUrl: string | null = null;
    try {
      if (image.file) {
        onStage?.('imagem-preparo');
        dataUrl = await blobToDataUrl(await prepareDrinkImage(image.file, 900, 0.78));
      }
      onStage?.('salvando');
      await demoDb.updateDrink(drinkId, input);
    } catch (error) {
      throw toAppError('drinks.update(demo)', error, fallback);
    }
    try {
      if (dataUrl) {
        onStage?.('enviando-imagem');
        await demoDb.setImage(drinkId, dataUrl);
      } else if (image.remove) {
        await demoDb.setImage(drinkId, null);
      }
    } catch (error) {
      throw toAppError('drinks.update.image(demo)', error, partial);
    }
    return;
  }

  const sb = getSupabase();
  let blob: Blob | null = null;
  try {
    if (image.file) {
      onStage?.('imagem-preparo');
      blob = await prepareDrinkImage(image.file);
    }
  } catch (error) {
    throw toAppError('drinks.update.prepareImage', error, 'Não foi possível processar a imagem. Tente outro arquivo.');
  }

  const uid = await getAuthenticatedUserId();

  onStage?.('salvando');
  const { error: rpcError } = await sb.rpc('update_drink', { p_id: drinkId, ...rpcParams(input) });
  if (rpcError) throw toAppError('drinks.update.rpc', rpcError, fallback);

  try {
    if (blob) {
      onStage?.('enviando-imagem');
      const url = await uploadDrinkImage(uid, drinkId, blob);
      onStage?.('finalizando');
      const { error } = await sb.from('drinks').update({ url_imagem: url }).eq('id', drinkId);
      if (error) throw error;
    } else if (image.remove) {
      const { error } = await sb.from('drinks').update({ url_imagem: null }).eq('id', drinkId);
      if (error) throw error;
      await removeDrinkImage(uid, drinkId);
    }
  } catch (error) {
    throw toAppError('drinks.update.image', error, partial);
  }
}

/**
 * Exclusão: o DELETE passa pelo RLS (somente o autor). Se nenhuma linha
 * for afetada, o usuário não tinha permissão. Depois remove a imagem.
 */
export async function deleteDrink(drink: Pick<Drink, 'id' | 'autor_id' | 'url_imagem'>): Promise<void> {
  try {
    if (isDemoMode) {
      await demoDb.deleteDrink(drink.id);
      return;
    }
    await getAuthenticatedUserId();
    const { data, error } = await getSupabase().from('drinks').delete().eq('id', drink.id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new AppError('Você não tem permissão para excluir este drink.');
    }
    // Imagem órfã não compromete dados; falhas são apenas registradas.
    await removeDrinkImage(drink.autor_id, drink.id);
  } catch (error) {
    throw toAppError('drinks.delete', error, 'Não foi possível excluir o drink. Tente novamente.');
  }
}
