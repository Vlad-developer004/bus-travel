'use client';

import { ArrowRightLeft, CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { saveRecent } from '@/lib/favorites';
import { api } from '@/lib/api';
import { cityName, todayISO } from '@/lib/format';
import type { CityRef } from '@/lib/types';
import { DatePicker } from './DatePicker';
import { Select } from './Select';

interface Props {
  initial?: { from?: string; to?: string; date?: string; passengers?: number; ret?: string };
  compact?: boolean;
}

export function SearchForm({ initial }: Props) {
  const t = useTranslations('home');
  const ts = useTranslations('search');
  const tx = useTranslations('extras');
  const locale = useLocale();
  const router = useRouter();

  const [cities, setCities] = useState<CityRef[]>([]);
  const [from, setFrom] = useState(initial?.from ?? 'berlin');
  const [to, setTo] = useState(initial?.to ?? 'warsaw');
  const [date, setDate] = useState(initial?.date ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
  const [round, setRound] = useState(!!initial?.ret);
  const [ret, setRet] = useState(initial?.ret ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    api<CityRef[]>('/cities').then((c) => setCities(c.sort((a, b) => cityName(a.names, locale).localeCompare(cityName(b.names, locale), locale)))).catch(() => undefined);
  }, [locale]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return setError(ts('pickCities'));
    if (from === to) return setError(ts('sameCity'));
    setError('');
    const back = round ? (ret && ret >= date ? ret : date) : '';
    saveRecent({ from, to, date, passengers, ret: back || undefined });
    router.push(`/search?from=${from}&to=${to}&date=${date}&passengers=${passengers}${back ? `&return=${back}` : ''}`);
  }

  const cityOptions = cities.map((c) => ({ value: c.slug, label: cityName(c.names, locale), hint: c.countryIso }));
  const citySelect = (id: string, value: string, set: (v: string) => void) => (
    <Select id={id} value={value} onChange={set} options={cityOptions} placeholder={t('selectCity')} />
  );

  return (
    <form onSubmit={submit} className="bar p-3 sm:p-4">
      <div className="mb-2 flex gap-1 px-1" role="group" aria-label={tx('roundTrip')}>
        {([[false, tx('oneWay')], [true, tx('roundTrip')]] as [boolean, string][]).map(([v, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={round === v}
            onClick={() => {
              setRound(v);
              if (v && !ret) setRet(date);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${round === v ? 'bg-[#0d1220] text-white' : 'text-[#667085] hover:bg-[#f2f4f8]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={`grid gap-2 md:items-stretch ${round ? 'md:grid-cols-[1.25fr_1.25fr_1fr_1fr_0.7fr_auto]' : 'md:grid-cols-[1.25fr_1.25fr_1fr_0.75fr_auto]'}`}>
        <div className="relative grid gap-2 md:col-span-2 md:grid-cols-2">
          <div className="cell">
            <MapPin size={20} className="shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <label htmlFor="from" className="label">
                {t('from')}
              </label>
              {citySelect('from', from, setFrom)}
            </div>
          </div>
          <button
            type="button"
            className="z-10 mx-auto grid size-10 place-items-center rounded-full border border-[#e4e7ee] bg-white text-[#0d1220] shadow-sm transition hover:bg-[#f2f4f8] max-md:-my-5 md:absolute md:left-1/2 md:top-1/2 md:-ml-5 md:-mt-5"
            aria-label={t('swap')}
            title={t('swap')}
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <ArrowRightLeft size={16} className="max-md:rotate-90" aria-hidden="true" />
          </button>
          <div className="cell">
            <MapPin size={20} className="shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <label htmlFor="to" className="label">
                {t('to')}
              </label>
              {citySelect('to', to, setTo)}
            </div>
          </div>
        </div>
        <div className="cell">
          <CalendarDays size={20} className="shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <label htmlFor="date" className="label">
              {t('date')}
            </label>
            <DatePicker
              id="date"
              value={date}
              min={todayISO()}
              onChange={(d) => {
                setDate(d);
                if (ret && ret < d) setRet(d);
              }}
            />
          </div>
        </div>
        {round && (
          <div className="cell">
            <CalendarDays size={20} className="shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <label htmlFor="ret" className="label">
                {tx('returnDate')}
              </label>
              <DatePicker id="ret" value={ret || date} min={date} onChange={setRet} />
            </div>
          </div>
        )}
        <div className="cell">
          <Users size={20} className="shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <label htmlFor="pax" className="label">
              {t('passengers')}
            </label>
            <Select
              id="pax"
              value={String(passengers)}
              onChange={(v) => setPassengers(Number(v))}
              options={Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary !min-h-16 !rounded-[1.25rem] !px-8 text-base" disabled={cities.length === 0} aria-busy={cities.length === 0}>
          <Search size={18} aria-hidden="true" />
          {t('search')}
        </button>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-1 pt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
