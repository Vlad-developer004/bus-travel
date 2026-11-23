'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-white/25" strokeWidth={1.6} />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="fill-accent text-accent" strokeWidth={1.6} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: (n: number) => string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" className="inline-flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={label(n)}
          tabIndex={value === n || (!value && n === 1) ? 0 : -1}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(Math.min(5, (value || 0) + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(Math.max(1, (value || 2) - 1));
            }
          }}
          className="rounded-md p-0.5 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Star size={30} strokeWidth={1.6} className={n <= shown ? 'fill-accent text-accent' : 'text-muted'} />
        </button>
      ))}
    </div>
  );
}
