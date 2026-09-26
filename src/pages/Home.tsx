import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DrinkGrid } from '@/components/drinks/DrinkGrid';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { IconArrowRight, IconDroplet, IconGlass, IconHeart, IconLeaf, IconPlus, IconSearch } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getPopularDrinks, getRecentDrinks } from '@/services/drinks';
import type { Drink } from '@/types/database';
import { toUserMessage } from '@/utils/errors';

const CATEGORIES = [
  { filtro: 'drink', title: 'Drinks', desc: 'Clássicos e autorais', icon: <IconGlass />, tone: 'bg-amber-50 text-amber-800' },
  { filtro: 'mocktail', title: 'Mocktails', desc: 'Todo o sabor, zero álcool', icon: <IconLeaf />, tone: 'bg-lime-50 text-lime-800' },
  { filtro: 'com_alcool', title: 'Com álcool', desc: 'Destilados, licores e vinhos', icon: <IconDroplet />, tone: 'bg-stone-100 text-stone-800' },
  { filtro: 'sem_alcool', title: 'Sem álcool', desc: 'Para qualquer hora', icon: <IconDroplet />, tone: 'bg-sky-50 text-sky-800' },
] as const;

const QUICK_SEARCHES = ['Cachaça', 'Gin', 'Limão', 'Hortelã', 'Morango', 'Café'];

const HERO_1 = 'https://images.pexels.com/photos/2260281/pexels-photo-2260281.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=700';
const HERO_2 = 'https://images.pexels.com/photos/17612813/pexels-photo-17612813.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=700';

function SectionHeader({ id, title, subtitle, link }: { id: string; title: string; subtitle?: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
      </div>
      {link && (
        <Link
          to={link.to}
          className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {link.label} <IconArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  useDocumentTitle();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<Drink[]>([]);
  const [popular, setPopular] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getRecentDrinks(6), getPopularDrinks(4)])
      .then(([r, p]) => {
        setRecent(r);
        setPopular(p);
      })
      .catch((e) => setError(toUserMessage(e, 'Não foi possível carregar os drinks.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load, user?.id]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/drinks?q=${encodeURIComponent(q)}` : '/drinks');
  };

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-500" aria-hidden="true" />
            Drinks & mocktails da comunidade
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {user ? (
              <>
                Olá, {displayName.split(' ')[0]}.<br />
                <span className="italic text-brand-800">O que vamos servir?</span>
              </>
            ) : (
              <>
                A receita certa <br className="hidden sm:block" />
                para cada <span className="italic text-brand-800">copo</span>.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-600">
            Descubra, salve e crie receitas com medidas claras — e alertas automáticos quando uma combinação de ingredientes pede atenção.
          </p>

          <form onSubmit={submitSearch} role="search" className="mt-8 max-w-lg">
            <label htmlFor="home-search" className="sr-only">
              Pesquisar drinks por nome ou ingrediente
            </label>
            <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white p-1.5 pl-5 focus-within:ring-2 focus-within:ring-brand-600">
              <IconSearch size={20} className="shrink-0 text-stone-400" />
              <input
                id="home-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busque por nome ou ingrediente"
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] placeholder:text-stone-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-brand-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Buscas rápidas">
            {QUICK_SEARCHES.map((q) => (
              <Link
                key={q}
                to={`/drinks?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-700 hover:border-stone-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {q}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/criar-drink" size="lg" icon={<IconPlus size={18} />}>
              Criar drink
            </ButtonLink>
            {user ? (
              <ButtonLink to="/favoritos" size="lg" variant="outline" icon={<IconHeart size={18} />}>
                Meus favoritos
              </ButtonLink>
            ) : (
              <ButtonLink to="/drinks" size="lg" variant="outline">
                Explorar receitas
              </ButtonLink>
            )}
          </div>
        </div>

        <div className="relative hidden h-[520px] lg:block" aria-hidden="true">
          <img src={HERO_1} alt="" className="absolute right-0 top-0 h-[440px] w-[330px] rounded-[2rem] object-cover" />
          <img
            src={HERO_2}
            alt=""
            className="absolute bottom-0 left-4 h-[260px] w-[240px] rounded-[2rem] border-[6px] border-cream object-cover"
          />
          <div className="absolute bottom-16 right-8 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-stone-500">Verificação de segurança</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ingredientes compatíveis
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="categorias" className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="categorias" className="sr-only">
          Categorias
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li key={c.filtro}>
              <Link
                to={`/drinks?filtro=${c.filtro}`}
                className="group flex h-full items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:p-5"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.tone}`} aria-hidden="true">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{c.title}</span>
                  <span className="hidden text-sm text-stone-600 sm:block">{c.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(loading || popular.length > 0) && !error && (
        <section aria-labelledby="populares" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <SectionHeader id="populares" title="Mais salvos" subtitle="Os favoritos da comunidade." link={{ to: '/drinks', label: 'Ver todos' }} />
          <DrinkGrid drinks={popular} loading={loading} skeletonCount={4} className="lg:grid-cols-4" loadingLabel="Carregando drinks populares..." />
        </section>
      )}

      <section aria-labelledby="recentes" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <SectionHeader id="recentes" title="Recém-criados" subtitle="As receitas mais novas da plataforma." link={{ to: '/drinks', label: 'Explorar' }} />
        <DrinkGrid
          drinks={recent}
          loading={loading}
          error={error}
          onRetry={load}
          loadingLabel="Carregando drinks recentes..."
          empty={
            <EmptyState
              icon={<IconGlass />}
              title="Ainda não há receitas por aqui."
              description="Que tal ser a primeira pessoa a compartilhar um drink?"
              action={<ButtonLink to="/criar-drink" icon={<IconPlus size={16} />}>Criar drink</ButtonLink>}
            />
          }
        />
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 rounded-[2rem] bg-brand-900 p-8 text-white sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Receitas que se preocupam com você</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-white/80">
              Ao salvar um drink, o Copo Certo analisa as categorias dos ingredientes: bloqueia combinações de ácidos fortes com laticínios em
              proporção inadequada e pede confirmação quando álcool e estimulantes aparecem juntos.
            </p>
          </div>
          <div className="flex md:justify-end">
            <ButtonLink to="/criar-drink" variant="secondary" size="lg" icon={<IconPlus size={18} />}>
              Criar minha receita
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
