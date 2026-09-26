import { createContext, useContext } from 'react';

export interface FavoritesContextValue {
  favoriteIds: Set<string>;
  loading: boolean;
  isFavorite: (drinkId: string) => boolean;
  isPending: (drinkId: string) => boolean;
  /** Alterna o favorito. Retorna o novo estado ou null se não foi possível. */
  toggleFavorite: (drinkId: string, drinkName?: string) => Promise<boolean | null>;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de <FavoritesProvider>.');
  return ctx;
}
