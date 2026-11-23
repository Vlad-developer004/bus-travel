import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MapLoader } from '@/components/MapLoader';

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('map');
  return (
    <div className="container-x py-8">
      <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mb-6 mt-1 text-muted">{t('subtitle')}</p>
      <MapLoader />
    </div>
  );
}
