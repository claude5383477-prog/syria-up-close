import { describe, expect, it } from 'vitest'
import { blobStorage, imageRemotePatterns, mediaStorage, storageBackend } from '@/lib/storage'

const r2 = {
  S3_BUCKET: 'syria-media',
  S3_ENDPOINT: 'https://acc123.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
}
const blob = { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_abc_123' }
type FileUrlArgs = { filename: string; prefix?: string }
const fileUrl = (opts: ReturnType<typeof mediaStorage>, args: FileUrlArgs) => {
  const media = opts.collections.media
  if (media === true || !media?.generateFileURL) throw new Error('no generateFileURL')
  return media.generateFileURL({ collection: {} as never, ...args })
}

describe('storageBackend', () => {
  it('is Vercel Blob when its token is present (production), even if S3 is configured too', () => {
    expect(storageBackend({ ...blob, ...r2 })).toBe('vercel-blob')
  })

  it('is S3/R2 with a bucket and no Blob token, local disk otherwise', () => {
    expect(storageBackend(r2)).toBe('s3')
    expect(storageBackend({})).toBe('local')
  })
})

describe('blobStorage (Vercel Blob)', () => {
  it('is on with the token: browser uploads past the 4.5MB limit, files served from the Blob CDN', () => {
    const opts = blobStorage(blob)
    expect(opts.enabled).toBe(true)
    expect(opts.token).toBe(blob.BLOB_READ_WRITE_TOKEN)
    expect(opts.clientUploads).toBe(true)
    expect(opts.collections.media).toMatchObject({ disablePayloadAccessControl: true })
  })

  it('is off without the token, with the same schema either way', () => {
    const opts = blobStorage(r2)
    expect(opts.enabled).toBe(false)
    expect(opts.alwaysInsertFields).toBe(true)
  })
})

describe('mediaStorage (S3/R2, kept for a later move)', () => {
  it('is off without a bucket, and off whenever Blob is in use', () => {
    expect(mediaStorage({}).enabled).toBe(false)
    expect(mediaStorage({ ...blob, ...r2 }).enabled).toBe(false)
    expect(mediaStorage({}).alwaysInsertFields).toBe(true)
  })

  it('talks to R2: region auto, path-style addressing, browser uploads past the 4.5MB function limit', () => {
    const opts = mediaStorage(r2)
    expect(opts.enabled).toBe(true)
    expect(opts.bucket).toBe('syria-media')
    expect(opts.config).toMatchObject({ region: 'auto', endpoint: r2.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: 'key', secretAccessKey: 'secret' } })
    expect(opts.clientUploads).toBe(true)
  })

  it('serves files through Payload until R2_PUBLIC_URL is set', () => {
    expect(mediaStorage(r2).collections.media).toBe(true)
  })

  it('switches to the public R2 domain with one variable', () => {
    const opts = mediaStorage({ ...r2, R2_PUBLIC_URL: 'https://media.example.org/' })
    expect(opts.collections.media).toMatchObject({ disablePayloadAccessControl: true })
    expect(fileUrl(opts, { filename: 'damascus-800x600.webp' })).toBe('https://media.example.org/damascus-800x600.webp')
    expect(fileUrl(opts, { filename: 'سوق الحميدية.webp', prefix: 'reports' })).toBe(
      `https://media.example.org/reports/${encodeURIComponent('سوق الحميدية.webp')}`,
    )
  })

  it('leaves path-style off for plain AWS S3 (no endpoint)', () => {
    expect(mediaStorage({ S3_BUCKET: 'b', S3_REGION: 'eu-central-1' }).config).toMatchObject({ region: 'eu-central-1', forcePathStyle: false })
  })
})

describe('imageRemotePatterns (next/image)', () => {
  it('always allows public Vercel Blob URLs', () => {
    expect(imageRemotePatterns({})).toEqual([{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }])
  })

  it('adds the R2 public domain when set', () => {
    expect(imageRemotePatterns({ R2_PUBLIC_URL: 'https://media.example.org/' })).toContainEqual({ protocol: 'https', hostname: 'media.example.org' })
  })
})
