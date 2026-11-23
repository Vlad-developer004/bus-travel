import { PageLoader } from '@/components/Spinner';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { MockCheckout } from '@/components/MockCheckout';

export default async function MockPayPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <MockCheckout />
    </Suspense>
  );
}
