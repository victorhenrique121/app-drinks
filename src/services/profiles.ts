import { getSupabase, isDemoMode } from '@/lib/supabase';
import type { DrinkAuthor, ProfileRow } from '@/types/database';
import { AppError, toAppError } from '@/utils/errors';
import { LIMITS } from '@/utils/validation';
import { getAuthenticatedUserId } from './auth';
import { demoAuth } from './demo/backend';

/** Perfil do usuário autenticado (RLS: somente o próprio). */
export async function getMyProfile(): Promise<ProfileRow | null> {
  try {
    if (isDemoMode) {
      const session = await demoAuth.getSession();
      if (!session) return null;
      return { id: session.user.id, nome: session.user.nome, avatar_url: null, created_at: new Date().toISOString() };
    }
    const uid = await getAuthenticatedUserId();
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, nome, avatar_url, created_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  } catch (error) {
    throw toAppError('profiles.getMine', error, 'Não foi possível carregar seu perfil.');
  }
}

export async function updateMyProfile(nome: string): Promise<void> {
  const value = nome.trim();
  if (value.length < 2 || value.length > LIMITS.pessoaNomeMax) {
    throw new AppError(`O nome deve ter entre 2 e ${LIMITS.pessoaNomeMax} caracteres.`);
  }
  try {
    if (isDemoMode) {
      await demoAuth.updateName(value);
      return;
    }
    const uid = await getAuthenticatedUserId();
    const { data, error } = await getSupabase()
      .from('profiles')
      .update({ nome: value })
      .eq('id', uid)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new AppError('Não foi possível atualizar seu perfil.');
  } catch (error) {
    throw toAppError('profiles.update', error, 'Não foi possível atualizar seu perfil. Tente novamente.');
  }
}

/** Dados públicos (nome/avatar) de autores via view public_profiles. */
export async function getPublicProfiles(ids: string[]): Promise<Map<string, DrinkAuthor>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, DrinkAuthor>();
  if (unique.length === 0 || isDemoMode) return map;
  const { data, error } = await getSupabase()
    .from('public_profiles')
    .select('id, nome, avatar_url')
    .in('id', unique);
  if (error) throw error;
  (data as DrinkAuthor[] | null)?.forEach((p) => map.set(p.id, p));
  return map;
}
