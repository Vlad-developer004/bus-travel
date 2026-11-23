import { PageLoader } from '@/components/Spinner';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { BookingDetail } from '@/components/BookingDetail';

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <BookingDetail />
    </Suspense>
  );
}
