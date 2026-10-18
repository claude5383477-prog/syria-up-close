import { createHash, timingSafeEqual } from 'node:crypto'

/** Constant-time comparison of a presented secret with the configured one; nothing matches an unset secret. */
export function secretMatches(presented: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !presented) return false
  const digest = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(presented), digest(expected))
}
