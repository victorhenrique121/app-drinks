import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '../ui/Feedback';

/**
 * Protege rotas na interface. É apenas UX: a autorização real
 * acontece no Supabase (RLS) em cada operação.
 */
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verificando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** Redireciona usuários já autenticados (ex.: páginas de login/cadastro). */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;

  if (loading) return <PageLoader label="Verificando sua sessão..." />;
  if (user) return <Navigate to={from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/'} replace />;
  return <>{children}</>;
}
