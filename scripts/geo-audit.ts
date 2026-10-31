// GEO audit (SEO day 5): what each crawler robots.txt lets in actually receives, before JavaScript.
// Read-only: it only fetches pages.
//   npm run geo:audit                                  → local production build on http://localhost:3000
//   npm run geo:audit -- https://www.upclosesyria.com  → the deployed site (firewall and bot protection included)
// Writes GEO-AUDIT.md (summary + per-page detail) and geo-audit.json (raw data) in the project root.
// Exit code 1 when a page is blocked for a crawler, or core content is missing from the first HTML.
import { writeFileSync } from 'node:fs'
import { blocked, CRAWLERS, geoFacts, payloadText, type GeoFacts } from '../src/lib/geoAudit'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')

/** The sample: one page of each kind a visitor asks an assistant about. Missing kinds are skipped. */
async function sample(): Promise<string[]> {
  const fixed = ['/', '/cities/damascus', '/cities/aleppo', '/cities/homs', '/en/cities/damascus']
  const sitemap = async (s: string) => {
    const res = await fetch(`${base}/sitemaps/${s}.xml`)
    const xml = res.ok ? await res.text() : ''
    return [...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(new URL(m[1] ?? '').pathname))
  }
  const [rural, seasons, firstVisit] = await Promise.all([sitemap('countryside'), sitemap('seasons'), sitemap('first-visit')])
  const bloudan = rural.find((p) => /بلودان|bloudan/i.test(p)) ?? rural[0]
  return [...fixed, ...(bloudan ? [bloudan] : []), ...seasons.slice(0, 1), ...firstVisit.slice(0, 1)]
}

type Row = { path: string; crawler: string; status: number; block: string | null; facts: GeoFacts | null }

async function main() {
  const paths = await sample()
  // Next's not-found boundary and the site chrome ride in every page's payload; the 404 page has them all.
  const ignore = new Set(payloadText(await (await fetch(`${base}/geo-audit-404-probe`)).text()))
  const rows: Row[] = []
  for (const path of paths) {
    for (const c of CRAWLERS) {
      const res = await fetch(base + encodeURI(path), { headers: { 'User-Agent': c.ua, Accept: 'text/html' }, redirect: 'manual' })
      const html = await res.text()
      const block = blocked(res.status, html)
      rows.push({ path, crawler: c.name, status: res.status, block, facts: res.status === 200 && !block ? geoFacts(html, ignore) : null })
    }
  }

  // Content does not depend on the user agent; report it once per page (from the first crawler that got it).
  const pages = paths.map((path) => ({ path, facts: rows.find((r) => r.path === path && r.facts)?.facts ?? null }))
  const failedFetch = rows.filter((r) => r.status !== 200 || r.block)
  const arabicWithShort = (p: string) => !p.startsWith('/en') && (/^\/cities\//.test(p) || /^\/inside\//.test(p))
  const problems = pages.flatMap(({ path, facts: f }) => {
    if (!f) return []
    const out: string[] = []
    if (!f.h1) out.push('no H1')
    if (arabicWithShort(path) && !f.short) out.push('no «باختصار» box')
    if (f.short && !f.shortEarly) out.push('«باختصار» comes after the map or the lists')
    if (f.times.invalid.length) out.push(`${f.times.invalid.length} <time> without a valid datetime`)
    if (f.times.labelled.length) out.push(`labelled dates outside <time>: ${f.times.labelled.slice(0, 4).join('، ')}`)
    if (f.faq.onlyShown.length || f.faq.onlySchema.length) out.push(`FAQ mismatch (shown only ${f.faq.onlyShown.length}, schema only ${f.faq.onlySchema.length})`)
    if (f.jsOnly.length) out.push(`${f.jsOnly.length} texts only after JavaScript`)
    return out.map((o) => ({ path, problem: o }))
  })

  const yes = (b: boolean) => (b ? '✅' : '—')
  const md = [
    '# GEO-AUDIT — ما تراه الزواحف قبل JavaScript',
    '',
    `> \`npm run geo:audit -- ${base}\` · ${new Date().toISOString().slice(0, 10)} · ${paths.length} صفحات × ${CRAWLERS.length} زواحف`,
    '',
    '## الخلاصة',
    '',
    `- طلبات لم ترجع 200 أو رجعت صفحة تحدٍّ/حجب: **${failedFetch.length}** من ${rows.length}`,
    `- مشكلات في المحتوى الأولي: **${problems.length}**`,
    '',
    '## الوصول لكل زاحف',
    '',
    `| الصفحة | ${CRAWLERS.map((c) => c.name).join(' | ')} |`,
    `| --- | ${CRAWLERS.map(() => '---').join(' | ')} |`,
    ...paths.map((p) => `| \`${p}\` | ${CRAWLERS.map((c) => {
      const r = rows.find((x) => x.path === p && x.crawler === c.name)!
      return r.block ? `❌ ${r.block}` : String(r.status)
    }).join(' | ')} |`),
    '',
    '## المحتوى في HTML الأولي',
    '',
    '| الصفحة | H1 | باختصار | قبل الخريطة | المصادر | `<time>` | تواريخ في النص (منها بعد تسمية) | FAQ ظاهر/schema | نصوص بعد JS فقط | الكلمات | JSON-LD |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...pages.map(({ path, facts: f }) =>
      f
        ? `| \`${path}\` | ${f.h1 ? '✅' : '❌'} | ${yes(f.short)} | ${yes(f.shortEarly)} | ${yes(f.sources)} | ${f.times.tags}${f.times.invalid.length ? ` (❌${f.times.invalid.length})` : ''} | ${f.times.untagged.length} (${f.times.labelled.length}) | ${f.faq.shown.length}/${f.faq.inSchema.length} | ${f.jsOnly.length} | ${f.words} | ${f.ldTypes.join(', ')} |`
        : `| \`${path}\` | — | — | — | — | — | — | — | — | — | لم تُجلب |`,
    ),
    '',
    '## المشكلات',
    '',
    ...(problems.length ? problems.map((p) => `- \`${p.path}\`: ${p.problem}`) : ['لا شيء.']),
    '',
    '## نصوص لا تظهر إلا بعد JavaScript (عيّنة لكل صفحة)',
    '',
    ...pages.flatMap(({ path, facts: f }) => (f?.jsOnly.length ? [`### \`${path}\` (${f.jsOnly.length})`, '', ...f.jsOnly.slice(0, 15).map((t) => `- ${t.slice(0, 90)}`), ''] : [])),
  ].join('\n')

  writeFileSync('GEO-AUDIT.md', md + '\n')
  writeFileSync('geo-audit.json', JSON.stringify({ base, date: new Date().toISOString(), rows, pages }, null, 2))
  console.log(`geo:audit ${base}: ${rows.length} requests, ${failedFetch.length} blocked/non-200, ${problems.length} content problems → GEO-AUDIT.md`)
  if (failedFetch.length || problems.length) process.exitCode = 1
}

await main()
