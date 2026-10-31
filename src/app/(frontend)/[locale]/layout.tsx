import type { Metadata, Viewport } from 'next'
import { siteUrl } from '@/lib/site-url'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { plexLatin, preloadArabicFont } from '@/app/fonts'
import { Footer } from '@/components/Footer'
import { SyrianPatternDefs } from '@/components/Patterns'
import { LOCALES, dir, isLocale } from '@/lib/i18n'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components-core.css'
import '@/styles/components.css'
import '@/styles/layout.css'
import '@/styles/pages.css'
import '@/styles/guide.css'
import '@/styles/site.css'
import '@/styles/v2.css'
import '@/styles/batch4.css'

// Light identity (owner decision 2026-10-29): white header, so the browser bar matches it.
export const viewport: Viewport = { themeColor: '#FFFFFF' }

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

// Site-wide: absolute URLs for canonical/OG, and the title template. Pages add the rest (lib/seo).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const name = locale === 'en' ? 'Syria Up Close' : 'سوريا عن قرب'
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s | ${name}` },
  }
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
  if (locale === 'ar') preloadArabicFont()
  return (
    <html lang={locale} dir={dir(locale)} className={plexLatin.variable} data-theme="light">
      <body>
        <SyrianPatternDefs />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  )
}
