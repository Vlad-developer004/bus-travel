import { setRequestLocale } from 'next-intl/server';
import { AdminDashboard } from '@/components/AdminDashboard';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <AdminDashboard />;
}
