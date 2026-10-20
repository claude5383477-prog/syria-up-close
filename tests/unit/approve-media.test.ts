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

describe('assignUploadDestination (media beforeOperation)', () => {
  const run = async (args: Record<string, unknown>, user: unknown, operation = 'create') => {
    const { assignUploadDestination } = await import('@/hooks/approveMedia')
    const req = { user, file: args.file }
    const out = (await assignUploadDestination({ args: { ...args, req }, operation, req } as never)) as { data?: Record<string, unknown> }
    return { data: out.data, file: req.file as { name: string } | undefined }
  }
  const uuid = /^[0-9a-f-]{36}\.jpg$/

  it('names every uploaded file with a UUID, for staff too', async () => {
    expect((await run({ data: {}, file: { name: 'gate-400x300.jpg' } }, corr)).file?.name).toMatch(uuid)
    expect((await run({ data: {}, file: { name: 'IMG_0001.jpg' } }, editor, 'update')).file?.name).toMatch(uuid)
  })

  it('drops a caller-chosen file name or URL, and a non-staff folder', async () => {
    const data = { alt: 'x', prefix: 'zz', filename: 'gate.webp', url: 'https://example.org/a.jpg' }
    expect((await run({ data }, corr)).data).toEqual({ alt: 'x' })
    expect((await run({ data }, corr, 'update')).data).toEqual({ alt: 'x' })
    expect((await run({ data }, editor)).data).toEqual({ alt: 'x', prefix: 'zz' })
  })

  it('leaves server code (overrideAccess) and other operations alone', async () => {
    const file = { name: 'seed.jpg' }
    expect((await run({ data: { prefix: 'p' }, file, overrideAccess: true }, null)).file?.name).toBe('seed.jpg')
    expect((await run({ data: { prefix: 'p' } }, corr, 'delete')).data).toEqual({ prefix: 'p' })
  })
})

describe('checkUploadSize (media beforeOperation)', () => {
  it('refuses a file over the cap on create and update, for anyone; passes everything else through', async () => {
    const { checkUploadSize } = await import('@/hooks/approveMedia')
    const { MAX_UPLOAD_BYTES } = await import('@/lib/upload-limits')
    const args = { data: {} }
    const big = { size: MAX_UPLOAD_BYTES + 1 }
    expect(() => checkUploadSize({ args, operation: 'create', req: { file: big } } as never)).toThrow(/الصورة أكبر من/)
    expect(() => checkUploadSize({ args: { file: big }, operation: 'update', req: {} } as never)).toThrow(/الصورة أكبر من/)
    expect(checkUploadSize({ args, operation: 'create', req: { file: { size: MAX_UPLOAD_BYTES } } } as never)).toBe(args)
    expect(checkUploadSize({ args, operation: 'create', req: {} } as never)).toBe(args)
    expect(checkUploadSize({ args, operation: 'delete', req: { file: big } } as never)).toBe(args)
  })
})

describe('attachable photos (G1)', () => {
  it('attachableMedia: staff any, a correspondent own or approved, others approved only', async () => {
    const { attachableMedia } = await import('@/hooks/approveMedia')
    const f = attachableMedia as (a: { user: unknown }) => unknown
    expect(f({ user: editor })).toBe(true)
    expect(f({ user: corr })).toEqual({ or: [{ approved: { equals: true } }, { uploadedBy: { equals: 2 } }] })
    expect(f({ user: null })).toEqual({ approved: { equals: true } })
  })

  it('requireAttachableMedia refuses another correspondent’s private photo, even in a draft', async () => {
    const { requireAttachableMedia } = await import('@/hooks/approveMedia')
    const hook = requireAttachableMedia(['photos', 'cover'])
    const reqFor = (user: unknown, docs: unknown[]) => ({ user, payload: { find: vi.fn(async () => ({ docs })) } })
    const own = { id: 5, approved: false, uploadedBy: 2 }
    const approved = { id: 6, approved: true, uploadedBy: 9 }
    const theirs = { id: 7, approved: false, uploadedBy: { id: 9 } }
    await expect(hook({ data: { photos: [5, { id: 6 }] }, req: reqFor(corr, [own, approved]) } as never)).resolves.toBeTruthy()
    await expect(hook({ data: { photos: [5, 7] }, req: reqFor(corr, [own, theirs]) } as never)).rejects.toThrow(/صورك/)
    await expect(hook({ data: { cover: 99 }, req: reqFor(corr, []) } as never)).rejects.toThrow(/صورك/)
    const data = { photos: [7] }
    expect(await hook({ data, req: reqFor(editor, []) } as never)).toBe(data)
    expect(await hook({ data, req: reqFor(null, []) } as never)).toBe(data)
    expect(await hook({ data: { photos: [] }, req: reqFor(corr, []) } as never)).toEqual({ photos: [] })
  })
})

describe('refuseUrlUpload (media beforeChange)', () => {
  const run = async (args: Record<string, unknown>) => {
    const { refuseUrlUpload } = await import('@/hooks/approveMedia')
    return refuseUrlUpload(args as never)
  }

  it('refuses a create marked as having no uploaded file that ends up with a file (from a URL)', async () => {
    await expect(run({ operation: 'create', data: { filename: 'x.webp' }, req: { context: { mediaCreateWithoutFile: true } } })).rejects.toThrow(/رابط/)
  })

  it('lets uploads, duplicates and updates through', async () => {
    const data = { filename: 'x.webp' }
    expect(await run({ operation: 'create', data, req: { context: {} } })).toBe(data)
    expect(await run({ operation: 'update', data, req: { context: { mediaCreateWithoutFile: true } } })).toBe(data)
  })

  it('assignUploadDestination marks a create with no file that is not a duplicate', async () => {
    const { assignUploadDestination } = await import('@/hooks/approveMedia')
    const mark = async (args: Record<string, unknown>) => {
      const req = { user: corr, context: {} as Record<string, unknown>, file: args.file }
      await assignUploadDestination({ args: { data: {}, ...args, req }, operation: 'create', req } as never)
      return req.context.mediaCreateWithoutFile === true
    }
    expect(await mark({})).toBe(true)
    expect(await mark({ file: { name: 'a.jpg' } })).toBe(false)
    expect(await mark({ duplicateFromID: 3 })).toBe(false)
  })
})
