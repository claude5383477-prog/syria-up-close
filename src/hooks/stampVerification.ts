import type { CollectionBeforeChangeHook } from 'payload'

const nameOf = (user: unknown) => ((user as { name?: string } | null)?.name ?? null) as string | null

/**
 * Content rule ق3: every save of a practical fact records who verified it and when.
 * Always taken from the session and the server clock; client-sent values are overwritten.
 * `${byField}Name` is a public snapshot of the verifier's name (visitors cannot read users).
 */
export const stampVerification =
  (byField = 'verifiedBy', atField = 'verifiedAt', now: () => Date = () => new Date()): CollectionBeforeChangeHook =>
  ({ data, req }) => ({
    ...data,
    [byField]: req.user?.id ?? null,
    [`${byField}Name`]: nameOf(req.user),
    [atField]: now().toISOString(),
  })
