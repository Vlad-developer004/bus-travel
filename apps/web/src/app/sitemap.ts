import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

const PAGES = ['', '/map', '/help', '/legal/privacy', '/legal/terms', '/legal/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((p) =>
    routing.locales.map((l) => ({
      url: `${SITE_URL}/${l}${p}`,
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.6,
      alternates: { languages: Object.fromEntries(routing.locales.map((x) => [x, `${SITE_URL}/${x}${p}`])) },
    })),
  );
}
