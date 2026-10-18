import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'

// Self-hosted at build time by next/font; no runtime request to Google Fonts.
// preload: false so ~180KB of fonts don't compete with CSS on slow mobile connections: text paints
// at once in the fallback (size-adjusted by next/font) and swaps to IBM Plex when it arrives.
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-ar',
})

export const plexLatin = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-en',
})
