import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { plexArabic, plexLatin } from '@/app/fonts'
import '@/styles/tokens.css'
import '@/styles/base.css'

const LOCALES = ['ar', 'en'] as const
type Locale = (typeof LOCALES)[number]

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!LOCALES.includes(locale as Locale)) notFound()
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${plexArabic.variable} ${plexLatin.variable}`}>
      <body>{children}</body>
    </html>
  )
}
