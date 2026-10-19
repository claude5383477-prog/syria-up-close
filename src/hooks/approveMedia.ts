import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type Field,
  type FilterOptions,
  type UploadField,
  type Where,
} from 'payload'
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits'

// Photos are private until published (access/approvedOrOwn). These hooks decide when a photo
// becomes public: at once when staff upload it, otherwise when staff publish something using it.

const isStaff = (user: unknown) => {
  const role = (user as { role?: string } | null)?.role
  return role === 'admin' || role === 'editor'
}
const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/** Set by approveReferencedMedia on its own update, so the flag is accepted whoever triggered the publish. */
export const APPROVE_CONTEXT = 'approveMedia'

/** Media beforeChange: staff uploads are approved; nobody else can set or change the flag. */
export const approveStaffUploads: CollectionBeforeChangeHook = ({ data, operation, req, originalDoc, context }) => {
  if (operation === 'create') return { ...data, approved: isStaff(req.user) }
  if (context?.[APPROVE_CONTEXT] || isStaff(req.user)) return data
  return { ...data, approved: originalDoc?.approved ?? false }
}

/**
 * afterChange for any collection with upload fields: when the saved document is public (published,
 * or a collection without drafts), every photo it uses becomes approved.
 */
export const approveReferencedMedia =
  (fields: string[]): CollectionAfterChangeHook =>
  async ({ doc, collection, req }) => {
    const hasDrafts = Boolean(typeof collection.versions === 'object' && collection.versions?.drafts)
    if (hasDrafts && doc._status !== 'published') return doc
    const ids = fields
      .flatMap((f) => (Array.isArray(doc[f]) ? doc[f] : [doc[f]]))
      .map(idOf)
      .filter((id): id is number | string => typeof id === 'number' || typeof id === 'string')
    if (ids.length) {
      await req.payload.update({
        collection: 'media',
        where: { and: [{ id: { in: ids } }, { approved: { not_equals: true } }] },
        data: { approved: true },
        overrideAccess: true,
        context: { [APPROVE_CONTEXT]: true },
        req,
      })
    }
    return doc
  }

/**
 * Which photos a user may attach (G1): staff any; a correspondent their own or approved ones (never
 * another correspondent's private photo, which publishing would otherwise make public); anyone else
 * approved ones. Payload enforces filterOptions on the server when a document is saved.
 */
export const attachableMedia: FilterOptions = ({ user }) => {
  if (isStaff(user)) return true
  const id = (user as { id?: unknown; role?: string } | null)?.role === 'correspondent' ? (user as { id: number | string }).id : undefined
  const approved: Where = { approved: { equals: true } }
  return id === undefined ? approved : { or: [approved, { uploadedBy: { equals: id } }] }
}

/**
 * beforeChange for collections with media upload fields: a non-staff user may only attach their own
 * or approved photos. Enforced here because Payload skips field validation (and so filterOptions) on
 * draft saves, and correspondents only ever save drafts.
 */
export const requireAttachableMedia =
  (fields: string[]): CollectionBeforeChangeHook =>
  async ({ data, req }) => {
    const user = req.user as { id?: number | string; role?: string } | null
    if (!user || isStaff(user) || !data) return data
    const ids = fields
      .flatMap((f) => (Array.isArray(data[f]) ? data[f] : [data[f]]))
      .map(idOf)
      .filter((id): id is number | string => typeof id === 'number' || typeof id === 'string')
    if (!ids.length) return data
    const { docs } = await req.payload.find({ collection: 'media', where: { id: { in: ids } }, overrideAccess: true, depth: 0, limit: ids.length, req })
    const allowed = (m: { approved?: boolean | null; uploadedBy?: unknown }) => m.approved === true || idOf(m.uploadedBy) === user.id
    if (docs.length !== new Set(ids.map(String)).size || !docs.every(allowed)) {
      throw new APIError('لا يمكنك إرفاق إلا صورك أو صوراً منشورة.', 403)
    }
    return data
  }

/**
 * For every collection with top-level upload fields pointing at media: approve the photos it uses
 * when it becomes public, and limit which photos can be attached (attachableMedia).
 */
export function withMediaApproval(c: CollectionConfig): CollectionConfig {
  if (c.slug === 'media') return c
  const isMediaUpload = (f: Field): f is UploadField => f.type === 'upload' && f.relationTo === 'media'
  const fields = c.fields.flatMap((f) => (isMediaUpload(f) ? [f.name] : []))
  if (!fields.length) return c
  return {
    ...c,
    fields: c.fields.map((f) => (isMediaUpload(f) ? { ...f, filterOptions: f.filterOptions ?? attachableMedia } : f)),
    hooks: {
      ...c.hooks,
      beforeChange: [...(c.hooks?.beforeChange ?? []), requireAttachableMedia(fields)],
      afterChange: [...(c.hooks?.afterChange ?? []), approveReferencedMedia(fields)],
    },
  }
}

/**
 * Media beforeChange (runs before the storage plugin's own hooks): only staff may choose a storage
 * folder (`prefix`) for a new photo. Security H1: a correspondent sending another photo's folder as
 * `prefix` would have their files stored inside it. Payload core already ignores `_objectKey` from
 * any caller and restores `prefix` on update; this closes the create path.
 */
export const lockUploadPrefix: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create' || isStaff(req.user) || !data || !('prefix' in data)) return data
  const rest = { ...data }
  delete rest.prefix
  return rest
}

/**
 * Media beforeOperation: refuses a file over the size cap before Payload processes it (G2), for
 * every user. The type list is enforced by Payload from the file content (Media.upload.mimeTypes).
 */
export const checkUploadSize: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const size = (req.file as { size?: number } | undefined)?.size ?? (args as { file?: { size?: number } }).file?.size
  if (typeof size === 'number' && size > MAX_UPLOAD_BYTES) {
    throw new APIError(`الصورة أكبر من ${MAX_UPLOAD_BYTES / 1024 / 1024} ميغابايت. صغّرها ثم أعد الرفع.`, 413)
  }
  return args
}
