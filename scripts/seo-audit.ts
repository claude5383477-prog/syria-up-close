// SEO audit of every URL in the sitemap (SEO day 4). Read-only: it only fetches pages.
//   npm run seo:audit                                  → local production build on http://localhost:3000
//   npm run seo:audit -- https://www.upclosesyria.com  → the deployed site
// Writes SEO-AUDIT.md (summary + per-page table) and seo-audit.json (raw data) in the project root.
// Sitemap <loc> values carry the canonical origin; they are fetched from the base given here.
import { writeFileSync } from 'node:fs'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const TITLE_MAX = 60
const DESC_MIN = 120
const DESC_MAX = 160

type Page = {
  url: string
  path: string
  status: number
  title: string
  description: string
  canonical: string
  hreflang: string[]
  robots: string
  h1: string[]
  headingSkips: string[]
  imgsNoAlt: number
  links: string[]
  mainLinks: string[]
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))
  return m ? decode(m[1] ?? '') : null
}
const len = (s: string) => [...s].length

async function get(url: string) {
  const res = await fetch(url, { redirect: 'manual' })
  return { status: res.status, location: res.headers.get('location'), body: res.status === 200 ? await res.text() : '' }
}

async function sitemapUrls(): Promise<string[]> {
  const index = (await get(`${base}/sitemap.xml`)).body
  const children = [...index.matchAll(/<sitemap><loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '')
  const urls: string[] = []
  for (const child of children) {
    const xml = (await get(base + new URL(child).pathname)).body
    urls.push(...[...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? ''))
  }
  return urls
}

/** Internal page path of an href, or null for other sites, files, anchors and the CMS. */
function internalPath(href: string, origin: string): string | null {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return null
  let u: URL
  try {
    u = new URL(href, origin)
  } catch {
    return null
  }
  if (u.origin !== origin && u.origin !== base) return null
  if (/^\/(api|admin|_next)\//.test(u.pathname) || /\.[a-z0-9]{2,5}$/i.test(u.pathname)) return null
  return decodeURIComponent(u.pathname.replace(/\/$/, '') || '/')
}

function parse(url: string, status: number, html: string, origin: string): Page {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const head = clean.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? ''
  const body = clean.slice(head.length)
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0])
  const linksHead = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  const metaName = (n: string) => attr(metas.find((t) => attr(t, 'name') === n) ?? '', 'content') ?? ''
  const headings = [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: textOf(m[2] ?? '') }))
  const skips: string[] = []
  headings.forEach((h, i) => {
    const prev = headings[i - 1]
    if (prev && h.level > prev.level + 1) skips.push(`H${prev.level}→H${h.level} («${h.text.slice(0, 30)}»)`)
  })
  if (headings[0] && headings[0].level !== 1) skips.unshift(`starts at H${headings[0].level}`)
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? ''
  const hrefs = (h: string) => [...h.matchAll(/<a\b[^>]*>/gi)].map((m) => internalPath(attr(m[0], 'href') ?? '', origin)).filter((p): p is string => p !== null)
  return {
    url,
    path: decodeURIComponent(new URL(url).pathname),
    status,
    title: textOf(head.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: metaName('description'),
    canonical: attr(linksHead.find((t) => attr(t, 'rel') === 'canonical') ?? '', 'href') ?? '',
    hreflang: linksHead.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${new URL(attr(t, 'href') ?? '', origin).pathname}`),
    robots: metaName('robots'),
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    headingSkips: skips,
    imgsNoAlt: [...body.matchAll(/<img\b[^>]*>/gi)].filter((m) => attr(m[0], 'alt') === null).length,
    links: [...new Set(hrefs(body))],
    mainLinks: [...new Set(hrefs(main))],
  }
}

/** Follows redirects by hand: final status and number of hops. */
async function chase(path: string) {
  let url = base + encodeURI(path)
  for (let hops = 0; hops < 6; hops++) {
    const r = await get(url)
    if (r.status < 300 || r.status >= 400 || !r.location) return { status: r.status, hops, final: new URL(url).pathname }
    url = new URL(r.location, url).href
  }
  return { status: 0, hops: 6, final: url }
}

async function main() {
  const urls = await sitemapUrls()
  const origin = urls[0] ? new URL(urls[0]).origin : base
  const pages: Page[] = []
  for (const u of urls) {
    const r = await get(base + new URL(u).pathname)
    pages.push(parse(u, r.status, r.body, origin))
  }

  // Inbound links: distinct pages linking to each path (any link, and links inside <main> only).
  const inbound = new Map<string, Set<string>>()
  const inboundMain = new Map<string, Set<string>>()
  for (const p of pages) {
    for (const l of p.links) if (l !== p.path) (inbound.get(l) ?? inbound.set(l, new Set()).get(l)!).add(p.path)
    for (const l of p.mainLinks) if (l !== p.path) (inboundMain.get(l) ?? inboundMain.set(l, new Set()).get(l)!).add(p.path)
  }

  // Every internal link target: broken (4xx/5xx) and redirect chains.
  const targets = [...new Set(pages.flatMap((p) => p.links))]
  const checked = new Map<string, Awaited<ReturnType<typeof chase>>>()
  for (const t of targets) checked.set(t, await chase(t))
  const broken = [...checked].filter(([, c]) => c.status >= 400 || c.status === 0)
  const redirects = [...checked].filter(([, c]) => c.hops > 0)
  const linkedFrom = (t: string) => pages.filter((p) => p.links.includes(t)).map((p) => p.path)

  const dup = (key: 'title' | 'description') => {
    const m = new Map<string, string[]>()
    for (const p of pages) if (p[key]) m.set(p[key], [...(m.get(p[key]) ?? []), p.path])
    return [...m].filter(([, v]) => v.length > 1)
  }
  const dupTitles = dup('title')
  const dupDescs = dup('description')
  const isDupT = (p: Page) => dupTitles.some(([t]) => t === p.title)
  const isDupD = (p: Page) => dupDescs.some(([d]) => d === p.description)
  const noindex = pages.filter((p) => /noindex/.test(p.robots))
  const non200 = pages.filter((p) => p.status !== 200)
  const ok = pages.filter((p) => p.status === 200)
  const longT = ok.filter((p) => len(p.title) > TITLE_MAX)
  const noDesc = ok.filter((p) => !p.description)
  const shortD = ok.filter((p) => p.description && len(p.description) < DESC_MIN)
  const longD = ok.filter((p) => len(p.description) > DESC_MAX)
  const h1Bad = ok.filter((p) => p.h1.length !== 1)
  const skipsBad = ok.filter((p) => p.headingSkips.length)
  const orphans = ok.filter((p) => !inbound.get(p.path)?.size)
  const noContextual = ok.filter((p) => p.path !== '/' && p.path !== '/en' && !inboundMain.get(p.path)?.size)
  const canonicalOff = ok.filter((p) => new URL(p.canonical || '/', origin).pathname !== new URL(p.url).pathname)
  const altMissing = ok.filter((p) => p.imgsNoAlt > 0)

  const list = (ps: Page[], f: (p: Page) => string = (p) => p.path) => (ps.length ? ps.map((p) => `- \`${p.path}\`${f === undefined ? '' : f(p) === p.path ? '' : ` — ${f(p)}`}`).join('\n') : '- لا شيء ✅')
  const cell = (s: string) => s.replace(/\|/g, '\\|')
  const today = new Date().toISOString().slice(0, 10)

  const md = `# فحص SEO — ${today}

المصدر: \`${base}\` · ${pages.length} رابطاً في الـ sitemap · أُعيد بـ \`npm run seo:audit\`.

## الملخص

| البند | العدد |
| --- | --- |
| روابط الـ sitemap | ${pages.length} |
| روابط لا تُرجع 200 | ${non200.length} |
| روابط عليها noindex (يجب ألا تكون في الـ sitemap) | ${noindex.length} |
| canonical لا يطابق الرابط | ${canonicalOff.length} |
| عناوين مكرّرة (مجموعات) | ${dupTitles.length} (${dupTitles.reduce((n, [, v]) => n + v.length, 0)} صفحة) |
| عناوين أطول من ${TITLE_MAX} حرفاً | ${longT.length} |
| صفحات بلا وصف | ${noDesc.length} |
| أوصاف أقصر من ${DESC_MIN} | ${shortD.length} |
| أوصاف أطول من ${DESC_MAX} | ${longD.length} |
| أوصاف مكرّرة (مجموعات) | ${dupDescs.length} (${dupDescs.reduce((n, [, v]) => n + v.length, 0)} صفحة) |
| صفحات H1 فيها ≠ 1 | ${h1Bad.length} |
| صفحات فيها قفز في تسلسل العناوين | ${skipsBad.length} |
| صفحات فيها صور بلا alt | ${altMissing.length} |
| صفحات يتيمة (لا رابط داخلي يصلها) | ${orphans.length} |
| صفحات لا يصلها رابط من محتوى صفحة أخرى (خارج الهيدر والتذييل) | ${noContextual.length} |
| روابط داخلية مكسورة (4xx/5xx) | ${broken.length} |
| روابط داخلية تمر بتحويل | ${redirects.length} (منها ${redirects.filter(([, c]) => c.hops > 1).length} بأكثر من قفزة) |

## التفاصيل

### روابط لا تُرجع 200
${list(non200, (p) => String(p.status))}

### noindex داخل الـ sitemap
${list(noindex, (p) => p.robots)}

### canonical لا يطابق الرابط
${list(canonicalOff, (p) => p.canonical)}

### عناوين مكرّرة
${dupTitles.length ? dupTitles.map(([t, v]) => `- «${t}»: ${v.map((x) => `\`${x}\``).join('، ')}`).join('\n') : '- لا شيء ✅'}

### أوصاف مكرّرة
${dupDescs.length ? dupDescs.map(([t, v]) => `- «${t.slice(0, 60)}…»: ${v.map((x) => `\`${x}\``).join('، ')}`).join('\n') : '- لا شيء ✅'}

### H1 ≠ 1
${list(h1Bad, (p) => `${p.h1.length}: ${p.h1.map((h) => `«${h.slice(0, 40)}»`).join('، ')}`)}

### قفز في تسلسل العناوين
${list(skipsBad, (p) => p.headingSkips.join('؛ '))}

### صور بلا alt
${list(altMissing, (p) => `${p.imgsNoAlt} صورة`)}

### صفحات يتيمة
${list(orphans)}

### صفحات لا يصلها رابط من محتوى صفحة أخرى
${list(noContextual)}

### روابط داخلية مكسورة
${broken.length ? broken.map(([t, c]) => `- \`${t}\` → ${c.status} · من: ${linkedFrom(t).slice(0, 5).map((x) => `\`${x}\``).join('، ')}${linkedFrom(t).length > 5 ? ` و${linkedFrom(t).length - 5} غيرها` : ''}`).join('\n') : '- لا شيء ✅'}

### روابط داخلية تمر بتحويل
${redirects.length ? redirects.map(([t, c]) => `- \`${t}\` → \`${c.final}\` (${c.hops} قفزة) · من: ${linkedFrom(t).slice(0, 3).map((x) => `\`${x}\``).join('، ')}`).join('\n') : '- لا شيء ✅'}

## كل الصفحات

| الرابط | الحالة | العنوان (طول) | الوصف (طول) | H1 | واصلة (محتوى) | robots |
| --- | --- | --- | --- | --- | --- | --- |
${pages
  .map(
    (p) =>
      `| \`${p.path}\` | ${p.status} | ${cell(p.title)} (${len(p.title)}${isDupT(p) ? '، مكرّر' : ''}) | ${p.description ? `${len(p.description)}${isDupD(p) ? '، مكرّر' : ''}` : '—'} | ${p.h1.length} | ${inbound.get(p.path)?.size ?? 0} (${inboundMain.get(p.path)?.size ?? 0}) | ${p.robots || '—'} |`,
  )
  .join('\n')}
`
  writeFileSync('SEO-AUDIT.md', md)
  writeFileSync('seo-audit.json', JSON.stringify({ base, date: today, pages, broken, redirects }, null, 2))
  console.log(`seo-audit: ${pages.length} URLs → SEO-AUDIT.md`)
}

await main()
