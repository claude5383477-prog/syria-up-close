import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
let outsideNext = false
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => {
    if (outsideNext) throw new Error('Invariant: static generation store missing')
    revalidatePath(...a)
  },
}))

const { revalidateSite, revalidateSiteEndpoint, withRevalidate, PRIVATE_COLLECTIONS } = await import('@/hooks/revalidate')

beforeEach(() => {
  revalidatePath.mockReset()
  outsideNext = false
})

describe('revalidateSite', () => {
  it('invalidates every public page under the root layout', () => {
    revalidateSite()
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('also refreshes /llms.txt, a route handler outside the page layouts that lists the pages', () => {
    revalidateSite()
    expect(revalidatePath).toHaveBeenCalledWith('/llms.txt')
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
    // One site-wide revalidation per change (each also refreshes /llms.txt).
    const layoutCalls = () => revalidatePath.mock.calls.filter((a) => a[1] === 'layout').length
    expect(layoutCalls()).toBe(1)
    await c.hooks!.afterDelete!.at(-1)!({} as never)
    expect(layoutCalls()).toBe(2)
  })

  it('leaves private collections alone', () => {
    for (const slug of PRIVATE_COLLECTIONS) {
      const c = { slug, fields: [] }
      expect(withRevalidate(c)).toBe(c)
    }
    expect(PRIVATE_COLLECTIONS).toEqual(expect.arrayContaining(['users', 'auditLog']))
  })
})

describe('revalidateSiteEndpoint (container boot and after the seed)', () => {
  const call = (secret?: string) =>
    revalidateSiteEndpoint.handler({ headers: new Headers(secret === undefined ? {} : { 'x-revalidate-secret': secret }) } as never) as Promise<Response>

  it('is POST /api/revalidate-site', () => {
    expect(revalidateSiteEndpoint).toMatchObject({ path: '/revalidate-site', method: 'post' })
  })

  it('refreshes the whole public site when the request carries PAYLOAD_SECRET', async () => {
    vi.stubEnv('PAYLOAD_SECRET', 'boot-secret')
    const res = await call('boot-secret')
    expect(res.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    vi.unstubAllEnvs()
  })

  it('refuses anyone else without touching the cache', async () => {
    vi.stubEnv('PAYLOAD_SECRET', 'boot-secret')
    expect((await call('guess')).status).toBe(401)
    expect((await call()).status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
