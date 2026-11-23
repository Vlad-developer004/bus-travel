'use client';

import { Check, Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { cityName, duration, money } from '@/lib/format';
import type { CityRef } from '@/lib/types';
import { Select } from '../Select';
import { TableCard, Th } from './ui';

interface RouteRow {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  basePriceCents: number;
  schedules: number;
}
interface Schedule {
  id: string;
  routeId: string;
  departureTime: string;
  daysOfWeek: number[];
  priceCents: number | null;
  active: boolean;
  route: { from: { names: CityRef['names'] }; to: { names: CityRef['names'] } };
  bus: { plate: string };
}
interface Bus {
  id: string;
  plate: string;
  model: string;
}

export function Routes() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [routes, setRoutes] = useState<RouteRow[] | null>(null);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [edit, setEdit] = useState<{ id: string; value: string } | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ routeId: '', busId: '', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], price: '' });

  const load = useCallback(() => {
    api<RouteRow[]>(`/admin/routes?locale=${locale}`).then(setRoutes).catch(() => setRoutes([]));
    api<Schedule[]>('/admin/templates').then(setSchedules).catch(() => setSchedules([]));
  }, [locale]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Bus[]>('/admin/buses').then((b) => { setBuses(b); setForm((f) => ({ ...f, busId: f.busId || b[0]?.id || '' })); }).catch(() => undefined);
  }, []);
  useEffect(() => setForm((f) => (f.routeId || !routes?.length ? f : { ...f, routeId: routes[0].id })), [routes]);

  const wd = (d: number) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d)));

  async function savePrice(id: string) {
    const cents = Math.round(Number(edit?.value.replace(',', '.')) * 100);
    setEdit(null);
    if (!cents || cents < 100) return;
    await api(`/admin/routes/${id}`, { method: 'PATCH', body: JSON.stringify({ basePriceCents: cents }) }).then(() => setNote(t('priceSaved'))).catch(() => setNote(t('actionFail')));
    load();
  }
  async function toggle(s: Schedule) {
    await api(`/admin/templates/${s.id}`, { method: 'PATCH', body: JSON.stringify({ active: !s.active }) }).catch(() => setNote(t('actionFail')));
    load();
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post('/admin/templates', { routeId: form.routeId, busId: form.busId, departureTime: form.time, daysOfWeek: form.days, priceCents: form.price ? Math.round(Number(form.price) * 100) : undefined });
      setNote(t('scheduleCreated'));
      setAdding(false);
      load();
    } catch {
      setNote(t('actionFail'));
    }
  }

  return (
    <div className="space-y-10">
      {note && (
        <p role="status" className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm">
          {note}
        </p>
      )}

      <section aria-labelledby="rt-h">
        <h2 id="rt-h" className="mb-1 text-xl font-bold">
          {t('routes')}
        </h2>
        <p className="mb-3 max-w-2xl text-sm text-muted">{t('routesHint')}</p>
        <TableCard>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-white/50">
              <tr>
                <Th label={t('route')} />
                <Th label={t('distance')} />
                <Th label={t('durationCol')} />
                <Th label={t('basePrice')} />
                <Th label={t('schedules')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {routes?.map((r) => (
                <tr key={r.id} className="transition hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-semibold">
                    {r.from} → {r.to}
                  </td>
                  <td className="num px-4 py-3 text-white/70">{r.distanceKm} km</td>
                  <td className="px-4 py-3 text-white/70">{duration(r.durationMin, locale)}</td>
                  <td className="px-4 py-3">
                    {edit?.id === r.id ? (
                      <span className="flex items-center gap-1">
                        <input autoFocus aria-label={t('basePrice')} className="field !h-8 !w-24 !rounded-lg !px-2 !py-0 text-sm" inputMode="decimal" value={edit.value} onChange={(e) => setEdit({ id: r.id, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void savePrice(r.id); if (e.key === 'Escape') setEdit(null); }} />
                        <button className="grid size-8 place-items-center rounded-full text-ok hover:bg-white/10" onClick={() => savePrice(r.id)} aria-label={t('save')}>
                          <Check size={15} aria-hidden="true" />
                        </button>
                      </span>
                    ) : (
                      <button className="num group inline-flex items-center gap-1.5 hover:text-accent" onClick={() => setEdit({ id: r.id, value: (r.basePriceCents / 100).toFixed(2) })} aria-label={`${t('editPrice')}: ${money(r.basePriceCents, 'EUR', locale)}`}>
                        {money(r.basePriceCents, 'EUR', locale)}
                        <Pencil size={12} className="opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                  <td className="num px-4 py-3 text-white/70">{r.schedules}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {routes === null && <div className="h-40 animate-pulse" />}
        </TableCard>
      </section>

      <section aria-labelledby="sc-h">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 id="sc-h" className="text-xl font-bold">
            {t('schedulesTitle')}
          </h2>
          <button className="btn-primary !min-h-10" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus size={16} aria-hidden="true" />
            {t('addSchedule')}
          </button>
        </div>
        <p className="mb-3 max-w-2xl text-sm text-muted">{t('schedulesHint')}</p>

        {adding && (
          <form onSubmit={create} className="glass-tile still mb-4 space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="label" htmlFor="ns-route">{t('route')}</label>
                <Select id="ns-route" value={form.routeId} onChange={(v) => setForm({ ...form, routeId: v })} options={(routes ?? []).map((r) => ({ value: r.id, label: `${r.from} → ${r.to}` }))} />
              </div>
              <div>
                <label className="label" htmlFor="ns-bus">{t('bus')}</label>
                <Select id="ns-bus" value={form.busId} onChange={(v) => setForm({ ...form, busId: v })} options={buses.map((b) => ({ value: b.id, label: b.plate }))} />
              </div>
              <div>
                <label className="label" htmlFor="ns-time">{t('timeUtc')}</label>
                <input id="ns-time" type="time" required className="field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <fieldset>
              <legend className="label">{t('days')}</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button key={d} type="button" aria-pressed={form.days.includes(d)} onClick={() => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${form.days.includes(d) ? 'border-transparent bg-brand text-white' : 'border-white/15 bg-white/[0.05]'}`}>
                    {wd(d)}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="ns-price">{t('priceOptional')}</label>
                <input id="ns-price" type="number" min="1" max="1000" step="0.01" className="field !w-40" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <button className="btn-primary" disabled={!form.days.length}>
                {t('create')}
              </button>
            </div>
          </form>
        )}

        <TableCard>
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-white/50">
              <tr>
                <Th label={t('route')} />
                <Th label={t('timeUtc')} />
                <Th label={t('days')} />
                <Th label={t('bus')} />
                <Th label={t('price')} />
                <Th label={t('active')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {schedules?.map((s) => (
                <tr key={s.id} className={`transition hover:bg-white/[0.04] ${s.active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 font-semibold">
                    {cityName(s.route.from.names, locale)} → {cityName(s.route.to.names, locale)}
                  </td>
                  <td className="num px-4 py-3">{s.departureTime}</td>
                  <td className="px-4 py-3 text-white/70">{s.daysOfWeek.length === 7 ? t('daily') : [...s.daysOfWeek].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(wd).join(', ')}</td>
                  <td className="px-4 py-3 text-white/70">{s.bus.plate}</td>
                  <td className="num px-4 py-3 text-white/70">{s.priceCents ? money(s.priceCents, 'EUR', locale) : t('byRoute')}</td>
                  <td className="px-4 py-3">
                    <button type="button" role="switch" aria-checked={s.active} aria-label={`${t('active')}: ${cityName(s.route.from.names, locale)} → ${cityName(s.route.to.names, locale)} ${s.departureTime}`} onClick={() => toggle(s)} className={`relative h-6 w-11 rounded-full transition ${s.active ? 'bg-ok' : 'bg-white/20'}`}>
                      <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${s.active ? 'left-[1.4rem]' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {schedules === null && <div className="h-40 animate-pulse" />}
        </TableCard>
      </section>
    </div>
  );
}
