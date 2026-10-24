/**
 * "Plan your trip" on /outside. Picks the stops (the reader's own cities, or cities for their
 * interests), orders them along the road, gives every day to a stop, then fills each day from the
 * site's own content: the city's sights by day, a restaurant from the city's list by night.
 */
export const INTERESTS = ['history', 'food', 'nature', 'sea', 'family'] as const
export type Interest = (typeof INTERESTS)[number]

/** City slugs per interest; "family" has none: the reader's own family town is unknown to us. */
export const INTEREST_CITIES: Record<Interest, readonly string[]> = {
  history: ['damascus', 'aleppo', 'hama', 'daraa'],
  food: ['damascus', 'aleppo'],
  nature: ['bloudan', 'mashta-al-helu', 'slunfeh'],
  sea: ['latakia', 'tartous'],
  family: [],
}

/** A rough south-to-north road order, so the stops read as one trip. */
export const ROUTE = [
  'daraa',
  'suwayda',
  'quneitra',
  'damascus',
  'zabadani',
  'bloudan',
  'homs',
  'palmyra',
  'mashta-al-helu',
  'hama',
  'tartous',
  'latakia',
  'slunfeh',
  'mashquita',
  'kasab',
  'idlib',
  'aleppo',
  'raqqa',
  'deir-ez-zor',
  'hasakah',
] as const

export const MAX_DAYS = 30

export type Stop = { slug: string; days: number }

const routeIndex = (slug: string) => {
  const i = (ROUTE as readonly string[]).indexOf(slug)
  return i < 0 ? ROUTE.length : i
}

export function clampDays(days: number): number {
  return Math.min(MAX_DAYS, Math.max(1, Math.floor(days) || 1))
}

/**
 * The stops and the days at each. Chosen cities win over interests; with interests, each one gets
 * a city in turn (round robin) and a trip has about one stop per two days. Every day goes to a stop.
 */
export function planTrip(days: number, interests: readonly Interest[], cities: readonly string[] = [], available?: readonly string[]): Stop[] {
  const total = clampDays(days)
  const ok = (slug: string) => !available || available.includes(slug)
  let slugs: string[]
  const own = cities.filter(ok)
  if (own.length) {
    slugs = [...new Set(own)].sort((a, b) => routeIndex(a) - routeIndex(b)).slice(0, total)
  } else {
    const lists = INTERESTS.filter((i) => interests.includes(i)).map((i) => INTEREST_CITIES[i])
    const pool: string[] = []
    for (let r = 0; lists.some((l) => r < l.length); r++)
      for (const l of lists) {
        const c = l[r]
        if (c && ok(c) && !pool.includes(c)) pool.push(c)
      }
    if (!pool.length) pool.push('damascus')
    slugs = pool.slice(0, Math.max(1, Math.min(pool.length, Math.floor(total / 2)))).sort((a, b) => routeIndex(a) - routeIndex(b))
  }
  const base = Math.floor(total / slugs.length)
  let extra = total - base * slugs.length
  return slugs.map((slug) => ({ slug, days: base + (extra-- > 0 ? 1 : 0) }))
}

/** What the site knows about a city, for filling its days. `href` is a map link. */
export type CityPack = {
  sights: { name: string; note?: string; href: string }[]
  eats: { name: string; hood?: string; href: string }[]
  dish?: string
}

/** One slot of a day: morning (0), afternoon (1) or evening (2). */
export type DayItem =
  | { slot: 0 | 1 | 2; kind: 'arrive' }
  | { slot: 0; kind: 'move'; from: string }
  | { slot: 0 | 1; kind: 'sight'; name: string; note?: string; href: string }
  | { slot: 0 | 1 | 2; kind: 'free' }
  | {
      slot: 2
      kind: 'dine'
      name: string
      hood?: string
      dish?: string
      href: string
    }
  | { slot: 2; kind: 'taste'; dish: string }

export type PlanDay = { n: number; slug: string; items: DayItem[] }

/**
 * Day by day: day one in a city is arriving (or the road from the last stop) and one sight; other
 * days are two sights; every evening is the next restaurant on the city's list, the city's dish on
 * the first night. Runs out of sights? The slot is free time, never a made-up place.
 */
export function buildDays(stops: readonly Stop[], packs: Readonly<Record<string, CityPack | undefined>>): PlanDay[] {
  const out: PlanDay[] = []
  let prev: string | null = null
  for (const stop of stops) {
    const pack = packs[stop.slug]
    const sights = pack?.sights ?? []
    const eats = pack?.eats ?? []
    let k = 0
    const sight = (slot: 0 | 1): DayItem => {
      const s = sights[k++]
      return s ? { slot, kind: 'sight', name: s.name, note: s.note, href: s.href } : { slot, kind: 'free' }
    }
    for (let d = 0; d < stop.days; d++) {
      const items: DayItem[] = []
      if (d === 0) items.push(prev ? { slot: 0, kind: 'move', from: prev } : { slot: 0, kind: 'arrive' })
      else items.push(sight(0))
      items.push(sight(1))
      const dish = d === 0 ? pack?.dish : undefined
      const e = eats.length ? eats[d % eats.length] : undefined
      if (e)
        items.push({
          slot: 2,
          kind: 'dine',
          name: e.name,
          hood: e.hood,
          dish,
          href: e.href,
        })
      else items.push(dish ? { slot: 2, kind: 'taste', dish } : { slot: 2, kind: 'free' })
      out.push({ n: out.length + 1, slug: stop.slug, items })
    }
    prev = stop.slug
  }
  return out
}
