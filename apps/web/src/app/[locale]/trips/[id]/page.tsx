import { PageLoader } from '@/components/Spinner';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { TripBooking } from '@/components/TripBooking';

export default async function TripPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <TripBooking />
    </Suspense>
  );
}
