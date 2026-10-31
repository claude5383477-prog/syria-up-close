import { describe, expect, it, vi } from 'vitest'
import { coverUrl, fetchCover, instagramCoverUrl, tiktokCoverUrl, type Fetcher } from '@/lib/videoCover'
import { videoCover } from '@/hooks/videoCover'

const img = (type = 'image/jpeg', bytes = 10) => new Response(new Uint8Array(bytes), { headers: { 'content-type': type } })
const routes =
  (map: Record<string, () => Response>): Fetcher =>
  async (u) => {
    const k = Object.keys(map).find((p) => u.startsWith(p))
    return k ? map[k]!() : new Response('', { status: 404 })
  }

const TT = { platform: 'tiktok' as const, id: '7620862781889219861', url: 'https://www.tiktok.com/@a/video/7620862781889219861' }
const IG = { platform: 'instagram' as const, id: 'DGc-Ukgse6m', url: 'https://www.instagram.com/p/DGc-Ukgse6m/' }
const igHtml = '<div><img alt="x" src="https://cdn.ig/a.jpg?x=1&amp;y=2" class="EmbeddedMediaImage" /></div>'

describe('instagramCoverUrl', () => {
  it('reads the embed image whatever the attribute order', () => {
    expect(instagramCoverUrl(igHtml)).toBe('https://cdn.ig/a.jpg?x=1&y=2')
    expect(instagramCoverUrl('<img class="EmbeddedMediaImage" src="https://c/b.jpg">')).toBe('https://c/b.jpg')
  })
  it('is null without one', () => expect(instagramCoverUrl('<img src="x">')).toBeNull())
})

describe('coverUrl', () => {
  it('TikTok: the cover named in the video page', async () => {
    const page = '<script>{"video":{"cover":"https:\\u002F\\u002Fcdn.tt\\u002Fc.jpg","x":1}}</script>'
    expect(tiktokCoverUrl(page)).toBe('https://cdn.tt/c.jpg')
    expect(tiktokCoverUrl('<html></html>')).toBeNull()
    expect(await coverUrl(TT, routes({ [TT.url]: () => new Response(page) }))).toBe('https://cdn.tt/c.jpg')
    expect(await coverUrl(TT, routes({}))).toBeNull()
  })
  it('Instagram: the embed page', async () => {
    expect(await coverUrl(IG, routes({ 'https://www.instagram.com/p/': () => new Response(igHtml) }))).toBe('https://cdn.ig/a.jpg?x=1&y=2')
    expect(await coverUrl(IG, routes({}))).toBeNull()
  })
  it('YouTube needs none', async () => expect(await coverUrl({ platform: 'youtube', id: 'dQw4w9WgXcQ', url: '' }, routes({}))).toBeNull())
})

describe('fetchCover', () => {
  const base = { 'https://www.instagram.com/p/': () => new Response(igHtml) }
  it('downloads an accepted image', async () => {
    const c = await fetchCover(IG, routes({ ...base, 'https://cdn.ig/': () => img() }))
    expect(c?.mimetype).toBe('image/jpeg')
    expect(c?.data.length).toBe(10)
  })
  it('refuses another type, an empty or oversized file, or no source', async () => {
    expect(await fetchCover(IG, routes({ ...base, 'https://cdn.ig/': () => img('text/html') }))).toBeNull()
    expect(await fetchCover(IG, routes({ ...base, 'https://cdn.ig/': () => img('image/jpeg', 0) }))).toBeNull()
    expect(await fetchCover(IG, routes({ ...base, 'https://cdn.ig/': () => img('image/jpeg', 5 * 1024 * 1024) }))).toBeNull()
    expect(await fetchCover(IG, routes({}))).toBeNull()
  })
})

describe('videoCover hook', () => {
  const okFetch = routes({ 'https://www.instagram.com/p/': () => new Response(igHtml), 'https://cdn.ig/': () => img('image/webp') })
  const req = () => ({ payload: { create: vi.fn(async () => ({ id: 42 })), logger: { warn: vi.fn() } } })
  const data = { url: IG.url, platform: 'instagram', videoId: IG.id, title: 'سد الصوراني', author: '@hassan' }

  it('stores the cover, credited to the creator, and attaches it', async () => {
    const r = req()
    const out = await videoCover(okFetch)({ data, req: r } as never)
    expect(out).toMatchObject({ thumbnail: 42 })
    const arg = (r.payload.create.mock.calls[0] as unknown as [Record<string, unknown>])[0] as { data: Record<string, string>; file: { mimetype: string; name: string }; overrideAccess: boolean }
    expect(arg.data).toEqual({ alt: 'سد الصوراني', credit: '@hassan · Instagram' })
    expect(arg.file.mimetype).toBe('image/webp')
    expect(arg.file.name).toMatch(/^[0-9a-f-]{36}\.webp$/)
    expect(arg.overrideAccess).toBe(true)
  })
  it('backfills on a plain re-save using the stored document', async () => {
    const r = req()
    const out = await videoCover(okFetch)({ data: { _status: 'published' }, originalDoc: { ...data, title: undefined, thumbnail: null }, req: r } as never)
    expect(out).toMatchObject({ thumbnail: 42 })
    expect((r.payload.create.mock.calls[0] as unknown as [{ data: { alt: string } }])[0].data.alt).toBe('إنستغرام: @hassan')
  })
  it('keeps an existing still unless the link changed', async () => {
    const r = req()
    expect(await videoCover(okFetch)({ data: { title: 't' }, originalDoc: { ...data, thumbnail: { id: 7 } }, req: r } as never)).toEqual({ title: 't' })
    expect(r.payload.create).not.toHaveBeenCalled()
    await videoCover(okFetch)({ data: { ...data, url: 'https://www.instagram.com/p/DGc-Ukgse6m/?x' }, originalDoc: { ...data, thumbnail: 7 }, req: r } as never)
    expect(r.payload.create).toHaveBeenCalled()
  })
  it('skips YouTube and documents without a parsed link', async () => {
    const r = req()
    await videoCover(okFetch)({ data: { platform: 'youtube', videoId: 'x', url: 'u' }, req: r } as never)
    await videoCover(okFetch)({ data: { platform: 'instagram' }, req: r } as never)
    expect(r.payload.create).not.toHaveBeenCalled()
  })
  it('never fails the save', async () => {
    const r = req()
    expect(await videoCover(routes({}))({ data, req: r } as never)).toEqual(data)
    r.payload.create.mockRejectedValueOnce(new Error('disk'))
    expect(await videoCover(okFetch)({ data, req: r } as never)).toEqual(data)
    expect(r.payload.logger.warn).toHaveBeenCalled()
  })
})
