'use client';

import { Spinner } from './Spinner';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError, post } from '@/lib/api';
import { Stars, StarInput } from './Stars';

interface Props {
  bookingId: string;
  existing?: { rating: number; comment: string | null } | null;
  onDone: () => void;
}

export function ReviewForm({ bookingId, existing, onDone }: Props) {
  const t = useTranslations('reviews');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (existing) {
    return (
      <div className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="font-bold">{t('yours')}</h2>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={existing.rating} size={20} />
          <span className="text-sm text-muted">{t('stars', { n: existing.rating })}</span>
        </div>
        {existing.comment && <p className="mt-2 text-sm text-muted">{existing.comment}</p>}
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setBusy(true);
    setError('');
    try {
      await post('/reviews', { bookingId, rating, comment: comment.trim() || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t('thanks') : t('error'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-line p-5">
      <h2 className="font-bold">{t('write')}</h2>
      <p className="label mt-3">{t('yourRating')}</p>
      <StarInput value={rating} onChange={setRating} label={(n) => t('stars', { n })} />
      <label htmlFor="review-text" className="label mt-4">
        {t('comment')}
      </label>
      <textarea id="review-text" className="field min-h-24 py-3" maxLength={600} placeholder={t('commentPh')} value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary mt-4" disabled={!rating || busy} aria-busy={busy}>
        {busy && <Spinner />}
        {t('submit')}
      </button>
    </form>
  );
}
