import { setRequestLocale } from 'next-intl/server';
import { DriverScan } from '@/components/DriverScan';

export default async function DriverPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <DriverScan />;
}
