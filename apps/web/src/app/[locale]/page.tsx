import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Armchair, Clock, ShieldCheck, Tag } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroBus } from '@/components/HeroBus';
import { routing } from '@/i18n/routing';
import { ClientMessages } from '@/i18n/client-messages';
import { LazyPopular } from '@/components/LazyPopular';
import { RecentSearches } from '@/components/RecentSearches';
import { SearchForm } from '@/components/SearchForm';
import { Link } from '@/i18n/navigation';

const BOARD = [['08:00', '17:18'], ['12:30', '21:45'], ['18:30', '03:48']];
const WARSAW: Record<string, string> = { en: 'Warsaw', de: 'Warschau', pl: 'Warszawa', uk: 'Варшава' };
const ICONS = { punctual: Clock, comfort: Armchair, safe: ShieldCheck, price: Tag } as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    alternates: { canonical: `/${locale}`, languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const heroPhoto = existsSync(join(process.cwd(), 'public', 'hero.webp'));

  return (
    <ClientMessages ns={['home', 'search', 'extras']}>
      <div className="container-x mt-3">
        <section className={`hero rounded-[2.5rem] ${heroPhoto ? 'photo bg-[#0d1220]' : ''}`}>
          {heroPhoto && (
            <img src="/hero.webp" srcSet="/hero-800.webp 800w, /hero.webp 1600w" sizes="(max-width: 900px) 100vw, 1200px" width={1600} height={900} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover [object-position:72%_12%]" />
          )}
          {heroPhoto && <span className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/5" aria-hidden="true" />}
          <div className={`relative z-10 grid items-center gap-6 px-6 pb-32 pt-14 sm:px-12 sm:pt-24 ${heroPhoto ? 'min-h-[32rem]' : 'lg:grid-cols-[1.1fr_1fr]'}`}>
            <div>
              <h1 className="max-w-lg text-4xl leading-[1.04] sm:text-5xl lg:text-6xl">{t('title')}</h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{t('subtitle')}</p>
              <ul className="mt-7 flex flex-wrap gap-2">
                {(['punctual', 'comfort', 'safe'] as const).map((f) => {
                  const Icon = ICONS[f];
                  return (
                    <li key={f} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-medium backdrop-blur-md">
                      <Icon size={16} className="text-accent" aria-hidden="true" />
                      {t(`why.${f}.t`)}
                    </li>
                  );
                })}
              </ul>
            </div>
            {!heroPhoto && <HeroBus className="roll-in -mb-6 w-full max-w-xl justify-self-end drop-shadow-[0_30px_40px_rgba(6,10,40,0.35)] lg:-mr-4" />}
          </div>
        </section>
      </div>

      <div className="container-x relative z-10 -mt-16 px-6 sm:px-10">
        <SearchForm />
        <RecentSearches />
      </div>

      <section className="container-x mt-20">
        <LazyPopular />
      </section>

      <section className="container-x mt-24">
        <h2 className="mb-8 text-3xl sm:text-5xl">{t('whyTitle')}</h2>
        <ul className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          <li className="glass-tile relative overflow-hidden md:col-span-2 md:row-span-2" style={{ '--tint': 'rgba(51,82,255,0.28)' } as React.CSSProperties}>
            <div className="flex h-full flex-col justify-between gap-8 p-7 sm:p-9">
              <div>
                <span className="icon-chip bg-[#3352ff]">
                  <Clock size={22} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl sm:text-3xl">{t('why.punctual.t')}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-white/70">{t('why.punctual.d')}</p>
              </div>
              <div className="space-y-2" aria-hidden="true">
                {BOARD.map(([dep, arr], i) => (
                  <div key={dep} className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 ${i === 0 ? 'bg-white/15' : 'bg-white/[0.06]'}`}>
                    <span className="num text-xl">{dep}</span>
                    <span className="h-px flex-1 border-t border-dashed border-white/30" />
                    <span className="num text-xl">{arr}</span>
                    <span className="hidden w-32 text-right text-sm text-white/60 sm:block">Berlin – {WARSAW[locale] ?? 'Warsaw'}</span>
                  </div>
                ))}
              </div>
            </div>
          </li>

          <li className="glass-tile md:col-span-2" style={{ '--tint': 'rgba(255,190,40,0.22)' } as React.CSSProperties}>
            <div className="flex items-center justify-between gap-5 p-6 sm:p-7">
              <div>
                <span className="icon-chip bg-[#e8a700]">
                  <Armchair size={22} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl sm:text-2xl">{t('why.comfort.t')}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-white/70">{t('why.comfort.d')}</p>
              </div>
              <div className="grid shrink-0 grid-cols-4 gap-1.5" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <span key={i} className={`size-6 rounded-md sm:size-7 ${i === 6 ? 'bg-accent shadow-[0_0_18px_rgba(255,210,63,0.7)]' : [2, 3, 9, 12, 13].includes(i) ? 'bg-white/10' : 'bg-white/25'}`} />
                ))}
              </div>
            </div>
          </li>

          <li className="glass-tile" style={{ '--tint': 'rgba(40,200,130,0.2)' } as React.CSSProperties}>
            <div className="flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="icon-chip bg-[#1f9d68]">
                  <ShieldCheck size={22} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="grid size-14 grid-cols-3 gap-0.5 rounded-lg bg-white p-1.5" aria-hidden="true">
                  {[1, 1, 1, 1, 0, 1, 1, 1, 0].map((on, i) => (
                    <span key={i} className={on ? 'rounded-[2px] bg-[#0d1220]' : ''} />
                  ))}
                </span>
              </div>
              <div>
                <h3 className="text-xl">{t('why.safe.t')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{t('why.safe.d')}</p>
              </div>
            </div>
          </li>

          <li className="glass-tile" style={{ '--tint': 'rgba(140,90,255,0.26)' } as React.CSSProperties}>
            <div className="flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="icon-chip bg-[#7a3cff]">
                  <Tag size={22} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="num text-3xl text-accent" aria-hidden="true">
                  €16
                </span>
              </div>
              <div>
                <h3 className="text-xl">{t('why.price.t')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{t('why.price.d')}</p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section className="container-x mt-24">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/15 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
          <img src="/cta-road.webp" alt="" loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 -z-20 size-full object-cover [object-position:center_60%]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgba(9,11,25,0.94)_0%,rgba(9,11,25,0.78)_42%,rgba(9,11,25,0.15)_100%)]" aria-hidden="true" />
          <div className="grid items-end gap-10 px-8 py-14 sm:px-14 sm:py-20 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="max-w-xl text-4xl leading-[1.02] sm:text-6xl">{t('mapTitle')}</h2>
              <p className="mt-4 max-w-md text-lg text-white/75">{t('mapText')}</p>
              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                {[
                  ['13', t('statCities')],
                  ['19', t('statRoutes')],
                  ['4', t('statLangs')],
                ].map(([num, label]) => (
                  <li key={label} className="flex items-baseline gap-2">
                    <span className="num text-4xl text-accent">{num}</span>
                    <span className="text-white/70">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:justify-self-end">
              <Link href="/map" className="btn-accent !min-h-16 !px-10 text-lg shadow-[0_18px_40px_-12px_rgba(255,210,63,0.55)]">
                {t('mapCta')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ClientMessages>
  );
}
