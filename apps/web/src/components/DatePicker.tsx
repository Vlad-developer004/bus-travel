'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
};
const addDays = (s: string, n: number) => {
  const { y, m, d } = parse(s);
  const t = new Date(Date.UTC(y, m, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
const addMonths = (s: string, n: number) => {
  const { y, m, d } = parse(s);
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m + n, Math.min(d, last)));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  id: string;
  value: string;
  min: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  clearLabel?: string;
  triggerClassName?: string;
}

export function DatePicker({ id, value, min, onChange, placeholder, onClear, clearLabel, triggerClassName = '' }: Props) {
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value || min);
  const [moved, setMoved] = useState(false);
  const [up, setUp] = useState(false);

  const fmt = useMemo(() => (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o }), [locale]);
  const label = (s: string, o: Intl.DateTimeFormatOptions) => fmt(o).format(new Date(`${s}T12:00:00Z`));

  const { y, m } = parse(focus);
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const weekdays = Array.from({ length: 7 }, (_, i) => cap(fmt({ weekday: 'short' }).format(new Date(Date.UTC(2024, 0, 1 + i)))));
  const today = new Date().toISOString().slice(0, 10);
  const todayWord = cap(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day'));

  function toggle() {
    if (!open) {
      setFocus(value >= min ? value : min);
      setMoved(true);
      const r = trigger.current?.getBoundingClientRect();
      setUp(!!r && window.innerHeight - r.bottom < 430 && r.top > 430);
    }
    setOpen(!open);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  function pick(s: string) {
    if (s < min) return;
    onChange(s);
    close();
  }

  useLayoutEffect(() => {
    if (!open || !dialog.current) return;
    setShift(0);
    const r = dialog.current.getBoundingClientRect();
    const margin = 12;
    if (r.right > window.innerWidth - margin) setShift(window.innerWidth - margin - r.right);
    else if (r.left < margin) setShift(margin - r.left);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);

  useEffect(() => {
    if (open && moved) grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus();
  }, [open, moved, focus]);

  function onKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string | null = null;
    if (e.key in step) next = addDays(focus, step[e.key]);
    else if (e.key === 'PageDown') next = addMonths(focus, e.shiftKey ? 12 : 1);
    else if (e.key === 'PageUp') next = addMonths(focus, e.shiftKey ? -12 : -1);
    else if (e.key === 'Home') next = addDays(focus, -((lead + parse(focus).d - 1) % 7));
    else if (e.key === 'End') next = addDays(focus, 6 - ((lead + parse(focus).d - 1) % 7));
    else if (e.key === 'Escape') {
      e.preventDefault();
      return close();
    }
    if (next) {
      e.preventDefault();
      setFocus(next < min ? min : next);
      setMoved(true);
    }
  }

  const monthLabel = cap(label(focus, { month: 'long', year: 'numeric' }));
  const canGoBack = addMonths(focus, -1).slice(0, 7) >= min.slice(0, 7);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        id={id}
        type="button"
        className={`field flex items-center whitespace-nowrap text-left ${triggerClassName}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        {value ? label(value, { weekday: 'short', day: 'numeric', month: 'short' }) : <span className="text-muted">{placeholder ?? ''}</span>}
      </button>

      {open && (
        <div
          ref={dialog}
          role="dialog"
          style={{ transform: shift ? `translateX(${shift}px)` : undefined }}
          aria-label={monthLabel}
          className={`card absolute left-0 z-50 w-[min(21rem,calc(100vw-2rem))] p-4 ${up ? 'bottom-full mb-5' : 'mt-3'} shadow-[0_24px_60px_-16px_rgba(13,18,32,0.4)]`}
          onKeyDown={onKey}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="px-1 text-base font-bold" aria-live="polite">
              {monthLabel}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full border border-line transition hover:bg-bg disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label={label(addMonths(focus, -1), { month: 'long', year: 'numeric' })}
                disabled={!canGoBack}
                onClick={() => setFocus(addMonths(focus, -1) < min ? min : addMonths(focus, -1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full border border-line transition hover:bg-bg"
                aria-label={label(addMonths(focus, 1), { month: 'long', year: 'numeric' })}
                onClick={() => setFocus(addMonths(focus, 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted" aria-hidden="true">
            {weekdays.map((w) => (
              <span key={w} className="py-1.5">
                {w}
              </span>
            ))}
          </div>

          <div ref={grid} role="grid" className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = iso(y, m, i + 1);
              const disabled = d < min;
              const selected = d === value;
              return (
                <button
                  key={d}
                  type="button"
                  data-iso={d}
                  role="gridcell"
                  tabIndex={d === focus ? 0 : -1}
                  disabled={disabled}
                  aria-selected={selected}
                  aria-label={label(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  aria-current={d === today ? 'date' : undefined}
                  onClick={() => pick(d)}
                  className={`mx-auto grid size-10 place-items-center rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                    selected
                      ? 'bg-brand text-white shadow-md'
                      : disabled
                        ? 'text-muted/40'
                        : d === today
                          ? 'bg-accent/30 hover:bg-accent/50'
                          : 'hover:bg-bg'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/10" onClick={() => pick(today < min ? min : today)}>
              {todayWord}
            </button>
            {value && onClear ? (
              <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-white/10 hover:text-white" onClick={() => { onClear(); close(); }}>
                {clearLabel}
              </button>
            ) : (
              <span className="text-xs text-muted">{value ? label(value, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
