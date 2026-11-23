'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Flag } from './Flag';

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  alignRight?: boolean;
  ariaLabel?: string;
  variant?: 'field' | 'pill';
  triggerClassName?: string;
}

export function Select({ id, value, options, onChange, placeholder, className = '', compact, alignRight, ariaLabel, variant = 'field', triggerClassName = '' }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const [active, setActive] = useState(Math.max(0, selectedIndex));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  };
  const pick = (i: number) => {
    if (options[i]) onChange(options[i].value);
    setOpen(false);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          typed.current.text = (now - typed.current.at > 700 ? '' : typed.current.text) + e.key.toLowerCase();
          typed.current.at = now;
          const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (hit >= 0) setActive(hit);
        }
    }
  }

  const current = options[selectedIndex];
  const pill = variant === 'pill';

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={
          pill
            ? 'lang-btn flex h-10 items-center gap-2 rounded-full border py-0 pl-2 pr-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
            : `field flex items-center justify-between gap-2 text-left ${compact ? '!min-h-9 !px-2.5 text-xs' : ''} ${open ? 'is-open' : ''} ${triggerClassName}`
        }
      >
        {pill ? (
          <>
            <Flag code={value} className="size-5" />
            <span>{current?.hint}</span>
            <ChevronDown size={14} className={`shrink-0 opacity-70 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </>
        ) : (
          <>
            <span className={`truncate ${current ? '' : 'text-muted'}`}>{current?.label ?? placeholder ?? ''}</span>
            <ChevronDown size={compact ? 14 : 16} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={`dropdown-panel absolute z-50 mt-2 max-h-72 ${pill ? 'min-w-[13.5rem] p-2' : 'min-w-[var(--trigger-w,12rem)] p-1.5'} overflow-auto [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin] ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ width: 'max-content', maxWidth: 'min(22rem, 90vw)' }}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault() }
                onClick={() => pick(i)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 text-[15px] transition-colors ${pill ? 'rounded-xl px-2.5 py-2' : 'rounded-xl px-3 py-2'} ${
                  selected ? 'bg-[#3352ff] font-semibold text-white' : i === active ? 'bg-brand/10' : ''
                }`}
              >
                <span className="flex items-center gap-3">
                  {pill && <Flag code={o.value} className="size-8" />}
                  {o.label}
                  {!pill && o.hint && <span className="rounded bg-line px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted">{o.hint}</span>}
                </span>
                {selected && <Check size={15} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
