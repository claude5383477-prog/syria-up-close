import type { CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)
const nameOf = (user: unknown) => ((user as { name?: string } | null)?.name ?? null) as string | null

/**
 * First-visit pages (ق3): publishing is the act of verification, so it stamps who and when
 * (plus a public name snapshot). Draft saves keep the previous stamp; client values are always discarded.
 */
export const stampOnPublish =
  (byField = 'lastVerifiedBy', atField = 'lastVerifiedAt', now: () => Date = () => new Date()): CollectionBeforeChangeHook =>
  ({ data, req, originalDoc }) => {
    const nameField = `${byField}Name`
    if (data._status === 'published') {
      return { ...data, [byField]: req.user?.id ?? null, [nameField]: nameOf(req.user), [atField]: now().toISOString() }
    }
    return {
      ...data,
      [byField]: idOf(originalDoc?.[byField]) ?? null,
      [nameField]: originalDoc?.[nameField] ?? null,
      [atField]: originalDoc?.[atField] ?? null,
    }
  }
