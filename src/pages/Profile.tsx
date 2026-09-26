import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DrinkGrid } from '@/components/drinks/DrinkGrid';
import { Avatar } from '@/components/layout/Header';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Field';
import { IconGlass, IconPlus } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { listMyDrinks } from '@/services/drinks';
import { updateMyProfile } from '@/services/profiles';
import type { Drink } from '@/types/database';
import { toUserMessage } from '@/utils/errors';
import { LIMITS } from '@/utils/validation';

export default function Profile() {
  useDocumentTitle('Meu perfil');
  const { user, displayName, refreshProfile } = useAuth();
  const { notify } = useToast();
  const [nome, setNome] = useState(displayName);
  const [nomeError, setNomeError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setNome(displayName), [displayName]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listMyDrinks()
      .then(setDrinks)
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar seus drinks.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const value = nome.trim();
    if (value.length < 2 || value.length > LIMITS.pessoaNomeMax) {
      setNomeError(`O nome deve ter entre 2 e ${LIMITS.pessoaNomeMax} caracteres.`);
      return;
    }
    setNomeError(undefined);
    setSaving(true);
    try {
      await updateMyProfile(value);
      await refreshProfile();
      notify('Perfil atualizado.', 'success');
    } catch (err) {
      notify(toUserMessage(err, 'Não foi possível atualizar seu perfil.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 rounded-[2rem] border border-stone-200 bg-white p-6 sm:p-8 md:flex-row md:items-center">
        <Avatar name={displayName} url={user?.avatar_url ?? null} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{displayName}</h1>
          <p className="mt-1 truncate text-stone-600">{user?.email}</p>
        </div>
        <form onSubmit={saveName} noValidate className="flex w-full flex-col gap-2 sm:flex-row sm:items-end md:w-auto">
          <TextField
            label="Nome de exibição"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            error={nomeError}
            maxLength={LIMITS.pessoaNomeMax + 5}
            wrapperClassName="sm:w-64"
            disabled={saving}
          />
          <Button type="submit" variant="outline" loading={saving} loadingText="Salvando..." disabled={nome.trim() === displayName}>
            Salvar
          </Button>
        </form>
      </header>

      <section aria-labelledby="meus-drinks" className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="meus-drinks" className="font-display text-2xl font-semibold text-ink">
              Meus drinks
            </h2>
            <p className="mt-1 text-stone-600">Receitas públicas e privadas criadas por você.</p>
          </div>
          <ButtonLink to="/criar-drink" icon={<IconPlus size={16} />}>
            Criar drink
          </ButtonLink>
        </div>
        <DrinkGrid
          drinks={drinks}
          loading={loading}
          error={error}
          onRetry={load}
          skeletonCount={3}
          loadingLabel="Carregando seus drinks..."
          empty={
            <EmptyState
              icon={<IconGlass />}
              title="Você ainda não criou nenhum drink."
              description="Compartilhe sua primeira receita com a comunidade."
              action={<ButtonLink to="/criar-drink" icon={<IconPlus size={16} />}>Criar drink</ButtonLink>}
            />
          }
        />
      </section>
    </div>
  );
}
