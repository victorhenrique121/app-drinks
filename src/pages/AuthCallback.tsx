import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { completeAuthCallback } from '@/services/auth';
import { toUserMessage } from '@/utils/errors';

/**
 * Google → Supabase Auth → /auth/callback → sessão obtida do Supabase → Home.
 * O usuário só é considerado autenticado após o Supabase devolver a sessão
 * e confirmar o usuário (getUser) no servidor.
 */
export default function AuthCallback() {
  useDocumentTitle('Concluindo login');
  const navigate = useNavigate();
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita dupla execução em StrictMode
    ran.current = true;
    completeAuthCallback()
      .then((session) => {
        notify(`Olá, ${session.user.nome}!`, 'success');
        navigate('/', { replace: true });
      })
      .catch((e) => setError(toUserMessage(e, 'Não foi possível concluir o login. Tente novamente.')));
  }, [navigate, notify]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      {error ? (
        <div className="w-full space-y-6">
          <Alert tone="error" title="Falha no login">
            {error}
          </Alert>
          <ButtonLink to="/login" className="w-full">
            Voltar para o login
          </ButtonLink>
        </div>
      ) : (
        <div className="text-stone-600">
          <Spinner size={28} label="Concluindo login..." className="flex-col" />
        </div>
      )}
    </div>
  );
}
