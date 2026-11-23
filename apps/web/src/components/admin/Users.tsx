'use client';

import { BadgeCheck, Crown, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '../AuthProvider';
import { Select } from '../Select';
import { chip, type Dir, Pager, SortTh, TableCard, Th, useDebounced } from './ui';

type SortKey = 'createdAt' | 'email' | 'bookings' | 'role';
type Role = 'USER' | 'DRIVER' | 'ADMIN';
interface Row {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isOwner: boolean;
  verified: boolean;
  createdAt: string;
  bookings: number;
}

export function Users() {
  const t = useTranslations('admin');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<Role | ''>('');
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  const [sort, setSort] = useState<SortKey>('createdAt');
  const [dir, setDir] = useState<Dir>('desc');
  const [note, setNote] = useState('');

  useEffect(() => setPage(1), [role, query, sort, dir]);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), sort, dir });
    if (role) p.set('role', role);
    if (query) p.set('q', query);
    api<{ items: Row[]; total: number }>(`/admin/users?${p}`)
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
      })
      .catch(() => setRows([]));
  }, [page, sort, dir, role, query]);
  useEffect(load, [load]);

  const onSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir(k === 'email' || k === 'role' ? 'asc' : 'desc');
    }
  };
  async function setUserRole(id: string, r: 'USER' | 'DRIVER') {
    await api(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role: r }) }).then(() => setNote(t('roleSaved'))).catch(() => setNote(t('actionFail')));
    load();
  }
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
  const label = (r: Role) => (r === 'ADMIN' ? tn('admin') : r === 'DRIVER' ? tn('driver') : t('passenger'));
  const th = (k: SortKey, text: string) => <SortTh key={k} k={k} label={text} sort={sort} dir={dir} onSort={onSort} />;

  return (
    <section aria-labelledby="us-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="us-h" className="text-xl font-bold">
          {t('users')} <span className="num text-base text-muted">{total}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">{t('searchUsers')}</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchUsers')} maxLength={60} className="h-9 w-64 rounded-full border border-white/15 bg-white/[0.06] pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/50" />
          </label>
          {(['', 'USER', 'DRIVER', 'ADMIN'] as (Role | '')[]).map((r) => (
            <button key={r || 'all'} onClick={() => setRole(r)} aria-pressed={role === r} className={chip(role === r)}>
              {r ? label(r) : t('all')}
            </button>
          ))}
        </div>
      </div>
      {note && (
        <p role="status" className="mb-3 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
          {note}
        </p>
      )}

      <TableCard roomBelow>
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-white/50">
            <tr>
              {th('email', t('email'))}
              {th('role', t('role'))}
              {th('bookings', t('bookingsCount'))}
              {th('createdAt', t('registered'))}
              <Th label={t('emailVerified')} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows?.map((u) => (
              <tr key={u.id} className="transition hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <span className="block font-semibold">{u.name ?? u.email}</span>
                  {u.name && <span className="block text-xs text-muted">{u.email}</span>}
                </td>
                <td className="px-4 py-3">
                  {u.role === 'ADMIN' || u.id === user?.id ? (
                    <span className="inline-flex items-center gap-1.5 text-white/80">
                      {u.isOwner && <Crown size={13} className="text-accent" aria-label={t('owner')} />}
                      {label(u.role)}
                    </span>
                  ) : (
                    <Select ariaLabel={`${t('role')}: ${u.email}`} className="w-40" triggerClassName="!min-h-8 !rounded-full !py-0 !text-sm" value={u.role} onChange={(v) => setUserRole(u.id, v as 'USER' | 'DRIVER')} options={[{ value: 'USER', label: t('passenger') }, { value: 'DRIVER', label: tn('driver') }]} />
                  )}
                </td>
                <td className="num px-4 py-3">{u.bookings}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white/70">{date(u.createdAt)}</td>
                <td className="px-4 py-3">{u.verified ? <BadgeCheck size={17} className="text-ok" aria-label={t('emailVerified')} /> : <span className="text-white/30">–</span>}</td>
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
