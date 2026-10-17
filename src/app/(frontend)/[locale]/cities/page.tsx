import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityCards, SectionHead } from '@/components/content'
import { isLocale } from '@/lib/i18n'
import { getCities } from '@/data/queries'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: locale === 'en' ? 'Cities' : 'المدن' }
}

export default async function CitiesPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const cities = await getCities()
  return (
    <section className="s">
      <div className="wrap">
        <SectionHead
          as="h1"
          title={locale === 'ar' ? 'المدن' : 'Cities'}
          lede={
            locale === 'ar'
              ? 'نبدأ بأربع مدن، وتُضاف مدن جديدة مع كل مراسل جديد.'
              : 'We start with four cities; more join with each new correspondent.'
          }
        />
        <CityCards cities={cities} locale={locale} />
      </div>
    </section>
  )
}
