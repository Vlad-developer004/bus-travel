'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError, post } from '@/lib/api';
import { cityName, dateTime } from '@/lib/format';
import type { Names } from '@/lib/types';
import { useAuth } from './AuthProvider';

interface ScanResult {
  valid: boolean;
  alreadyBoarded?: boolean;
  reason?: 'NOT_PAID' | 'TRIP_CANCELLED';
  code: string;
  departureAt: string;
  from: Names;
  to: Names;
  passengers: { name: string; seat: number }[];
}

export function DriverScan() {
  const t = useTranslations('driver');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  if (loading) return null;
  if (!user || (user.role !== 'DRIVER' && user.role !== 'ADMIN')) return <p className="container-x py-16 text-center text-lg font-bold">{t('noAccess')}</p>;

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      setResult(await post<ScanResult>('/tickets/scan', { token: token.trim() }));
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 400 || err.status === 404) ? t('unknown') : (err as Error).message);
    }
  }

  return (
    <div className="container-x max-w-xl py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mb-6 mt-1 text-muted">{t('hint')}</p>

      <form onSubmit={scan} className="card flex flex-col gap-3 p-5 sm:flex-row">
        <label htmlFor="token" className="sr-only">
          QR
        </label>
        <input id="token" className="field font-mono" placeholder={t('placeholder')} value={token} onChange={(e) => setToken(e.target.value)} required autoFocus />
        <button className="btn-primary">{t('scan')}</button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-bad/10 p-4 font-semibold text-bad">
          {error}
        </p>
      )}

      {result && (
        <div role="status" className={`card mt-4 border-2 p-6 ${result.valid ? 'border-ok' : 'border-bad'}`}>
          <p className={`text-2xl font-extrabold ${result.valid ? 'text-ok' : 'text-bad'}`}>
            {result.valid ? '✓ ' + t('valid') : '✕ ' + t('invalid')}
          </p>
          {result.valid && <p className="mt-1 font-semibold">{result.alreadyBoarded ? t('alreadyBoarded') : t('boardedNow')}</p>}
          {!result.valid && result.reason && <p className="mt-1 font-semibold">{t(`reason${result.reason}`)}</p>}
          <p className="mt-3 text-sm text-muted">
            {result.code} · {cityName(result.from, locale)} → {cityName(result.to, locale)} · {dateTime(result.departureAt, locale)}
          </p>
          <h2 className="label mt-4">{t('passengers')}</h2>
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {result.passengers.map((p) => (
              <li key={p.seat} className="flex justify-between px-4 py-2.5">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted">#{p.seat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
