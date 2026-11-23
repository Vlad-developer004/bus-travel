import { ClientMessages } from '@/i18n/client-messages';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientMessages ns={['auth']}>{children}</ClientMessages>;
}
