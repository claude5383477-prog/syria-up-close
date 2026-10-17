import type { CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/**
 * First-visit pages (ق3): publishing is the act of verification, so it stamps who and when.
 * Draft saves keep the previous stamp; client-sent values are always discarded.
 */
export const stampOnPublish =
  (byField = 'lastVerifiedBy', atField = 'lastVerifiedAt', now: () => Date = () => new Date()): CollectionBeforeChangeHook =>
  ({ data, req, originalDoc }) => {
    if (data._status === 'published') {
      return { ...data, [byField]: req.user?.id ?? null, [atField]: now().toISOString() }
    }
    return { ...data, [byField]: idOf(originalDoc?.[byField]) ?? null, [atField]: originalDoc?.[atField] ?? null }
  }
