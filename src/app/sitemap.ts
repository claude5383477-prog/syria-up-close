import type { MetadataRoute } from 'next'
import { getCities, getFirstVisitPages, getLatestReports } from '@/data/queries'
import { isTranslated } from '@/lib/localized'
import { sitemapEntry } from '@/lib/seo'
import { siteUrl } from '@/lib/site-url'

// Regenerated hourly and on every publish (hooks/revalidate). Published content only: the
// queries run as a visitor. English URLs appear only where the English page is translated.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const [cities, reports, firstVisit] = await Promise.all([getCities(), getLatestReports(1000), getFirstVisitPages()])

  return [
    ...['/', '/outside', '/outside/first-visit', '/cities', '/about'].flatMap((p) => sitemapEntry(base, p, { english: true })),
    ...['/inside', '/seasons'].flatMap((p) => sitemapEntry(base, p, { english: false })),
    ...cities.flatMap((c) =>
      sitemapEntry(base, `/cities/${c.slug}`, { english: isTranslated([c.name, c.lede], 'en'), lastModified: c.updatedAt }),
    ),
    ...firstVisit.flatMap((p) =>
      sitemapEntry(base, `/outside/first-visit/${p.topic}`, { english: isTranslated([p.title, p.body], 'en'), lastModified: p.updatedAt }),
    ),
    ...reports.flatMap((r) => sitemapEntry(base, `/seasons/${r.slug}`, { english: false, lastModified: r.updatedAt })),
  ]
}
