import { setRequestLocale } from 'next-intl/server';
import { AccountBookings } from '@/components/AccountBookings';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <AccountBookings />;
}
