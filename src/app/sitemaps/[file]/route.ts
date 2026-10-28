import { getSitemapSnapshot } from '@/data/sitemap'
import { isSitemapSection, sectionPages, SITEMAP_SECTIONS, sitemapUrls, urlsetXml, XML_HEADERS } from '@/lib/sitemap'
import { siteUrl } from '@/lib/site-url'

// One section of the sitemap (/sitemaps/cities.xml…), listed by the index at /sitemap.xml.
export const revalidate = 3600
export const dynamicParams = false

export function generateStaticParams() {
  return SITEMAP_SECTIONS.map((s) => ({ file: `${s}.xml` }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const section = (await params).file.replace(/\.xml$/, '')
  if (!isSitemapSection(section)) return new Response('Not found', { status: 404 })
  const base = siteUrl()
  return new Response(urlsetXml(sitemapUrls(base, sectionPages(section, await getSitemapSnapshot()))), { headers: XML_HEADERS })
}
