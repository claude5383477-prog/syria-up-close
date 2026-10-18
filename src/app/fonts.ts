import { IBM_Plex_Sans } from 'next/font/google'
import { preload } from 'react-dom'

// Arabic: IBM Plex Sans Arabic, our own subset in public/fonts (src/styles/fonts.css).
// Latin: IBM Plex Sans via next/font, downloaded at build time and served from this site.

/** Preloads only the regular Arabic weight; 600/700 load when first used. */
export function preloadArabicFont() {
  preload('/fonts/plex-arabic-400.v1.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
}

export const plexLatin = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-en',
})
