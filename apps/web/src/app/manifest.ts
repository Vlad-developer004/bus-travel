import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BusTravel',
    short_name: 'BusTravel',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1220',
    theme_color: '#0d1220',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
