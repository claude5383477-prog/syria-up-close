// Collects free-licensed photo candidates per city from Wikimedia Commons (and Openverse/Flickr as a
// second source) and writes harvest/<slug>.json plus contact sheets for review. Runs on a GitHub
// runner (workflow .github/workflows/harvest.yml); the output is reviewed by eye before anything
// reaches src/content/photos.json. Free licences only: CC0, public domain, CC BY, CC BY-SA.
import { mkdirSync, writeFileSync } from 'node:fs'

const UA = { 'User-Agent': 'SyriaUpClose/1.0 (https://upclosesyria.com; photo-harvest)' }
const OUT = 'harvest'
mkdirSync(OUT, { recursive: true })

const CITIES = [
  { slug: 'damascus', names: 'damascus|dimashq|دمشق', en: 'Damascus', cats: ['Damascus', 'Old City of Damascus'], lat: 33.5115, lng: 36.3065, r: 7000 },
  { slug: 'aleppo', names: 'aleppo|halab|حلب', en: 'Aleppo', cats: ['Aleppo', 'Ancient City of Aleppo'], lat: 36.2021, lng: 37.1343, r: 8000 },
  { slug: 'latakia', names: 'latakia|lattakia|laodicea|اللاذقية', en: 'Latakia', cats: ['Latakia'], lat: 35.5317, lng: 35.7901, r: 8000 },
  { slug: 'homs', names: 'homs|emesa|حمص', en: 'Homs', cats: ['Homs'], lat: 34.7324, lng: 36.7137, r: 8000 },
  { slug: 'hama', names: 'hama\\b|hamah|حماة', en: 'Hama', cats: ['Hama'], lat: 35.1318, lng: 36.7578, r: 8000 },
  { slug: 'tartous', names: 'tartus|tartous|tortosa|arwad|طرطوس', en: 'Tartus', cats: ['Tartus'], lat: 34.889, lng: 35.8866, r: 8000 },
  { slug: 'idlib', names: 'idlib|إدلب', en: 'Idlib', cats: ['Idlib', 'Idlib Governorate'], lat: 35.9306, lng: 36.6339, r: 10000 },
  { slug: 'daraa', names: 'daraa|dara\\b|bosra|درعا', en: 'Daraa', cats: ['Daraa', 'Daraa Governorate'], lat: 32.6189, lng: 36.1021, r: 10000, minLat: 32.585 },
  { slug: 'suwayda', names: 'suwayda|sweida|shahba|qanawat|السويداء', en: 'Suwayda', cats: ['As-Suwayda', 'As-Suwayda Governorate'], lat: 32.709, lng: 36.5666, r: 10000 },
  { slug: 'quneitra', names: 'quneitra|القنيطرة', en: 'Quneitra', cats: ['Quneitra', 'Quneitra Governorate'], lat: 33.1259, lng: 35.8245, r: 6000, minLon: 35.815 },
  { slug: 'raqqa', names: 'raqqa|rakka|الرقة', en: 'Raqqa', cats: ['Raqqa', 'Raqqa Governorate'], lat: 35.9528, lng: 39.0079, r: 10000 },
  { slug: 'deir-ez-zor', names: 'deir ez-zor|deir ezzor|deir al-zor|dayr az-zawr|دير الزور', en: 'Deir ez-Zor', cats: ['Deir ez-Zor', 'Deir ez-Zor Governorate'], lat: 35.3359, lng: 40.1408, r: 10000 },
  { slug: 'hasakah', names: 'hasakah|hasaka|qamishli|القامشلي|الحسكة', en: 'Hasakah', cats: ['Hasakah', 'Hasakah Governorate', 'Qamishli'], lat: 36.5024, lng: 40.7477, r: 12000 },
]
const only = process.argv[2]

const FREE = /^(cc0|public domain|pd|pdm|cc[ -]?by(-sa)?( \d(\.\d)?)?( [a-z]{2,})?)$/i
// Not a picture of the city today, or not suitable for a travel guide's gallery.
const SKIP =
  /\b(maps?|plan|logo|flag|coat of arms|diagram|drawing|sketch|engraving|lithograph|painting|stamps?|coins?|banknote|svg|locator|chart|book|page|manuscript|scan|portrait|selfie|civil war|war|destroy\w*|damage\w*|destruction|shelling|bomb\w*|airstrike|explosion|protests?|demonstration|refugees?|camp|army|soldiers?|military|troops|fighters?|rebels?|funeral|isis|isil|daesh|tank|checkpoint|ypg|sdf|fsa|wounded|killed|attack|conflict|massacre|prison|satellite|nasa|iss\d*|astronaut|sentinel|landsat|aerial view from space|mug ?shot|passport|document|newspaper|poster|election|president|assad|minister|ambassador|delegation|meeting|conference|un ?ocha|unhcr|unicef|wfp|aid|tent)\b/i
const strip = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(params) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: UA })
    if (res.ok) return res.json()
    await sleep(2000 * (i + 1))
  }
  throw new Error(`Commons failed: ${url}`)
}

const II = {
  prop: 'imageinfo|coordinates',
  colimit: 'max',
  iiprop: 'url|extmetadata|size|mime',
  iiurlwidth: '500',
  iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|DateTimeOriginal|ImageDescription|Categories|ObjectName',
}

function toCandidate(p, via) {
  const i = p.imageinfo?.[0]
  if (!i?.thumburl || !/^image\/(jpeg|png|webp)$/.test(i.mime)) return null
  if (Math.max(i.width, i.height) < 1200) return null
  const m = i.extmetadata ?? {}
  const license = strip(m.LicenseShortName?.value)
  if (!FREE.test(license) || /\b(nc|nd)\b/i.test(license)) return null
  const cats = strip(m.Categories?.value)
  const desc = strip(m.ImageDescription?.value).slice(0, 300)
  const hay = `${p.title} ${cats} ${desc}`
  if (SKIP.test(hay)) return null
  const dateRaw = strip(m.DateTimeOriginal?.value)
  const year = Number(dateRaw.match(/\b(18|19|20)\d{2}\b/)?.[0]) || null
  const thumb = (w) => i.thumburl.replace(/\/\d+px-/, `/${w}px-`).split('?')[0]
  const co = p.coordinates?.[0]
  return {
    source: 'commons',
    via,
    lat: co?.lat ?? null,
    lon: co?.lon ?? null,
    title: p.title.replace(/^File:/, ''),
    href: i.descriptionurl,
    original: i.url,
    width: i.width,
    height: i.height,
    grid: thumb(500),
    full: i.width > 1280 ? thumb(1280) : i.url.split('?')[0],
    tiny: thumb(250),
    license,
    licenseUrl: strip(m.LicenseUrl?.value) || null,
    author: strip(m.Artist?.value).slice(0, 80) || null,
    year,
    date: dateRaw.slice(0, 40) || null,
    description: desc,
    categories: cats.split('|').slice(0, 12),
  }
}

async function search(query, via, max = 500) {
  const out = []
  let offset = 0
  while (offset < max) {
    const data = await api({ action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: query, gsrlimit: '50', gsroffset: String(offset), ...II })
    for (const p of data.query?.pages ?? []) {
      const c = toCandidate(p, via)
      if (c) out.push(c)
    }
    if (!data.continue?.gsroffset) break
    offset = data.continue.gsroffset
    await sleep(300)
  }
  return out
}

async function geo(c) {
  const out = []
  let cont = {}
  for (let n = 0; n < 30; n++) {
    const data = await api({ action: 'query', generator: 'geosearch', ggsnamespace: '6', ggscoord: `${c.lat}|${c.lng}`, ggsradius: String(c.r), ggslimit: '50', ...II, ...cont })
    for (const p of data.query?.pages ?? []) {
      const cand = toCandidate(p, 'geo')
      if (cand) out.push(cand)
    }
    if (!data.continue) break
    cont = data.continue
    await sleep(300)
  }
  return out
}

async function openverse(c) {
  const out = []
  for (let page = 1; page <= 4; page++) {
    const q = new URLSearchParams({ q: `${c.en} Syria`, license: 'by,by-sa,cc0,pdm', source: 'flickr', page_size: '20', page: String(page), mature: 'false' })
    const res = await fetch(`https://api.openverse.org/v1/images/?${q}`, { headers: UA })
    if (!res.ok) break
    const data = await res.json()
    for (const r of data.results ?? []) {
      const hay = `${r.title} ${(r.tags ?? []).map((t) => t.name).join(' ')}`
      if (SKIP.test(hay)) continue
      if (r.width && Math.max(r.width, r.height) < 1000) continue
      if (!new RegExp(c.en.split(' ')[0], 'i').test(hay)) continue
      out.push({
        source: 'flickr',
        via: 'openverse',
        title: strip(r.title).slice(0, 120),
        href: r.foreign_landing_url,
        original: r.url,
        width: r.width,
        height: r.height,
        grid: r.url,
        full: r.url,
        tiny: r.thumbnail,
        license: `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`.replace('CC CC0', 'CC0').replace('CC PDM', 'Public domain'),
        licenseUrl: r.license_url,
        author: strip(r.creator).slice(0, 80) || null,
        year: null,
        date: null,
        description: '',
        categories: (r.tags ?? []).slice(0, 12).map((t) => t.name),
      })
    }
    if (page >= (data.page_count ?? 1)) break
    await sleep(3500)
  }
  return out
}

function rank(list) {
  const seen = new Set()
  const unique = list.filter((c) => (seen.has(c.href) ? false : (seen.add(c.href), true)))
  const score = (c) =>
    (c.year >= 2018 ? 4 : c.year >= 2011 ? 2 : c.year ? 0 : 1) + Math.min(3, (c.width * c.height) / 4e6) + (c.via === 'cat' ? 1 : 0) + (c.source === 'commons' ? 0.5 : 0)
  unique.sort((a, b) => score(b) - score(a))
  // Variety: no more than 6 photos sharing their first specific category (one castle, one souq...).
  const perCat = new Map()
  const out = []
  for (const c of unique) {
    const key = c.categories.find((k) => !/(Syria|uploaded|license|cc-by|pd-|self-published|taken with|files|media|pages|wiki loves|photographs by|images by)/i.test(k)) ?? c.title
    const n = perCat.get(key) ?? 0
    if (n >= 6) continue
    perCat.set(key, n + 1)
    out.push({ ...c, group: key })
  }
  return out
}

const summary = {}
for (const c of CITIES) {
  if (only && c.slug !== only) continue
  const all = []
  for (const cat of c.cats) {
    try {
      all.push(...(await search(`deepcat:"${cat}" filetype:bitmap`, 'cat', 600)))
    } catch (e) {
      console.error(c.slug, 'deepcat', cat, e.message)
    }
    try {
      all.push(...(await search(`incategory:"${cat.replace(/ /g, '_')}" filetype:bitmap`, 'cat', 300)))
    } catch (e) {
      console.error(c.slug, 'incat', cat, e.message)
    }
  }
  try {
    all.push(...(await geo(c)))
  } catch (e) {
    console.error(c.slug, 'geo', e.message)
  }
  try {
    all.push(...(await openverse(c)))
  } catch (e) {
    console.error(c.slug, 'openverse', e.message)
  }
  const near = (x) => {
    if (x.lat == null) return null
    // Stay on the Syrian side of the ceasefire line / border (Quneitra, Daraa).
    if ((c.minLon && x.lon < c.minLon) || (c.minLat && x.lat < c.minLat)) return false
    const dy = (x.lat - c.lat) * 111000
    const dx = (x.lon - c.lng) * 111000 * Math.cos((c.lat * Math.PI) / 180)
    return Math.hypot(dx, dy) <= c.r * (x.via === 'geo' ? 1 : 3)
  }
  const nameRe = new RegExp(c.names, 'i')
  const elsewhere = /jerusalem|maryland|virginia|oregon|ohio|arkansas|pennsylvania|cairo|egypt|lebanon|jordan|israel|turkey|iraq|benevento|italy/i
  const inPlace = all.filter((x) => {
    const hay = `${x.title} ${x.categories.join(' ')}`
    if (elsewhere.test(hay)) return false
    if (x.source !== 'commons') return nameRe.test(hay)
    const n = near(x)
    if (n !== null) return n
    // No camera location: only when the file's own title or categories name the city.
    return x.via === 'cat' && nameRe.test(hay)
  })
  const ranked = rank(inPlace).slice(0, 180)
  writeFileSync(`${OUT}/${c.slug}.json`, JSON.stringify(ranked, null, 1))
  summary[c.slug] = { raw: all.length, inPlace: inPlace.length, kept: ranked.length, commons: ranked.filter((x) => x.source === 'commons').length, flickr: ranked.filter((x) => x.source === 'flickr').length }
  console.log(c.slug, summary[c.slug])
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 1))
