import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('help');
  const faq = t.raw('faq') as { q: string; a: string }[];

  return (
    <div className="container-x max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t('title')}</h1>
      <div className="space-y-3">
        {faq.map((item) => (
          <details key={item.q} className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {item.q}
              <span className="text-brand transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-3 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
