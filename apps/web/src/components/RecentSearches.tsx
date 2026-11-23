'use client';

import { History } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cityName } from '@/lib/format';
import { readRecent, type Recent } from '@/lib/favorites';
import type { CityRef } from '@/lib/types';

export function RecentSearches() {
  const t = useTranslations('extras');
  const locale = useLocale();
  const [items, setItems] = useState<Recent[]>([]);
  const [cities, setCities] = useState<Record<string, CityRef>>({});

  useEffect(() => {
    const r = readRecent();
    if (!r.length) return;
    setItems(r);
    api<CityRef[]>('/cities').then((c) => setCities(Object.fromEntries(c.map((x) => [x.slug, x])))).catch(() => undefined);
  }, []);

  const name = (slug: string) => (cities[slug] ? cityName(cities[slug].names, locale) : null);
  const shown = items.filter((i) => name(i.from) && name(i.to));
  if (!shown.length) return null;

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 px-1">
      <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
        <History size={15} aria-hidden="true" />
        {t('recent')}
      </span>
      {shown.map((i) => {
        const date = i.date >= tomorrow.slice(0, 10) || i.date >= new Date().toISOString().slice(0, 10) ? i.date : tomorrow;
        const ret = i.ret && i.ret >= date ? `&return=${i.ret}` : '';
        return (
          <Link
            key={`${i.from}-${i.to}`}
            href={`/search?from=${i.from}&to=${i.to}&date=${date}&passengers=${i.passengers}${ret}`}
            className="rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium transition hover:border-white/50"
          >
            {name(i.from)} → {name(i.to)}
          </Link>
        );
      })}
    </div>
  );
}
