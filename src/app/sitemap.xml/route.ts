import { getSitemapSnapshot } from '@/data/sitemap'
import { latest, sectionPages, SITEMAP_SECTIONS, sitemapIndexXml, XML_HEADERS } from '@/lib/sitemap'
import { siteUrl } from '@/lib/site-url'

// The sitemap index, at the address already submitted to Search Console and Bing (/sitemap.xml).
// Next's generateSitemaps writes no index (Next 16 docs), so this route serves it. Regenerated hourly
// and on every publish (hooks/revalidate).
export const revalidate = 3600

export async function GET() {
  const snap = await getSitemapSnapshot()
  const sections = SITEMAP_SECTIONS.map((section) => ({ section, lastmod: latest(...sectionPages(section, snap).map((p) => p.lastmod)) }))
  return new Response(sitemapIndexXml(siteUrl(), sections), { headers: XML_HEADERS })
}
