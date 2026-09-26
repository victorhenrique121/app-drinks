import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isDemoMode } from '@/lib/supabase';
import type { AuthSession, AuthUser } from '@/types/database';
import { AppError, toAppError } from '@/utils/errors';
import { demoAuth } from './demo/backend';

/**
 * Autenticação 100% via Supabase Auth.
 * Nada de autenticação própria, nada de senha armazenada pela aplicação.
 */

export type AuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED';

function mapUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (typeof meta[key] === 'string' && (meta[key] as string).trim()) || '';
  const nome = pick('nome') || pick('full_name') || pick('name') || user.email?.split('@')[0] || 'Usuário';
  return {
    id: user.id,
    email: user.email ?? null,
    nome,
    avatar_url: pick('avatar_url') || pick('picture') || null,
  };
}

function mapSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return { user: mapUser(session.user), expires_at: session.expires_at ?? null };
}

function redirectUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (isDemoMode) return demoAuth.getSession();
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw toAppError('auth.getSession', error, 'Não foi possível restaurar sua sessão.');
  return mapSession(data.session);
}

export function onAuthChange(callback: (event: AuthEvent, session: AuthSession | null) => void): () => void {
  if (isDemoMode) return demoAuth.onChange((event, session) => callback(event, session));
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
    callback(event as AuthEvent, mapSession(session));
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Retorna o id do usuário VALIDADO pelo servidor do Supabase Auth
 * (getUser consulta o servidor; não confia apenas no token local).
 */
export async function getAuthenticatedUserId(): Promise<string> {
  if (isDemoMode) {
    const session = await demoAuth.getSession();
    if (!session) throw new AppError('Sua sessão expirou. Entre novamente para continuar.', { code: 'AUTH' });
    return session.user.id;
  }
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new AppError('Sua sessão expirou. Entre novamente para continuar.', { code: 'AUTH', cause: error });
  }
  return data.user.id;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    if (isDemoMode) {
      await demoAuth.signIn(email);
      return;
    }
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  } catch (error) {
    throw toAppError('auth.signIn', error, 'Não foi possível entrar. Tente novamente.');
  }
}

export async function signUpWithEmail(params: {
  nome: string;
  email: string;
  password: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  try {
    if (isDemoMode) {
      await demoAuth.signUp(params.nome, params.email);
      return { needsEmailConfirmation: false };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        // O perfil em public.profiles é criado pelo trigger handle_new_user()
        // a partir deste metadado — o frontend não escreve em profiles.
        data: { nome: params.nome.trim() },
        emailRedirectTo: redirectUrl('/auth/callback'),
      },
    });
    if (error) throw error;
    // Com confirmação de e-mail ativa, e-mails já cadastrados retornam identities vazio.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new AppError('Já existe uma conta com este e-mail.');
    }
    return { needsEmailConfirmation: !data.session };
  } catch (error) {
    throw toAppError('auth.signUp', error, 'Não foi possível criar sua conta. Tente novamente.');
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (isDemoMode) {
    throw new AppError('O login com Google fica disponível após configurar o Supabase.');
  }
  try {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl('/auth/callback') },
    });
    if (error) throw error;
  } catch (error) {
    throw toAppError('auth.google', error, 'Não foi possível entrar com o Google. Tente novamente.');
  }
}

/**
 * Finaliza o fluxo OAuth / confirmação de e-mail.
 * A sessão é obtida do Supabase Auth — uma resposta positiva na URL não basta.
 */
export async function completeAuthCallback(): Promise<AuthSession> {
  if (isDemoMode) {
    const session = await demoAuth.getSession();
    if (!session) throw new AppError('Não foi possível concluir o login.');
    return session;
  }

  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const providerError = params.get('error_description') || hash.get('error_description') || params.get('error');
  if (providerError) {
    throw toAppError('auth.callback.provider', new Error(providerError), 'O login foi cancelado ou não pôde ser concluído.');
  }

  const sb = getSupabase();
  // getSession aguarda a inicialização do cliente, que já troca o ?code= (PKCE) pela sessão.
  let { data } = await sb.auth.getSession();

  const code = params.get('code');
  if (!data.session && code) {
    const exchange = await sb.auth.exchangeCodeForSession(code);
    if (exchange.error) {
      throw toAppError('auth.callback.exchange', exchange.error, 'O link de acesso é inválido ou expirou. Tente entrar novamente.');
    }
    data = { session: exchange.data.session };
  }

  // Confirmação final com o servidor.
  const { data: userData, error } = await sb.auth.getUser();
  const session = mapSession(data.session);
  if (error || !userData.user || !session) {
    throw toAppError('auth.callback.getUser', error, 'Não foi possível concluir o login. Tente novamente.');
  }
  return session;
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (isDemoMode) {
    throw new AppError('A recuperação de senha fica disponível após configurar o Supabase.');
  }
  try {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl('/redefinir-senha'),
    });
    if (error) throw error;
  } catch (error) {
    throw toAppError('auth.resetPassword', error, 'Não foi possível enviar o e-mail de recuperação. Tente novamente.');
  }
}

export async function updatePassword(password: string): Promise<void> {
  if (isDemoMode) {
    throw new AppError('A redefinição de senha fica disponível após configurar o Supabase.');
  }
  try {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw error;
  } catch (error) {
    throw toAppError('auth.updatePassword', error, 'Não foi possível alterar sua senha. Tente novamente.');
  }
}

export async function signOut(): Promise<void> {
  try {
    if (isDemoMode) {
      await demoAuth.signOut();
      return;
    }
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  } catch (error) {
    throw toAppError('auth.signOut', error, 'Não foi possível sair. Tente novamente.');
  }
}
