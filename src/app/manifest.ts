import type { MetadataRoute } from 'next'

// Home-screen icon and colours (owner decision 2026-10-26: the lens as the site's icon; light identity 2026-10-29, icon unchanged).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'سوريا عن قرب | Syria Up Close',
    short_name: 'سوريا عن قرب',
    description: 'دليل مستقل لسوريا كما هي اليوم.',
    start_url: '/',
    display: 'browser',
    background_color: '#FBF8F2',
    theme_color: '#FFFFFF',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
