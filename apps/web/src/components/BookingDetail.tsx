'use client';

import { CalendarPlus, FlaskConical, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError, post } from '@/lib/api';
import { cityName, dateTime, money } from '@/lib/format';
import type { Booking } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { ReviewForm } from './ReviewForm';
import { StatusBadge } from './StatusBadge';

function downloadIcs(b: Booking, title: string, where: string) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (v: string) => v.replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BusTravel//Ticket//EN',
    'BEGIN:VEVENT',
    `UID:${b.code}@bustravel`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.trip.departureAt)}`,
    `DTEND:${stamp(b.trip.arrivalAt)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(`${b.code} · ${b.seats.map((x) => `${x.passengerName} #${x.seatNumber}`).join(', ')}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${b.code}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingDetail() {
  const t = useTranslations('account');
  const tx = useTranslations('extras');
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const justPaid = useSearchParams().get('paid') === '1';
  const { user, loading } = useAuth();

  const [b, setB] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace(`/login?next=/account/bookings/${id}`);
    api<Booking>(`/bookings/${id}`).then(setB).catch(() => router.replace('/account'));
  }, [user, loading, id, router]);

  useEffect(() => {
    if (!justPaid || !b || b.status !== 'PENDING') return;
    const timer = setInterval(() => api<Booking>(`/bookings/${id}`).then(setB).catch(() => undefined), 2000);
    return () => clearInterval(timer);
  }, [justPaid, b, id]);

  if (!b) return <div className="container-x py-8"><div className="glass-tile h-80 animate-pulse" /></div>;

  async function pay() {
    const { url } = await post<{ url: string }>(`/payments/bookings/${b!.id}/checkout`);
    window.location.assign(url);
  }

  async function cancel() {
    try {
      setB(await post<Booking>(`/bookings/${b!.id}/cancel`));
      setConfirming(false);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? t('cancelFailed') : (e as Error).message);
    }
  }

  return (
    <div className="container-x max-w-3xl py-8">
      <Link href="/account" className="text-sm font-semibold text-brand">
        ← {t('back')}
      </Link>

      <div className="glass-tile still mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {cityName(b.trip.from.names, locale)} → {cityName(b.trip.to.names, locale)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {dateTime(b.trip.departureAt, locale)} · {b.trip.from.station}
            </p>
          </div>
          <StatusBadge status={b.status} />
        </div>

        {justPaid && b.status === 'PAID' && <p className="mt-4 rounded-lg bg-ok/10 p-3 text-sm font-medium text-ok">{t('paidOk')}</p>}

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="label">{t('code')}</dt>
            <dd className="font-mono text-lg font-bold">{b.code}</dd>
          </div>
          <div>
            <dt className="label">{t('seats')}</dt>
            <dd className="text-lg font-bold">{b.seats.map((s) => s.seatNumber).join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="label">{t('total')}</dt>
            <dd className="num text-xl">{money(b.totalCents, b.currency, locale)}</dd>
          </div>
        </dl>

        {b.seats.length > 0 && (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
            {b.seats.map((s) => (
              <li key={s.seatNumber} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-semibold">{s.passengerName}</span>
                <span className="text-muted">
                  #{s.seatNumber}
                  {s.largeBags > 0 && ` · ${t('baggage')}: +${s.largeBags}`}
                  {s.boarded && ` · ✓ ${t('boarded')}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {b.status === 'PAID' && b.qr && (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line p-6 text-center">
            <h2 className="font-bold">{t('ticket')}</h2>
            <img src={b.qr} alt={`QR ${b.code}`} width={220} height={220} className="my-3 rounded-lg bg-white p-2" />
            <p className="text-sm text-muted">{t('ticketHint')}</p>
            <p className="mx-auto mt-3 flex max-w-md items-start justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs text-accent"><FlaskConical size={14} className="mt-px shrink-0" aria-hidden="true" />{tx('demoNote')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
              <button
                type="button"
                className="btn-ghost !min-h-10"
                onClick={() => downloadIcs(b, t('calTitle', { from: cityName(b.trip.from.names, locale), to: cityName(b.trip.to.names, locale) }), b.trip.from.station ?? cityName(b.trip.from.names, locale))}
              >
                <CalendarPlus size={17} aria-hidden="true" />
                {t('addCal')}
              </button>
              <button type="button" className="btn-ghost !min-h-10" onClick={() => window.print()}>
                <Printer size={17} aria-hidden="true" />
                {t('print')}
              </button>
            </div>
          </div>
        )}

        {b.status === 'PAID' && <ReviewForm bookingId={b.id} existing={b.review} onDone={() => api<Booking>(`/bookings/${b.id}`).then(setB)} />}

        {b.status === 'PENDING' && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-muted">{t('payBefore', { time: dateTime(b.expiresAt, locale) })}</p>
            <button className="btn-accent w-full sm:w-auto" onClick={pay}>
              {t('pay')} · {money(b.totalCents, b.currency, locale)}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-bad/10 p-3 text-sm font-medium text-bad">
            {error}
          </p>
        )}

        {(b.status === 'PENDING' || b.status === 'PAID') && (
          <div className="mt-6 border-t border-line pt-5">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">{t('cancelConfirm')}</span>
                <button className="btn-danger" onClick={cancel}>
                  {t('yes')}
                </button>
                <button className="btn-ghost" onClick={() => setConfirming(false)}>
                  {t('no')}
                </button>
              </div>
            ) : (
              <button className="btn-ghost" onClick={() => setConfirming(true)}>
                {t('cancel')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
