import type { CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/**
 * Server-owned "created by" field: set from req.user on create and frozen afterwards.
 * Whatever the client sends for it is discarded (SPEC §5.2). With `nameField`, the creator's
 * name is snapshotted too, for public display (visitors cannot read users).
 */
export const stampCreator =
  (field: string, nameField?: string): CollectionBeforeChangeHook =>
  ({ data, operation, req, originalDoc }) => {
    const out = { ...data, [field]: operation === 'create' ? req.user?.id : idOf(originalDoc?.[field]) }
    if (nameField) {
      out[nameField] =
        operation === 'create' ? ((req.user as { name?: string } | null)?.name ?? null) : (originalDoc?.[nameField] ?? null)
    }
    return out
  }
