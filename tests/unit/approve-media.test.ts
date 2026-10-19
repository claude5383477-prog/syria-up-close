import { describe, expect, it, vi } from 'vitest'
import { approvedOrOwn, ownUnapprovedOrStaff, staffOnlyField } from '@/access'
import { APPROVE_CONTEXT, approveReferencedMedia, approveStaffUploads, withMediaApproval } from '@/hooks/approveMedia'

const editor = { id: 1, role: 'editor' }
const corr = { id: 2, role: 'correspondent' }

describe('approvedOrOwn (media read)', () => {
  const read = approvedOrOwn('uploadedBy')
  it('staff see everything, correspondents approved or their own, visitors approved only', () => {
    expect(read({ req: { user: editor } } as never)).toBe(true)
    expect(read({ req: { user: corr } } as never)).toEqual({ or: [{ approved: { equals: true } }, { uploadedBy: { equals: 2 } }] })
    expect(read({ req: { user: null } } as never)).toEqual({ approved: { equals: true } })
  })

  it('only staff may write the flag', () => {
    expect(staffOnlyField({ req: { user: editor } } as never)).toBe(true)
    expect(staffOnlyField({ req: { user: corr } } as never)).toBe(false)
  })
})

describe('approveStaffUploads (media beforeChange)', () => {
  const run = (args: object) => approveStaffUploads({ data: { approved: true }, ...args } as never)
  it('approves staff uploads and never a correspondent upload, whatever the client sends', () => {
    expect(run({ operation: 'create', req: { user: editor } })).toMatchObject({ approved: true })
    expect(run({ operation: 'create', req: { user: corr } })).toMatchObject({ approved: false })
  })

  it('on update keeps the stored flag unless staff or the approval hook change it', () => {
    expect(run({ operation: 'update', req: { user: corr }, originalDoc: { approved: false } })).toMatchObject({ approved: false })
    expect(run({ operation: 'update', req: { user: corr }, originalDoc: {} })).toMatchObject({ approved: false })
    expect(run({ operation: 'update', req: { user: editor }, originalDoc: { approved: false } })).toMatchObject({ approved: true })
    expect(run({ operation: 'update', req: { user: null }, originalDoc: { approved: false }, context: { [APPROVE_CONTEXT]: true } })).toMatchObject({
      approved: true,
    })
  })
})

describe('approveReferencedMedia (afterChange)', () => {
  const setup = () => {
    const update = vi.fn().mockResolvedValue({})
    return { update, req: { payload: { update } } }
  }
  const drafts = { versions: { drafts: true } }

  it('approves every photo of a published document, single or many, ids or objects', async () => {
    const { update, req } = setup()
    const doc = { _status: 'published', photos: [{ id: 5 }, 6], cover: 7 }
    expect(await approveReferencedMedia(['photos', 'cover'])({ doc, collection: drafts, req } as never)).toBe(doc)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'media', data: { approved: true }, overrideAccess: true, context: { [APPROVE_CONTEXT]: true } }),
    )
    expect(update.mock.calls[0]![0].where).toEqual({ and: [{ id: { in: [5, 6, 7] } }, { approved: { not_equals: true } }] })
  })

  it('leaves photos of drafts alone, and does nothing without photos', async () => {
    const { update, req } = setup()
    await approveReferencedMedia(['photos'])({ doc: { _status: 'draft', photos: [5] }, collection: drafts, req } as never)
    await approveReferencedMedia(['image'])({ doc: { image: null }, collection: {}, req } as never)
    expect(update).not.toHaveBeenCalled()
  })

  it('treats a collection without drafts as always public', async () => {
    const { update, req } = setup()
    await approveReferencedMedia(['image'])({ doc: { image: 9 }, collection: {}, req } as never)
    expect(update).toHaveBeenCalledTimes(1)
  })
})

describe('withMediaApproval', () => {
  it('adds the hook after existing ones to collections with top-level media uploads only', () => {
    const existing = vi.fn()
    const places = withMediaApproval({ slug: 'places', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }], hooks: { afterChange: [existing] } } as never)
    expect(places.hooks?.afterChange).toHaveLength(2)
    expect(places.hooks?.afterChange?.[0]).toBe(existing)
    const plain = { slug: 'users', fields: [{ name: 'name', type: 'text' }] } as never
    expect(withMediaApproval(plain)).toBe(plain)
    const media = { slug: 'media', fields: [{ name: 'x', type: 'upload', relationTo: 'media' }] } as never
    expect(withMediaApproval(media)).toBe(media)
  })
})

describe('ownUnapprovedOrStaff (media update/delete)', () => {
  const rule = ownUnapprovedOrStaff('uploadedBy')
  it('staff always; a correspondent only their own unapproved photos; nobody else', () => {
    expect(rule({ req: { user: editor } } as never)).toBe(true)
    expect(rule({ req: { user: corr } } as never)).toEqual({ and: [{ uploadedBy: { equals: 2 } }, { approved: { not_equals: true } }] })
    expect(rule({ req: { user: null } } as never)).toBe(false)
  })
})

describe('lockUploadPrefix (media beforeChange)', () => {
  it('drops a prefix a correspondent sends on create; staff and updates are untouched', async () => {
    const { lockUploadPrefix } = await import('@/hooks/approveMedia')
    const data = { alt: 'x', prefix: 'victimkey' }
    expect(lockUploadPrefix({ data, operation: 'create', req: { user: corr } } as never)).toEqual({ alt: 'x' })
    expect(lockUploadPrefix({ data, operation: 'create', req: { user: editor } } as never)).toBe(data)
    expect(lockUploadPrefix({ data, operation: 'update', req: { user: corr } } as never)).toBe(data)
    expect(lockUploadPrefix({ data: { alt: 'x' }, operation: 'create', req: { user: corr } } as never)).toEqual({ alt: 'x' })
  })
})
