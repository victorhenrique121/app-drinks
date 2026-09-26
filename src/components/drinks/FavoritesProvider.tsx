import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FavoritesContext, type FavoritesContextValue } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';
import { addFavorite, getFavoriteIds, removeFavorite } from '@/services/favorites';
import { toUserMessage } from '@/utils/errors';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const userId = user?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    getFavoriteIds()
      .then((ids) => active && setFavoriteIds(new Set(ids)))
      .catch((error) => active && notify(toUserMessage(error, 'Não foi possível carregar seus favoritos.'), 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, notify]);

  const toggleFavorite = useCallback<FavoritesContextValue['toggleFavorite']>(
    async (drinkId, drinkName) => {
      if (!userId) {
        notify('Entre na sua conta para salvar drinks nos favoritos.', 'info');
        navigate('/login', { state: { from: location } });
        return null;
      }
      if (pendingRef.current.has(drinkId)) return null;

      const wasFavorite = favoriteIds.has(drinkId);
      const next = !wasFavorite;

      setPending((p) => new Set(p).add(drinkId));
      // Atualização otimista, revertida em caso de erro.
      setFavoriteIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(drinkId);
        else copy.delete(drinkId);
        return copy;
      });

      try {
        if (next) await addFavorite(drinkId);
        else await removeFavorite(drinkId);
        const label = drinkName ? `“${drinkName}”` : 'Drink';
        notify(next ? `${label} salvo nos favoritos.` : `${label} removido dos favoritos.`, 'success');
        return next;
      } catch (error) {
        setFavoriteIds((prev) => {
          const copy = new Set(prev);
          if (wasFavorite) copy.add(drinkId);
          else copy.delete(drinkId);
          return copy;
        });
        notify(toUserMessage(error, 'Não foi possível atualizar seus favoritos.'), 'error');
        return null;
      } finally {
        setPending((p) => {
          const copy = new Set(p);
          copy.delete(drinkId);
          return copy;
        });
      }
    },
    [userId, favoriteIds, notify, navigate, location],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      loading,
      isFavorite: (id) => favoriteIds.has(id),
      isPending: (id) => pending.has(id),
      toggleFavorite,
    }),
    [favoriteIds, loading, pending, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
