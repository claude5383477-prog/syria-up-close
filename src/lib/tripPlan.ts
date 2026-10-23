/**
 * "Plan your trip" on /outside: an illustration of the planning tool. Picks cities by interest
 * (order of the interests, no repeats), then spreads the nights over at most one stop per two nights.
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

export type Stop = { slug: string; nights: number }

export function planTrip(days: number, interests: readonly Interest[]): Stop[] {
  const nights = Math.max(1, Math.floor(days) - 1)
  const slugs: string[] = []
  for (const i of INTERESTS) {
    if (!interests.includes(i)) continue
    for (const s of INTEREST_CITIES[i]) if (!slugs.includes(s)) slugs.push(s)
  }
  if (slugs.length === 0) slugs.push('damascus')
  const stops = slugs.slice(0, Math.max(1, Math.min(slugs.length, Math.ceil(nights / 2))))
  const base = Math.floor(nights / stops.length)
  let extra = nights - base * stops.length
  return stops.map((slug) => ({ slug, nights: base + (extra-- > 0 ? 1 : 0) }))
}
