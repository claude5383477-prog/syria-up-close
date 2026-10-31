// Reads the SEO facts of a rendered page (SEO day 4). Used by `npm run seo:audit` and the e2e SEO
// tests, so both judge pages the same way. Plain string parsing: the HTML is Next's own output.

export type PageFacts = {
  title: string
  description: string
  canonical: string
  /** "lang=/path" for every hreflang alternate. */
  hreflang: string[]
  robots: string
  h1: string[]
  /** Heading levels that skip one (H1 → H3), or a page that does not start at H1. */
  headingSkips: string[]
  imgsNoAlt: number
  /** Internal page paths linked anywhere in the body, and inside <main> only. */
  links: string[]
  mainLinks: string[]
}

/** Words a title or description must never contain (ق4: no prices, no safety claims). */
export const FORBIDDEN_META = /\b(price|prices|cost|costs|fee|fees|safe|safety|secure)\b|سعر|أسعار|تكلفة|كلفة|آمن|أمان/i

export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

const textOf = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))
  return m ? decodeEntities(m[1] ?? '') : null
}

/** The site path an href points to, or null for other sites, anchors, files, the CMS and its API. */
export function internalPath(href: string, origins: readonly string[]): string | null {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return null
  let u: URL
  try {
    u = new URL(href, origins[0])
  } catch {
    return null
  }
  if (!origins.includes(u.origin)) return null
  if (/^\/(api|admin|_next)(\/|$)/.test(u.pathname) || /\.[a-z0-9]{2,5}$/i.test(u.pathname)) return null
  return decodeURIComponent(u.pathname.replace(/\/$/, '') || '/')
}

export function parsePage(html: string, origins: readonly string[]): PageFacts {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const head = clean.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? ''
  const body = clean.slice(clean.indexOf(head) + head.length)
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0])
  const linksHead = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  const metaName = (n: string) => attr(metas.find((t) => attr(t, 'name') === n) ?? '', 'content') ?? ''
  const headings = [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: textOf(m[2] ?? '') }))
  const skips: string[] = []
  if (headings[0] && headings[0].level !== 1) skips.push(`starts at H${headings[0].level}`)
  headings.forEach((h, i) => {
    const prev = headings[i - 1]
    if (prev && h.level > prev.level + 1) skips.push(`H${prev.level}→H${h.level} (${h.text.slice(0, 30)})`)
  })
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? ''
  const hrefs = (h: string) => [...new Set([...h.matchAll(/<a\b[^>]*>/gi)].map((m) => internalPath(attr(m[0], 'href') ?? '', origins)).filter((p): p is string => p !== null))]
  return {
    title: textOf(head.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: metaName('description'),
    canonical: attr(linksHead.find((t) => attr(t, 'rel') === 'canonical') ?? '', 'href') ?? '',
    hreflang: linksHead.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${new URL(attr(t, 'href') ?? '', origins[0]).pathname}`),
    robots: metaName('robots'),
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    headingSkips: skips,
    imgsNoAlt: [...body.matchAll(/<img\b[^>]*>/gi)].filter((m) => attr(m[0], 'alt') === null).length,
    links: hrefs(body),
    mainLinks: hrefs(main),
  }
}
