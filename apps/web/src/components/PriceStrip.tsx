'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { PriceDay } from '@/lib/types';

interface Props {
  from: string;
  to: string;
  date: string;
  href: (date: string) => string;
}

export function PriceStrip({ from, to, date, href }: Props) {
  const t = useTranslations('extras');
  const locale = useLocale();
  const [days, setDays] = useState<PriceDay[] | null>(null);
  const active = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    api<PriceDay[]>(`/trips/prices?from=${from}&to=${to}&date=${date}&days=7`).then(setDays).catch(() => setDays([]));
  }, [from, to, date]);

  useEffect(() => {
    active.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [days]);

  const lowest = useMemo(() => {
    const p = (days ?? []).map((d) => d.priceCents).filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : null;
  }, [days]);

  if (days === null) return <div className="mt-6 h-[5.9rem]" aria-hidden="true" />;
  if (!days.length) return null;
  const wd = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const dm = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <nav aria-label={t('priceByDay')} className="mt-6">
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
        {days.map((d) => {
          const on = d.date === date;
          const cheapest = d.priceCents != null && d.priceCents === lowest && days.filter((x) => x.priceCents === lowest).length < days.length;
          const day = new Date(`${d.date}T12:00:00Z`);
          const body = (
            <>
              <span className="text-xs text-white/60">{wd.format(day)}</span>
              <span className="text-sm font-semibold">{dm.format(day)}</span>
              <span className={`num mt-1 text-lg ${d.priceCents == null ? 'text-white/30' : cheapest ? 'text-accent' : ''}`}>
                {d.priceCents == null ? '–' : money(d.priceCents, d.currency, locale)}
              </span>
              {cheapest && <span className="text-[10px] font-semibold text-accent">{t('lowest')}</span>}
            </>
          );
          const cls = `flex min-w-[6.2rem] shrink-0 snap-center flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition sm:min-w-0 ${
            on ? 'border-transparent bg-white text-[#0d1220] [&_span]:!text-[#0d1220]' : 'border-white/15 bg-white/[0.05] hover:border-white/40'
          }`;
          return (
            <li key={d.date} className="contents">
              {d.priceCents == null ? (
                <span className={`${cls} opacity-60`} aria-label={`${dm.format(day)}: ${t('noTripsDay')}`}>
                  {body}
                </span>
              ) : (
                <Link ref={on ? active : undefined} href={href(d.date)} aria-current={on ? 'date' : undefined} className={cls}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
