import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from 'payload'
import { changedFields } from '@/lib/audit'

type Operation = 'create' | 'update' | 'delete' | 'confirm'

async function write(req: PayloadRequest, collection: string, docId: unknown, operation: Operation, fields: string[]) {
  await req.payload.create({
    collection: 'auditLog',
    overrideAccess: true,
    req,
    data: {
      at: new Date().toISOString(),
      user: (req.user?.id as number | undefined) ?? null,
      operation,
      collection,
      docId: String(docId),
      changedFields: fields,
    },
  })
}

const afterChange: CollectionAfterChangeHook = async ({ collection, doc, previousDoc, operation, req, context }) => {
  const op: Operation = context?.auditOperation === 'confirm' ? 'confirm' : operation
  await write(req, collection.slug, doc.id, op, changedFields(operation === 'create' ? undefined : previousDoc, doc))
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ collection, id, req }) => {
  await write(req, collection.slug, id, 'delete', [])
}

/** Adds audit hooks to a collection (every collection except the log itself). */
export function withAudit(c: CollectionConfig): CollectionConfig {
  if (c.slug === 'auditLog') return c
  return {
    ...c,
    hooks: {
      ...c.hooks,
      afterChange: [...(c.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(c.hooks?.afterDelete ?? []), afterDelete],
    },
  }
}
