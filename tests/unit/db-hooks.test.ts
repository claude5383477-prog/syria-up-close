import { describe, expect, it, vi } from 'vitest'
import { withAudit } from '@/hooks/audit'
import { seasonSlug } from '@/hooks/seasonSlug'

describe('withAudit', () => {
  const base = { slug: 'cities', fields: [], hooks: { afterChange: [vi.fn()] } }

  it('leaves the audit log itself alone', () => {
    const log = { slug: 'auditLog', fields: [] }
    expect(withAudit(log)).toBe(log)
  })

  it('appends hooks after existing ones', () => {
    const out = withAudit(base)
    expect(out.hooks?.afterChange).toHaveLength(2)
    expect(out.hooks?.afterChange?.[0]).toBe(base.hooks.afterChange[0])
    expect(out.hooks?.afterDelete).toHaveLength(1)
    expect(withAudit({ slug: 'x', fields: [] }).hooks?.afterChange).toHaveLength(1)
  })

  const req = (user: { id: number } | null) => {
    const create = vi.fn()
    return { create, req: { user, payload: { create } } }
  }

  it('writes create/update/confirm entries with changed field names', async () => {
    const hook = withAudit(base).hooks!.afterChange![1]!
    const r = req({ id: 7 })
    const doc = { id: 3, name: 'x', tag: 'y' }
    await hook({ collection: { slug: 'cities' }, doc, previousDoc: { id: 3, name: 'x', tag: 'old' }, operation: 'update', req: r.req, context: {} } as never)
    expect(r.create.mock.calls[0]![0]).toMatchObject({
      collection: 'auditLog',
      overrideAccess: true,
      data: { user: 7, operation: 'update', collection: 'cities', docId: '3', changedFields: ['tag'] },
    })

    await hook({ collection: { slug: 'cities' }, doc, previousDoc: {}, operation: 'create', req: r.req, context: {} } as never)
    expect(r.create.mock.calls[1]![0].data).toMatchObject({ operation: 'create', changedFields: ['name', 'tag'] })

    await hook({ collection: { slug: 'statusItems' }, doc, previousDoc: doc, operation: 'update', req: r.req, context: { auditOperation: 'confirm' } } as never)
    expect(r.create.mock.calls[2]![0].data).toMatchObject({ operation: 'confirm', changedFields: [] })
  })

  it('writes delete entries and tolerates system (user-less) writes', async () => {
    const hook = withAudit(base).hooks!.afterDelete![0]!
    const r = req(null)
    await hook({ collection: { slug: 'cities' }, id: 9, req: r.req } as never)
    expect(r.create.mock.calls[0]![0].data).toMatchObject({ user: null, operation: 'delete', docId: '9', changedFields: [] })
  })
})

describe('seasonSlug', () => {
  const fakeReq = (taken: string[]) => ({
    payload: {
      findByID: vi.fn(async () => ({ slug: 'bloudan' })),
      count: vi.fn(async ({ where }: { where: { slug: { equals: string } } }) => ({ totalDocs: taken.includes(where.slug.equals) ? 1 : 0 })),
    },
  })
  const run = (data: Record<string, unknown> | undefined, taken: string[] = [], originalDoc?: Record<string, unknown>) =>
    seasonSlug({ data, req: fakeReq(taken), originalDoc } as never)

  it('builds city-date and suffixes when taken', async () => {
    expect(await run({ city: 1, fieldDate: '2026-12-01T00:00:00.000Z' })).toMatchObject({ slug: 'bloudan-2026-12-01' })
    expect(await run({ city: { id: 1 }, fieldDate: '2026-12-01' }, ['bloudan-2026-12-01', 'bloudan-2026-12-01-2'])).toMatchObject({
      slug: 'bloudan-2026-12-01-3',
    })
  })

  it('keeps an existing or provided slug, and waits for city and date', async () => {
    expect(await run({ slug: 'custom', city: 1, fieldDate: '2026-12-01' })).toMatchObject({ slug: 'custom' })
    expect(await run({ city: 1, fieldDate: '2026-12-01' }, [], { slug: 'old' })).not.toHaveProperty('slug')
    expect(await run({ city: 1 })).not.toHaveProperty('slug')
    expect(await run({ fieldDate: '2026-12-01' })).not.toHaveProperty('slug')
    expect(await run(undefined)).toBeUndefined()
  })
})
