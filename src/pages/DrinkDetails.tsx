import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlcoholBadge, DrinkImage, DrinkTypeBadge, FavoriteButton, PrivateBadge } from '@/components/drinks/DrinkBits';
import { CategoryTag } from '@/components/ingredients/IngredientSelector';
import { Avatar } from '@/components/layout/Header';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, EmptyState, PageLoader } from '@/components/ui/Feedback';
import { IconAlert, IconArrowLeft, IconEdit, IconGlass, IconTrash } from '@/components/ui/Icons';
import { ConfirmModal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { deleteDrink, getDrinkById } from '@/services/drinks';
import type { Drink } from '@/types/database';
import { checkCompatibility } from '@/utils/compatibility';
import { formatDate, formatQuantity } from '@/utils/constants';
import { toUserMessage } from '@/utils/errors';

export default function DrinkDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const [drink, setDrink] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(drink?.nome ?? 'Receita');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getDrinkById(id)
      .then(setDrink)
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar o drink.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load, user?.id]);

  const compat = useMemo(
    () =>
      drink
        ? checkCompatibility(
            drink.ingredientes.map((i) => ({ nome: i.nome, categoria: i.categoria, quantidade: i.quantidade, unidade: i.unidade })),
          )
        : null,
    [drink],
  );

  // Esconder botões é apenas UX: o RLS impede edição/exclusão por outros usuários.
  const isAuthor = Boolean(user && drink && user.id === drink.autor_id);

  const handleDelete = async () => {
    if (!drink) return;
    setDeleting(true);
    try {
      await deleteDrink(drink);
      notify(`“${drink.nome}” foi excluído.`, 'success');
      setDeleteOpen(false);
      navigate('/perfil', { replace: true });
    } catch (e) {
      notify(toUserMessage(e, 'Não foi possível excluir o drink.'), 'error');
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Carregando receita..." />;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="error" title={error} action={<Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>} />
      </div>
    );
  }

  if (!drink) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<IconGlass />}
          title="Drink não encontrado."
          description="Esta receita não existe, foi excluída ou é privada."
          action={<ButtonLink to="/drinks">Explorar receitas</ButtonLink>}
        />
      </div>
    );
  }

  const steps = drink.modo_preparo
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/drinks"
        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <IconArrowLeft size={16} /> Voltar para receitas
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="aspect-[4/3] overflow-hidden rounded-[2rem] bg-stone-100 lg:aspect-[4/5]">
            <DrinkImage drink={drink} />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <DrinkTypeBadge tipo={drink.tipo} />
            <AlcoholBadge contemAlcool={drink.contemAlcool} />
            {!drink.publico && <PrivateBadge />}
          </div>

          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">{drink.nome}</h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-stone-600">
            <Avatar name={drink.autor?.nome ?? '?'} url={drink.autor?.avatar_url ?? null} size={32} />
            <p>
              por <span className="font-medium text-ink">{drink.autor?.nome ?? 'Autor desconhecido'}</span>
              <span aria-hidden="true"> · </span>
              <time dateTime={drink.created_at}>{formatDate(drink.created_at)}</time>
            </p>
          </div>

          {drink.descricao && <p className="mt-5 text-lg leading-relaxed text-stone-700">{drink.descricao}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <FavoriteButton drinkId={drink.id} drinkName={drink.nome} variant="full" />
            {isAuthor && (
              <>
                <ButtonLink to={`/drinks/${drink.id}/editar`} variant="outline" icon={<IconEdit size={17} />}>
                  Editar
                </ButtonLink>
                <Button variant="outline" onClick={() => setDeleteOpen(true)} icon={<IconTrash size={17} />} className="text-rose-700 hover:bg-rose-50">
                  Excluir
                </Button>
              </>
            )}
          </div>

          {compat?.stats.hasAlcohol && compat.stats.hasStimulant && (
            <Alert tone="warning" title="Álcool + estimulante" className="mt-6">
              Esta receita combina álcool com um ingrediente estimulante, o que pode alterar a percepção dos efeitos do álcool. Consuma com
              moderação.
            </Alert>
          )}

          <section aria-labelledby="ingredientes" className="mt-10">
            <h2 id="ingredientes" className="font-display text-2xl font-semibold text-ink">
              Ingredientes
            </h2>
            <ul className="mt-4 divide-y divide-stone-200 rounded-3xl border border-stone-200 bg-white">
              {drink.ingredientes.map((i) => (
                <li key={i.vinculo_id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{i.nome}</span>
                    <CategoryTag categoria={i.categoria} />
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums text-stone-700">{formatQuantity(i.quantidade, i.unidade)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="preparo" className="mt-10">
            <h2 id="preparo" className="font-display text-2xl font-semibold text-ink">
              Modo de preparo
            </h2>
            <ol className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-1 leading-relaxed text-stone-700">
                    <span className="sr-only">Passo {index + 1}: </span>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {drink.contemAlcool && (
            <p className="mt-10 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
              Contém álcool. Proibido para menores de 18 anos. Se beber, não dirija.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        icon={<IconAlert />}
        title="Excluir este drink?"
        description={
          <>
            A receita <strong>“{drink.nome}”</strong>, seus ingredientes e a imagem serão excluídos permanentemente.{' '}
            <strong>Esta ação não pode ser desfeita.</strong>
          </>
        }
        confirmLabel="Excluir drink"
        loadingLabel="Excluindo..."
      />
    </article>
  );
}
