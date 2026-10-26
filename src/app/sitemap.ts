import { STORIES } from '@/content/guide'
import type { MetadataRoute } from 'next'
import { getDayTrips, getFirstVisitPages, getLatestReports, getMainCities, getStories } from '@/data/queries'
import { tripPath } from '@/lib/rural'
import { isTranslated } from '@/lib/localized'
import { sitemapEntry } from '@/lib/seo'
import { siteUrl } from '@/lib/site-url'

// Regenerated hourly and on every publish (hooks/revalidate). Published content only: the
// queries run as a visitor. English URLs appear only where the English page is translated.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const [cities, reports, firstVisit, stories, trips] = await Promise.all([getMainCities(), getLatestReports(1000), getFirstVisitPages(), getStories(1000), getDayTrips()])

  return [
    ...['/', '/outside', '/outside/first-visit', '/cities', '/blog', '/about'].flatMap((p) => sitemapEntry(base, p, { english: true })),
    ...['/inside', '/seasons'].flatMap((p) => sitemapEntry(base, p, { english: false })),
    ...cities.flatMap((c) =>
      sitemapEntry(base, `/cities/${c.slug}`, { english: isTranslated([c.name, c.lede], 'en'), lastModified: c.updatedAt }),
    ),
    // Countryside pages (Arabic only). Resorts' old /cities/<slug> pages redirect here, so they are left out.
    ...trips.flatMap((t) => sitemapEntry(base, tripPath(t), { english: false, lastModified: t.checkedAt ?? t.updatedAt })),
    ...firstVisit.flatMap((p) =>
      sitemapEntry(base, `/outside/first-visit/${p.topic}`, { english: isTranslated([p.title, p.body], 'en'), lastModified: p.updatedAt }),
    ),
    ...reports.flatMap((r) => sitemapEntry(base, `/seasons/${r.slug}`, { english: false, lastModified: r.updatedAt })),
    ...stories.flatMap((s) => sitemapEntry(base, `/blog/${s.slug}`, { english: isTranslated([s.title, s.body], 'en'), lastModified: s.updatedAt })),
    ...STORIES.filter((g) => !stories.some((s) => s.slug === g.slug)).flatMap((g) => sitemapEntry(base, `/blog/${g.slug}`, { english: true, lastModified: g.date })),
  ]
}
