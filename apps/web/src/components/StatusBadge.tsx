'use client';

import { useTranslations } from 'next-intl';
import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-accent/20 text-[#8a5a00] dark:text-accent',
  PAID: 'bg-ok/15 text-ok',
  CANCELLED: 'bg-line text-muted',
  EXPIRED: 'bg-line text-muted',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations('account.status');
  return <span className={`badge ${STYLES[status]}`}>{t(status)}</span>;
}
