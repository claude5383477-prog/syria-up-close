import { notFound } from 'next/navigation'
import { text } from '@/lib/localized'
import { asDoc, getTrip } from '@/data/queries'
import { parseTripKey } from '@/lib/rural'
import { OG_CACHE, OG_SIZE, renderOg } from '@/og/render'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'سوريا عن قرب'

/** A countryside page's card: its name, its city's countryside, its one-line description. */
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params
  const key = parseTripKey(slug)
  const trip = key ? await getTrip(key) : null
  if (!trip) notFound()
  const from = asDoc(trip.fromCity)
  const png = await renderOg({
    kicker: from ? `ريف ${text(from.name, 'ar') ?? from.slug}` : 'جوّا سوريا',
    title: trip.title,
    subtitle: trip.description ?? undefined,
  })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': contentType, 'Cache-Control': OG_CACHE } })
}
