import { getDayTrips, getFirstVisitPages, getMainCities } from '@/data/queries'
import { text } from '@/lib/localized'
import { llmsTxt } from '@/lib/llms'
import { tripPath } from '@/lib/rural'
import { siteUrl } from '@/lib/site-url'

// /llms.txt: a Markdown map of the guide for AI assistants (llmstxt.org), rebuilt hourly.
export const revalidate = 3600

export async function GET() {
  const [cities, trips, firstVisit] = await Promise.all([getMainCities(), getDayTrips(), getFirstVisitPages()])
  const body = llmsTxt({
    base: siteUrl(),
    cities: cities.map((c) => ({ name: text(c.name, 'ar') ?? c.slug, en: text(c.name, 'en') ?? undefined, path: `/cities/${c.slug}`, note: text(c.lede, 'ar') ?? undefined })),
    trips: trips.map((t) => ({ name: t.title, path: tripPath(t), note: t.description ?? undefined })),
    firstVisit: firstVisit.map((p) => ({ name: text(p.title, 'en') ?? text(p.title, 'ar') ?? p.topic, path: `/en/outside/first-visit/${p.topic}` })),
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } })
}
