import { DRINK_IMAGES_BUCKET, getSupabase } from '@/lib/supabase';
import { logDevError } from '@/utils/errors';

/** Convenção obrigatória (validada pelas Storage Policies): {user_id}/{drink_id}.jpg */
export function drinkImagePath(userId: string, drinkId: string): string {
  return `${userId}/${drinkId}.jpg`;
}

/**
 * Envia (ou substitui) a imagem do drink e devolve a URL pública
 * com parâmetro de versão para evitar cache desatualizado.
 */
export async function uploadDrinkImage(userId: string, drinkId: string, blob: Blob): Promise<string> {
  const sb = getSupabase();
  const path = drinkImagePath(userId, drinkId);
  const { error } = await sb.storage.from(DRINK_IMAGES_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = sb.storage.from(DRINK_IMAGES_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Remove a imagem. Falhas são registradas mas não interrompem o fluxo principal. */
export async function removeDrinkImage(userId: string, drinkId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .storage.from(DRINK_IMAGES_BUCKET)
      .remove([drinkImagePath(userId, drinkId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    logDevError('storage.remove', error);
    return false;
  }
}
