import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { plexArabic, plexLatin } from '@/app/fonts'
import { Footer } from '@/components/Footer'
import { LOCALES, dir, isLocale } from '@/lib/i18n'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components.css'
import '@/styles/layout.css'
import '@/styles/pages.css'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

// Site-wide: absolute URLs for canonical/OG, and the title template. Pages add the rest (lib/seo).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const name = locale === 'en' ? 'Syria Up Close' : 'سوريا عن قرب'
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: name, template: `%s · ${name}` },
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
  return (
    <html lang={locale} dir={dir(locale)} className={`${plexArabic.variable} ${plexLatin.variable}`}>
      <body>
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  )
}
