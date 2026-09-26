import { createContext, useContext } from 'react';
import type { AuthSession, AuthUser } from '@/types/database';

export interface AuthContextValue {
  /** Usuário autenticado segundo o Supabase Auth (null se deslogado). */
  user: AuthUser | null;
  session: AuthSession | null;
  /** true enquanto a sessão inicial é restaurada. */
  loading: boolean;
  /** Nome exibido (perfil em public.profiles, com fallback nos metadados). */
  displayName: string;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
