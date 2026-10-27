// Photo candidates for each sight card (place-<slug>-<arabic title>) and each listed dish/sweet
// (scripts/harvest/topics.json): top Commons results per query, free licences only, for review.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const UA = { 'User-Agent': 'SyriaUpClose/1.0 (https://upclosesyria.com; photo-harvest)' }
const FREE = /^(cc0|public domain|pd|cc[ -]?by(-sa)?( \d(\.\d)?)?( [a-z]{2,})?)$/i
const SKIP = /\b(maps?|plan|logo|flag|diagram|drawing|sketch|engraving|lithograph|painting|stamps?|coins?|banknote|svg|chart|book|page|manuscript|portrait|selfie|war|destroy\w*|damage\w*|destruction|shelling|bomb\w*|airstrike|protests?|refugees?|army|soldiers?|military|isis|daesh|tank|wounded|killed|satellite)\b/i
const strip = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync('harvest', { recursive: true })

async function top(query, n = 6) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '40',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '500',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|DateTimeOriginal|Categories',
  })
  let data
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })
    if (res.ok) { data = await res.json(); break }
    await sleep(2000 * (i + 1))
  }
  const out = []
  for (const p of (data?.query?.pages ?? []).sort((a, b) => a.index - b.index)) {
    const i = p.imageinfo?.[0]
    if (!i?.thumburl || !/^image\/(jpeg|png|webp)$/.test(i.mime) || i.width < 1000 || i.width < i.height * 0.9) continue
    const m = i.extmetadata ?? {}
    const license = strip(m.LicenseShortName?.value)
    if (!FREE.test(license)) continue
    if (SKIP.test(`${p.title} ${strip(m.Categories?.value)}`)) continue
    const year = Number(strip(m.DateTimeOriginal?.value).match(/\b(18|19|20)\d{2}\b/)?.[0]) || null
    const thumb = (w) => i.thumburl.replace(/\/\d+px-/, `/${w}px-`)
    out.push({
      source: 'commons', title: p.title.replace(/^File:/, ''), href: i.descriptionurl, width: i.width, height: i.height,
      grid: thumb(500), full: i.width > 1280 ? thumb(1280) : i.url, tiny: thumb(250),
      license, licenseUrl: strip(m.LicenseUrl?.value) || null, author: strip(m.Artist?.value).slice(0, 80) || null, year,
    })
    if (out.length >= n) break
  }
  return out
}

const jobs = []
for (const c of JSON.parse(readFileSync('seed-content/cities.json', 'utf8')).cities) {
  for (const p of c.places) jobs.push({ key: `place-${c.slug}-${p.ar}`, query: p.commons })
}
if (existsSync('scripts/harvest/topics.json')) jobs.push(...JSON.parse(readFileSync('scripts/harvest/topics.json', 'utf8')))
const out = {}
for (const j of jobs) {
  try {
    out[j.key] = { query: j.query, candidates: await top(j.query) }
  } catch (e) {
    out[j.key] = { query: j.query, error: e.message, candidates: [] }
  }
  await sleep(250)
}
writeFileSync('harvest/places.json', JSON.stringify(out, null, 1))
console.log(Object.keys(out).length, 'topics')
