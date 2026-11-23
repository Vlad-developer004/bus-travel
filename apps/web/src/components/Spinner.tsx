'use client';

import { useTranslations } from 'next-intl';

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader() {
  const t = useTranslations('common');
  return (
    <div className="container-x grid min-h-[80vh] place-items-center py-16" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-16 w-48 overflow-hidden" aria-hidden="true">
          <span className="absolute inset-x-0 bottom-2 h-[3px] rounded-full bg-white/15" />
          <span className="absolute bottom-2 left-0 h-[3px] w-1/3 rounded-full bg-accent [animation:road-run_1.2s_linear_infinite]" />
          <svg className="absolute bottom-3 left-1/2 -translate-x-1/2 [animation:bus-bob_0.6s_ease-in-out_infinite]" width="52" height="40" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#3352ff" />
            <path d="M8 10.5A2.5 2.5 0 0 1 10.5 8h11A2.5 2.5 0 0 1 24 10.5V20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9.5Z" fill="#fff" />
            <rect x="10" y="11" width="12" height="5" rx="1" fill="#3352ff" />
            <circle cx="12" cy="24" r="2" fill="#ffd23f" />
            <circle cx="20" cy="24" r="2" fill="#ffd23f" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/70">{t('loading')}</p>
      </div>
    </div>
  );
}
