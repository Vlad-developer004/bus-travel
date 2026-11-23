import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'uk', 'de', 'pl'],
  defaultLocale: 'en',
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', uk: 'Українська', de: 'Deutsch', pl: 'Polski' };
