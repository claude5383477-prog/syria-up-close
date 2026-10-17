import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
let outsideNext = false
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => {
    if (outsideNext) throw new Error('Invariant: static generation store missing')
    revalidatePath(...a)
  },
}))

const { revalidateSite, withRevalidate, PRIVATE_COLLECTIONS } = await import('@/hooks/revalidate')

beforeEach(() => {
  revalidatePath.mockReset()
  outsideNext = false
})

describe('revalidateSite', () => {
  it('invalidates every public page under the root layout', () => {
    revalidateSite()
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('is a no-op outside a Next request (seed CLI, tests) instead of failing the save', () => {
    outsideNext = true
    expect(() => revalidateSite()).not.toThrow()
  })
})

describe('withRevalidate', () => {
  it('adds afterChange/afterDelete to public collections, keeping existing hooks first', async () => {
    const existing = vi.fn()
    const c = withRevalidate({ slug: 'statusItems', fields: [], hooks: { afterChange: [existing] } })
    expect(c.hooks?.afterChange?.[0]).toBe(existing)
    const hook = c.hooks!.afterChange!.at(-1)!
    const doc = { id: 1 }
    expect(await hook({ doc } as never)).toBe(doc)
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    await c.hooks!.afterDelete!.at(-1)!({} as never)
    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('leaves private collections alone', () => {
    for (const slug of PRIVATE_COLLECTIONS) {
      const c = { slug, fields: [] }
      expect(withRevalidate(c)).toBe(c)
    }
    expect(PRIVATE_COLLECTIONS).toEqual(expect.arrayContaining(['users', 'auditLog']))
  })
})
