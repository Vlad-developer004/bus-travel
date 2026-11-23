'use client';

import dynamic from 'next/dynamic';

const NetworkMap = dynamic(() => import('./NetworkMap'), {
  ssr: false,
  loading: () => <div className="card h-[min(70vh,560px)] animate-pulse" />,
});

export function MapLoader() {
  return <NetworkMap />;
}
