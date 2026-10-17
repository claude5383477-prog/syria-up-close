import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Content rule ق3: every save of a practical fact records who verified it and when.
 * Always taken from the session and the server clock; client-sent values are overwritten.
 */
export const stampVerification =
  (byField = 'verifiedBy', atField = 'verifiedAt', now: () => Date = () => new Date()): CollectionBeforeChangeHook =>
  ({ data, req }) => ({ ...data, [byField]: req.user?.id ?? null, [atField]: now().toISOString() })
