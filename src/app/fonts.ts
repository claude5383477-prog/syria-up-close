import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'

// Self-hosted at build time by next/font; no runtime request to Google Fonts.
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ar',
})

export const plexLatin = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-en',
})
