import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { preloadArabicFont } from '@/app/fonts'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components-core.css'
import '@/styles/correspondent.css'

// The correspondent app is private, Arabic only and always dynamic (it reads the session cookie).
export const metadata: Metadata = {
  title: { default: 'المراسل · سوريا عن قرب', template: '%s · المراسل' },
  robots: { index: false, follow: false },
}
export const viewport: Viewport = { themeColor: '#0B4836' }

export default function CorrespondentLayout({ children }: { children: ReactNode }) {
  preloadArabicFont()
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
