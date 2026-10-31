import { bodyExcerpt, pageMetadata } from '@/lib/seo'
import { describe, SITE_LINE } from '@/lib/seoText'
import { Page } from '@/components/Header'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { Crumbs, JsonLd, Photo, RelatedLinks, text } from '@/components/content'
import { articleLd, siteBase } from '@/lib/jsonld'
import { formatDate } from '@/components/Stamp'
import { Chip } from '@/components/ui'
import { asDoc, asMedia, getCities, getLatestReports, getReport, getTripForPlace } from '@/data/queries'
import { tripPath } from '@/lib/rural'
import { isLocale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  return (await getLatestReports(100)).map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const report = isLocale(locale) ? await getReport(slug) : null
  if (!report || !isLocale(locale)) return {}
  // The report's text first, then the facts the page shows under its title (place, field date, author).
  const place = text(asDoc(report.city)?.name, 'ar')
  const from = `تقرير ميداني${place ? ` من ${place}` : ''}`
  const facts = [`${from} بتاريخ ${formatDate(new Date(report.fieldDate), 'ar')}${report.authorName ? `، كتبه ${report.authorName}` : ''}`, from]
  return pageMetadata({ locale, path: `/seasons/${slug}`, title: report.title, description: describe([bodyExcerpt(report.body, 110), facts, SITE_LINE.ar]), arabicOnly: true, ownImage: true })
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const report = await getReport(slug) // published only: drafts are 404
  if (!report) notFound()
  const city = asDoc(report.city)
  const photos = (report.photos ?? []).map(asMedia).filter((m) => m !== null)
  // Internal links (SEO day 4): the report's city guide, and its countryside page when it is about one.
  const parentId = city ? (asDoc(city.parentCity)?.id ?? city.parentCity ?? null) : null
  const [cities, trip] = await Promise.all([getCities(), city && parentId != null ? getTripForPlace(city.id) : Promise.resolve(null)])
  const mainCity = city ? (parentId != null ? cities.find((c) => c.id === parentId) : city) : undefined
  const related = [
    ...(trip && city ? [{ href: tripPath(trip), label: `${trip.title}: صفحة المشوار` }] : []),
    ...(mainCity ? [{ href: `/cities/${mainCity.slug}`, label: `دليل مدينة ${text(mainCity.name, 'ar') ?? mainCity.slug}` }] : []),
  ]

  return (
    <Page locale={locale} path={`/seasons/${slug}`}>
    <ArabicOnly locale={locale}>
      <JsonLd
        data={articleLd({
          base: siteBase(),
          path: `/seasons/${slug}`,
          headline: report.title,
          fieldDate: report.fieldDate,
          updatedAt: report.updatedAt,
          authorName: report.authorName,
          image: photos[0]?.sizes?.hero?.url ?? photos[0]?.url ?? undefined,
        })}
      />
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
      <RelatedLinks id="report-places" title="المكان بالدليل" links={related} />
    </ArabicOnly>
    </Page>
  )
}
