import { getSupabase, isDemoMode } from '@/lib/supabase';
import type { Drink } from '@/types/database';
import { toAppError } from '@/utils/errors';
import { getAuthenticatedUserId } from './auth';
import { demoDb } from './demo/backend';
import { DRINK_SELECT, mapDrinksWithAuthors, type RawDrink } from './mappers';

/**
 * Favoritos. O user_id NUNCA é enviado pelo cliente no INSERT:
 * o banco preenche com auth.uid() (DEFAULT) e o RLS exige user_id = auth.uid().
 */

/**
 * Drinks salvos pelo usuário autenticado, com a receita completa
 * (saved_drinks -> drinks -> drink_ingredients -> ingredients).
 */
export async function getSavedDrinks(): Promise<Drink[]> {
  try {
    if (isDemoMode) return await demoDb.savedDrinks();
    const uid = await getAuthenticatedUserId();
    const { data, error } = await getSupabase()
      .from('saved_drinks')
      .select(`created_at, drink:drinks ( ${DRINK_SELECT} )`)
      .eq('user_id', uid) // redundante com o RLS, deixa a intenção explícita
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = ((data ?? []) as unknown as { drink: RawDrink | RawDrink[] | null }[])
      .map((row) => (Array.isArray(row.drink) ? row.drink[0] : row.drink))
      .filter((d): d is RawDrink => Boolean(d));
    return await mapDrinksWithAuthors(rows);
  } catch (error) {
    throw toAppError('favorites.list', error, 'Não foi possível carregar seus favoritos. Tente novamente.');
  }
}

export async function getFavoriteIds(): Promise<string[]> {
  try {
    if (isDemoMode) return await demoDb.favoriteIds();
    const uid = await getAuthenticatedUserId();
    const { data, error } = await getSupabase().from('saved_drinks').select('drink_id').eq('user_id', uid);
    if (error) throw error;
    return (data ?? []).map((r) => r.drink_id as string);
  } catch (error) {
    throw toAppError('favorites.ids', error, 'Não foi possível carregar seus favoritos.');
  }
}

export async function addFavorite(drinkId: string): Promise<void> {
  try {
    if (isDemoMode) return await demoDb.addFavorite(drinkId);
    await getAuthenticatedUserId();
    const { error } = await getSupabase().from('saved_drinks').insert({ drink_id: drinkId });
    // Já favoritado (unique) = estado desejado; não é erro para o usuário.
    if (error && error.code !== '23505') throw error;
  } catch (error) {
    throw toAppError('favorites.add', error, 'Não foi possível salvar o drink. Tente novamente.');
  }
}

export async function removeFavorite(drinkId: string): Promise<void> {
  try {
    if (isDemoMode) return await demoDb.removeFavorite(drinkId);
    const uid = await getAuthenticatedUserId();
    const { error } = await getSupabase().from('saved_drinks').delete().eq('drink_id', drinkId).eq('user_id', uid);
    if (error) throw error;
  } catch (error) {
    throw toAppError('favorites.remove', error, 'Não foi possível remover dos favoritos. Tente novamente.');
  }
}

export async function isFavorite(drinkId: string): Promise<boolean> {
  try {
    if (isDemoMode) return (await demoDb.favoriteIds()).includes(drinkId);
    const uid = await getAuthenticatedUserId();
    const { data, error } = await getSupabase()
      .from('saved_drinks')
      .select('id')
      .eq('drink_id', drinkId)
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    throw toAppError('favorites.check', error, 'Não foi possível verificar o favorito.');
  }
}
