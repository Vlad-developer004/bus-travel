import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LOCALE_LABELS, routing } from '@/i18n/routing';
import credits from '@/lib/photoCredits.json';

export function Footer() {
  const t = useTranslations('footer');
  const n = useTranslations('nav');
  const l = useTranslations('legal');
  const locale = useLocale();

  const col = 'text-sm text-white/60 transition hover:text-white';
  const head = 'mb-4 text-sm font-semibold text-white';

  return (
    <footer className="relative isolate mt-24 overflow-hidden border-t border-white/10">
      <img src="/footer-city.webp" alt="" loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,9,16,0.88)_0%,rgba(7,9,16,0.72)_45%,rgba(7,9,16,0.96)_100%)]" aria-hidden="true" />
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" prefetch={false} className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight" aria-label="BusTravel">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="#3352ff" />
              <path d="M8 10.5A2.5 2.5 0 0 1 10.5 8h11A2.5 2.5 0 0 1 24 10.5V20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9.5Z" fill="#fff" />
              <rect x="10" y="11" width="12" height="5" rx="1" fill="#3352ff" />
              <circle cx="12" cy="24" r="2" fill="#fff" />
              <circle cx="20" cy="24" r="2" fill="#fff" />
            </svg>
            <span>
              Bus<span className="text-accent">Travel</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed text-white/60">{t('tagline')}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">{t('demo')}</p>
        </div>

        <nav aria-label={t('explore')}>
          <h2 className={head}>{t('explore')}</h2>
          <ul className="space-y-2.5">
            <li>
              <Link href="/" prefetch={false} className={col}>
                {n('home')}
              </Link>
            </li>
            <li>
              <Link href="/map" className={col}>
                {n('map')}
              </Link>
            </li>
            <li>
              <Link href="/help" className={col}>
                {n('help')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t('account')}>
          <h2 className={head}>{t('account')}</h2>
          <ul className="space-y-2.5">
            <li>
              <Link href="/login" className={col}>
                {n('login')}
              </Link>
            </li>
            <li>
              <Link href="/register" className={col}>
                {n('register')}
              </Link>
            </li>
            <li>
              <Link href="/account" className={col}>
                {n('trips')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t('languages')}>
          <h2 className={head}>{t('languages')}</h2>
          <ul className="space-y-2.5">
            {routing.locales.map((l) => (
              <li key={l}>
                <Link href="/" prefetch={false} locale={l} className={`${col} ${l === locale ? '!text-accent' : ''}`} aria-current={l === locale ? 'true' : undefined}>
                  {LOCALE_LABELS[l]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {t('rights')}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t('legal')}>
            {(['privacy', 'terms', 'imprint'] as const).map((d) => (
              <li key={d}>
                <Link href={`/legal/${d}`} className="transition hover:text-white">
                  {l(`${d}.title`)}
                </Link>
              </li>
            ))}
          </ul>
          <p>{t('built')}</p>
        </div>
        <details className="container-x pb-6 text-xs text-white/40">
          <summary className="cursor-pointer select-none hover:text-white/70">{t('photos')}</summary>
          <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(credits).map(([slug, c]) => (
              <li key={slug}>
                <a href={c.page} className="underline decoration-white/20 underline-offset-2 hover:text-white" target="_blank" rel="noreferrer">
                  {slug}
                </a>
                : {c.artist}, {c.license}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <p aria-hidden="true" className="pointer-events-none select-none overflow-hidden whitespace-nowrap text-center font-extrabold leading-[0.8] tracking-tighter text-white/[0.06] [font-size:clamp(4rem,17vw,15rem)]">
        BusTravel
      </p>
    </footer>
  );
}
