'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

export function VerifyEmail() {
  const t = useTranslations('auth');
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, [token]);

  return (
    <div className="container-x grid min-h-[50vh] place-items-center py-12">
      <div className="card max-w-md p-8 text-center">
        <p className="text-lg font-bold">{state === 'loading' ? t('verifying') : state === 'ok' ? t('verified') : t('verifyFailed')}</p>
        {state !== 'loading' && (
          <Link href="/account" className="btn-primary mt-5">
            OK
          </Link>
        )}
      </div>
    </div>
  );
}
