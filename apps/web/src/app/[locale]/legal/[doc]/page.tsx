import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

const DOCS = ['privacy', 'terms', 'imprint'] as const;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const sections = t.raw(`${doc}.sections`) as { h: string; p: string }[];

  return (
    <div className="container-x max-w-3xl py-8">
      <div className="glass-tile p-7 sm:p-10" style={{ '--tint': 'rgba(51,82,255,0.2)' } as React.CSSProperties}>
        <h1 className="text-4xl sm:text-5xl">{t(`${doc}.title`)}</h1>
        <div className="mt-8 space-y-7">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-white/70">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
