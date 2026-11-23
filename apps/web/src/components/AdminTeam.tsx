'use client';

import { Crown, MailPlus, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, post } from '@/lib/api';

interface Team {
  admins: { id: string; email: string; name: string | null; isOwner: boolean }[];
  invites: { id: string; email: string; expiresAt: string }[];
}

export function AdminTeam() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => api<Team>('/admin/team').then(setTeam).catch(() => undefined), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const r = await post<{ status: 'invited' | 'promoted' }>('/admin/team/invite', { email, locale });
      setNote({ ok: true, text: t(r.status === 'invited' ? 'sentInvite' : 'promoted', { email }) });
      setEmail('');
      await load();
    } catch (err) {
      setNote({ ok: false, text: err instanceof ApiError && err.status === 409 ? t('already') : t('inviteFail') });
    } finally {
      setBusy(false);
    }
  }

  async function del(path: string) {
    await api(path, { method: 'DELETE' }).catch(() => undefined);
    setConfirm(null);
    await load();
  }

  if (!team) return null;
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));

  return (
    <section className="glass-tile still mt-8 p-5 sm:p-6" aria-labelledby="team-h">
      <h2 id="team-h" className="text-xl font-bold">
        {t('team')}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t('teamHint')}</p>

      <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="invite-email" className="label">
            {t('inviteEmail')}
          </label>
          <input id="invite-email" type="email" required maxLength={254} className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <button className="btn-primary" disabled={busy}>
          <MailPlus size={17} aria-hidden="true" />
          {t('inviteBtn')}
        </button>
      </form>
      {note && (
        <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${note.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
          {note.text}
        </p>
      )}

      <ul className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10">
        {team.admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-brand/80 text-sm font-bold">{(a.name ?? a.email)[0].toUpperCase()}</span>
              <span>
                <span className="block font-semibold">{a.name ?? a.email}</span>
                <span className="block text-xs text-muted">{a.email}</span>
              </span>
            </span>
            {a.isOwner ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                <Crown size={13} aria-hidden="true" />
                {t('owner')}
              </span>
            ) : confirm === a.id ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-muted">{t('removeConfirm', { email: a.email })}</span>
                <button className="btn-ghost !min-h-8 !text-bad" onClick={() => del(`/admin/team/${a.id}`)}>
                  {t('remove')}
                </button>
                <button className="btn-ghost !min-h-8" onClick={() => setConfirm(null)} aria-label={t('cancel')}>
                  <X size={15} aria-hidden="true" />
                </button>
              </span>
            ) : (
              <button className="btn-ghost !min-h-8 text-sm" onClick={() => setConfirm(a.id)}>
                <Trash2 size={14} aria-hidden="true" />
                {t('remove')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {team.invites.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-white/60">{t('pendingInvites')}</h3>
          <ul className="space-y-2">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-white/20 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-semibold">{i.email}</span> <span className="text-muted">· {t('expires', { date: date(i.expiresAt) })}</span>
                </span>
                <button className="btn-ghost !min-h-8 text-sm" onClick={() => del(`/admin/team/invites/${i.id}`)}>
                  {t('revoke')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
