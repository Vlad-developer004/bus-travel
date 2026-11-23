import type { Names } from './types';

const TAGS: Record<string, string> = { en: 'en-GB', uk: 'uk-UA', de: 'de-DE', pl: 'pl-PL' };

export const cityName = (names: Names, locale: string) => names[locale as keyof Names] ?? names.en;

export const money = (cents: number, currency: string, locale: string) =>
  new Intl.NumberFormat(TAGS[locale] ?? 'en-GB', { style: 'currency', currency }).format(cents / 100);

export const time = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(TAGS[locale] ?? 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const dateLong = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(TAGS[locale] ?? 'en-GB', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(iso));

export const dateTime = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(TAGS[locale] ?? 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const UNITS: Record<string, [string, string]> = { en: ['h', 'min'], uk: ['год', 'хв'], de: ['Std.', 'Min.'], pl: ['godz.', 'min'] };
export const duration = (min: number, locale = 'en') => {
  const [h, m] = UNITS[locale] ?? UNITS.en;
  return min % 60 === 0 ? `${Math.floor(min / 60)} ${h}` : `${Math.floor(min / 60)} ${h} ${min % 60} ${m}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
