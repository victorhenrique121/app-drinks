import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getCurrentSession, onAuthChange, signOut as authSignOut } from '@/services/auth';
import { getMyProfile } from '@/services/profiles';
import type { AuthSession } from '@/types/database';
import { logDevError, toUserMessage } from '@/utils/errors';

/**
 * Mantém a sessão sincronizada com o Supabase Auth via onAuthStateChange:
 * login, logout, sessão restaurada, token renovado e sessão expirada.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const { notify } = useToast();
  const manualSignOut = useRef(false);
  const hadSession = useRef(false);

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((s) => {
        if (!active) return;
        hadSession.current = Boolean(s);
        setSession(s);
      })
      .catch((error) => {
        logDevError('auth.restore', error);
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = onAuthChange((event, nextSession) => {
      if (!active) return;
      // Importante: não chamar outros métodos do Supabase dentro deste callback.
      if (event === 'SIGNED_OUT' && hadSession.current && !manualSignOut.current) {
        notify('Sua sessão expirou. Entre novamente para continuar.', 'info');
      }
      if (event === 'SIGNED_OUT') manualSignOut.current = false;
      hadSession.current = Boolean(nextSession);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [notify]);

  const userId = session?.user.id ?? null;

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfileName(null);
      return;
    }
    try {
      const profile = await getMyProfile();
      setProfileName(profile?.nome ?? null);
    } catch (error) {
      logDevError('auth.profile', error);
    }
  }, [userId]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    manualSignOut.current = true;
    try {
      await authSignOut();
      notify('Você saiu da sua conta.', 'success');
    } catch (error) {
      manualSignOut.current = false;
      notify(toUserMessage(error, 'Não foi possível sair. Tente novamente.'), 'error');
    }
  }, [notify]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      displayName: profileName ?? session?.user.nome ?? '',
      signOut,
      refreshProfile,
    }),
    [session, loading, profileName, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
