import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { plexArabic, plexLatin } from '@/app/fonts'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LOCALES, dir, isLocale } from '@/lib/i18n'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components.css'
import '@/styles/layout.css'

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
  if (!isLocale(locale)) notFound()
  return (
    <html lang={locale} dir={dir(locale)} className={`${plexArabic.variable} ${plexLatin.variable}`}>
      <body>
        <Header locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  )
}
