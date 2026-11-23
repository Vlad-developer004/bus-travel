import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const BASE = ['nav', 'common'];

export async function ClientMessages({ ns = [], children }: { ns?: string[]; children: React.ReactNode }) {
  const all = (await getMessages()) as Record<string, unknown>;
  const messages = Object.fromEntries([...new Set([...BASE, ...ns])].filter((k) => k in all).map((k) => [k, all[k]]));
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
