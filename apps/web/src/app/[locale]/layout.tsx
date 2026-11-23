import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Onest } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { BackgroundArt } from '@/components/BackgroundArt';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { TopLoader } from '@/components/TopLoader';
import { ClientMessages } from '@/i18n/client-messages';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

const body = Onest({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-body', display: 'swap' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: '%s · BusTravel' },
    description: t('description'),
    metadataBase: new URL(SITE_URL),
    openGraph: {
      type: 'website',
      siteName: 'BusTravel',
      title: t('title'),
      description: t('description'),
      locale,
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'BusTravel' }],
    },
    twitter: { card: 'summary_large_image', title: t('title'), description: t('description'), images: ['/og.jpg'] },
  };
}

export const viewport = { themeColor: '#0d1220', colorScheme: 'dark' } as const;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${body.variable} dark`}>
      <body>
        <ClientMessages>
          <AuthProvider>
            <Suspense fallback={null}>
              <TopLoader />
            </Suspense>
            <BackgroundArt />
            <Header />
            <main>{children}</main>
            <Footer />
          </AuthProvider>
        </ClientMessages>
      </body>
    </html>
  );
}
