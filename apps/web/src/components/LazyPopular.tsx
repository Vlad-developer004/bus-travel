'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const PopularRoutes = dynamic(() => import('./PopularRoutes').then((m) => m.PopularRoutes), {
  ssr: false,
  loading: () => <div className="min-h-[34rem]" aria-hidden="true" />,
});

export function LazyPopular() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (!('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="min-h-[34rem]">
      {visible && <PopularRoutes />}
    </div>
  );
}
