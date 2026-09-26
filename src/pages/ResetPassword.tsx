import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, PageLoader } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { updatePassword } from '@/services/auth';
import { toUserMessage } from '@/utils/errors';
import { LIMITS, validateNewPassword, type FieldErrors } from '@/utils/validation';

/** Destino do link "Esqueci minha senha" (o Supabase cria uma sessão de recuperação). */
export default function ResetPassword() {
  useDocumentTitle('Redefinir senha');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'password' | 'confirmPassword'>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) return <PageLoader label="Validando link..." />;

  if (!user) {
    return (
      <AuthShell title="Link inválido">
        <Alert tone="error" title="O link de redefinição é inválido ou expirou.">
          Solicite um novo link em “Esqueci minha senha” na tela de login.
        </Alert>
        <ButtonLink to="/login" className="mt-6 w-full">
          Ir para o login
        </ButtonLink>
      </AuthShell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateNewPassword(password, confirm);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await updatePassword(password);
      notify('Senha alterada com sucesso.', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível alterar sua senha.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`Mínimo de ${LIMITS.senhaMin} caracteres, com letras e números.`}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirmPassword}
        />
        {submitError && <Alert tone="error" title={submitError} />}
        <Button type="submit" size="lg" className="w-full" loading={saving} loadingText="Salvando...">
          Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  );
}
