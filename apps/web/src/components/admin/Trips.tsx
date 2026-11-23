'use client';

import { Check, Pencil, Plus, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { cityName, dateTime, money } from '@/lib/format';
import type { CityRef } from '@/lib/types';
import { DatePicker } from '../DatePicker';
import { Select } from '../Select';
import { chip, type Dir, Pager, SortTh, TableCard, Th } from './ui';

type SortKey = 'departure' | 'price' | 'booked';
type Scope = 'upcoming' | 'past' | 'cancelled';
interface Row {
  id: string;
  departureAt: string;
  priceCents: number;
  currency: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  from: string;
  to: string;
  bus: string;
  seatCount: number;
  booked: number;
}
interface RouteRow {
  id: string;
  from: string;
  to: string;
  basePriceCents: number;
}
interface Bus {
  id: string;
  plate: string;
  model: string;
}

export function Trips() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<Scope>('upcoming');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState<SortKey>('departure');
  const [dir, setDir] = useState<Dir>('asc');
  const [cities, setCities] = useState<CityRef[]>([]);
  const [edit, setEdit] = useState<{ id: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ routeId: '', busId: '', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), time: '08:00', price: '' });

  useEffect(() => {
    api<CityRef[]>('/cities').then(setCities).catch(() => undefined);
  }, []);
  useEffect(() => setPage(1), [scope, from, to, date, sort, dir]);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), scope, sort, dir, locale });
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (date) p.set('date', date);
    api<{ items: Row[]; total: number }>(`/admin/trips?${p}`)
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
      })
      .catch(() => setRows([]));
  }, [page, scope, sort, dir, locale, from, to, date]);
  useEffect(load, [load]);

  async function openAdd() {
    setAdding((v) => !v);
    if (!routes.length) {
      const [r, b] = await Promise.all([api<RouteRow[]>(`/admin/routes?locale=${locale}`), api<Bus[]>('/admin/buses')]).catch(() => [[], []] as [RouteRow[], Bus[]]);
      setRoutes(r);
      setBuses(b);
      setForm((f) => ({ ...f, routeId: r[0]?.id ?? '', busId: b[0]?.id ?? '' }));
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post('/admin/trips', { routeId: form.routeId, busId: form.busId, departureAt: new Date(`${form.date}T${form.time}:00`).toISOString(), priceCents: form.price ? Math.round(Number(form.price) * 100) : undefined });
      setNote(t('tripCreated'));
      setAdding(false);
      load();
    } catch {
      setNote(t('actionFail'));
    }
  }
  async function savePrice(id: string) {
    const cents = Math.round(Number(edit?.value.replace(',', '.')) * 100);
    if (!cents || cents < 100) return setEdit(null);
    await api(`/admin/trips/${id}`, { method: 'PATCH', body: JSON.stringify({ priceCents: cents }) }).catch(() => setNote(t('actionFail')));
    setEdit(null);
    load();
  }
  async function cancelTrip(id: string) {
    const r = await post<{ cancelled: number; refunded: number }>(`/admin/trips/${id}/cancel`).catch(() => null);
    setConfirm(null);
    setNote(r ? t('tripCancelled', { n: r.cancelled, refunded: r.refunded }) : t('actionFail'));
    load();
  }
  const onSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir(k === 'booked' ? 'desc' : 'asc');
    }
  };
  const th = (k: SortKey, label: string) => <SortTh key={k} k={k} label={label} sort={sort} dir={dir} onSort={onSort} />;

  return (
    <section aria-labelledby="tr-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="tr-h" className="text-xl font-bold">
          {t('trips')}
        </h2>
        <button className="btn-primary !min-h-10" onClick={openAdd} aria-expanded={adding}>
          <Plus size={16} aria-hidden="true" />
          {t('addTrip')}
        </button>
      </div>

      {adding && (
        <form onSubmit={create} className="glass-tile still mb-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1.3fr_1.3fr_1fr_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="nt-route">{t('route')}</label>
            <Select id="nt-route" value={form.routeId} onChange={(v) => setForm({ ...form, routeId: v })} options={routes.map((r) => ({ value: r.id, label: `${r.from} → ${r.to}` }))} />
          </div>
          <div>
            <label className="label" htmlFor="nt-bus">{t('bus')}</label>
            <Select id="nt-bus" value={form.busId} onChange={(v) => setForm({ ...form, busId: v })} options={buses.map((b) => ({ value: b.id, label: `${b.plate} · ${b.model}` }))} />
          </div>
          <div>
            <label className="label" htmlFor="nt-at">{t('departure')}</label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <DatePicker id="nt-at" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(v) => setForm({ ...form, date: v })} />
              </div>
              <input aria-label={t('time')} type="time" required className="field !w-28" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nt-price">{t('priceOptional')}</label>
            <input id="nt-price" type="number" min="1" max="1000" step="0.01" className="field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <button className="btn-primary">{t('create')}</button>
        </form>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['upcoming', 'past', 'cancelled'] as Scope[]).map((s) => (
          <button key={s} onClick={() => setScope(s)} aria-pressed={scope === s} className={chip(scope === s)}>
            {t(`scope.${s}`)}
          </button>
        ))}
        <Select
          ariaLabel={t('fromCity')}
          className="w-52"
          triggerClassName="!min-h-9 !rounded-full !py-0 !text-sm"
          value={from}
          onChange={setFrom}
          placeholder={t('fromCity')}
          options={[{ value: '', label: t('fromCity') }, ...cities.map((c) => ({ value: c.slug, label: cityName(c.names, locale) }))]}
        />
        <Select
          ariaLabel={t('toCity')}
          className="w-52"
          triggerClassName="!min-h-9 !rounded-full !py-0 !text-sm"
          value={to}
          onChange={setTo}
          placeholder={t('toCity')}
          options={[{ value: '', label: t('toCity') }, ...cities.map((c) => ({ value: c.slug, label: cityName(c.names, locale) }))]}
        />
        <div className="w-52">
          <DatePicker id="trip-date" value={date} min="2020-01-01" onChange={setDate} onClear={() => setDate('')} clearLabel={t('reset')} placeholder={t('departure')} triggerClassName="!min-h-9 !rounded-full !py-0 !text-sm" />
        </div>
        {(from || to || date) && (
          <button className="px-2 text-sm text-white/60 underline underline-offset-2 hover:text-white" onClick={() => { setFrom(''); setTo(''); setDate(''); }}>
            {t('reset')}
          </button>
        )}
      </div>
      {note && (
        <p role="status" className="mb-3 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
          {note}
        </p>
      )}

      <TableCard>
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-white/50">
            <tr>
              {th('departure', t('departure'))}
              <Th label={t('route')} />
              <Th label={t('bus')} />
              {th('booked', t('occupancyCol'))}
              {th('price', t('price'))}
              <Th label={t('status')} />
              <Th label={t('actions')} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows?.map((r) => (
              <tr key={r.id} className="transition hover:bg-white/[0.04]">
                <td className="whitespace-nowrap px-4 py-3">{dateTime(r.departureAt, locale)}</td>
                <td className="px-4 py-3 font-semibold">
                  {r.from} → {r.to}
                </td>
                <td className="px-4 py-3 text-white/70">{r.bus}</td>
                <td className="px-4 py-3">
                  <span className="num text-xs">
                    {r.booked}/{r.seatCount}
                  </span>
                  <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${(r.booked / r.seatCount) * 100}%` }} />
                  </span>
                </td>
                <td className="px-4 py-3">
                  {edit?.id === r.id ? (
                    <span className="flex items-center gap-1">
                      <input autoFocus aria-label={t('price')} className="field !h-8 !w-24 !rounded-lg !px-2 !py-0 text-sm" inputMode="decimal" value={edit.value} onChange={(e) => setEdit({ id: r.id, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void savePrice(r.id); if (e.key === 'Escape') setEdit(null); }} />
                      <button className="grid size-8 place-items-center rounded-full text-ok hover:bg-white/10" onClick={() => savePrice(r.id)} aria-label={t('save')}>
                        <Check size={15} aria-hidden="true" />
                      </button>
                    </span>
                  ) : (
                    <button className="num group inline-flex items-center gap-1.5 hover:text-accent" onClick={() => setEdit({ id: r.id, value: (r.priceCents / 100).toFixed(2) })} aria-label={`${t('editPrice')}: ${money(r.priceCents, r.currency, locale)}`}>
                      {money(r.priceCents, r.currency, locale)}
                      <Pencil size={12} className="opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${r.status === 'CANCELLED' ? 'bg-bad/15 text-bad' : 'bg-ok/15 text-ok'}`}>{t(`tripStatus.${r.status}`)}</span>
                </td>
                <td className="px-4 py-3">
                  {r.status === 'SCHEDULED' &&
                    (confirm === r.id ? (
                      <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                        <button className="btn-ghost !min-h-8 !text-bad" onClick={() => cancelTrip(r.id)}>
                          {t('cancelTripConfirm', { n: r.booked })}
                        </button>
                        <button className="btn-ghost !min-h-8" onClick={() => setConfirm(null)}>
                          {t('keep')}
                        </button>
                      </span>
                    ) : (
                      <button className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-bad" onClick={() => setConfirm(r.id)} aria-label={t('cancelTrip')} title={t('cancelTrip')}>
                        <XCircle size={15} aria-hidden="true" />
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && <div className="h-40 animate-pulse" />}
        {rows?.length === 0 && <p className="p-6 text-center text-muted">{t('noTrips')}</p>}
      </TableCard>
      <Pager page={page} total={total} onPage={setPage} labels={{ prev: t('prev'), next: t('next'), page: t('page', { n: page, total: Math.max(1, Math.ceil(total / 25)) }) }} />
    </section>
  );
}
