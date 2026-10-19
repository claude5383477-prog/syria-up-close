import { beforeEach, describe, expect, it, vi } from 'vitest'

const del = vi.fn(async () => undefined)
const list = vi.fn(async ({ prefix }: { prefix: string }) => ({
  blobs: [
    { pathname: `${prefix}orphan.png`, url: `https://abc.public.blob.vercel-storage.com/${prefix}orphan.png`, uploadedAt: new Date(0) },
  ],
  hasMore: false,
}))
vi.mock('@vercel/blob', () => ({ del, list }))

const { blobOrphansEndpoint, deleteBlobFilesAfterDelete } = await import('@/hooks/blobCleanup')

const HOST = 'https://abc.public.blob.vercel-storage.com'
const admin = { id: 1, role: 'admin' }

beforeEach(() => {
  del.mockClear()
  list.mockClear()
  vi.unstubAllEnvs()
})

describe('deleteBlobFilesAfterDelete (media afterDelete)', () => {
  it('on Vercel Blob, deletes the document’s files and their folder', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_abc_123')
    const doc = { id: 3, url: `${HOST}/f1/a.png`, sizes: { thumb: { url: `${HOST}/f1/a-400x300.webp` } } }
    expect(await deleteBlobFilesAfterDelete({ doc } as never)).toBe(doc)
    expect(del).toHaveBeenCalledWith([`${HOST}/f1/a.png`, `${HOST}/f1/a-400x300.webp`], expect.objectContaining({ token: 'vercel_blob_rw_abc_123' }))
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'f1/', token: 'vercel_blob_rw_abc_123' }))
  })

  it('does nothing on local disk or S3 (their own adapters delete)', async () => {
    await deleteBlobFilesAfterDelete({ doc: { url: `${HOST}/f1/a.png` } } as never)
    expect(del).not.toHaveBeenCalled()
  })
})

describe('blobOrphansEndpoint (GET dry run, POST delete; admin only)', () => {
  const req = (user: unknown, method: 'get' | 'post', mediaDocs: unknown[] = []) =>
    ({ user, method, payload: { find: vi.fn(async () => ({ docs: mediaDocs })) } }) as never
  const call = async (r: never, method: 'get' | 'post') => {
    const ep = blobOrphansEndpoint.find((e) => e.method === method)!
    const res = (await ep.handler(r)) as Response
    return { status: res.status, body: (await res.json()) as Record<string, number> }
  }

  it('refuses everyone but the admin', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_abc_123')
    expect((await call(req({ id: 2, role: 'editor' }, 'post'), 'post')).status).toBe(403)
    expect((await call(req(null, 'get'), 'get')).status).toBe(403)
    expect(del).not.toHaveBeenCalled()
  })

  it('GET counts orphans without deleting; POST deletes only unreferenced files', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_abc_123')
    const referenced = { url: `${HOST}/kept.png`, sizes: {} }
    list.mockResolvedValueOnce({
      blobs: [
        { pathname: 'kept.png', url: `${HOST}/kept.png`, uploadedAt: new Date(0) },
        { pathname: 'old/orphan.png', url: `${HOST}/old/orphan.png`, uploadedAt: new Date(0) },
      ],
      hasMore: false,
    })
    const dry = await call(req(admin, 'get', [referenced]), 'get')
    expect(dry).toEqual({ status: 200, body: { total: 2, referenced: 1, orphans: 1, deleted: 0 } })
    expect(del).not.toHaveBeenCalled()

    list.mockResolvedValueOnce({ blobs: [{ pathname: 'old/orphan.png', url: `${HOST}/old/orphan.png`, uploadedAt: new Date(0) }], hasMore: false })
    const run = await call(req(admin, 'post', [referenced]), 'post')
    expect(run.body).toMatchObject({ orphans: 1, deleted: 1 })
    expect(del).toHaveBeenCalledWith([`${HOST}/old/orphan.png`], expect.anything())
  })

  it('is a 400 when Vercel Blob is not the storage', async () => {
    expect((await call(req(admin, 'get'), 'get')).status).toBe(400)
  })
})
