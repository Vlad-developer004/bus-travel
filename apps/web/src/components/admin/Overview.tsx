'use client';

import { Armchair, Bus, Clock, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money } from '@/lib/format';

interface Stats {
  paidBookings: number;
  revenueCents: number;
  upcomingTrips: number;
  pendingBookings: number;
  weekCents: number;
  prevWeekCents: number;
  occupancy: number;
  topRoutes: { from: string; to: string; cents: number; seats: number }[];
  last14Days: { day: string; bookings: number; cents: number }[];
}

export function Overview() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    api<Stats>('/admin/stats').then(setStats).catch(() => undefined);
  }, []);

  const byDay = new Map((stats?.last14Days ?? []).map((d) => [d.day.slice(0, 10), d.cents]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86_400_000);
    const iso = day.toISOString().slice(0, 10);
    return { iso, label: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(day), cents: byDay.get(iso) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.cents));
  const anySales = days.some((d) => d.cents);
  const delta = stats && stats.prevWeekCents > 0 ? (stats.weekCents - stats.prevWeekCents) / stats.prevWeekCents : null;
  const pct = delta === null ? null : `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`;
  const topMax = Math.max(1, ...(stats?.topRoutes ?? []).map((r) => r.cents));
  const eur0 = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const tile = (Icon: typeof Wallet, color: string, label: string, value: string, extra?: React.ReactNode) => (
    <div className="glass-tile still flex items-center gap-4 p-5">
      <span className="icon-chip shrink-0" style={{ background: color }}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/55">{label}</p>
        <p className="num break-words text-xl sm:text-[1.6rem]">{value}</p>
        {extra}
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {tile(Wallet, '#3352ff', t('revenue'), stats ? eur0.format(stats.revenueCents / 100) : '…',
          pct && (
            <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${delta! >= 0 ? 'text-ok' : 'text-bad'}`}>
              {delta! >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
              {t('vsPrev', { pct })}
            </p>
          ))}
        {tile(Armchair, '#1f9d68', t('paidBookings'), stats ? String(stats.paidBookings) : '…')}
        {tile(Bus, '#e8a700', t('upcomingTrips'), stats ? String(stats.upcomingTrips) : '…')}
        {tile(Clock, '#8b5cf6', t('pending'), stats ? String(stats.pendingBookings) : '…')}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <section className="glass-tile still p-5 sm:p-6" aria-labelledby="chart-h">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="chart-h" className="font-bold">
              {t('last14')}
            </h2>
            <p className="num text-sm text-white/70" aria-live="polite">
              {hover !== null ? `${days[hover].label}: ${money(days[hover].cents, 'EUR', locale)}` : stats ? `${t('week')}: ${money(stats.weekCents, 'EUR', locale)}` : ''}
            </p>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 flex-col justify-between" aria-hidden="true">
              {[1, 0.5, 0].map((f) => (
                <div key={f} className="flex items-center gap-2 text-[10px] text-white/40">
                  <span className="w-12 shrink-0 text-right">{f && anySales ? eur0.format(Math.round(max * f) / 100) : ''}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              ))}
            </div>
            <div className="ml-14 flex h-44 items-end gap-1.5" role="img" aria-label={t('last14')} onMouseLeave={() => setHover(null)}>
              {days.map((d, i) => (
                <div key={d.iso} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
                  <div
                    className={`w-full rounded-t-md transition ${hover === i ? 'bg-accent' : d.cents ? 'bg-gradient-to-t from-brand to-[#7b92ff]' : 'bg-white/10'}`}
                    style={{ height: `${d.cents ? Math.max(6, (d.cents / max) * 100) : 3}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="ml-14 mt-2 flex gap-1.5 text-[10px] text-white/50" aria-hidden="true">
              {days.map((d, i) => (
                <span key={d.iso} className="flex-1 overflow-visible whitespace-nowrap text-center">
                  {i % 3 === 1 ? d.label : ''}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="glass-tile still p-5 sm:p-6" aria-labelledby="occ-h">
            <h2 id="occ-h" className="font-bold">
              {t('occupancy')}
            </h2>
            <p className="num mt-2 text-5xl">{stats ? `${(stats.occupancy * 100).toFixed(stats.occupancy < 0.1 ? 1 : 0)}%` : '…'}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${Math.round((stats?.occupancy ?? 0) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{t('occupancyHint')}</p>
          </section>

          <section className="glass-tile still p-5 sm:p-6" aria-labelledby="top-h">
            <h2 id="top-h" className="mb-3 font-bold">
              {t('topRoutes')}
            </h2>
            {stats?.topRoutes.length === 0 && <p className="text-sm text-muted">{t('noSales')}</p>}
            <ul className="space-y-3">
              {stats?.topRoutes.map((r) => (
                <li key={`${r.from}${r.to}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold">
                      {r.from} → {r.to}
                    </span>
                    <span className="num text-white/80">{money(r.cents, 'EUR', locale)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(r.cents / topMax) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{t('tickets', { n: r.seats })}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
