import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { User } from '@/payload-types'
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits'
import { makeUser, payload, resetWithAdmin } from './helpers'

// G2: every upload goes through the server (browser uploads are off), which enforces an image-only
// type list (by content, not the declared type or name) and a size cap, for staff and correspondents.

let editor: User
let corr: User

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const
const create = async (user: User, file: { data: Buffer; mimetype: string; name: string }) =>
  (await payload()).create({ collection: 'media', data: { alt: 'اختبار' }, file: { ...file, size: file.data.length }, ...as(user) })

beforeAll(async () => {
  await resetWithAdmin()
  editor = await makeUser('editor')
  const city = await (await payload()).create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [city.id] })
})

describe('upload type list and size cap', () => {
  it('a real image under the cap is accepted', async () => {
    const data = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#336699' } }).jpeg().toBuffer()
    expect((await create(corr, { data, mimetype: 'image/jpeg', name: 'ok.jpg' })).id).toBeTruthy()
  })

  it('HTML disguised as a PNG is refused', async () => {
    const data = Buffer.from('<!doctype html><script>alert(1)</script>')
    await expect(create(corr, { data, mimetype: 'image/png', name: 'x.png' })).rejects.toThrow()
  })

  it('SVG is refused even from staff', async () => {
    const data = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await expect(create(editor, { data, mimetype: 'image/svg+xml', name: 'x.svg' })).rejects.toThrow()
  })

  it(`a photo over ${MAX_UPLOAD_BYTES / 1024 / 1024}MB is refused with a clear Arabic message, staff included`, async () => {
    const data = await sharp({ create: { width: 3000, height: 3000, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
      .jpeg({ quality: 100 })
      .toBuffer()
    expect(data.length).toBeGreaterThan(MAX_UPLOAD_BYTES)
    await expect(create(editor, { data, mimetype: 'image/jpeg', name: 'big.jpg' })).rejects.toThrow(/الصورة أكبر من/)
    await expect(create(corr, { data, mimetype: 'image/jpeg', name: 'big.jpg' })).rejects.toThrow(/الصورة أكبر من/)
  })
})
