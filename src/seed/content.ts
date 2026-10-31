// Entry point for `npm run seed:content` (scripts/seed-content.mjs runs it through `payload run`).
// Fills the site with the sourced starter content in seed-content/*.json. Fill-only and re-runnable:
// it never changes a value a person already entered, and a second run adds nothing new.
// Writes are made as the "فريق التحرير" editor account, so hooks stamp that public name (never a
// correspondent's) on status items and guides. Report: seed-content/REPORT.md.
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { markdownToLexical } from '@/lib/lexical-text'
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits'

type Pair = { ar: string; en: string }
type Sourced = Pair & { sourceUrl: string }
type CityIn = {
  slug: string
  lat: number
  lng: number
  ahleenCity: string
  name: Pair
  tag: Pair
  lede: Pair
  food: Pair
  cover: { commons: string; shotNote: string }
  places: { ar: string; en: string; dAr: string; dEn: string; commons: string }[]
}
type StatusIn = {
  nationalStatus: Record<string, Sourced>
  cityStatusOverrides: Record<string, Record<string, Sourced>>
  seasonGuides: { city: string; fieldDate: string; title: string; body: string; commons: string }[]
}
type FirstVisitIn = { pages: { topic: string; officialSourceUrl: string | null; otherSources: string[]; body: Pair }[] }
type StaysIn = {
  stays: { city?: string; title?: string; description: string; ahleenUrl?: string; cityPageFallback?: boolean }[]
  dailyDetails: { date: string; city: string; place: string; ar: string; en: string; commons: string }[]
}
type Doc = Record<string, unknown> & { id: number }
type User = Doc & { role: string }

const read = <T>(f: string): T => JSON.parse(readFileSync(`seed-content/${f}`, 'utf8')) as T
const UA = { 'User-Agent': 'SyriaUpClose/1.0 (https://syria-up-close.vercel.app)' }
const EDITOR_EMAIL = 'editorial@syria-up-close.vercel.app'
const report = { added: {} as Record<string, number>, images: [] as string[], missingImages: [] as string[], drafts: [] as string[], skipped: [] as string[] }
// No Blob token yet: fill text now; a later run with the token adds the missing photos.
const NO_IMAGES = process.env.SEED_NO_IMAGES === '1'
const added = (c: string) => (report.added[c] = (report.added[c] ?? 0) + 1)

/** Empty in that locale (locale: 'all' values come back as { ar, en }). */
const blank = (v: unknown, loc: 'ar' | 'en') => {
  const x = v && typeof v === 'object' ? (v as Record<string, unknown>)[loc] : undefined
  return typeof x !== 'string' || !x.trim()
}
const strip = (s?: string) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// ── Images ──────────────────────────────────────────────────────────────────────────────────────
type Meta = Record<string, { value?: string } | undefined>
type Info = { thumburl?: string; width: number; height: number; mime: string; extmetadata?: Meta }
const FREE_LICENSE = /^(cc0|public domain|cc by(-sa)? \d)/i

/** First landscape, ≥1200px, freely licensed photo for a Commons search (CC BY / BY-SA / CC0 / PD only). */
async function commonsImage(q: string) {
  const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: q, gsrlimit: '15', prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600' })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })
  if (!res.ok) return null
  const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; index: number; imageinfo?: Info[] }> } }
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index)
  for (const p of pages) {
    const i = p.imageinfo?.[0]
    const license = strip(i?.extmetadata?.LicenseShortName?.value)
    if (!i?.thumburl || !/^image\/(jpeg|png|webp)$/.test(i.mime) || i.width < 1200 || i.width < i.height || !FREE_LICENSE.test(license)) continue
    const shot = /\d{4}-\d{2}-\d{2}/.exec(i.extmetadata?.DateTimeOriginal?.value ?? '')?.[0]
    return { title: p.title.replace(/^File:/, ''), url: i.thumburl, artist: strip(i.extmetadata?.Artist?.value) || 'غير معروف', license, shot }
  }
  return null
}

let fileNo = 0
/** Uploads one image (deduplicated by its credit line, which names the source file). */
async function upload(payload: Payload, user: User, src: { url: string; alt: string; credit: string; shotDate?: string; headers?: Record<string, string> }) {
  const existing = await payload.find({ collection: 'media', where: { credit: { equals: src.credit } }, limit: 1, depth: 0 })
  if (existing.docs[0]) return existing.docs[0].id
  const res = await fetch(src.url, { headers: src.headers ?? UA })
  const mimetype = res.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(mimetype)) return null
  const data = Buffer.from(await res.arrayBuffer())
  if (data.length > MAX_UPLOAD_BYTES) return null
  const name = `starter-${Date.now()}-${++fileNo}.${mimetype.split('/')[1]}`
  const doc = await payload.create({ collection: 'media', user, locale: 'ar', data: { alt: src.alt, credit: src.credit, ...(src.shotDate ? { shotDate: src.shotDate } : {}) } as never, file: { data, mimetype, name, size: data.length } })
  added('media')
  return doc.id
}

async function archival(payload: Payload, user: User, query: string, alt: string): Promise<number | null> {
  if (NO_IMAGES) return null
  try {
    const img = await commonsImage(query)
    if (img) {
      const id = await upload(payload, user, { url: img.url, alt, credit: `صورة أرشيفية: ${img.artist} · ${img.license} · Wikimedia Commons · ${img.title}`, shotDate: img.shot })
      if (id !== null) {
        report.images.push(`${alt}: ${img.title}`)
        return id
      }
    }
  } catch (err) {
    payload.logger.warn(`image "${query}": ${err instanceof Error ? err.message : String(err)}`)
  }
  report.missingImages.push(`${alt} (${query})`)
  return null
}

/** A partner page's og:image (Ahleen hotels), credited to the partner. */
async function ogImage(payload: Payload, user: User, page: string, alt: string): Promise<number | null> {
  if (NO_IMAGES) return null
  try {
    const html = await (await fetch(page, { headers: UA })).text()
    const url = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
    if (url) return await upload(payload, user, { url, alt, credit: `أهلين · ${alt}` })
  } catch (err) {
    payload.logger.warn(`og:image ${page}: ${err instanceof Error ? err.message : String(err)}`)
  }
  report.missingImages.push(`${alt} (أهلين)`)
  return null
}

// ── Weather (Open-Meteo, no key) ────────────────────────────────────────────────────────────────
const WEATHER: [number, string, string][] = [
  [0, 'صحو', 'clear'], [3, 'غائم جزئياً', 'partly cloudy'], [48, 'ضباب', 'fog'], [57, 'رذاذ', 'drizzle'],
  [67, 'مطر', 'rain'], [77, 'ثلج', 'snow'], [82, 'زخات مطر', 'showers'], [86, 'زخات ثلج', 'snow showers'], [99, 'عواصف رعدية', 'thunderstorms'],
]
async function weather(c: CityIn): Promise<Pair | null> {
  const params = new URLSearchParams({ latitude: String(c.lat), longitude: String(c.lng), daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code', timezone: 'Asia/Damascus', forecast_days: '1' })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) return null
  const d = ((await res.json()) as { daily?: Record<string, (number | string)[]> }).daily
  const [date, max, min, rain, code] = ['time', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'weather_code'].map((k) => d?.[k]?.[0])
  if (date === undefined || max === undefined || min === undefined) return null
  const [, ar, en] = WEATHER.find(([upTo]) => Number(code) <= upTo) ?? WEATHER[0]!
  const r = (n: unknown) => Math.round(Number(n))
  return {
    ar: `توقعات ${date}: ${ar}، العظمى ${r(max)} والصغرى ${r(min)} درجة. احتمال المطر ${r(rain ?? 0)}%.`,
    en: `Forecast for ${date}: ${en}, high ${r(max)}, low ${r(min)} degrees C. Rain chance ${r(rain ?? 0)}%.`,
  }
}

// ── Steps ───────────────────────────────────────────────────────────────────────────────────────
async function editorUser(payload: Payload): Promise<User> {
  const found = await payload.find({ collection: 'users', where: { email: { equals: EDITOR_EMAIL } }, limit: 1, depth: 0 })
  if (found.docs[0]) return found.docs[0] as unknown as User
  // Nobody signs in with this account: its random password is never stored (the admin can reset it).
  const data = { email: EDITOR_EMAIL, name: 'فريق التحرير', displayName: 'فريق التحرير (من مصدر منشور)', role: 'editor', password: randomBytes(24).toString('base64url') }
  added('users')
  return (await payload.create({ collection: 'users', data: data as never })) as unknown as User
}

async function seedCities(payload: Payload, user: User, cities: CityIn[]) {
  const ids: Record<string, number> = {}
  for (const c of cities) {
    let city = (await payload.find({ collection: 'cities', where: { slug: { equals: c.slug } }, locale: 'all', limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
    const values: Record<string, Pair> = { name: c.name, tag: c.tag, lede: c.lede, eat: c.food }
    if (!city) {
      const ar = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.ar]))
      city = (await payload.create({ collection: 'cities', user, locale: 'ar', data: { slug: c.slug, ...ar } as never })) as unknown as Doc
      await payload.update({ collection: 'cities', id: city.id, user, locale: 'en', data: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.en])) as never })
      added('cities')
    } else {
      for (const loc of ['ar', 'en'] as const) {
        const fill = Object.fromEntries(Object.entries(values).filter(([k]) => blank(city![k], loc)).map(([k, v]) => [k, v[loc]]))
        if (Object.keys(fill).length) await payload.update({ collection: 'cities', id: city.id, user, locale: loc, data: fill as never })
      }
    }
    ids[c.slug] = city.id
    // The cover note describes the cover photo, so it is set together with an archival cover.
    if (!city.coverImage) {
      const cover = await archival(payload, user, c.cover.commons, c.name.ar)
      if (cover !== null) {
        await payload.update({ collection: 'cities', id: city.id, user, locale: 'ar', data: { coverImage: cover, coverShotNote: c.cover.shotNote } as never })
        await payload.update({ collection: 'cities', id: city.id, user, locale: 'en', data: { coverShotNote: `Archive photo: ${c.name.en}` } as never })
      }
    }

    for (const [order, p] of c.places.entries()) {
      const found = (await payload.find({ collection: 'places', where: { and: [{ city: { equals: city.id } }, { title: { equals: p.ar } }] }, locale: 'ar', limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
      if (found?.image) continue
      const image = await archival(payload, user, p.commons, p.ar)
      if (found) {
        if (image !== null) await payload.update({ collection: 'places', id: found.id, user, data: { image } as never })
        continue
      }
      const doc = await payload.create({ collection: 'places', user, locale: 'ar', data: { city: city.id, title: p.ar, description: p.dAr, order, ...(image !== null ? { image } : {}) } as never })
      await payload.update({ collection: 'places', id: doc.id, user, locale: 'en', data: { title: p.en, description: p.dEn } as never })
      added('places')
    }
  }
  return ids
}

async function seedStatus(payload: Payload, user: User, cities: CityIn[], ids: Record<string, number>, s: StatusIn) {
  for (const c of cities) {
    const city = ids[c.slug]!
    const items: Record<string, (Pair & { sourceUrl?: string }) | null> = { ...s.nationalStatus, ...s.cityStatusOverrides[c.slug] }
    items.weather = await weather(c).catch(() => null)
    for (const [type, item] of Object.entries(items)) {
      if (!item) {
        report.skipped.push(`حال البلد: ${c.name.ar} / ${type} (لم يُجلب)`)
        continue
      }
      const found = (await payload.find({ collection: 'statusItems', where: { and: [{ city: { equals: city } }, { type: { equals: type } }] }, limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
      // A person's entry is never replaced; the weather line this script wrote is refreshed on every run.
      const ours = found && (found.verifiedBy === user.id || (found.verifiedBy as Doc | undefined)?.id === user.id)
      if (found && !(type === 'weather' && ours)) continue
      const source = item.sourceUrl ?? (type === 'weather' ? 'https://open-meteo.com' : undefined)
      const doc = found
        ? await payload.update({ collection: 'statusItems', id: found.id, user, locale: 'ar', data: { value: item.ar, sourceUrl: source } as never })
        : await payload.create({ collection: 'statusItems', user, locale: 'ar', data: { city, type, value: item.ar, sourceUrl: source } as never })
      await payload.update({ collection: 'statusItems', id: doc.id, user, locale: 'en', data: { value: item.en } as never })
      if (!found) added('statusItems')
    }
  }
}

async function seedGuides(payload: Payload, user: User, ids: Record<string, number>, s: StatusIn) {
  for (const g of s.seasonGuides) {
    const found = (await payload.find({ collection: 'seasonReports', where: { title: { equals: g.title } }, draft: true, limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
    if (found && (found.photos as unknown[] | undefined)?.length) continue
    const photo = await archival(payload, user, g.commons, g.title)
    if (found) {
      if (photo !== null && found._status === 'published') await payload.update({ collection: 'seasonReports', id: found.id, user, data: { photos: [photo] } as never })
      continue
    }
    await payload.create({
      collection: 'seasonReports',
      user,
      data: { title: g.title, city: ids[g.city], fieldDate: `${g.fieldDate}T12:00:00.000Z`, body: markdownToLexical(g.body), photos: photo !== null ? [photo] : [], _status: 'published' } as never,
    })
    added('seasonReports')
  }
}

const sourceAnswers = async (url: string) => {
  try {
    const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20_000) })
    // Official sites often refuse scripts (403) or answer 5xx under bot protection: any answer but "gone" shows the page exists.
    return res.status !== 404 && res.status !== 410
  } catch {
    return false
  }
}

async function seedFirstVisit(payload: Payload, user: User, fv: FirstVisitIn) {
  for (const p of fv.pages) {
    const page = (await payload.find({ collection: 'firstVisitPages', where: { topic: { equals: p.topic } }, draft: true, locale: 'all', limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
    if (!page) {
      report.skipped.push(`أول زيارة/${p.topic}: الصفحة غير موجودة (شغّل npm run seed أولاً)`)
      continue
    }
    const hasBody = (loc: 'ar' | 'en') => Boolean(((page.body as Record<string, { root?: { children?: unknown[] } } | null> | null)?.[loc]?.root?.children ?? []).length)
    // A draft this script wrote earlier (same official source) is rewritten, and published once its source answers.
    const ownDraft = page._status === 'draft' && Boolean(p.officialSourceUrl) && page.officialSourceUrl === p.officialSourceUrl
    if (hasBody('ar') && !ownDraft) {
      report.skipped.push(`أول زيارة/${p.topic}: فيها محتوى سابق، لم تُلمس`)
      continue
    }
    const publish = Boolean(p.officialSourceUrl) && (await sourceAnswers(p.officialSourceUrl!))
    if (!publish) report.drafts.push(`أول زيارة/${p.topic}: ${p.officialSourceUrl ? `المصدر الرسمي لم يستجب (${p.officialSourceUrl})` : 'لا يوجد مصدر رسمي'}`)
    // The page shows its own title and "last verified" badge: drop those lines from the body.
    const body = (md: string, heading: string) =>
      markdownToLexical(
        md.split('\n').slice(1).filter((l) => !/^\*\*(آخر تحقق|Last checked)/.test(l)).join('\n') +
          (p.otherSources.length ? `\n### ${heading}\n${p.otherSources.map((u) => `- ${u}`).join('\n')}` : ''),
      )
    const status = publish ? 'published' : 'draft'
    await payload.update({ collection: 'firstVisitPages', id: page.id, user, locale: 'ar', draft: !publish, data: { body: body(p.body.ar, 'مصادر أخرى'), officialSourceUrl: p.officialSourceUrl ?? undefined, _status: status } as never })
    await payload.update({ collection: 'firstVisitPages', id: page.id, user, locale: 'en', draft: !publish, data: { body: body(p.body.en, 'Other sources'), _status: status } as never })
    added(publish ? 'firstVisitPages (منشورة)' : 'firstVisitPages (مسودة)')
  }
}

async function seedStays(payload: Payload, user: User, cities: CityIn[], ids: Record<string, number>, st: StaysIn) {
  const fallback = st.stays.find((s) => s.cityPageFallback)
  for (const s of st.stays) {
    if (s.cityPageFallback || !s.city || !s.title || !s.ahleenUrl) continue
    const city = ids[s.city]!
    const found = (await payload.find({ collection: 'stays', where: { and: [{ city: { equals: city } }, { title: { equals: s.title } }] }, locale: 'ar', limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
    if (found?.image) continue
    const image = await ogImage(payload, user, s.ahleenUrl, s.title)
    if (found) {
      if (image !== null) await payload.update({ collection: 'stays', id: found.id, user, data: { image } as never })
      continue
    }
    await payload.create({ collection: 'stays', user, locale: 'ar', data: { city, title: s.title, description: s.description, ahleenUrl: s.ahleenUrl, ...(image !== null ? { image } : {}) } as never })
    added('stays')
  }
  if (!fallback) return
  for (const c of cities) {
    const city = ids[c.slug]!
    if ((await payload.count({ collection: 'stays', where: { city: { equals: city } } })).totalDocs) continue
    const doc = await payload.create({
      collection: 'stays',
      user,
      locale: 'ar',
      data: { city, title: `إقامات في ${c.name.ar} على أهلين`, description: fallback.description, ahleenUrl: `https://www.ahleenbooking.com/cities/${c.ahleenCity}` } as never,
    })
    await payload.update({ collection: 'stays', id: doc.id, user, locale: 'en', data: { title: `Stays in ${c.name.en} on Ahleen`, description: 'The Ahleen page for this city. Ahleen lists a hotel only after inspecting it.' } as never })
    added('stays (صفحة المدينة)')
  }
}

async function seedDaily(payload: Payload, user: User, ids: Record<string, number>, st: StaysIn) {
  for (const d of st.dailyDetails) {
    const day = { greater_than_equal: `${d.date}T00:00:00.000Z`, less_than_equal: `${d.date}T23:59:59.999Z` }
    const found = (await payload.find({ collection: 'dailyDetail', where: { date: day }, limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined
    if (found?.photo) continue
    const photo = await archival(payload, user, d.commons, d.place)
    if (found) {
      if (photo !== null) await payload.update({ collection: 'dailyDetail', id: found.id, user, data: { photo } as never })
      continue
    }
    const doc = await payload.create({ collection: 'dailyDetail', user, locale: 'ar', data: { date: `${d.date}T00:00:00.000Z`, sentence: d.ar, place: d.place, city: ids[d.city], ...(photo !== null ? { photo } : {}) } as never })
    await payload.update({ collection: 'dailyDetail', id: doc.id, user, locale: 'en', data: { sentence: d.en } as never })
    added('dailyDetail')
  }
}

type ResearchIn = {
  venues: { city: string; kind: string; category?: string; subcategory?: string; name: Pair; neighbourhood: Pair; note: Pair; sourceUrl: string }[]
  lore: { city: string; kind: string; text: string; meaning: string; sourceUrl: string }[]
}

// Researched restaurants, sweet shops and proverbs go in as drafts only: an editor or correspondent checks
// each one before it is published (venues are "added after a visit", lore is reviewed before publishing).
async function seedResearch(payload: Payload, user: User, ids: Record<string, number>, r: ResearchIn) {
  for (const v of r.venues) {
    const city = ids[v.city]
    if (!city) continue
    const found = await payload.find({ collection: 'venues', where: { and: [{ city: { equals: city } }, { name: { equals: v.name.ar } }] }, draft: true, locale: 'ar', limit: 1, depth: 0 })
    if (found.docs.length) continue
    const doc = await payload.create({
      collection: 'venues',
      user,
      locale: 'ar',
      draft: true,
      data: { city, kind: v.kind, category: v.category, subcategory: v.subcategory, name: v.name.ar, neighbourhood: v.neighbourhood.ar || undefined, note: v.note.ar, _status: 'draft' } as never,
    })
    await payload.update({ collection: 'venues', id: doc.id, user, locale: 'en', draft: true, data: { name: v.name.en, neighbourhood: v.neighbourhood.en || undefined, note: v.note.en } as never })
    added('venues (مسودة)')
  }
  for (const l of r.lore) {
    const city = ids[l.city]
    if (!city) continue
    const found = await payload.find({ collection: 'cityLore', where: { text: { equals: l.text } }, draft: true, limit: 1, depth: 0 })
    if (found.docs.length) continue
    await payload.create({
      collection: 'cityLore',
      user,
      draft: true,
      data: { city, kind: l.kind, text: l.text, meaning: l.meaning || undefined, tellerName: `فريق التحرير · من مصدر منشور (${new URL(l.sourceUrl).hostname})`, _status: 'draft' } as never,
    })
    added('cityLore (مسودة)')
  }
}

function writeReport() {
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '- لا شيء')
  writeFileSync(
    'seed-content/REPORT.md',
    `# تقرير تعبئة المحتوى الأولي\n\nتاريخ التشغيل: ${new Date().toISOString()}\n\n## ما أُضيف\n${list(Object.entries(report.added).map(([k, v]) => `${k}: ${v}`))}\n\n` +
      `## صفحات بقيت مسودة\n${list(report.drafts)}\n\n## لم يُلمس أو لم يُجلب\n${list(report.skipped)}\n\n` +
      `## صور لم يُعثر لها على صورة حرة مناسبة\n${NO_IMAGES ? '- لم تُجلب صور في هذا التشغيل (لا يوجد مفتاح Blob). أعد التشغيل بعد إضافته.' : list(report.missingImages)}\n\n## الصور المستخدمة (راجعها بالعين)\n${list(report.images)}\n`,
  )
}

const payload = await getPayload({ config })
try {
  const cities = read<{ cities: CityIn[] }>('cities.json').cities
  const status = read<StatusIn>('status-and-seasons.json')
  const user = await editorUser(payload)
  payload.logger.info('seed:content - cities and places (with images; this takes a while)')
  const ids = await seedCities(payload, user, cities)
  payload.logger.info('seed:content - status, guides, first visit, stays, daily details')
  await seedStatus(payload, user, cities, ids, status)
  await seedGuides(payload, user, ids, status)
  await seedFirstVisit(payload, user, read<FirstVisitIn>('first-visit.json'))
  const stays = read<StaysIn>('stays-and-daily.json')
  await seedStays(payload, user, cities, ids, stays)
  await seedDaily(payload, user, ids, stays)
  await seedResearch(payload, user, ids, read<ResearchIn>('research-2026-10.json'))
  writeReport()
  payload.logger.info(`seed:content complete: ${JSON.stringify(report.added)} - see seed-content/REPORT.md`)
  process.exit(0)
} catch (err) {
  writeReport()
  payload.logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
}
