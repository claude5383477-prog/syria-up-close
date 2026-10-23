/**
 * A city's stays split for the hotels section: real hotels (with a booking link when they are on
 * Ahleen, without one when they are not) and the city's Ahleen page, which the seed stores as a stay
 * whose URL is the city page (/cities/…), shown as "all stays in this city on Ahleen".
 */
type StayLike = { ahleenUrl?: string | null }

const isCityPage = (url: string) => {
  try {
    return new URL(url).pathname.startsWith('/cities/')
  } catch {
    return false
  }
}

export function splitStays<S extends StayLike>(stays: readonly S[]): { hotels: S[]; cityPage: string | null } {
  const hotels: S[] = []
  let cityPage: string | null = null
  for (const s of stays) {
    if (s.ahleenUrl && isCityPage(s.ahleenUrl)) cityPage ??= s.ahleenUrl
    else hotels.push(s)
  }
  return { hotels, cityPage }
}
