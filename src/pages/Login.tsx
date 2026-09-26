import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Field';
import { IconGoogle, IconLock } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { isDemoMode } from '@/lib/supabase';
import { sendPasswordReset, signInWithEmail, signInWithGoogle } from '@/services/auth';
import { toUserMessage } from '@/utils/errors';
import { validateEmail, validateLogin, type FieldErrors } from '@/utils/validation';

function ForgotPasswordModal({ open, onClose, initialEmail }: { open: boolean; onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setStatus('sending');
    setSubmitError(null);
    try {
      await sendPasswordReset(email);
      setStatus('sent');
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível enviar o e-mail. Tente novamente.'));
      setStatus('idle');
    }
  };

  const close = () => {
    setStatus('idle');
    setSubmitError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={status === 'sending'}
      icon={<IconLock />}
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."
    >
      {status === 'sent' ? (
        <div className="space-y-4">
          <Alert tone="success" title="Verifique seu e-mail">
            Se existir uma conta para {email.trim()}, você receberá um link para redefinir a senha.
          </Alert>
          <Button className="w-full" onClick={close}>
            Entendi
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            data-autofocus
          />
          {submitError && <Alert tone="error" title={submitError} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close} disabled={status === 'sending'}>
              Cancelar
            </Button>
            <Button type="submit" loading={status === 'sending'} loadingText="Enviando...">
              Enviar link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function Login() {
  useDocumentTitle('Entrar');
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const redirectTo = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errs = validateLogin({ email, password });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      document.getElementById(errs.email ? 'login-email' : 'login-password')?.focus();
      return;
    }
    setLoading('email');
    setSubmitError(null);
    try {
      await signInWithEmail(email, password);
      notify('Bem-vindo de volta!', 'success');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível entrar. Tente novamente.'));
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading('google');
    setSubmitError(null);
    try {
      await signInWithGoogle(); // redireciona para o Google
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível entrar com o Google.'));
      setLoading(null);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse suas receitas, favoritos e crie novos drinks.">
      {isDemoMode && (
        <Alert tone="info" title="Modo demonstração" className="mb-6">
          O login é simulado: use qualquer e-mail válido e uma senha qualquer. Nenhuma senha é armazenada.
        </Alert>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogle}
        loading={loading === 'google'}
        loadingText="Redirecionando..."
        disabled={loading !== null}
        icon={<IconGoogle />}
      >
        Continuar com Google
      </Button>

      <Divider label="ou com e-mail" />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading !== null}
        />
        <div>
          <TextField
            id="login-password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading !== null}
          />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="rounded text-sm font-medium text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {submitError && <Alert tone="error" title={submitError} />}

        <Button type="submit" size="lg" className="w-full" loading={loading === 'email'} loadingText="Entrando..." disabled={loading !== null}>
          Entrar
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-600">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" state={location.state} className="font-semibold text-brand-800 hover:underline">
          Criar conta
        </Link>
      </p>

      {forgotOpen && <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={email} />}
    </AuthShell>
  );
}
