import { PageLoader } from '@/components/Spinner';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { SearchResults } from '@/components/SearchResults';

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <SearchResults />
    </Suspense>
  );
}
