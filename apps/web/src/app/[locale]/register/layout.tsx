import { ClientMessages } from '@/i18n/client-messages';

export const metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientMessages ns={['auth']}>{children}</ClientMessages>;
}
