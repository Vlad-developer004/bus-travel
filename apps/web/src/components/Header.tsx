'use client';

import { Menu, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_LABELS, routing, type Locale } from '@/i18n/routing';
import { useAuth } from './AuthProvider';
import { Select } from './Select';
import { UserMenu } from './UserMenu';

function Logo({ onHero }: { onHero: boolean }) {
  return (
    <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="10" fill="#3352ff" />
        <path d="M8 10.5A2.5 2.5 0 0 1 10.5 8h11A2.5 2.5 0 0 1 24 10.5V20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9.5Z" fill="#fff" />
        <rect x="10" y="11" width="12" height="5" rx="1" fill="#3352ff" />
        <circle cx="12" cy="24" r="2" fill="#fff" />
        <circle cx="20" cy="24" r="2" fill="#fff" />
      </svg>
      <span>
        Bus<span className={onHero ? 'text-accent' : 'text-brand'}>Travel</span>
      </span>
    </span>
  );
}

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const home = pathname === '/';
  const onHero = home && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: t('home') },
    { href: '/map', label: t('map') },
    ...(user ? [{ href: '/account', label: t('trips') }] : []),
    { href: '/help', label: t('help') },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: t('admin') }] : []),
    ...(user && (user.role === 'DRIVER' || user.role === 'ADMIN') ? [{ href: '/driver', label: t('driver') }] : []),
  ];

  const linkClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      onHero
        ? active
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
        : active
          ? 'bg-brand/10 text-brand'
          : 'text-ink/75 hover:bg-line/60 hover:text-ink'
    }`;

  return (
    <>
      {!home && <div className="h-20" aria-hidden="true" />}
      <header className={`fixed inset-x-0 top-0 z-40 ${onHero ? 'on-hero' : ''}`}>
        <div className="container-x">
          <div
            className={`flex h-14 items-center justify-between gap-2 rounded-full border px-2.5 transition-all duration-300 sm:gap-4 sm:px-4 ${home ? 'mx-1.5 sm:mx-5' : ''} ${
              onHero
                ? 'mt-5 border-white/25 bg-white/10 text-white shadow-[0_12px_40px_-14px_rgba(0,0,0,0.6)] backdrop-blur-xl'
                : 'mt-3 border-line bg-surface/75 text-ink shadow-[0_14px_44px_-16px_rgba(13,18,32,0.4)] backdrop-blur-2xl'
            }`}
          >
            <Link href="/" prefetch={false} aria-label="BusTravel" className={onHero ? 'text-white' : 'text-ink'}>
              <Logo onHero={onHero} />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label={t('main')}>
              {links.filter((l) => !["/account", "/admin", "/driver"].includes(l.href)).map((l) => (
                <Link key={l.href} href={l.href} prefetch={l.href === '/' ? false : undefined} className={linkClass(pathname === l.href)}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Select
                id="lang"
                variant="pill"
                alignRight
                ariaLabel="Language"
                value={locale}
                onChange={(l) => router.replace(pathname, { locale: l as Locale })}
                options={routing.locales.map((l) => ({ value: l, label: LOCALE_LABELS[l], hint: l.toUpperCase() }))}
              />

              <div className="hidden items-center gap-2 md:flex">
                {user ? (
                  <UserMenu onHero={onHero} />
                ) : (
                  <>
                    <Link href="/login" className={onHero ? 'btn !min-h-10 !px-4 text-white hover:bg-white/15' : 'btn !min-h-10 !px-4 hover:bg-line/60'}>
                      {t('login')}
                    </Link>
                    <Link href="/register" className={onHero ? 'btn !min-h-10 !px-5 bg-white text-[#0d1220] hover:bg-white/90' : 'btn-primary !min-h-10 !px-5'}>
                      {t('register')}
                    </Link>
                  </>
                )}
              </div>

              <button
                className={`grid size-10 place-items-center rounded-full md:hidden ${onHero ? 'border border-white/40 text-white' : 'border border-line bg-surface text-ink'}`}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={t('menu')}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" className="container-x mt-2 md:hidden" aria-label={t('mobile')}>
            <div className="flex flex-col rounded-3xl border border-line bg-surface p-2 text-ink shadow-xl">
              {links.map((l) => (
                <Link key={l.href} href={l.href} prefetch={l.href === '/' ? false : undefined} onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-sm font-semibold">
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button className="px-2 py-3 text-left text-sm font-semibold text-bad" onClick={() => logout().then(() => { setOpen(false); router.push('/'); })}>
                  {t('logout')}
                </button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="px-2 py-3 text-sm font-semibold">
                    {t('login')}
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="px-2 py-3 text-sm font-semibold text-brand">
                    {t('register')}
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
