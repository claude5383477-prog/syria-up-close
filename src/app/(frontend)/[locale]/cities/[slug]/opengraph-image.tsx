import { notFound } from 'next/navigation'
import { text } from '@/components/content'
import { getCity } from '@/data/queries'
import { isLocale } from '@/lib/i18n'
import { OG_SIZE, renderOg } from '@/og/render'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'سوريا عن قرب'

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const city = isLocale(locale) ? await getCity(slug) : null
  if (!city || !isLocale(locale)) notFound()
  const png = await renderOg({
    kicker: locale === 'en' ? 'Cities' : 'المدن',
    title: text(city.name, locale) ?? slug,
    subtitle: text(city.lede, locale) ?? text(city.tag, locale) ?? undefined,
  })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': contentType } })
}
