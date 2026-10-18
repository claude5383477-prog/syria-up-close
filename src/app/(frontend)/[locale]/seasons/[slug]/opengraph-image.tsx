import { notFound } from 'next/navigation'
import { text } from '@/lib/localized'
import { asDoc, getReport } from '@/data/queries'
import { OG_SIZE, renderOg } from '@/og/render'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'تقرير موسم · سوريا عن قرب'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = await getReport(slug) // published only
  if (!report) notFound()
  const city = asDoc(report.city)
  const png = await renderOg({
    kicker: city ? `تقرير موسم · ${text(city.name, 'ar')}` : 'تقرير موسم',
    title: report.title,
    subtitle: report.authorName ? `كتبه: ${report.authorName}` : undefined,
  })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': contentType } })
}
