import type { CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/**
 * Server-owned "created by" field: set from req.user on create and frozen afterwards.
 * Whatever the client sends for it is discarded (SPEC §5.2).
 */
export const stampCreator =
  (field: string): CollectionBeforeChangeHook =>
  ({ data, operation, req, originalDoc }) => {
    const value = operation === 'create' ? req.user?.id : idOf(originalDoc?.[field])
    return { ...data, [field]: value }
  }
