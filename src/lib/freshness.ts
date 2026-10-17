export type Freshness = 'pending' | 'fresh' | 'stale'

const DAY_MS = 86_400_000

/**
 * Content rule ق3: every practical fact shows whether it is awaiting a first check,
 * fresh, or older than its allowed age (statusDays = 7, firstVisitDays = 30 in siteSettings).
 * Exactly `maxAgeDays` old is still fresh; a future timestamp (clock skew) counts as fresh.
 */
export function freshness(verifiedAt: Date | string | null | undefined, now: Date, maxAgeDays: number): Freshness {
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
    throw new RangeError(`maxAgeDays must be a positive number, got ${maxAgeDays}`)
  }
  if (verifiedAt == null) return 'pending'
  const t = verifiedAt instanceof Date ? verifiedAt.getTime() : Date.parse(verifiedAt)
  if (Number.isNaN(t)) return 'pending'
  return now.getTime() - t > maxAgeDays * DAY_MS ? 'stale' : 'fresh'
}
