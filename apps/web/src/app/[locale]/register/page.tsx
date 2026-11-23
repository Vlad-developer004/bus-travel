import { PageLoader } from '@/components/Spinner';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
