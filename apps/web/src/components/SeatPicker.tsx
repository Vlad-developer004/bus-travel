'use client';

import { useTranslations } from 'next-intl';

interface Props {
  seatCount: number;
  taken: number[];
  selected: number[];
  max: number;
  onToggle: (seat: number) => void;
}

export function SeatPicker({ seatCount, taken, selected, max, onToggle }: Props) {
  const t = useTranslations('trip');
  const rows = Math.ceil(seatCount / 4);

  const seat = (n: number) => {
    if (n > seatCount) return <span key={n} />;
    const isTaken = taken.includes(n);
    const isSel = selected.includes(n);
    const blocked = isTaken || (!isSel && selected.length >= max);
    return (
      <button
        key={n}
        type="button"
        disabled={blocked}
        aria-pressed={isSel}
        aria-label={`${n}${isTaken ? ` (${t('taken')})` : ''}`}
        onClick={() => onToggle(n)}
        className={`grid size-10 place-items-center rounded-lg border text-xs font-bold tabular-nums transition sm:size-11 ${
          isTaken
            ? 'cursor-not-allowed border-line bg-line/60 text-muted line-through'
            : isSel
              ? 'border-brand bg-brand text-white shadow-md'
              : 'border-line bg-surface hover:border-brand disabled:opacity-40'
        }`}
      >
        {n}
      </button>
    );
  };

  return (
    <div>
      <div className="mx-auto w-fit rounded-[2rem] border border-line bg-surface/60 p-4 pb-5">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">⬆ {t('front')}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, auto) 1.25rem repeat(2, auto)' }}>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="contents">
              {seat(4 * r + 1)}
              {seat(4 * r + 2)}
              <span aria-hidden="true" />
              {seat(4 * r + 3)}
              {seat(4 * r + 4)}
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-4 rounded border border-line bg-surface" /> {t('free')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-4 rounded border border-brand bg-brand" /> {t('selected')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-4 rounded border border-line bg-line/60" /> {t('taken')}
        </li>
      </ul>
    </div>
  );
}
