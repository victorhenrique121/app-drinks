import { Link, Outlet } from 'react-router-dom';
import { isDemoMode } from '@/lib/supabase';
import { IconInfo } from '../ui/Icons';
import { Header } from './Header';
import { LogoMark } from './Logo';

function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs sm:items-center sm:px-6 sm:text-sm">
        <IconInfo size={16} className="mt-0.5 shrink-0 sm:mt-0" />
        <span>
          <strong>Modo demonstração:</strong> o Supabase não está configurado, então os dados ficam apenas neste navegador e o
          login é simulado. Configure <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_ANON_KEY</code> para usar a plataforma real.
        </span>
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-semibold">Copo Certo</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-600">
            Receitas de drinks e mocktails criadas pela comunidade, com alertas de segurança sobre combinações de ingredientes.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="text-sm font-semibold text-ink">Explorar</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              <Link className="hover:text-ink hover:underline" to="/drinks">
                Todas as receitas
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink hover:underline" to="/drinks?filtro=mocktail">
                Mocktails
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink hover:underline" to="/criar-drink">
                Criar drink
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold text-ink">Beba com responsabilidade</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Venda e consumo de bebidas alcoólicas são proibidos para menores de 18 anos. Se beber, não dirija.
          </p>
        </div>
      </div>
      <p className="border-t border-stone-100 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Copo Certo
      </p>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-brand-800 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <Header />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
