import { PLAYER_ORIGINS } from './video'

/**
 * Sent on every response (next.config.ts). Anti-framing first (second security audit, M1): without
 * it another site could frame /admin or /correspondent and trick a signed-in editor or correspondent
 * into clicking publish, delete or save. 'self' rather than 'none' keeps same-origin previews possible.
 * A full Content-Security-Policy (script sources) is a separate step: too strict a policy breaks
 * Payload's admin, so it starts as report-only once added.
 * frame-src (batch 4, "عدسات"): our pages may frame only ourselves and the three video players.
 */

export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: `frame-ancestors 'self'; frame-src 'self' ${PLAYER_ORIGINS.join(' ')}` },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
] as const
