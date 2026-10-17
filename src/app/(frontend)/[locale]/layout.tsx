import type { Metadata } from 'next'
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
import '@/styles/pages.css'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

// Baseline title only; per-page metadata, hreflang and OG arrive in T30–T31.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const name = locale === 'en' ? 'Syria Up Close' : 'سوريا عن قرب'
  return { title: { default: name, template: `%s · ${name}` } }
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
