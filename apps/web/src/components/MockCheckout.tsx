'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Spinner } from './Spinner';
import { api, post } from '@/lib/api';
import { cityName, dateTime, money } from '@/lib/format';
import type { Booking } from '@/lib/types';

export function MockCheckout() {
  const t = useTranslations('pay');
  const te = useTranslations('extras');
  const locale = useLocale();
  const router = useRouter();
  const ids = (useSearchParams().get('booking') ?? '').split(',').filter(Boolean);
  const idsKey = ids.join(',');
  const [list, setList] = useState<Booking[] | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');

  useEffect(() => {
    Promise.all(idsKey.split(',').map((id) => api<Booking>(`/bookings/${id}`)))
      .then(setList)
      .catch(() => router.replace('/account'));
  }, [idsKey, router]);

  async function pay() {
    setState('busy');
    try {
      for (const id of ids) await post('/payments/mock/confirm', { bookingId: id });
      router.push(ids.length > 1 ? '/account' : `/account/bookings/${ids[0]}?paid=1`);
    } catch {
      setState('error');
    }
  }

  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-12">
      <div className="glass-tile still w-full max-w-md space-y-4 p-8 text-center">
        <span className="badge bg-accent/20 text-[#8a5a00] dark:text-accent">{t('demo')}</span>
        <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted">{t('text')}</p>
        {state === 'error' && (
          <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm font-medium text-bad">
            {t('error')}
          </p>
        )}
        {list && list.length > 1 && <p className="text-sm font-semibold">{te('roundTripTickets', { count: list.length })}</p>}
        {list && (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] text-left text-sm">
            {list.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block font-semibold">
                    {cityName(b.trip.from.names, locale)} → {cityName(b.trip.to.names, locale)}
                  </span>
                  <span className="text-xs text-muted">
                    {dateTime(b.trip.departureAt, locale)} · #{b.seats.map((x) => x.seatNumber).join(', ')}
                  </span>
                </span>
                <span className="num">{money(b.totalCents, b.currency, locale)}</span>
              </li>
            ))}
          </ul>
        )}
        <button className="btn-accent w-full" disabled={!list || state === 'busy'} aria-busy={state === 'busy'} onClick={pay}>
          {state === 'busy' && <Spinner />}
          {state === 'busy' ? t('processing') : list ? t('button', { amount: money(list.reduce((s, x) => s + x.totalCents, 0), list[0].currency, locale) }) : '…'}
        </button>
      </div>
    </div>
  );
}
