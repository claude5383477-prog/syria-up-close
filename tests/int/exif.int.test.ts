import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Media, User } from '@/payload-types'
import { blobStorage, mediaStorage } from '@/lib/storage'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Correspondent safety: a stored photo must carry no metadata (GPS position, device, owner): not the
// original, not any size. Payload re-encodes every server upload with sharp, which drops metadata;
// browser uploads straight to storage would keep the raw original, so they are disabled.

let corr: User
let editor: User

const GPS = { IFD0: { Make: 'PhoneCo', Copyright: 'الاسم الحقيقي' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '33/1 30/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '36/1 18/1 0/1' } }

async function photoWithGps(format: 'jpeg' | 'png' | 'webp') {
  const data = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#336699' } }).withExif(GPS)[format]().toBuffer()
  expect((await sharp(data).metadata()).exif, 'the test photo carries EXIF').toBeDefined()
  return { data, mimetype: `image/${format}`, name: `IMG_0001.${format === 'jpeg' ? 'jpg' : format}`, size: data.length }
}

/** Every stored file of a media document (original and sizes) from the local media folder. */
function storedFiles(doc: Media): [string, Buffer][] {
  const dir = path.resolve(process.env.MEDIA_DIR ?? 'media')
  const names: [string, string | null | undefined][] = [['original', doc.filename], ...Object.entries(doc.sizes ?? {}).map(([k, s]) => [k, s?.filename] as [string, string | null | undefined])]
  return names.filter((n): n is [string, string] => Boolean(n[1])).map(([k, f]) => [k, readFileSync(path.join(dir, f))])
}

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  const city = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [city.id] })
})

describe('no metadata survives an upload', () => {
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    it(`${format} with GPS: the stored original and every size have no EXIF, XMP or IPTC`, async () => {
      const p = await payload()
      const doc = await p.create({ collection: 'media', data: { alt: `صورة ${format}` }, file: await photoWithGps(format), user: corr, overrideAccess: false })
      const files = storedFiles(doc)
      expect(files.map(([k]) => k).sort()).toEqual(['card', 'hero', 'original', 'thumb'])
      for (const [name, bytes] of files) {
        const meta = await sharp(bytes).metadata()
        expect(meta.exif, `${name} EXIF`).toBeUndefined()
        expect(meta.xmp, `${name} XMP`).toBeUndefined()
        expect(meta.iptc, `${name} IPTC`).toBeUndefined()
        expect(bytes.includes(Buffer.from('PhoneCo')), `${name} raw bytes`).toBe(false)
      }
    })
  }

  it('staff uploads are cleaned the same way', async () => {
    const p = await payload()
    const doc = await p.create({ collection: 'media', data: { alt: 'من المحرر' }, file: await photoWithGps('jpeg'), user: editor, overrideAccess: false })
    for (const [name, bytes] of storedFiles(doc)) expect((await sharp(bytes).metadata()).exif, name).toBeUndefined()
  })

  it('nobody can upload a raw original straight to storage (browser uploads are off)', () => {
    const blob = blobStorage({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_abc_123' })
    const s3 = mediaStorage({ S3_BUCKET: 'b', S3_ENDPOINT: 'https://x.r2.cloudflarestorage.com' })
    expect(blob.clientUploads ?? false).toBe(false)
    expect(s3.clientUploads ?? false).toBe(false)
  })
})
