import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider } from '@/components/layout/AuthShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Field';
import { IconGoogle } from '@/components/ui/Icons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { signInWithGoogle, signUpWithEmail } from '@/services/auth';
import { toUserMessage } from '@/utils/errors';
import { LIMITS, validateRegister, type FieldErrors, type RegisterField } from '@/utils/validation';

const FIELD_IDS: Record<RegisterField, string> = {
  nome: 'reg-nome',
  email: 'reg-email',
  password: 'reg-password',
  confirmPassword: 'reg-confirm',
};

export default function Register() {
  useDocumentTitle('Criar conta');
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const [values, setValues] = useState<Record<RegisterField, string>>({ nome: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const set = (field: RegisterField) => (e: ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    if (attempted) setErrors(validateRegister(next));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setAttempted(true);
    const errs = validateRegister(values);
    setErrors(errs);
    const first = (Object.keys(FIELD_IDS) as RegisterField[]).find((f) => errs[f]);
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    setLoading('email');
    setSubmitError(null);
    try {
      const { needsEmailConfirmation } = await signUpWithEmail({
        nome: values.nome,
        email: values.email,
        password: values.password,
      });
      if (needsEmailConfirmation) {
        setConfirmationSentTo(values.email.trim());
      } else {
        notify('Conta criada! Bem-vindo ao Copo Certo.', 'success');
        navigate('/', { replace: true });
      }
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível criar sua conta. Tente novamente.'));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    setSubmitError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível entrar com o Google.'));
      setLoading(null);
    }
  };

  if (confirmationSentTo) {
    return (
      <AuthShell title="Confirme seu e-mail">
        <Alert tone="success" title="Conta criada!">
          Enviamos um link de confirmação para <strong>{confirmationSentTo}</strong>. Abra o e-mail para ativar sua conta e depois
          faça login.
        </Alert>
        <ButtonLink to="/login" className="mt-6 w-full" size="lg">
          Ir para o login
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar conta" subtitle="Salve seus drinks favoritos e compartilhe suas receitas.">
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
          id={FIELD_IDS.nome}
          label="Nome"
          autoComplete="name"
          required
          maxLength={LIMITS.pessoaNomeMax + 5}
          value={values.nome}
          onChange={set('nome')}
          error={errors.nome}
          disabled={loading !== null}
        />
        <TextField
          id={FIELD_IDS.email}
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          disabled={loading !== null}
        />
        <TextField
          id={FIELD_IDS.password}
          label="Senha"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={`Mínimo de ${LIMITS.senhaMin} caracteres, com letras e números.`}
          disabled={loading !== null}
        />
        <TextField
          id={FIELD_IDS.confirmPassword}
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          disabled={loading !== null}
        />

        {submitError && <Alert tone="error" title={submitError} />}

        <Button type="submit" size="lg" className="w-full" loading={loading === 'email'} loadingText="Criando conta..." disabled={loading !== null}>
          Criar conta
        </Button>
        <p className="text-center text-xs text-stone-500">Ao criar uma conta você declara ter 18 anos ou mais para receitas alcoólicas.</p>
      </form>

      <p className="mt-8 text-center text-sm text-stone-600">
        Já tem conta?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-brand-800 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
