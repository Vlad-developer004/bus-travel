'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function TopLoader() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    if (safety.current) clearTimeout(safety.current);
    timer.current = safety.current = null;
  };

  const start = () => {
    stop();
    if (hide.current) clearTimeout(hide.current);
    setVisible(true);
    setWidth(8);
    timer.current = setInterval(() => setWidth((w) => w + (90 - w) * 0.08), 200);
    safety.current = setTimeout(finish, 15_000);
  };

  const finish = () => {
    stop();
    setWidth(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    finish();
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      stop();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" role="progressbar" aria-hidden={!visible} aria-label={t('loading')} hidden={!visible}>
      <div className="h-full bg-gradient-to-r from-brand via-[#7b92ff] to-accent shadow-[0_0_10px_rgba(255,210,63,0.6)] transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
