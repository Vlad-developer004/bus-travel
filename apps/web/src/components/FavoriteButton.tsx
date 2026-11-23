'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFavorites } from '@/lib/favorites';

export function FavoriteButton({ from, to, className = '', variant = 'plain' }: { from: string; to: string; className?: string; variant?: 'plain' | 'glass' }) {
  const t = useTranslations('extras');
  const { has, toggle } = useFavorites();
  const on = has(from, to);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t('unsave') : t('save')}
      title={on ? t('unsave') : t('save')}
      onClick={() => toggle(from, to)}
      className={`grid place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        variant === 'glass' ? 'size-10 bg-white/90 text-[#0d1220] hover:bg-white' : 'size-10 border border-white/20 bg-white/[0.06] hover:border-white/40'
      } ${className}`}
    >
      <Heart size={19} className={on ? 'fill-[#ff4d6a] text-[#ff4d6a]' : ''} aria-hidden="true" />
    </button>
  );
}
