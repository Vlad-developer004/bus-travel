'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Dir = 'asc' | 'desc';

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function SortTh<K extends string>({ k, label, sort, dir, onSort }: { k: K; label: string; sort: K; dir: Dir; onSort: (k: K) => void }) {
  const on = sort === k;
  return (
    <th className="px-4 py-3 font-semibold" aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-white ${on ? 'text-white' : ''}`}>
        {label}
        {on ? dir === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={13} className="opacity-40" aria-hidden="true" />}
      </button>
    </th>
  );
}

export function Th({ label }: { label: string }) {
  return <th className="px-4 py-3 font-semibold uppercase tracking-wide">{label}</th>;
}

export function Pager({ page, total, size = 25, onPage, labels }: { page: number; total: number; size?: number; onPage: (p: number) => void; labels: { prev: string; next: string; page: string } }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button className="btn-ghost !min-h-9" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {labels.prev}
      </button>
      <span className="text-muted">{labels.page}</span>
      <button className="btn-ghost !min-h-9" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {labels.next}
      </button>
    </nav>
  );
}

export const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? 'border-transparent bg-brand text-white' : 'border-white/15 bg-white/[0.05] hover:border-white/40'}`;

export const TableCard = ({ children, roomBelow }: { children: React.ReactNode; roomBelow?: boolean }) => <div className={`glass-tile still overflow-x-auto !rounded-3xl ${roomBelow ? 'pb-24' : ''}`}>{children}</div>;
