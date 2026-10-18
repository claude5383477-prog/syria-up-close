import type { S3StorageOptions } from '@payloadcms/storage-s3'
import type { VercelBlobStorageOptions } from '@payloadcms/storage-vercel-blob'

/**
 * Where media files live (SPEC §10 س-3), chosen by the environment alone:
 * - Vercel Blob when BLOB_READ_WRITE_TOKEN is set: production (Vercel adds the token to the project).
 * - S3-compatible storage (Cloudflare R2) when S3_BUCKET is set: kept for a later move off Vercel.
 * - Local disk (MEDIA_DIR) otherwise: development and the Docker image.
 * Both plugins always add their columns (alwaysInsertFields), so every backend shares one schema.
 * Media is public anyway (collections/Media read: () => true), so serving files straight from the
 * storage CDN skips nothing about who can see a file.
 */
type Env = Record<string, string | undefined>

export type StorageBackend = 'vercel-blob' | 's3' | 'local'

export function storageBackend(env: Env = process.env): StorageBackend {
  if (env.BLOB_READ_WRITE_TOKEN) return 'vercel-blob'
  if (env.S3_BUCKET) return 's3'
  return 'local'
}

export function blobStorage(env: Env = process.env): VercelBlobStorageOptions {
  return {
    enabled: storageBackend(env) === 'vercel-blob',
    token: env.BLOB_READ_WRITE_TOKEN,
    alwaysInsertFields: true,
    // Admin uploads go from the browser straight to Blob, past Vercel's 4.5MB request limit.
    clientUploads: true,
    // Public store: images load from the Blob CDN, not through a function.
    collections: { media: { disablePayloadAccessControl: true } },
  }
}

/**
 * S3/R2. Files are served through Payload (/api/media/file/…) until R2_PUBLIC_URL names the bucket's
 * public domain; setting that one variable (and redeploying) moves every image URL to R2 directly.
 */
export function mediaStorage(env: Env = process.env): S3StorageOptions {
  const publicUrl = env.R2_PUBLIC_URL?.replace(/\/+$/, '')
  return {
    enabled: storageBackend(env) === 's3',
    alwaysInsertFields: true,
    bucket: env.S3_BUCKET ?? '',
    // The bucket's CORS rules must allow PUT (and the If-None-Match header) from the site's origin.
    clientUploads: true,
    collections: {
      media: publicUrl
        ? {
            disablePayloadAccessControl: true,
            generateFileURL: ({ filename, prefix }) => [publicUrl, prefix, encodeURIComponent(filename)].filter(Boolean).join('/'),
          }
        : true,
    },
    config: {
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT || undefined,
      // R2 needs path-style addressing (bucket in the path, not the hostname).
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '' },
    },
  }
}

/** Hosts next/image may load media from: public Vercel Blob, and the R2 public domain if set. */
export function imageRemotePatterns(env: Env = process.env): { protocol: 'https'; hostname: string }[] {
  const patterns: { protocol: 'https'; hostname: string }[] = [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }]
  if (env.R2_PUBLIC_URL) patterns.push({ protocol: 'https', hostname: new URL(env.R2_PUBLIC_URL).hostname })
  return patterns
}
