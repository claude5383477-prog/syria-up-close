// Countryside pages, Ahleen links and site search (owner decisions 2026-10-26). Pure helpers, so
// the pages stay thin and the rules are unit-tested.

/** A trip's page: /inside/<slug>, or /inside/trip-<id> for a trip an editor saved without a slug. */
export function tripPath(trip: { id: number; slug?: string | null }): string {
  return `/inside/${trip.slug || `trip-${trip.id}`}`
}

/** Guide photo keys a trip page may use when its resort has no gallery (scripts/photos-fill.mjs), in order. */
export function tripPhotoKeys(trip: { slug?: string | null; title: string }): string[] {
  const n = [1, 2, 3, 4]
  return [...n.map((i) => `sv-${trip.slug}-${i}`), `trip-${trip.title}`, ...n.map((i) => `trip-${trip.slug}-${i}`)]
}

/** The lookup key behind /inside/<key>: a slug, or the id of a trip without one. */
export function parseTripKey(key: string): { slug: string } | { id: number } | null {
  const byId = /^trip-(\d+)$/.exec(key)
  if (byId) return { id: Number(byId[1]) }
  return /^[a-z0-9-]+$/.test(key) ? { slug: key } : null
}

/** Main cities only: resorts and towns with a parent city live in its countryside. */
export function mainCities<C extends { parentCity?: unknown }>(cities: readonly C[]): C[] {
  return cities.filter((c) => c.parentCity == null)
}

// Ahleen's city pages (seed-content/cities.json → ahleenCity).
const AHLEEN_CITY: Record<string, string> = {
  quneitra: 'al-qunaytirah',
  palmyra: 'homs',
  hasakah: 'al-hasakah',
  zabadani: 'al-zabadani',
}

/** Ahleen's page for a city (never its home page, so "all stays in X" lands on X). */
export function ahleenCityUrl(base: string, slug: string): string {
  const root = (base || 'https://www.ahleenbooking.com').replace(/\/+$/, '')
  return `${root}/cities/${AHLEEN_CITY[slug] ?? slug}`
}

/** Partner links carry the guide's UTM tags, so Ahleen can count the bookings that came from us. */
export function withUtm(url: string, campaign: string): string {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return url
  }
  if (!/(^|\.)ahleenbooking\.com$/.test(u.hostname)) return url
  u.searchParams.set('utm_source', 'upclosesyria')
  u.searchParams.set('utm_medium', 'referral')
  u.searchParams.set('utm_campaign', campaign)
  return u.toString()
}

/** Arabic search folding: hamza forms, taa marbuta, alif maqsura, the article and tashkeel. */
export function foldArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/(^|\s)ال/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SearchItem = { name: string; sub: string; type: string; href: string }

/** Items whose name (first) or subtitle contains the query; names that start with it come first. */
export function searchItems(items: readonly SearchItem[], query: string, limit = 8): SearchItem[] {
  const q = foldArabic(query)
  if (q.length < 2) return []
  const scored = items.flatMap((it) => {
    const n = foldArabic(it.name)
    const rank = n.startsWith(q) ? 0 : n.includes(q) ? 1 : foldArabic(it.sub).includes(q) ? 2 : -1
    return rank < 0 ? [] : [{ it, rank }]
  })
  return scored.sort((a, b) => a.rank - b.rank).slice(0, limit).map((s) => s.it)
}

/** Sources stored one per line; blank lines dropped. */
export function sourceLines(v: string | null | undefined): string[] {
  return (v ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export type Fact = { k: string; v: string }
export type Faq = { q: string; a: string }

/** "In short" facts and the FAQ for a city page, from what the page already shows (no new claims). */
export function cityAnswers(o: { name: string; tag?: string | null; eat?: string | null; sweets: string[]; sights: string[]; hotels: number; listed?: number; rural: string[] }): { facts: Fact[]; faq: Faq[] } {
  const wait = 'بانتظار مراسل المدينة'
  const facts: Fact[] = [
    ...(o.tag ? [{ k: 'المنطقة', v: o.tag }] : []),
    { k: 'شو تاكل', v: o.eat || wait },
    { k: 'حلوها', v: o.sweets.length ? o.sweets.join('، ') : wait },
    { k: 'أبرز المعالم', v: o.sights.length ? o.sights.slice(0, 3).join('، ') : wait },
    { k: 'وين تنام', v: o.hotels ? `${o.hotels} فندق على أهلين` : o.listed ? `${o.listed} فندق للمعلومة، وصفحة ${o.name} على أهلين` : `صفحة ${o.name} على أهلين` },
    ...(o.rural.length ? [{ k: 'ريفها', v: o.rural.join('، ') }] : []),
  ]
  const faq: Faq[] = [
    ...(o.eat ? [{ q: `شو لازم آكل بـ${o.name}؟`, a: `${o.eat} ولكل مطعم بالقائمة رابط موقعه.` }] : []),
    ...(o.sweets.length ? [{ q: `شو أشهر حلويات ${o.name}؟`, a: `${o.sweets.join('، ')}.` }] : []),
    ...(o.sights.length ? [{ q: `شو أهم المعالم بـ${o.name}؟`, a: `${o.sights.slice(0, 5).join('، ')}. كل معلم عليه رابط موقعه على الخريطة.` }] : []),
    {
      q: `وين بنام بـ${o.name}؟`,
      a: o.hotels
        ? `في ${o.hotels} فندق على أهلين، وكل واحد بينحجز من صفحته مباشرة. أهلين شريكنا والشراكة غير مدفوعة.`
        : o.listed
          ? `بقسم الفنادق ${o.listed} فندق من دليل وزارة السياحة للمعلومة (بلا حجز)، وصفحة ${o.name} على أهلين فيها الإقامات المتاحة.`
          : `ما في فنادق مدرجة بعد؛ صفحة ${o.name} على أهلين فيها الإقامات المتاحة.`,
    },
    ...(o.rural.length ? [{ q: `شو في مشاوير قريبة من ${o.name}؟`, a: `${o.rural.join('، ')}. لكل مكان صفحته بقسم جوّا سوريا.` }] : []),
    { q: `كيف حال الكهرباء والإنترنت اليوم بـ${o.name}؟`, a: 'بقسم "حال البلد اليوم": كل بند عليه اسم المراسل اللي تحقق منه وتاريخ التحقق.' },
  ]
  return { facts, faq }
}

type SpotLike = { kind: 'stay' | 'food' | 'nature' | 'ruins' | 'picnic'; name: string }

/** "In short" facts and the FAQ for a countryside page, from its own spots (no new claims). */
export function tripAnswers(o: { name: string; region: string; distance?: string | null; spots: readonly SpotLike[]; hotels: number }): { facts: Fact[]; faq: Faq[] } {
  const names = (k: SpotLike['kind']) => o.spots.filter((s) => s.kind === k).map((s) => s.name)
  const wait = 'بانتظار المراسل'
  const [stay, food, nature, ruins] = [names('stay'), names('food'), names('nature'), names('ruins')]
  const facts: Fact[] = [
    { k: 'وين', v: [o.region, o.distance].filter(Boolean).join('، ') },
    { k: 'طبيعة', v: nature.length ? nature.slice(0, 4).join('، ') : wait },
    { k: 'آثار', v: ruins.length ? ruins.slice(0, 3).join('، ') : wait },
    { k: 'وين تنام', v: stay.length || o.hotels ? [...stay, ...(o.hotels ? [`${o.hotels} إقامة على أهلين`] : [])].join('، ') : wait },
    { k: 'وين تاكل', v: food.length ? food.slice(0, 3).join('، ') : wait },
  ]
  const faq: Faq[] = [
    ...(o.distance ? [{ q: `كم بعيدة ${o.name}؟`, a: `${o.distance}.` }] : []),
    ...(nature.length ? [{ q: `شو في طبيعة وينابيع بـ${o.name}؟`, a: `${nature.join('، ')}.` }] : []),
    ...(ruins.length ? [{ q: `في آثار بـ${o.name}؟`, a: `${ruins.join('، ')}.` }] : []),
    {
      q: `وين بنام بـ${o.name}؟`,
      a: stay.length || o.hotels ? `${[...stay, ...(o.hotels ? ['إقامات على أهلين'] : [])].join('، ')}. تأكد من الحجز قبل السفر.` : `بانتظار المراسل؛ صفحة ${o.region} على أهلين فيها الإقامات القريبة.`,
    },
    { q: `في أماكن تخييم بـ${o.name}؟`, a: 'ما منقترح مكان تخييم قبل ما يزوره مراسلنا ويتأكد منه.' },
  ]
  return { facts, faq }
}
