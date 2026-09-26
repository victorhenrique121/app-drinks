import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ButtonLink, buttonClasses } from '../ui/Button';
import { IconHeart, IconLogOut, IconMenu, IconPlus, IconUser, IconX } from '../ui/Icons';
import { Logo } from './Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
    isActive ? 'bg-brand-50 text-brand-900' : 'text-stone-700 hover:bg-stone-100 hover:text-ink',
  );

function Avatar({ name, url, size = 34 }: { name: string; url: string | null; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (url) {
    return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-full bg-brand-800 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

export function Header() {
  const { user, displayName, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const menuItemClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:bg-stone-100';

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/drinks" className={navLinkClass}>
            Explorar
          </NavLink>
          {user && (
            <NavLink to="/favoritos" className={navLinkClass}>
              Favoritos
            </NavLink>
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {loading ? (
            <span className="h-9 w-40 animate-pulse rounded-full bg-stone-200" aria-hidden="true" />
          ) : user ? (
            <>
              <ButtonLink to="/criar-drink" size="sm" icon={<IconPlus size={16} />}>
                Criar drink
              </ButtonLink>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Menu da conta de ${displayName}`}
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full p-0.5 pr-3 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <Avatar name={displayName} url={user.avatar_url} />
                  <span className="max-w-[9rem] truncate text-sm font-medium text-ink">{displayName}</span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    aria-label="Conta"
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg animate-pop-in"
                  >
                    <div className="px-3 py-2 text-xs text-stone-500">
                      <p className="truncate">{user.email}</p>
                    </div>
                    <Link role="menuitem" to="/perfil" className={menuItemClass}>
                      <IconUser size={18} /> Meu perfil
                    </Link>
                    <Link role="menuitem" to="/favoritos" className={menuItemClass}>
                      <IconHeart size={18} /> Favoritos
                    </Link>
                    <Link role="menuitem" to="/criar-drink" className={menuItemClass}>
                      <IconPlus size={18} /> Criar drink
                    </Link>
                    <hr className="my-1 border-stone-100" />
                    <button role="menuitem" type="button" onClick={handleSignOut} disabled={signingOut} className={menuItemClass}>
                      <IconLogOut size={18} /> {signingOut ? 'Saindo...' : 'Sair'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm" state={{ from: location }}>
                Entrar
              </ButtonLink>
              <ButtonLink to="/cadastro" size="sm">
                Criar conta
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto rounded-full p-2 text-ink hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <IconX /> : <IconMenu />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-menu" aria-label="Menu móvel" className="border-t border-stone-200 bg-cream px-4 pb-5 pt-3 md:hidden">
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3">
              <Avatar name={displayName} url={user.avatar_url} size={40} />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{displayName}</p>
                <p className="truncate text-xs text-stone-500">{user.email}</p>
              </div>
            </div>
          )}
          <ul className="flex flex-col gap-1">
            <li>
              <NavLink to="/drinks" className={navLinkClass}>
                <span className="block py-1">Explorar drinks</span>
              </NavLink>
            </li>
            {user && (
              <>
                <li>
                  <NavLink to="/favoritos" className={navLinkClass}>
                    <span className="block py-1">Favoritos</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/perfil" className={navLinkClass}>
                    <span className="block py-1">Meu perfil</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <>
                <ButtonLink to="/criar-drink" icon={<IconPlus size={16} />}>
                  Criar drink
                </ButtonLink>
                <button type="button" onClick={handleSignOut} disabled={signingOut} className={buttonClasses('outline')}>
                  <IconLogOut size={16} /> {signingOut ? 'Saindo...' : 'Sair'}
                </button>
              </>
            ) : (
              <>
                <ButtonLink to="/cadastro">Criar conta</ButtonLink>
                <ButtonLink to="/login" variant="outline" state={{ from: location }}>
                  Entrar
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export { Avatar };
