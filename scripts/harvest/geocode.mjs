// Finds coordinates for listed places that have no pin yet (scripts/harvest/geo-input.json) from
// OpenStreetMap: one Overpass query per city for named features, matched by normalised Arabic or
// English name; then Nominatim (1 request/second) for what is left. Output is reviewed before use.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const UA = { 'User-Agent': 'SyriaUpClose/1.0 (https://upclosesyria.com; geocode)' }
const { centers, items } = JSON.parse(readFileSync('scripts/harvest/geo-input.json', 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MAIN = new Set(['damascus', 'aleppo', 'latakia', 'homs', 'hama', 'tartous', 'idlib', 'daraa', 'suwayda', 'quneitra', 'raqqa', 'deir-ez-zor', 'hasakah'])
const radius = (city) => (MAIN.has(city) ? 25 : 12)

const STOP = /^(مطعم|مقهى|كافيه|كافتيريا|فندق|نزل|منتجع|حلويات|حديقة|منتزه|مجمع|استراحة|restaurant|cafe|café|hotel|resort|sweets|park)\s+/i
export const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(STOP, '')
    .replace(/\bال/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const km = (a, b) => {
  const r = Math.PI / 180
  const x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

async function overpass(city) {
  const [lat, lng] = centers[city]
  const d = radius(city) / 111
  const bbox = `${lat - d},${lng - d * 1.25},${lat + d},${lng + d * 1.25}`
  const q = `[out:json][timeout:120];(nwr["name"](${bbox})[~"^(amenity|tourism|leisure|historic|shop|natural|place|building|man_made|waterway)$"~"."];);out center tags;`
  for (let i = 0; i < 4; i++) {
    const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(q)}` })
    if (res.ok) return (await res.json()).elements
    await sleep(10000 * (i + 1))
  }
  return []
}

async function nominatim(query, city) {
  const [lat, lng] = centers[city]
  const d = radius(city) / 111
  const p = new URLSearchParams({ q: query, format: 'jsonv2', countrycodes: 'sy', limit: '3', viewbox: `${lng - d * 1.25},${lat + d},${lng + d * 1.25},${lat - d}`, bounded: '1', 'accept-language': 'ar' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { headers: UA })
  await sleep(1100)
  if (!res.ok) return []
  return res.json()
}

const out = []
const byCity = {}
for (const it of items) (byCity[it.city] ??= []).push(it)
for (const [city, list] of Object.entries(byCity)) {
  if (!centers[city]) continue
  const els = await overpass(city)
  await sleep(3000)
  const index = []
  for (const e of els) {
    const t = e.tags ?? {}
    const pt = e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null
    if (!pt) continue
    for (const n of [t.name, t['name:ar'], t['name:en'], t.alt_name, t.old_name]) if (n) index.push({ key: norm(n), name: t.name, pt, osm: `${e.type}/${e.id}`, tags: t })
  }
  for (const it of list) {
    const keys = [norm(it.ar), norm(it.en)].filter((k) => k.length >= 3)
    let hit = index.filter((x) => keys.includes(x.key))
    let how = 'osm-exact'
    if (!hit.length) {
      hit = index.filter((x) => keys.some((k) => k.length >= 5 && (x.key.includes(k) || (x.key.length >= 5 && k.includes(x.key)))))
      how = 'osm-partial'
    }
    hit = hit.filter((h) => km(h.pt, centers[city]) <= radius(city))
    let res = null
    if (hit.length) {
      const h = hit[0]
      res = { lat: h.pt[0], lng: h.pt[1], how, matched: h.name, osm: h.osm, candidates: hit.length, kind: h.tags.amenity ?? h.tags.tourism ?? h.tags.leisure ?? h.tags.historic ?? '' }
    } else {
      for (const q of [[it.ar, it.hoodAr].filter(Boolean).join('، '), it.ar, it.en].filter((s) => s && s.length > 2)) {
        const r = await nominatim(q, city)
        const good = r.find((x) => norm(x.name || x.display_name).includes(norm(it.ar)) || (it.en && norm(x.name || '').includes(norm(it.en))))
        if (good) {
          res = { lat: +good.lat, lng: +good.lon, how: 'nominatim', matched: good.display_name.slice(0, 120), osm: `${good.osm_type}/${good.osm_id}`, kind: good.type }
          break
        }
      }
    }
    out.push({ ...it, ...(res ?? { how: 'none' }), km: res ? +km([res.lat, res.lng], centers[city]).toFixed(1) : null })
  }
  console.log(city, list.length, out.filter((o) => o.city === city && o.how !== 'none').length)
}
mkdirSync('harvest', { recursive: true })
writeFileSync('harvest/geo.json', JSON.stringify(out, null, 1))
