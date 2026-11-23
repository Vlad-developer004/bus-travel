'use client';

import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cityName, dateLong, duration, money, time } from '@/lib/format';
import type { CityRef, TripSummary } from '@/lib/types';
import { FavoriteButton } from './FavoriteButton';
import { PriceStrip } from './PriceStrip';
import { SearchForm } from './SearchForm';

type Sort = 'time' | 'price' | 'fast';
type Part = 'any' | 'morning' | 'afternoon' | 'evening';
const partOf = (iso: string): Exclude<Part, 'any'> => {
  const h = new Date(iso).getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
};

const shiftDay = (date: string, days: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

export function SearchResults() {
  const t = useTranslations('search');
  const tx = useTranslations('extras');
  const locale = useLocale();
  const params = useSearchParams();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const date = params.get('date') ?? new Date().toISOString().slice(0, 10);
  const passengers = Number(params.get('passengers') ?? 1);
  const ret = params.get('return') ?? '';
  const outbound = params.get('outbound') ?? '';

  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [cities, setCities] = useState<CityRef[]>([]);
  const [sort, setSort] = useState<Sort>('time');
  const [part, setPart] = useState<Part>('any');
  const [group, setGroup] = useState(false);

  useEffect(() => {
    api<CityRef[]>('/cities').then(setCities).catch(() => undefined);
  }, []);

  useEffect(() => {
    setTrips(null);
    api<TripSummary[]>(`/trips/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}`)
      .then(setTrips)
      .catch(() => setTrips([]));
  }, [from, to, date, passengers]);

  const name = (slug: string) => {
    const c = cities.find((x) => x.slug === slug);
    return c ? cityName(c.names, locale) : slug;
  };
  const cheapestId = useMemo(() => (trips && trips.length > 1 && new Set(trips.map((x) => x.priceCents)).size > 1 ? [...trips].sort((a, b) => a.priceCents - b.priceCents)[0].id : null), [trips]);
  const fastestId = useMemo(() => (trips && trips.length > 1 && new Set(trips.map((x) => x.durationMin)).size > 1 ? [...trips].sort((a, b) => a.durationMin - b.durationMin)[0].id : null), [trips]);

  const visible = useMemo(() => {
    const list = (trips ?? []).filter((x) => (part === 'any' || partOf(x.departureAt) === part) && (!group || x.seatsLeft >= passengers));
    const by = { time: (a: TripSummary, b: TripSummary) => a.departureAt.localeCompare(b.departureAt), price: (a: TripSummary, b: TripSummary) => a.priceCents - b.priceCents || a.departureAt.localeCompare(b.departureAt), fast: (a: TripSummary, b: TripSummary) => a.durationMin - b.durationMin || a.departureAt.localeCompare(b.departureAt) }[sort];
    return list.sort(by);
  }, [trips, sort, part, group, passengers]);
  const lowest = trips?.length ? Math.min(...trips.map((x) => x.priceCents)) : 0;
  const filtered = part !== 'any' || group;
  const chip = (on: boolean) =>
    `inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${on ? 'border-transparent bg-white text-[#0d1220]' : 'border-white/20 bg-white/[0.06] text-white/80 hover:border-white/40'}`;

  const ctx = `${ret && !outbound ? `&return=${ret}` : ''}${outbound ? `&outbound=${outbound}` : ''}`;
  const link = (d: string) => `/search?from=${from}&to=${to}&date=${d}&passengers=${passengers}${ctx}`;

  return (
    <div className="container-x py-8">
      <SearchForm initial={{ from, to, date, passengers, ret: outbound ? '' : ret }} compact />

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl">{t('title', { from: name(from), to: name(to) })}</h1>
          <FavoriteButton from={from} to={to} />
        </div>
        <div className="flex items-center gap-2">
          <Link href={link(shiftDay(date, -1))} className="btn-ghost !min-h-9 !px-3" aria-label={t('prevDay')}>
            ←
          </Link>
          <span className="min-w-32 text-center text-sm font-semibold">{dateLong(`${date}T12:00:00Z`, locale)}</span>
          <Link href={link(shiftDay(date, 1))} className="btn-ghost !min-h-9 !px-3" aria-label={t('nextDay')}>
            →
          </Link>
        </div>
      </div>

      {(ret || outbound) && (
        <p className="mb-4 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm" role="status">
          <span className="font-semibold">{outbound ? tx('chooseReturn') : tx('chooseOutbound')}</span>
          {outbound && <span className="text-muted"> · {tx('outboundHeld')}</span>}
        </p>
      )}

      <PriceStrip from={from} to={to} date={date} href={link} />

      {!!trips?.length && (
        <div className="mb-5 mt-6 space-y-3">
          <p className="text-sm text-muted" aria-live="polite">
            {t('found', { count: visible.length })} · {t('fromPrice', { price: money(lowest, trips[0].currency, locale) })}
          </p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('sortBy')}>
            {([['time', t('sortTime')], ['price', t('sortPrice')], ['fast', t('sortFast')]] as [Sort, string][]).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={sort === v} onClick={() => setSort(v)} className={chip(sort === v)}>
                {label}
              </button>
            ))}
            <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />
            {([['morning', t('morning')], ['afternoon', t('afternoon')], ['evening', t('evening')]] as [Part, string][]).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={part === v} onClick={() => setPart(part === v ? 'any' : v)} className={chip(part === v)}>
                {label}
              </button>
            ))}
            {passengers > 1 && (
              <button type="button" aria-pressed={group} onClick={() => setGroup((g) => !g)} className={chip(group)}>
                {t('onlySeats')}
              </button>
            )}
            {filtered && (
              <button type="button" onClick={() => { setPart('any'); setGroup(false); }} className="px-2 text-sm text-white/60 underline underline-offset-2 hover:text-white">
                {t('reset')}
              </button>
            )}
          </div>
        </div>
      )}

      {!!trips?.length && visible.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold">{t('noMatch')}</p>
        </div>
      )}

      {trips === null && (
        <ul className="min-h-[70vh] space-y-3" aria-busy="true" aria-label={t('loading')}>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="card h-28 animate-pulse" />
          ))}
        </ul>
      )}

      {trips?.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold">{t('noResults')}</p>
          <p className="mt-1 text-muted">{t('noResultsHint')}</p>
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((trip) => (
          <li key={trip.id} className="card grid grid-cols-1 items-center gap-4 p-4 sm:grid-cols-[1fr_auto_auto] sm:p-5 [&>*]:min-w-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-center">
                <p className="num text-2xl sm:text-3xl">{time(trip.departureAt, locale)}</p>
                <p className="text-xs text-muted">{cityName(trip.from.names, locale)}</p>
              </div>
              <div className="flex min-w-16 flex-1 flex-col sm:min-w-24 items-center text-xs text-muted">
                <span>{duration(trip.durationMin, locale)}</span>
                <span className="my-1 h-px w-full bg-line" />
                <span>{trip.busModel}</span>
                {trip.rating && (
                  <span className="mt-1 inline-flex items-center gap-1 text-white/75" title={tx('ratingCount', { count: trip.rating.count })}>
                    <Star size={12} className="fill-accent text-accent" aria-hidden="true" />
                    <span className="font-semibold">{trip.rating.average.toFixed(1)}</span>
                    <span className="text-white/45">({trip.rating.count})</span>
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="num text-2xl sm:text-3xl">
                  {time(trip.arrivalAt, locale)}
                  {new Date(trip.arrivalAt).toDateString() !== new Date(trip.departureAt).toDateString() && (
                    <sup className="ml-0.5 text-xs font-bold text-accent" title={t('nextDay')}>
                      +1
                    </sup>
                  )}
                </p>
                <p className="text-xs text-muted">{cityName(trip.to.names, locale)}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="mb-1 flex flex-wrap gap-1.5 sm:justify-end">
                {trip.id === cheapestId && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">{t('cheapest')}</span>}
                {trip.id === fastestId && <span className="rounded-full bg-[#3352ff] px-2.5 py-0.5 text-xs font-bold text-white">{t('fastest')}</span>}
              </div>
              <p className="num text-3xl">{money(trip.priceCents, trip.currency, locale)}</p>
              <p className={`text-xs font-semibold ${trip.seatsLeft <= 8 ? 'text-bad' : 'text-ok'}`}>{t('seatsLeft', { count: trip.seatsLeft })}</p>
            </div>
            <Link href={`/trips/${trip.id}?passengers=${passengers}${ctx}`} className="btn-primary">
              {t('select')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
