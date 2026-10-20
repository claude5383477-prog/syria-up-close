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

describe('a published photo cannot be overwritten on Blob (the server names every upload)', () => {
  // Production stores photos at the store root and Blob uploads overwrite. Payload's taken-name check
  // compares originals only (and inside the caller's `prefix`), so an original named like another
  // photo's size file (gate-400x300.jpg) replaced that size.
  const jpeg = async (color: string, name: string) => {
    const data = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: color } }).jpeg().toBuffer()
    return { data, mimetype: 'image/jpeg', name, size: data.length }
  }

  it('every attack fails and the victim files stay byte for byte the same', async () => {
    const p = await payload()
    const victim = await p.create({ collection: 'media', data: { alt: 'بوابة منشورة' }, file: await jpeg('#0B4836', 'gate.jpg'), ...as(editor) })
    const victimPaths = [victim.filename, ...Object.values(victim.sizes ?? {}).map((s) => s?.filename)].filter(Boolean) as string[]
    expect(victimPaths).toHaveLength(4)
    const before = new Map(victimPaths.map((k) => [k, blob.store.get(k)]))
    for (const [k, bytes] of before) expect(bytes, k).toBeDefined()

    const own = await p.create({ collection: 'media', data: { alt: 'صورتي غير المعتمدة' }, file: await jpeg('#222222', 'mine.jpg'), ...as(corr) })
    const attacks: [string, () => Promise<unknown>][] = [
      ['create, forged prefix, same name', async () => p.create({ collection: 'media', data: { alt: 'هجوم ١', prefix: 'zz' } as never, file: await jpeg('#ff0000', 'gate.jpg'), ...as(corr) })],
      ['create, same name', async () => p.create({ collection: 'media', data: { alt: 'هجوم ٢' }, file: await jpeg('#ff0000', 'gate.jpg'), ...as(corr) })],
      ['create, forged filename', async () => p.create({ collection: 'media', data: { alt: 'هجوم ٣', filename: 'gate.webp' } as never, file: await jpeg('#ff0000', 'x.jpg'), ...as(corr) })],
      ['update own photo, forged prefix, same name', async () => p.update({ collection: 'media', id: own.id, data: { prefix: 'zz' } as never, file: await jpeg('#ff0000', 'gate.jpg'), ...as(corr) })],
      ['update own photo, same name', async () => p.update({ collection: 'media', id: own.id, data: {}, file: await jpeg('#ff0000', 'gate.jpg'), ...as(corr) })],
      ['create, named like a size file', async () => p.create({ collection: 'media', data: { alt: 'هجوم ٤' }, file: await jpeg('#ff0000', 'gate-400x300.jpg'), ...as(corr) })],
      ['create, forged prefix, named like a size file', async () => p.create({ collection: 'media', data: { alt: 'هجوم ٥', prefix: 'zz' } as never, file: await jpeg('#ff0000', 'gate-800x600.jpg'), ...as(corr) })],
      ['replace the published file', async () => p.update({ collection: 'media', id: victim.id, data: {}, file: await jpeg('#ff0000', 'gate.jpg'), ...as(corr) })],
    ]
    for (const [, attack] of attacks) await attack().catch(() => null)

    for (const [k, bytes] of before) expect(blob.store.get(k)?.equals(bytes!), k).toBe(true)
    const after = await p.findByID({ collection: 'media', id: victim.id, overrideAccess: true, depth: 0 })
    expect(after.filename).toBe(victim.filename)
    expect(after.url).toBe(victim.url)
  })
})

describe('a correspondent cannot upload from a URL (it named the file and skipped the size cap)', () => {
  it('a URL download named like a published photo’s size file is refused and stores nothing', async () => {
    const p = await payload()
    // A reachable external image: Payload's SSRF-safe fetch cannot reach a test server, so this
    // test alone switches the collection to the global fetch and serves the image from a stub.
    const upload = p.collections.media.config.upload as { skipSafeFetch?: unknown }
    const saved = upload.skipSafeFetch
    const image = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#ff0000' } }).jpeg().toBuffer()
    upload.skipSafeFetch = true
    const fetched = vi.fn(async () => new Response(new Uint8Array(image), { headers: { 'content-type': 'image/jpeg' } }))
    vi.stubGlobal('fetch', fetched)
    const target = [...blob.store.keys()].find((k) => /^[0-9a-f-]{36}-400x300\.webp$/.test(k))!
    const before = blob.store.get(target)!
    const published = (await p.find({ collection: 'media', where: { approved: { equals: true } }, overrideAccess: true, limit: 1 })).docs[0]!
    try {
      const attempt = p.create({ collection: 'media', data: { alt: 'من رابط', filename: target, url: 'https://attacker.example/x.jpg' } as never, ...as(corr) })
      await expect(attempt).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/رابط/) })
      // The same through "duplicate" (POST /api/media/:id/duplicate), which carries the URL too.
      const viaDuplicate = p.duplicate({ collection: 'media', id: published.id, data: { alt: 'من رابط', filename: target, url: 'https://attacker.example/x.jpg' } as never, ...as(corr) })
      await expect(viaDuplicate).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/رابط/) })
      // And over REST as multipart with a dummy file: a duplicate ignores the file and fetched the url.
      const { token } = await p.login({ collection: 'users', data: { email: corr.email, password: 'correct-horse-battery' } })
      const own = await p.create({ collection: 'media', data: { alt: 'صورتي للنسخ' }, file: await png('#00ff00', 'own.png'), ...as(corr) })
      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(await png('#0000ff', 'dummy.png').then((f) => f.data))], { type: 'image/png' }), 'dummy.png')
      form.append('_payload', JSON.stringify({ alt: 'من رابط', filename: target, url: 'https://attacker.example/x.jpg' }))
      const { handleEndpoints } = await import('payload')
      const config = (await import('@payload-config')).default
      const res = await handleEndpoints({
        config,
        path: `/api/media/${own.id}/duplicate`,
        request: new Request(`http://localhost:3000/api/media/${own.id}/duplicate`, { method: 'POST', headers: { Authorization: `JWT ${token}` }, body: form }),
      })
      expect(res.status, await res.clone().text()).toBe(400)
      // Refused before the download: the server never fetches what the caller points at.
      expect(fetched).not.toHaveBeenCalled()
    } finally {
      upload.skipSafeFetch = saved
      vi.unstubAllGlobals()
    }
    expect(blob.store.get(target)?.equals(before), target).toBe(true)
    const { totalDocs } = await p.count({ collection: 'media', where: { alt: { equals: 'من رابط' } }, overrideAccess: true })
    expect(totalDocs).toBe(0)
  })
})
