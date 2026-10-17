import { Page } from '@/components/Header'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { Crumbs, Photo, text } from '@/components/content'
import { formatDate } from '@/components/Stamp'
import { Chip } from '@/components/ui'
import { asDoc, asMedia, getLatestReports, getReport } from '@/data/queries'
import { isLocale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  return (await getLatestReports(100)).map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const report = await getReport(slug)
  return report ? { title: report.title } : {}
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const report = await getReport(slug) // published only: drafts are 404
  if (!report) notFound()
  const city = asDoc(report.city)
  const photos = (report.photos ?? []).map(asMedia).filter((m) => m !== null)

  return (
    <Page locale={locale} path={`/seasons/${slug}`}>
    <ArabicOnly locale={locale}>
      <article className="s">
        <div className="wrap stack">
          <Crumbs items={[{ href: localePath(locale, '/seasons'), label: 'تقارير الموسم' }, { label: report.title }]} />
          <h1>{report.title}</h1>
          <div className="chips">
            {city && <Chip kind="city">{text(city.name, 'ar')}</Chip>}
            <span className="stamp">
              تاريخ المشاهدة: <time dateTime={report.fieldDate}>{formatDate(new Date(report.fieldDate), 'ar')}</time>
            </span>
            {report.authorName && <span className="cap">كتبه: {report.authorName}</span>}
          </div>
          {photos[0] && <Photo media={photos[0]} shot={report.title} size="hero" priority />}
          {report.body ? (
            <div className="prose">
              <RichText data={report.body as SerializedEditorState} />
            </div>
          ) : null}
          {photos.length > 1 && (
            <div className="grid g3">
              {photos.slice(1).map((m) => (
                <Photo key={m.id} media={m} shot={report.title} />
              ))}
            </div>
          )}
        </div>
      </article>
    </ArabicOnly>
    </Page>
  )
}
