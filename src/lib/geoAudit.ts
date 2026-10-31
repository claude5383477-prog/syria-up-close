// What a crawler gets from a page before any JavaScript runs (SEO day 5, GEO). Used by
// `npm run geo:audit` and the e2e GEO tests, so both judge pages the same way.
// Plain string parsing of Next's own output, like lib/seoAudit.
import { decodeEntities } from '@/lib/seoAudit'

/**
 * The crawlers robots.txt lets in (SEO day 3), with the user agents their owners publish. Version
 * numbers may change; the sites only match the product token.
 * Sources (checked 2026-10-31):
 * - Googlebot: developers.google.com/search/docs/crawling-indexing/google-common-crawlers
 * - Bingbot: bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0
 * - OAI-SearchBot, GPTBot, ChatGPT-User: developers.openai.com/api/docs/bots
 * - PerplexityBot: docs.perplexity.ai/guides/perplexitybot
 */
export const CRAWLERS = [
  { name: 'Googlebot', ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { name: 'Bingbot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/130.0.0.0 Safari/537.36' },
  { name: 'OAI-SearchBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot' },
  { name: 'GPTBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot' },
  { name: 'ChatGPT-User', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' },
  { name: 'PerplexityBot', ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' },
] as const

/** A firewall or bot-protection page instead of ours (Vercel, Cloudflare), or a refusal. */
export function blocked(status: number, html: string): string | null {
  if (status === 403 || status === 429) return `HTTP ${status}`
  if (/Vercel Security Checkpoint|vcrcs|x-vercel-challenge/i.test(html)) return 'Vercel challenge'
  if (/cf-chl-|Just a moment\.\.\.|challenge-platform/i.test(html)) return 'Cloudflare challenge'
  if (status === 200 && !/<html[\s>]/i.test(html)) return 'not HTML'
  return null
}

const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<template[\s\S]*?<\/template>/gi, ' ')
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Every word a reader (or a crawler without JavaScript) can find in the HTML, hidden by CSS or not. */
export function htmlText(html: string): string {
  return norm(decodeEntities(strip(html).replace(/<[^>]+>/g, ' ')))
}

/** The React Server Components payload Next inlines for hydration (self.__next_f.push([1,"…"])). */
export function flightPayload(html: string): string {
  const out: string[] = []
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      out.push(JSON.parse(m[1] ?? '""') as string)
    } catch {
      // A chunk Next split mid-escape: skip it rather than fail the audit.
    }
  }
  return out.join('')
}

/**
 * Words handed to components in the hydration payload: element children, and the text of items a client
 * component lays out itself (lore). Not name/title props: those are search indexes, map pins and menus.
 */
export function payloadText(html: string): string[] {
  const found = new Set<string>()
  for (const m of flightPayload(html).matchAll(/"(?:children|text|meaning)":"((?:[^"\\]|\\.)*)"/g)) {
    let s: string
    try {
      s = norm(JSON.parse(`"${m[1] ?? ''}"`) as string)
    } catch {
      continue
    }
    // Words only: ids, classes, URLs, references ($L1, $undefined), meta names and numbers are not content.
    if (s.length < 3 || /^\$|^https?:|^\/|^[\w-]+$|^[\w.]+:[\w:]+$|^Next\.|^[\d\s.,:/-]+$/.test(s) || !/\p{L}{2}/u.test(s)) continue
    found.add(s)
  }
  return [...found]
}

/**
 * Text the page will only show after JavaScript: words in the hydration payload that are nowhere in
 * the HTML, text or attributes. These are what a crawler that does not run scripts (GPTBot,
 * PerplexityBot, OAI-SearchBot) never sees. `ignore`: words every page carries for Next itself (its
 * not-found boundary), taken from the site's 404 page by the audit script.
 */
export function jsOnlyText(html: string, ignore: ReadonlySet<string> = new Set()): string[] {
  const markup = decodeEntities(strip(html)).replace(/\s+/g, ' ')
  return payloadText(html).filter((s) => !ignore.has(s) && !markup.includes(s))
}

/**
 * untagged: dates in plain text (inside content they are normal: "announced in August 2026").
 * labelled: plain-text dates right after a page label ("آخر تحديث:", "جُمعت في"…) that must be <time>.
 */
export type TimeFacts = { tags: number; invalid: string[]; untagged: string[]; labelled: string[] }

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/
const AR_MONTHS = 'كانون الثاني|كانون الأول|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين الأول|تشرين الثاني|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر'
const EN_MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const LABELS = 'آخر تحديث|آخر تحقق|جُمعت في|جمعت في|بتاريخ|تاريخ التحقق|Last updated|Last checked|compiled on|checked on'
const DATE = new RegExp(`(?:[\\d٠-٩]{1,2}\\s+)?(?:${AR_MONTHS}|${EN_MONTHS})\\s+[\\d٠-٩]{4}`, 'g')

/** Dates in <time datetime>, those with a bad datetime, and dates shown as plain text without one. */
export function timeFacts(html: string): TimeFacts {
  const body = strip(html)
  const tags = [...body.matchAll(/<time\b([^>]*)>([\s\S]*?)<\/time>/gi)]
  const invalid = tags.map((t) => t[1]?.match(/datetime="([^"]*)"/i)?.[1] ?? '(none)').filter((d) => !ISO.test(d))
  const outside = decodeEntities(body.replace(/<time\b[\s\S]*?<\/time>/gi, ' ').replace(/<[^>]+>/g, ' '))
  const untagged = [...new Set([...outside.matchAll(DATE)].map((m) => norm(m[0])))]
  const labelled = [...new Set([...outside.matchAll(new RegExp(`(?:${LABELS})\\s*:?\\s*(${DATE.source})`, 'gi'))].map((m) => norm(m[0])))]
  return { tags: tags.length, invalid, untagged, labelled }
}

type Ld = Record<string, unknown>

/** Every JSON-LD node on the page, @graph flattened. */
export function jsonLd(html: string): Ld[] {
  const nodes: Ld[] = []
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1] ?? '') as Ld | Ld[]
      for (const d of Array.isArray(data) ? data : [data]) nodes.push(...(Array.isArray(d['@graph']) ? (d['@graph'] as Ld[]) : [d]))
    } catch {
      nodes.push({ '@type': 'INVALID' })
    }
  }
  return nodes
}

/** FAQ questions shown on the page (<details class="faq"><summary>) against those in FAQPage. */
export function faqFacts(html: string): { shown: string[]; inSchema: string[]; onlyShown: string[]; onlySchema: string[] } {
  const shown = [...strip(html).matchAll(/<details\b[^>]*class="[^"]*\bfaq\b[^"]*"[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map((m) => norm(decodeEntities((m[1] ?? '').replace(/<[^>]+>/g, ' '))))
  const faq = jsonLd(html).find((n) => n['@type'] === 'FAQPage')
  const inSchema = ((faq?.mainEntity as Ld[] | undefined) ?? []).map((q) => norm(String(q.name ?? '')))
  return { shown, inSchema, onlyShown: shown.filter((q) => !inSchema.includes(q)), onlySchema: inSchema.filter((q) => !shown.includes(q)) }
}

export type GeoFacts = {
  h1: string
  /** The "in short" box (Arabic city and countryside pages), and whether it comes before the map and the place lists. */
  short: boolean
  shortEarly: boolean
  sources: boolean
  times: TimeFacts
  faq: ReturnType<typeof faqFacts>
  ldTypes: string[]
  jsOnly: string[]
  words: number
}

export function geoFacts(html: string, ignore: ReadonlySet<string> = new Set()): GeoFacts {
  const body = strip(html)
  const h1 = norm(decodeEntities((body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '').replace(/<[^>]+>/g, ' ')))
  const shortAt = body.search(/class="eyebrow">باختصار</)
  // The first section after the page header: the map, the photo gallery or the first place card.
  const firstBlock = body.search(/id="map"|id="gallery"|id="sights"|id="food"/)
  const text = htmlText(html)
  return {
    h1,
    short: shortAt >= 0,
    shortEarly: shortAt >= 0 && (firstBlock < 0 || shortAt < firstBlock),
    sources: /المصادر|Sources/.test(text),
    times: timeFacts(html),
    faq: faqFacts(html),
    ldTypes: [...new Set(jsonLd(html).map((n) => String(n['@type'])))],
    jsOnly: jsOnlyText(html, ignore),
    words: text.split(' ').length,
  }
}
