import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { plexArabic } from '@/app/fonts'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components.css'
import '@/styles/correspondent.css'

// The correspondent app is private, Arabic only and always dynamic (it reads the session cookie).
export const metadata: Metadata = {
  title: { default: 'المراسل · سوريا عن قرب', template: '%s · المراسل' },
  robots: { index: false, follow: false },
}
export const viewport: Viewport = { themeColor: '#0B4836' }

export default function CorrespondentLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable}>
      <body>{children}</body>
    </html>
  )
}
