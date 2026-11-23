'use client';

import 'leaflet/dist/leaflet.css';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { CircleMarker, GeoJSON, MapContainer, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cityName, duration, money } from '@/lib/format';
import type { CityRef, Route } from '@/lib/types';

const BLUE = '#6f86ff';
const GOLD = '#ffd23f';

const SERVED = new Set(['NL', 'DE', 'FR', 'GB', 'PL', 'UA', 'CZ', 'AT']);

const LABEL: Record<string, { dir: 'left' | 'right' | 'top' | 'bottom'; off: [number, number] }> = {
  london: { dir: 'left', off: [-10, 0] },
  paris: { dir: 'left', off: [-10, 0] },
  amsterdam: { dir: 'top', off: [0, -10] },
  duesseldorf: { dir: 'bottom', off: [0, 10] },
  hamburg: { dir: 'top', off: [0, -10] },
  berlin: { dir: 'top', off: [0, -12] },
  warsaw: { dir: 'top', off: [0, -10] },
  krakow: { dir: 'left', off: [-10, 0] },
  lviv: { dir: 'bottom', off: [0, 10] },
  kyiv: { dir: 'right', off: [10, 0] },
  prague: { dir: 'left', off: [-10, 0] },
  munich: { dir: 'left', off: [-10, 0] },
  vienna: { dir: 'right', off: [10, 0] },
};

function arc(a: [number, number], b: [number, number], side: 1 | -1): [number, number][] {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const mx = (lat1 + lat2) / 2;
  const my = (lng1 + lng2) / 2;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const k = 0.16 * side;
  const cx = mx - dy * k;
  const cy = my + dx * k;
  return Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const u = 1 - t;
    return [u * u * lat1 + 2 * u * t * cx + t * t * lat2, u * u * lng1 + 2 * u * t * cy + t * t * lng2] as [number, number];
  });
}

function Fly({ city }: { city?: CityRef }) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.lat, city.lng], 5, { duration: 0.9 });
    else map.flyTo([50.6, 14], 4.5, { duration: 0.9 });
  }, [city, map]);
  return null;
}

export default function NetworkMap() {
  const t = useTranslations('map');
  const locale = useLocale();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const [roads, setRoads] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    fetch('/europe.json').then((r) => r.json()).then(setLand).catch(() => undefined);
    fetch('/roads.json').then((r) => r.json()).then(setRoads).catch(() => undefined);
  }, []);

  useEffect(() => {
    api<Route[]>('/routes').then(setRoutes).catch(() => undefined);
  }, []);

  const cities = useMemo(() => {
    const map = new Map<string, CityRef>();
    routes.forEach((r) => {
      map.set(r.from.slug, r.from);
      map.set(r.to.slug, r.to);
    });
    return [...map.values()].sort((a, b) => cityName(a.names, locale).localeCompare(cityName(b.names, locale), locale));
  }, [routes, locale]);

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    routes.forEach((r) => d.set(r.from.slug, (d.get(r.from.slug) ?? 0) + 1));
    return d;
  }, [routes]);

  const lines = routes.filter((r) => r.from.slug < r.to.slug);
  const fromActive = routes.filter((r) => r.from.slug === active).sort((a, b) => a.durationMin - b.durationMin);
  const activeCity = cities.find((c) => c.slug === active);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const toggle = (slug: string) => setActive((cur) => (cur === slug ? null : slug));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
      <div className="map-shell overflow-hidden rounded-[2rem] border border-white/15 p-1.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
        <MapContainer center={[50.6, 14]} zoom={4.5} zoomSnap={0.25} minZoom={3.5} maxBounds={[[30, -22], [70, 50]]} scrollWheelZoom style={{ height: 'min(72vh, 620px)', width: '100%' }}>
          {land && (
            <GeoJSON
              data={land}
              attribution="Map data: Natural Earth"
              interactive={false}
              style={(f) => {
                const served = SERVED.has(f?.properties?.n);
                return { color: 'rgba(160,180,230,0.22)', weight: 0.8, fillColor: served ? '#1d2c4d' : '#111b30', fillOpacity: 1 };
              }}
            />
          )}
          <Fly city={activeCity} />

          {lines.map((r, i) => {
            const hot = !!active && (r.from.slug === active || r.to.slug === active);
            const dim = !!active && !hot;
            const pos = roads[`${r.from.slug}-${r.to.slug}`] ?? arc([r.from.lat, r.from.lng], [r.to.lat, r.to.lng], i % 2 === 0 ? 1 : -1);
            const color = hot ? GOLD : BLUE;
            return (
              <span key={r.id}>
                <Polyline positions={pos} interactive={false} pathOptions={{ color, weight: hot ? 9 : 5, opacity: dim ? 0.012 : hot ? 0.2 : 0.07, lineCap: 'round' }} />
                <Polyline positions={pos} interactive={false} pathOptions={{ color, weight: hot ? 2.2 : 1.3, opacity: dim ? 0.08 : hot ? 0.95 : 0.55, lineCap: 'round' }} />
                {!dim && (
                  <Polyline
                    positions={pos}
                    interactive={false}
                    className={hot ? 'flow-line flow-hot' : 'flow-line'}
                    pathOptions={{ color: hot ? '#fff3b0' : '#c6d2ff', weight: hot ? 3 : 1.8, opacity: hot ? 1 : 0.8, lineCap: 'round' }}
                  />
                )}
              </span>
            );
          })}

          {cities.map((c) => {
            const on = c.slug === active;
            const size = 6 + Math.min(4, (degree.get(c.slug) ?? 1) / 2);
            return (
              <span key={c.slug}>
                <CircleMarker center={[c.lat, c.lng]} radius={size + 8} interactive={false} pathOptions={{ stroke: false, fillColor: on ? GOLD : BLUE, fillOpacity: on ? 0.3 : 0.16 }} />
                <CircleMarker
                  center={[c.lat, c.lng]}
                  radius={on ? size + 2 : size}
                  pathOptions={{ color: '#fff', weight: 2, fillColor: on ? GOLD : BLUE, fillOpacity: 1 }}
                  eventHandlers={{ click: () => toggle(c.slug) }}
                >
                  <Tooltip permanent direction={LABEL[c.slug]?.dir ?? 'right'} offset={LABEL[c.slug]?.off ?? [10, 0]} className="city-label">
                    {cityName(c.names, locale)}
                  </Tooltip>
                </CircleMarker>
              </span>
            );
          })}
        </MapContainer>
      </div>

      <aside className="glass-tile max-h-[min(72vh,620px)] overflow-y-auto p-5 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]" style={{ '--tint': 'rgba(51,82,255,0.22)' } as React.CSSProperties} aria-live="polite">
        {activeCity ? (
          <>
            <button type="button" onClick={() => setActive(null)} className="mb-3 text-sm text-white/60 transition hover:text-white">
              ← {t('title')}
            </button>
            <h2 className="mb-4 text-2xl">{t('routesFrom', { city: cityName(activeCity.names, locale) })}</h2>
            <ul className="space-y-2">
              {fromActive.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/search?from=${r.from.slug}&to=${r.to.slug}&date=${tomorrow}&passengers=1`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 transition hover:border-accent/60 hover:bg-white/10"
                  >
                    <span>
                      <span className="block font-semibold">{cityName(r.to.names, locale)}</span>
                      <span className="text-xs text-white/55">{duration(r.durationMin, locale)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num text-accent">{money(r.fromPriceCents, 'EUR', locale)}</span>
                      <ArrowUpRight size={16} className="text-white/40 transition group-hover:text-accent" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/65">{t('subtitle')}</p>
            <ul className="space-y-1.5">
              {cities.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(c.slug)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <MapPin size={16} className="text-brand" aria-hidden="true" />
                      <span className="font-medium">{cityName(c.names, locale)}</span>
                    </span>
                    <span className="num rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">{degree.get(c.slug) ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
