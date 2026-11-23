'use client';

import { ExternalLink, Search, Send, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api, post } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import type { BookingStatus } from '@/lib/types';
import { StatusBadge } from '../StatusBadge';
import { chip, type Dir, Pager, SortTh, TableCard, Th, useDebounced } from './ui';

type SortKey = 'createdAt' | 'code' | 'route' | 'departure' | 'email' | 'seats' | 'total' | 'status';
interface Row {
  id: string;
  code: string;
  status: BookingStatus;
  email: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  departureAt: string;
  from: string;
  to: string;
  seats: number[];
}
const FILTERS: (BookingStatus | '')[] = ['', 'PAID', 'PENDING', 'CANCELLED', 'EXPIRED'];

export function Bookings() {
  const t = useTranslations('admin');
  const ts = useTranslations('account');
  const locale = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<BookingStatus | ''>('');
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  const [sort, setSort] = useState<SortKey>('createdAt');
  const [dir, setDir] = useState<Dir>('desc');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => setPage(1), [filter, query, sort, dir]);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), sort, dir, locale });
    if (filter) p.set('status', filter);
    if (query) p.set('q', query);
    api<{ items: Row[]; total: number }>(`/admin/bookings?${p}`)
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
      })
      .catch(() => setRows([]));
  }, [page, sort, dir, locale, filter, query]);
  useEffect(load, [load]);

  const onSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir(k === 'createdAt' || k === 'total' || k === 'departure' ? 'desc' : 'asc');
    }
  };

  async function cancel(id: string) {
    const r = await post<{ refunded: boolean }>(`/admin/bookings/${id}/cancel`).catch(() => null);
    setConfirm(null);
    setNote(r ? (r.refunded ? t('cancelledRefunded') : t('cancelledOk')) : t('actionFail'));
    load();
  }
  async function resend(id: string) {
    const r = await post(`/admin/bookings/${id}/resend`).catch(() => null);
    setNote(r ? t('resent') : t('actionFail'));
  }

  const th = (k: SortKey, label: string) => <SortTh key={k} k={k} label={label} sort={sort} dir={dir} onSort={onSort} />;
  return (
    <section aria-labelledby="bk-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="bk-h" className="text-xl font-bold">
          {t('bookings')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">{t('search')}</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} maxLength={60} className="h-9 w-64 rounded-full border border-white/15 bg-white/[0.06] pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/50" />
          </label>
          {FILTERS.map((f) => (
            <button key={f || 'all'} onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>
              {f ? ts(`status.${f}`) : t('all')}
            </button>
          ))}
        </div>
      </div>
      {note && (
        <p role="status" className="mb-3 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
          {note}
        </p>
      )}

      <TableCard>
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-white/50">
            <tr>
              {th('createdAt', t('booked'))}
              {th('code', t('code'))}
              {th('route', t('route'))}
              {th('departure', t('departure'))}
              {th('email', t('email'))}
              {th('seats', t('seatsCol'))}
              {th('total', t('total'))}
              {th('status', t('status'))}
              <Th label={t('actions')} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows?.map((r) => (
              <tr key={r.id} className="transition hover:bg-white/[0.04]">
                <td className="whitespace-nowrap px-4 py-3 text-white/70">{dateTime(r.createdAt, locale)}</td>
                <td className="px-4 py-3 font-mono font-semibold">{r.code}</td>
                <td className="px-4 py-3">
                  {r.from} → {r.to}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{dateTime(r.departureAt, locale)}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.seats.join(', ')}</td>
                <td className="num px-4 py-3">{money(r.totalCents, r.currency, locale)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  {confirm === r.id ? (
                    <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                      <button className="btn-ghost !min-h-8 !text-bad" onClick={() => cancel(r.id)}>
                        {r.status === 'PAID' ? t('cancelRefund') : t('cancelBooking')}
                      </button>
                      <button className="btn-ghost !min-h-8" onClick={() => setConfirm(null)}>
                        {t('keep')}
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Link href={`/account/bookings/${r.id}`} className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label={t('openTicket')} title={t('openTicket')}>
                        <ExternalLink size={15} aria-hidden="true" />
                      </Link>
                      {r.status === 'PAID' && (
                        <button className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" onClick={() => resend(r.id)} aria-label={t('resend')} title={t('resend')}>
                          <Send size={15} aria-hidden="true" />
                        </button>
                      )}
                      {(r.status === 'PAID' || r.status === 'PENDING') && (
                        <button className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-bad" onClick={() => setConfirm(r.id)} aria-label={t('cancelBooking')} title={t('cancelBooking')}>
                          <XCircle size={15} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && <div className="h-40 animate-pulse" />}
        {rows?.length === 0 && <p className="p-6 text-center text-muted">{t('empty')}</p>}
      </TableCard>
      <Pager page={page} total={total} onPage={setPage} labels={{ prev: t('prev'), next: t('next'), page: t('page', { n: page, total: Math.max(1, Math.ceil(total / 25)) }) }} />
    </section>
  );
}
