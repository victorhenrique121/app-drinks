import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DrinkForm } from '@/components/drinks/DrinkForm';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, EmptyState, PageLoader } from '@/components/ui/Feedback';
import { IconLock } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { getDrinkById, updateDrink } from '@/services/drinks';
import type { Drink } from '@/types/database';
import { toUserMessage } from '@/utils/errors';

export default function EditDrink() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const [drink, setDrink] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(drink ? `Editar ${drink.nome}` : 'Editar drink');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getDrinkById(id)
      .then(setDrink)
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar o drink.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  if (loading) return <PageLoader label="Carregando receita..." />;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="error" title={error} action={<Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>} />
      </div>
    );
  }

  // Verificação de UX. A proteção real é o RLS + RPC update_drink (autor_id = auth.uid()).
  if (!drink || drink.autor_id !== user?.id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<IconLock />}
          title={drink ? 'Você não pode editar este drink.' : 'Drink não encontrado.'}
          description={drink ? 'Somente o autor da receita pode editá-la.' : 'Esta receita não existe ou foi excluída.'}
          action={<ButtonLink to={drink ? `/drinks/${drink.id}` : '/drinks'}>Voltar</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Editar drink</h1>
        <p className="mt-2 text-stone-600">As verificações de compatibilidade são executadas novamente ao salvar.</p>
      </header>
      <DrinkForm
        initial={drink}
        submitLabel="Salvar alterações"
        cancelTo={`/drinks/${drink.id}`}
        onSubmit={async (input, image, onStage) => {
          await updateDrink(drink.id, input, image, onStage);
          notify('Alterações salvas.', 'success');
          navigate(`/drinks/${drink.id}`, { replace: true });
        }}
      />
    </div>
  );
}
