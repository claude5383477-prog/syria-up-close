import { describe, expect, it } from 'vitest'
import { mediaStorage } from '@/lib/storage'

const r2 = {
  S3_BUCKET: 'syria-media',
  S3_ENDPOINT: 'https://acc123.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
}
type FileUrlArgs = { filename: string; prefix?: string }
const fileUrl = (opts: ReturnType<typeof mediaStorage>, args: FileUrlArgs) => {
  const media = opts.collections.media
  if (media === true || !media?.generateFileURL) throw new Error('no generateFileURL')
  return media.generateFileURL({ collection: {} as never, ...args })
}

describe('mediaStorage', () => {
  it('is off without a bucket (local disk in dev and Docker), with the same schema either way', () => {
    const opts = mediaStorage({})
    expect(opts.enabled).toBe(false)
    expect(opts.alwaysInsertFields).toBe(true)
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
