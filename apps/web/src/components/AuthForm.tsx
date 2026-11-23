'use client';

import { Armchair, Bookmark, Eye, EyeOff, QrCode } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError, post } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { Spinner } from './Spinner';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState(() => (params.get('invite') ? (params.get('email') ?? '') : ''));
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const inviteToken = params.get('invite') ?? '';
  const invited = mode === 'register' && /^[0-9a-f]{20,100}$/.test(inviteToken);

  const rawNext = params.get('next') ?? '/account';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/account';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'login' ? { email, password } : { email, password, name: name || undefined, locale, inviteToken: invited ? inviteToken : undefined };
      const res = await post<{ user: User }>(`/auth/${mode}`, body);
      setUser(res.user);
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t('exists') : mode === 'login' ? t('invalid') : (err as Error).message);
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <div className="container-x grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-[1fr_28rem]">
      <aside className="hidden lg:block">
        <h2 className="max-w-md text-4xl leading-tight">{t('perksTitle')}</h2>
        <ul className="mt-8 space-y-5">
          {[
            [Armchair, t('perk1'), '#3352ff'],
            [QrCode, t('perk2'), '#e8a700'],
            [Bookmark, t('perk3'), '#1f9d68'],
          ].map(([Icon, text, color]) => {
            const I = Icon as typeof Armchair;
            return (
              <li key={text as string} className="flex items-center gap-4 text-lg text-white/85">
                <span className="icon-chip" style={{ background: color as string }}>
                  <I size={22} aria-hidden="true" />
                </span>
                {text as string}
              </li>
            );
          })}
        </ul>
      </aside>
      <form onSubmit={submit} className="glass-tile still w-full max-w-md space-y-4 justify-self-center p-6 sm:p-8 lg:justify-self-end">
        <h1 className="text-2xl font-extrabold tracking-tight">{isLogin ? t('loginTitle') : t('registerTitle')}</h1>
        {invited && <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{t('inviteBanner')}</p>}

        {!isLogin && (
          <div>
            <label htmlFor="name" className="label">
              {t('name')}
            </label>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">
            {t('email')}
          </label>
          <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            {t('password')}
          </label>
          <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            required
            minLength={isLogin ? undefined : 8}
            className="field !pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('hide') : t('show')} aria-pressed={show} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/60 hover:text-white">
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
          </div>
          {!isLogin && <p className="mt-1 text-xs text-muted">{t('passwordHint')}</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm font-medium text-bad">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy && <Spinner />}
          {isLogin ? t('login') : t('register')}
        </button>
        <p className="text-center text-sm text-muted">
          {isLogin ? t('noAccount') : t('haveAccount')}{' '}
          <Link href={isLogin ? '/register' : '/login'} className="font-semibold text-brand">
            {isLogin ? t('register') : t('login')}
          </Link>
        </p>
      </form>
    </div>
  );
}
