import { getDayTrips, getFirstVisitPages, getLatestReports, getMainCities } from '@/data/queries'
import { getSitemapSnapshot } from '@/data/sitemap'
import { text } from '@/lib/localized'
import { llmsLinks, llmsTxt, type LlmsInfo } from '@/lib/llms'
import { tripPath } from '@/lib/rural'
import { sectionPages } from '@/lib/sitemap'
import { siteUrl } from '@/lib/site-url'
import { formatDate } from '@/components/Stamp'

// /llms.txt: a Markdown map of the guide for AI assistants (llmstxt.org). The page list is the
// sitemap's (published and indexable only); names and summaries are each page's own text.
// Rebuilt hourly, and at once on every publish (hooks/revalidate).
export const revalidate = 3600

export async function GET() {
  const [snap, cities, trips, firstVisit, reports] = await Promise.all([getSitemapSnapshot(), getMainCities(), getDayTrips(), getFirstVisitPages(), getLatestReports(200)])
  const byPath = <T,>(rows: T[], path: (r: T) => string, info: (r: T) => LlmsInfo) => {
    const m = new Map(rows.map((r) => [path(r), info(r)]))
    return (p: string) => m.get(p)
  }
  // The guide's own order (cities by their order field, reports newest first), not the sitemap's.
  const ordered = <T,>(section: Parameters<typeof sectionPages>[0], rows: T[], path: (r: T) => string) => {
    const at = new Map(rows.map((r, i) => [path(r), i]))
    return [...sectionPages(section, snap)].sort((a, b) => (at.get(a.path) ?? 1e9) - (at.get(b.path) ?? 1e9))
  }
  const cityPath = (c: (typeof cities)[number]) => `/cities/${c.slug}`
  const fvPath = (p: (typeof firstVisit)[number]) => `/outside/first-visit/${p.topic}`
  const reportPath = (r: (typeof reports)[number]) => `/seasons/${r.slug}`
  const body = llmsTxt({
    base: siteUrl(),
    cities: llmsLinks(
      ordered('cities', cities, cityPath),
      byPath(cities, cityPath, (c) => ({ name: text(c.name, 'ar') ?? c.slug, en: text(c.name, 'en') ?? undefined, note: text(c.lede, 'ar') })),
    ),
    trips: llmsLinks(ordered('countryside', trips, tripPath), byPath(trips, tripPath, (t) => ({ name: t.title, note: t.description }))),
    firstVisit: llmsLinks(
      ordered('first-visit', firstVisit, fvPath),
      byPath(firstVisit, fvPath, (p) => ({ name: text(p.title, 'ar') ?? p.topic, en: text(p.title, 'en') ?? undefined, note: text(p.summary, 'ar') })),
    ),
    seasons: llmsLinks(
      ordered('seasons', reports, reportPath),
      byPath(reports, reportPath, (r) => ({ name: r.title, note: `تقرير ميداني بتاريخ ${formatDate(new Date(r.fieldDate), 'ar')}${r.authorName ? `، كتبه ${r.authorName}` : ''}` })),
    ),
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } })
}
