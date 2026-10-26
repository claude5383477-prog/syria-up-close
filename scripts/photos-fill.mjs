// Fills src/content/photos.json with free-licensed Wikimedia Commons photos for the keys listed in
// seed-content/photo-requests.json (countryside galleries `trip-<slug>-<n>` and spot cards
// `spot-<slug>-<name>`). Fill-only: a key already in photos.json is never changed, so the owner's
// own photos and earlier picks stay. Photos are hotlinked as 960px thumbnails like the existing
// Commons entries (components/content Photo: unoptimized), credited "author · licence · Wikimedia Commons".
//   npm run photos:fill            → fetch and write photos.json + seed-content/PHOTOS-REPORT.md
//   npm run photos:fill -- --dry   → report only
// Needs internet access to commons.wikimedia.org (run it on a normal connection).
import { readFileSync, writeFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const MANIFEST = 'src/content/photos.json'
const photos = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const { requests } = JSON.parse(readFileSync('seed-content/photo-requests.json', 'utf8'))
const UA = { 'User-Agent': 'SyriaUpClose/1.0 (https://upclosesyria.com; photos-fill)' }
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]{2})?)$/i
// Not photos of the place: maps, plans, logos, flags, drawings, scans of books.
const SKIP = /\b(map|plan|logo|flag|coat of arms|diagram|drawing|sketch|engraving|lithograph|stamp|coin|banknote|svg|locator|chart|book|page)\b/i
const strip = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const used = new Set(Object.values(photos).map((p) => p.href))

async function pick(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: query, gsrlimit: '20',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '960',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })
  if (!res.ok) throw new Error(`Commons ${res.status}`)
  const data = await res.json()
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index)
  for (const p of pages) {
    const i = p.imageinfo?.[0]
    if (!i?.thumburl || !/^image\/(jpeg|png|webp)$/.test(i.mime)) continue
    if (i.width < 1200 || i.width < i.height || SKIP.test(p.title)) continue
    const license = strip(i.extmetadata?.LicenseShortName?.value)
    if (!FREE.test(license)) continue
    if (used.has(i.descriptionurl)) continue
    const artist = strip(i.extmetadata?.Artist?.value) || 'غير معروف'
    return {
      src: i.thumburl,
      w: i.thumbwidth,
      h: i.thumbheight,
      credit: `${artist.slice(0, 80)} · ${license} · Wikimedia Commons`,
      href: i.descriptionurl,
      title: p.title.replace(/^File:/, ''),
    }
  }
  return null
}

const report = { added: [], missing: [], kept: 0 }
for (const r of requests) {
  if (photos[r.key]) {
    report.kept++
    continue
  }
  try {
    const got = await pick(r.query)
    if (!got) {
      report.missing.push(`${r.key} (${r.query})`)
      continue
    }
    const { title, ...entry } = got
    photos[r.key] = entry
    used.add(entry.href)
    report.added.push(`${r.key}: ${title} — ${entry.credit}`)
  } catch (err) {
    report.missing.push(`${r.key} (${r.query}): ${err instanceof Error ? err.message : String(err)}`)
  }
  await new Promise((ok) => setTimeout(ok, 250)) // polite to the Commons API
}

if (!DRY) writeFileSync(MANIFEST, `${JSON.stringify(photos, null, 1)}\n`)
const md = [
  '# صور الأرياف من ويكيميديا كومنز',
  '',
  `تاريخ التشغيل: ${new Date().toISOString()}${DRY ? ' (تجربة بلا كتابة)' : ''}`,
  '',
  `## أُضيفت (${report.added.length}) — راجعها بالعين، واحذف من photos.json أي صورة لا تخص المكان`,
  ...report.added.map((l) => `- ${l}`),
  '',
  `## لم يُعثر لها على صورة حرة مناسبة (${report.missing.length})`,
  ...(report.missing.length ? report.missing.map((l) => `- ${l}`) : ['- لا شيء']),
  '',
  `موجودة مسبقاً ولم تُلمس: ${report.kept}`,
  '',
].join('\n')
writeFileSync('seed-content/PHOTOS-REPORT.md', md)
console.log(`photos:fill: ${report.added.length} added, ${report.missing.length} missing, ${report.kept} kept. Report: seed-content/PHOTOS-REPORT.md`)
