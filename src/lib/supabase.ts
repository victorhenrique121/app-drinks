import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '@/utils/errors';

/**
 * Cliente Supabase do frontend.
 *
 * Usa SOMENTE a chave pública (anon). Nunca coloque a chave service_role
 * ou qualquer credencial administrativa no frontend: toda autorização é
 * garantida por RLS e Storage Policies no Supabase.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Sem variáveis de ambiente a aplicação roda em "modo demonstração"
 * (dados somente no navegador) para que a interface possa ser avaliada.
 */
export const isDemoMode = !isSupabaseConfigured;

export const DRINK_IMAGES_BUCKET = 'drink-images';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new AppError('O serviço não está configurado. Tente novamente mais tarde.');
  }
  return supabase;
}
