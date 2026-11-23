'use client';

import { BadgeCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ReviewList } from '@/lib/types';
import { Stars } from './Stars';

export function ReviewsPanel({ from, to }: { from: string; to: string }) {
  const t = useTranslations('reviews');
  const locale = useLocale();
  const [data, setData] = useState<ReviewList | null>(null);

  useEffect(() => {
    api<ReviewList>(`/reviews?from=${from}&to=${to}&limit=20`)
      .then((r) => setData({ ...r, items: [...r.items].sort((a, b) => Number(b.lang === locale) - Number(a.lang === locale)).slice(0, 6) })).catch(() => setData(null));
  }, [from, to]);

  if (!data) return null;
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <section className="glass-tile still mt-6 p-5 sm:p-7" style={{ '--tint': 'rgba(255,190,40,0.14)' } as React.CSSProperties} aria-labelledby="reviews-h">
      <h2 id="reviews-h" className="text-2xl">
        {t('title')}
      </h2>

      {data.count === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('none')}</p>
      ) : (
        <div className="mt-5 grid gap-8 md:grid-cols-[14rem_1fr]">
          <div>
            <p className="num text-6xl leading-none">{data.average.toFixed(1)}</p>
            <div className="mt-2">
              <Stars value={data.average} size={20} />
            </div>
            <p className="mt-2 text-sm text-muted">{t('based', { count: data.count })}</p>
            <ul className="mt-4 space-y-1.5" aria-hidden="true">
              {data.distribution.map((d) => (
                <li key={d.star} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-3 text-right">{d.star}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(d.count / data.count) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-4">
            {data.items.map((r) => (
              <li key={r.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.author}</span>
                  <Stars value={r.rating} size={14} />
                  <span className="sr-only">{t('stars', { n: r.rating })}</span>
                  <span className="text-xs text-muted">{date(r.createdAt)}</span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 text-xs text-ok">
                      <BadgeCheck size={14} aria-hidden="true" />
                      {t('verified')}
                    </span>
                  )}
                </div>
                {r.comment && <p className="mt-1.5 leading-relaxed text-white/75">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
