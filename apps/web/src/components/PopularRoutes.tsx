'use client';

import { ArrowUpRight, Clock, LocateFixed } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { cityName, duration, money } from '@/lib/format';
import type { CityRef, Route } from '@/lib/types';
import { FavoriteButton } from './FavoriteButton';
import { Select } from './Select';

const PHOTOS = new Set(['amsterdam', 'berlin', 'duesseldorf', 'hamburg', 'krakow', 'kyiv', 'london', 'lviv', 'paris', 'prague', 'vienna', 'warsaw']);
const TINTS = ['--t0', '--t1', '--t2', '--t3', '--t4', '--t5'];
const KEY = 'bt-origin';

const ZONE_CITY: Record<string, string> = {
  'Europe/Berlin': 'berlin',
  'Europe/Kyiv': 'kyiv',
  'Europe/Kiev': 'kyiv',
  'Europe/London': 'london',
  'Europe/Paris': 'paris',
  'Europe/Warsaw': 'warsaw',
  'Europe/Prague': 'prague',
  'Europe/Vienna': 'vienna',
  'Europe/Amsterdam': 'amsterdam',
  'Europe/Zurich': 'munich',
  'Europe/Budapest': 'vienna',
  'Europe/Bratislava': 'vienna',
  'Europe/Brussels': 'duesseldorf',
  'Europe/Copenhagen': 'hamburg',
  'Europe/Uzhgorod': 'lviv',
};

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function PopularRoutes() {
  const t = useTranslations('home');
  const tx = useTranslations('extras');
  const { favs } = useFavorites();
  const locale = useLocale();
  const [all, setAll] = useState<Route[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [geo, setGeo] = useState<'idle' | 'busy' | 'fail'>('idle');

  useEffect(() => {
    api<Route[]>('/routes').then(setAll).catch(() => setAll([]));
  }, []);

  const cities = useMemo(() => {
    const m = new Map<string, CityRef>();
    (all ?? []).forEach((r) => m.set(r.from.slug, r.from));
    return [...m.values()].sort((a, b) => cityName(a.names, locale).localeCompare(cityName(b.names, locale), locale));
  }, [all, locale]);

  useEffect(() => {
    if (!cities.length || origin) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
    }
    const zone = ZONE_CITY[Intl.DateTimeFormat().resolvedOptions().timeZone];
    const pick = [saved, zone, 'berlin'].find((s) => s && cities.some((c) => c.slug === s));
    setOrigin(pick ?? cities[0].slug);
  }, [cities, origin]);

  function choose(slug: string) {
    setOrigin(slug);
    try {
      localStorage.setItem(KEY, slug);
    } catch {
    }
  }

  function locate() {
    if (!navigator.geolocation) return setGeo('fail');
    setGeo('busy');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = [...cities].sort((a, b) => distKm(me, a) - distKm(me, b))[0];
        if (nearest) choose(nearest.slug);
        setGeo('idle');
      },
      () => setGeo('fail'),
      { timeout: 8000, maximumAge: 600_000 },
    );
  }

  const shown = useMemo(
    () => (all ?? []).filter((r) => r.from.slug === origin).sort((a, b) => a.durationMin - b.durationMin).slice(0, 6),
    [all, origin],
  );
  const loading = all === null || !origin;
  const saved = (all ?? []).filter((r) => favs.includes(`${r.from.slug}>${r.to.slug}`));
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2 className="text-3xl sm:text-5xl">{t('popular')}</h2>
          <p className="mt-2 text-lg text-muted">{t('popularSub')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t('popularFrom')}</span>
          <Select
            id="origin"
            compact
            alignRight
            className="w-44"
            ariaLabel={t('popularFrom')}
            value={origin ?? ''}
            onChange={choose}
            options={cities.map((c) => ({ value: c.slug, label: cityName(c.names, locale), hint: c.countryIso }))}
          />
          <button
            type="button"
            onClick={locate}
            disabled={geo === 'busy' || !cities.length}
            title={t('locate')}
            aria-label={t('locate')}
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-ink/40 disabled:opacity-50"
          >
            <LocateFixed size={17} className={geo === 'busy' ? 'animate-pulse text-accent' : ''} aria-hidden="true" />
          </button>
        </div>
        {geo === 'fail' && (
          <p role="status" className="w-full text-sm text-muted md:text-right">
            {t('locateFail')}
          </p>
        )}
      </div>

      {saved.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2" aria-label={tx('savedRoutes')} role="group">
          <span className="text-sm font-semibold text-white/70">{tx('savedRoutes')}</span>
          {saved.map((r) => (
            <Link
              key={r.id}
              href={`/search?from=${r.from.slug}&to=${r.to.slug}&date=${tomorrow}&passengers=1`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium transition hover:border-white/50"
            >
              <span className="text-[#ff4d6a]" aria-hidden="true">
                ♥
              </span>
              {cityName(r.from.names, locale)} → {cityName(r.to.names, locale)}
              <span className="num text-accent">{money(r.fromPriceCents, 'EUR', locale)}</span>
            </Link>
          ))}
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(loading ? Array.from({ length: 6 }, () => null) : shown).map((r, i) => {
          if (!r) return <li key={i} className="aspect-[4/3] animate-pulse rounded-[2rem] bg-line" aria-hidden="true" />;
          const photo = PHOTOS.has(r.to.slug) ? r.to.slug : PHOTOS.has(r.from.slug) ? r.from.slug : null;
          return (
            <li key={r.id} className="relative">
              <FavoriteButton from={r.from.slug} to={r.to.slug} variant="glass" className="absolute right-[3.75rem] top-4 z-10" />
              <Link
                href={`/search?from=${r.from.slug}&to=${r.to.slug}&date=${tomorrow}&passengers=1`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-[2rem] text-white"
                style={{ background: `var(${TINTS[i % TINTS.length]})` }}
              >
                {photo && (
                  <img src={`/cities/${photo}.webp`} srcSet={`/cities/${photo}-480.webp 480w, /cities/${photo}.webp 720w`} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0d1220] backdrop-blur">
                  <Clock size={13} aria-hidden="true" />
                  {duration(r.durationMin, locale)} · {r.distanceKm} km
                </span>
                <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-[#0d1220] transition duration-300 group-hover:rotate-45 group-hover:bg-accent" aria-hidden="true">
                  <ArrowUpRight size={19} />
                </span>
                <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-2xl font-bold leading-tight tracking-tight">{cityName(r.to.names, locale)}</span>
                    <span className="block truncate text-sm text-white/80">{cityName(r.from.names, locale)}</span>
                  </span>
                  <span className="num shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-sm text-accent-ink">{t('fromPrice', { price: money(r.fromPriceCents, 'EUR', locale) })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
