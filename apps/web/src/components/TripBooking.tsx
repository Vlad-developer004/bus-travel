'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlaskConical, Luggage, Share2, Snowflake, Toilet, Usb, Wifi } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError, post } from '@/lib/api';
import { cityName, dateTime, duration, money } from '@/lib/format';
import type { Booking, TripDetail } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { FavoriteButton } from './FavoriteButton';
import dynamic from 'next/dynamic';
import { SeatPicker } from './SeatPicker';
import { Spinner } from './Spinner';
import { Stars } from './Stars';

const LARGE_BAG_FEE_CENTS = 500;

interface Pax {
  seat: number;
  name: string;
  largeBags: number;
}

const ReviewsPanel = dynamic(() => import('./ReviewsPanel').then((m) => m.ReviewsPanel), { ssr: false });

export function TripBooking() {
  const t = useTranslations('trip');
  const tx = useTranslations('extras');
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const wanted = Math.min(9, Math.max(1, Number(sp.get('passengers') ?? 1)));
  const ret = sp.get('return') ?? '';
  const outbound = sp.get('outbound') ?? '';
  const ctx = `${ret && !outbound ? `&return=${ret}` : ''}${outbound ? `&outbound=${outbound}` : ''}`;
  const [shared, setShared] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [pax, setPax] = useState<Record<number, Pax>>({});
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const load = () =>
    api<TripDetail>(`/trips/${id}`)
      .then(setTrip)
      .catch(() => setMissing(true));
  useEffect(() => {
    load();
  }, [id]);

  if (missing) return <p className="container-x py-16 text-center text-lg font-bold">{t('departed')}</p>;
  if (!trip) return <div className="container-x py-8"><div className="card h-96 animate-pulse" /></div>;

  function toggle(seat: number) {
    setSelected((cur) => (cur.includes(seat) ? cur.filter((s) => s !== seat) : [...cur, seat].sort((a, b) => a - b)));
    setPax((cur) => (cur[seat] ? cur : { ...cur, [seat]: { seat, name: '', largeBags: 0 } }));
  }

  const chosen = selected.map((s) => pax[s]);
  const total = trip.priceCents * selected.length + chosen.reduce((sum, p) => sum + p.largeBags, 0) * LARGE_BAG_FEE_CENTS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selected.length) return setError(t('selectAtLeast'));
    if (chosen.some((p) => p.name.trim().length < 2)) return setError(t('nameRequired'));

    setBusy(true);
    try {
      const booking = await post<Booking>('/bookings', {
        tripId: trip!.id,
        locale,
        passengers: chosen.map((p) => ({ name: p.name.trim(), seatNumber: p.seat, largeBags: p.largeBags })),
      });
      const { url } = await post<{ url: string }>(`/payments/bookings/${booking.id}/checkout`);
      const demo = url.includes('/pay/mock');
      if (outbound && demo) {
        router.push(`/pay/mock?booking=${outbound},${booking.id}`);
      } else if (ret && !outbound && demo) {
        router.push(`/search?from=${trip!.to.slug}&to=${trip!.from.slug}&date=${ret}&passengers=${wanted}&outbound=${booking.id}`);
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.code === 'SEAT_TAKEN') {
        setError(t('seatTaken'));
        setSelected([]);
        load();
      } else {
        setError(t('error'));
      }
    }
  }

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">
            {cityName(trip.from.names, locale)} → {cityName(trip.to.names, locale)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {dateTime(trip.departureAt, locale)} · {duration(trip.durationMin, locale)} · {trip.from.station}
          </p>
          {trip.rating && (
            <a href="#reviews-h" className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <Stars value={trip.rating.average} size={16} />
              <span className="font-semibold">{tx('rating', { avg: trip.rating.average.toFixed(1) })}</span>
              <span className="text-muted">({tx('ratingCount', { count: trip.rating.count })})</span>
            </a>
          )}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={tx('onBoard')}>
            {[
              [Wifi, tx('wifi')],
              [Usb, tx('usb')],
              [Snowflake, tx('ac')],
              [Toilet, tx('wc')],
              [Luggage, tx('hold')],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Wifi;
              return (
                <li key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80">
                  <I size={14} aria-hidden="true" />
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton from={trip.from.slug} to={trip.to.slug} />
          <button
            type="button"
            className="btn-ghost !min-h-10"
            onClick={async () => {
              const url = window.location.href;
              try {
                if (navigator.share) await navigator.share({ title: document.title, url });
                else {
                  await navigator.clipboard.writeText(url);
                  setShared(true);
                  setTimeout(() => setShared(false), 2000);
                }
              } catch {
              }
            }}
          >
            <Share2 size={16} aria-hidden="true" />
            {shared ? tx('copied') : tx('share')}
          </button>
        </div>
      </div>

      {outbound && (
        <p className="mb-4 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm" role="status">
          <span className="font-semibold">{tx('chooseReturn')}</span>
        </p>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <section className="glass-tile still h-fit p-5 sm:p-6" aria-labelledby="seats-h">
          <h2 id="seats-h" className="mb-4 text-lg font-bold">
            {t('title')}
          </h2>
          <SeatPicker seatCount={trip.seatCount} taken={trip.takenSeats} selected={selected} max={wanted} onToggle={toggle} />
        </section>

        <div className="space-y-6">
        <section className="glass-tile still p-5 sm:p-6" aria-label={`${cityName(trip.from.names, locale)} → ${cityName(trip.to.names, locale)}`}>
          <ol className="relative space-y-6 pl-7">
            <span className="absolute bottom-3 left-[0.45rem] top-3 w-px bg-gradient-to-b from-accent to-brand" aria-hidden="true" />
            {[
              [trip.departureAt, trip.from.names, trip.from.station, 'bg-accent'],
              [trip.arrivalAt, trip.to.names, trip.to.station, 'bg-brand'],
            ].map(([at, names, station, dot], i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-7 top-1.5 size-3.5 rounded-full ring-4 ring-[#0d1220] ${dot}`} aria-hidden="true" />
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="num text-2xl">{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(at as string))}</span>
                  <span className="font-bold">{cityName(names as never, locale)}</span>
                </p>
                <p className="text-sm text-muted">{station as string}</p>
                {i === 0 && <p className="mt-2 text-xs font-medium text-white/60">{duration(trip.durationMin, locale)} · {trip.busModel}</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="glass-tile still h-fit p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">{t('passengerDetails')}</h2>
          {selected.length === 0 && <p className="text-sm text-muted">{t('selectAtLeast')}</p>}

          <div className="space-y-4">
            {chosen.map((p, i) => (
              <fieldset key={p.seat} className="rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-bold">{t('passenger', { n: i + 1, seat: p.seat })}</legend>
                <label htmlFor={`name-${p.seat}`} className="label">
                  {t('fullName')}
                </label>
                <input
                  id={`name-${p.seat}`}
                  className="field"
                  value={p.name}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(e) => setPax((cur) => ({ ...cur, [p.seat]: { ...p, name: e.target.value } }))}
                />
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand)]"
                    checked={p.largeBags > 0}
                    onChange={(e) => setPax((cur) => ({ ...cur, [p.seat]: { ...p, largeBags: e.target.checked ? 1 : 0 } }))}
                  />
                  {t('largeBags', { fee: money(LARGE_BAG_FEE_CENTS, trip.currency, locale) })}
                </label>
              </fieldset>
            ))}
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm font-semibold text-muted">{t('total')}</span>
            <span className="text-3xl num">{money(total, trip.currency, locale)}</span>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-bad/10 p-3 text-sm font-medium text-bad">
              {error}
            </p>
          )}

          {!authLoading && !user ? (
            <Link href={`/login?next=${encodeURIComponent(`/trips/${trip.id}?passengers=${wanted}${ctx}`)}`} className="btn-primary mt-4 w-full">
              {t('loginToBook')}
            </Link>
          ) : (
            <button type="submit" className="btn-accent mt-4 w-full" disabled={busy || !selected.length} aria-busy={busy}>
              {busy && <Spinner />}
              {t('book')}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">{t('hold')}</p>
          <p className="mt-3 flex items-start justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-center text-xs text-accent"><FlaskConical size={14} className="mt-px shrink-0" aria-hidden="true" />{tx('demoNote')}</p>
        </section>
        </div>
      </form>

      <ReviewsPanel from={trip.from.slug} to={trip.to.slug} />
    </div>
  );
}
