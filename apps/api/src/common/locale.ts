export const LOCALES = ['en', 'uk', 'de', 'pl'] as const;
export type Locale = (typeof LOCALES)[number];

export function toLocale(value: unknown): Locale {
  return (LOCALES as readonly string[]).includes(value as string) ? (value as Locale) : 'en';
}

export function pickName(names: unknown, locale: Locale): string {
  const map = (names ?? {}) as Record<string, string>;
  return map[locale] ?? map.en ?? Object.values(map)[0] ?? '';
}

export function formatMoney(cents: number, currency: string, locale: Locale): string {
  const tag = { en: 'en-GB', uk: 'uk-UA', de: 'de-DE', pl: 'pl-PL' }[locale];
  return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(cents / 100);
}
