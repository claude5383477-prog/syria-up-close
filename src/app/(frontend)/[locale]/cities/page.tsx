import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityCards, SectionHead } from '@/components/content'
import { isLocale } from '@/lib/i18n'
import { getCities } from '@/data/queries'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/cities',
    title: locale === 'en' ? 'Cities' : 'المدن',
    description: locale === 'en' ? 'For each city: today’s status, what to see, what to eat, where to stay.' : 'لكل مدينة: حال البلد اليوم، ماذا ترى، ماذا تأكل، وأين تقيم.',
  })
}

export default async function CitiesPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const cities = await getCities()
  return (
    <Page locale={locale} path="/cities">
    <section className="s">
      <div className="wrap">
        <SectionHead
          as="h1"
          title={locale === 'ar' ? 'المدن' : 'Cities'}
          lede={
            locale === 'ar'
              ? 'مدن ووجهات من كل المحافظات. التحديثات الميدانية تُضاف مع كل مراسل جديد.'
              : 'Cities and destinations across every province. Field updates are added with each new correspondent.'
          }
        />
        <CityCards cities={cities} locale={locale} />
      </div>
    </section>
    </Page>
  )
}
