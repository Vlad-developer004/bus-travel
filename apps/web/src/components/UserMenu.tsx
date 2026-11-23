'use client';

import { ChevronDown, LayoutDashboard, LogOut, QrCode, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from './AuthProvider';

const initials = (name: string | null, email: string) => {
  const src = (name?.trim() || email.split('@')[0]).split(/[\s._-]+/).filter(Boolean);
  return ((src[0]?.[0] ?? '?') + (src.length > 1 ? src[src.length - 1][0] : '')).toUpperCase();
};

export function UserMenu({ onHero }: { onHero: boolean }) {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  if (!user) return null;
  const label = user.name?.trim() || user.email.split('@')[0];
  const first = label.split(' ')[0];

  const items = [
    { href: '/account', label: t('trips'), icon: Ticket },
    ...(user.role === 'ADMIN' ? [{ href: '/admin', label: t('admin'), icon: LayoutDashboard }] : []),
    ...(user.role === 'DRIVER' || user.role === 'ADMIN' ? [{ href: '/driver', label: t('driver'), icon: QrCode }] : []),
  ];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 items-center gap-2 rounded-full border py-0 pl-1 pr-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          onHero ? 'border-white/35 bg-white/12 text-white hover:bg-white/20' : 'border-line bg-surface text-ink hover:border-ink/40'
        }`}
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#3352ff] to-[#7a3cff] text-xs font-bold text-white" aria-hidden="true">
          {initials(user.name, user.email)}
        </span>
        <span className="max-w-[7rem] truncate text-sm font-semibold">{first}</span>
        <ChevronDown size={14} className={`opacity-70 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="dropdown-panel absolute right-0 z-50 mt-2 w-64 p-2">
          <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3352ff] to-[#7a3cff] font-bold text-white" aria-hidden="true">
              {initials(user.name, user.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted">{user.email}</span>
            </span>
          </div>
          <div className="my-1 border-t border-line" />
          {items.map(({ href, label: text, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-xl px-2.5 text-[15px] transition hover:bg-brand/10">
              <Icon size={18} className="text-muted" aria-hidden="true" />
              {text}
            </Link>
          ))}
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => logout().then(() => { setOpen(false); router.push('/'); })}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[15px] text-bad transition hover:bg-bad/10"
          >
            <LogOut size={18} aria-hidden="true" />
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
