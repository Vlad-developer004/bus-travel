'use client';

import { ArrowRight, QrCode } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cityName, dateTime, money } from '@/lib/format';
import type { Booking } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { StatusBadge } from './StatusBadge';

const NO_PHOTO = new Set(['munich']);

function relative(iso: string, locale: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
}

function Card({ b, locale, t, hero }: { b: Booking; locale: string; t: ReturnType<typeof useTranslations>; hero?: boolean }) {
  const slug = b.trip.to.slug;
  const upcoming = new Date(b.trip.departureAt).getTime() > Date.now() && b.status === 'PAID';
  return (
    <Link
      href={`/account/bookings/${b.id}`}
      className="glass-tile group relative flex min-h-[7.5rem] items-stretch overflow-hidden transition hover:border-white/40"
      style={upcoming ? ({ '--tint': 'rgba(51,82,255,0.16)' } as React.CSSProperties) : undefined}
    >
      <span className={`relative hidden shrink-0 overflow-hidden sm:block ${hero ? 'w-56' : 'w-36'}`} aria-hidden="true">
        {!NO_PHOTO.has(slug) && <img src={`/cities/${slug}-480.webp`} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0d1220]/80" />
      </span>
      <span className="flex flex-1 flex-wrap items-center justify-between gap-4 p-5">
        <span>
          <span className={`flex items-center gap-2 font-bold ${hero ? 'text-2xl' : 'text-lg'}`}>
            {cityName(b.trip.from.names, locale)}
            <ArrowRight size={hero ? 22 : 18} className="text-accent" aria-hidden="true" />
            {cityName(b.trip.to.names, locale)}
          </span>
          <span className="mt-1 block text-sm text-muted">{dateTime(b.trip.departureAt, locale)}</span>
          <span className="num mt-1 flex items-center gap-1.5 text-xs text-white/55">
            <QrCode size={13} aria-hidden="true" />
            {b.code}
            {b.seats.length > 0 && <span className="font-sans"> · {t('seats')}: {b.seats.map((s) => s.seatNumber).join(', ')}</span>}
          </span>
        </span>
        <span className="flex flex-col items-end gap-2">
          {upcoming && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-[#0d1220]">{relative(b.trip.departureAt, locale)}</span>}
          <StatusBadge status={b.status} />
          <span className="num text-lg">{money(b.totalCents, b.currency, locale)}</span>
        </span>
      </span>
    </Link>
  );
}

export function AccountBookings() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace('/login?next=/account');
    api<Booking[]>('/bookings').then(setItems).catch(() => setItems([]));
  }, [user, loading, router]);

  const now = Date.now();
  const isFuture = (b: Booking) => new Date(b.trip.departureAt).getTime() > now && (b.status === 'PAID' || b.status === 'PENDING');
  const upcoming = (items ?? []).filter(isFuture).sort((a, b) => +new Date(a.trip.departureAt) - +new Date(b.trip.departureAt));
  const past = (items ?? []).filter((b) => !isFuture(b));
  const [first, ...rest] = upcoming;

  return (
    <div className="container-x min-h-[60vh] py-8">
      <h1 className="mb-6 text-4xl">{t('title')}</h1>

      {items === null && <div className="glass-tile h-32 animate-pulse" aria-label={t('loading')} />}

      {items?.length === 0 && (
        <div className="glass-tile p-10 text-center">
          <p className="mb-4 text-lg font-bold">{t('empty')}</p>
          <Link href="/" className="btn-primary">
            {t('emptyCta')}
          </Link>
        </div>
      )}

      {first && (
        <section aria-labelledby="next-h" className="mb-8">
          <h2 id="next-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            {t('next')}
          </h2>
          <Card b={first} locale={locale} t={t} hero />
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="up-h" className="mb-8">
          <h2 id="up-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
            {t('upcoming')}
          </h2>
          <ul className="space-y-3">
            {rest.map((b) => (
              <li key={b.id}>
                <Card b={b} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
            {t('past')}
          </h2>
          <ul className="space-y-3">
            {past.map((b) => (
              <li key={b.id} className="opacity-80">
                <Card b={b} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
