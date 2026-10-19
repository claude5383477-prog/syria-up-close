import { beforeAll, describe, expect, it, vi } from 'vitest'

// Security H1, end to end through Payload and the real Vercel Blob plugin; only @vercel/blob's network
// calls are replaced by an in-memory store. A correspondent must not be able to place, overwrite or
// sweep files in another photo's folder by forging `prefix` or `_objectKey`.

const blob = vi.hoisted(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_teststore_abc123'
  return { store: new Map<string, Buffer>(), host: 'https://teststore.public.blob.vercel-storage.com' }
})

vi.mock('@vercel/blob', () => {
  class BlobNotFoundError extends Error {}
  const pathOf = (u: string) => decodeURIComponent(u.replace(/^https:\/\/[^/]+\//, ''))
  return {
    BlobNotFoundError,
    put: async (pathname: string, body: Buffer) => {
      blob.store.set(pathname, Buffer.from(body))
      return { url: `${blob.host}/${pathname}`, downloadUrl: `${blob.host}/${pathname}`, pathname, contentType: 'image/webp' }
    },
    del: async (urls: string | string[]) => {
      for (const u of Array.isArray(urls) ? urls : [urls]) blob.store.delete(pathOf(u))
    },
    head: async (u: string) => {
      const p = pathOf(u)
      if (!blob.store.has(p)) throw new BlobNotFoundError()
      return { url: `${blob.host}/${p}`, pathname: p, size: blob.store.get(p)!.length, uploadedAt: new Date(), contentType: 'image/webp' }
    },
    list: async ({ prefix = '' }: { prefix?: string }) => ({
      blobs: [...blob.store.keys()].filter((p) => p.startsWith(prefix)).map((p) => ({ pathname: p, url: `${blob.host}/${p}`, uploadedAt: new Date(0), size: 1 })),
      hasMore: false,
    }),
  }
})

const sharp = (await import('sharp')).default
const { makeUser, payload, resetWithAdmin } = await import('./helpers')
type User = Awaited<ReturnType<typeof makeUser>>

const png = async (color: string, name: string) => {
  const data = await sharp({ create: { width: 64, height: 64, channels: 3, background: color } }).png().toBuffer()
  return { data, mimetype: 'image/png', name, size: data.length }
}
const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const
const filesIn = (folder: string) => [...blob.store.keys()].filter((p) => p.startsWith(`${folder}/`)).sort()

let editor: User
let corr: User
let victimFiles: Map<string, Buffer>

beforeAll(async () => {
  await resetWithAdmin()
  editor = await makeUser('editor')
  const p = await payload()
  const city = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [city.id] })
  // A published staff photo in its own key folder, as a browser upload stores it.
  await p.create({ collection: 'media', overrideAccess: true, data: { alt: 'صورة منشورة', _objectKey: 'victimkey' } as never, file: await png('#0B4836', 'shared-name.png') })
  victimFiles = new Map(filesIn('victimkey').map((k) => [k, blob.store.get(k)!]))
})

describe('Blob folders cannot be hijacked (security H1)', () => {
  it('the victim photo is stored in its own key folder', () => {
    expect([...victimFiles.keys()]).toContain('victimkey/shared-name.webp')
  })

  it('a correspondent cannot overwrite another photo’s file by forging its folder and name', async () => {
    const p = await payload()
    // Same file name: refused or renamed; either way the victim's bytes must not change.
    await p.create({ collection: 'media', data: { alt: 'محاولة ١', prefix: 'victimkey' } as never, file: await png('#ff0000', 'shared-name.png'), ...as(corr) }).catch(() => null)
    for (const [k, bytes] of victimFiles) expect(blob.store.get(k)?.equals(bytes), k).toBe(true)
  })

  it('a correspondent cannot place a photo inside another photo’s folder', async () => {
    const p = await payload()
    const doc = await p.create({ collection: 'media', data: { alt: 'محاولة ٢', prefix: 'victimkey' } as never, file: await png('#ff0000', 'planted.png'), ...as(corr) })
    expect((doc as { prefix?: string | null }).prefix ?? '').not.toBe('victimkey')
    expect(filesIn('victimkey')).toEqual([...victimFiles.keys()].sort())
  })

  it('a correspondent cannot move their photo into another folder afterwards', async () => {
    const p = await payload()
    const own = await p.create({ collection: 'media', data: { alt: 'صورتي' }, file: await png('#00ff00', 'mine.png'), ...as(corr) })
    const updated = await p.update({ collection: 'media', id: own.id, data: { prefix: 'victimkey', _objectKey: 'victimkey' } as never, ...as(corr) })
    expect((updated as { prefix?: string | null }).prefix ?? '').not.toBe('victimkey')
    expect((updated as { _objectKey?: string | null })._objectKey ?? null).not.toBe('victimkey')
  })

  it('deleting the correspondent’s photos leaves the victim folder intact', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'media', where: { uploadedBy: { equals: corr.id } }, overrideAccess: true })
    for (const d of docs) await p.delete({ collection: 'media', id: d.id, ...as(corr) })
    expect(filesIn('victimkey')).toEqual([...victimFiles.keys()].sort())
  })

  it('staff deleting the victim photo removes its whole key folder', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'media', where: { alt: { equals: 'صورة منشورة' } }, overrideAccess: true })
    await p.delete({ collection: 'media', id: docs[0]!.id, ...as(editor) })
    expect(filesIn('victimkey')).toEqual([])
  })
})
