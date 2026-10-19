import type { S3StorageOptions } from '@payloadcms/storage-s3'
import type { VercelBlobStorageOptions } from '@payloadcms/storage-vercel-blob'
import type { ClientUploadsAccess } from '@payloadcms/plugin-cloud-storage/types'

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

/**
 * Who may get a browser upload token: exactly who may create a document in that collection
 * (Media: any signed-in user). Only a plain `true` counts; a query result means "some documents",
 * which a token for any file cannot honour, so it is refused.
 */
export const canClientUpload: ClientUploadsAccess = async ({ collectionSlug, req }) => {
  const create = req.payload.collections[collectionSlug]?.config.access?.create
  if (!create) return false
  return (await create({ req } as never)) === true
}

export function blobStorage(env: Env = process.env): VercelBlobStorageOptions {
  return {
    enabled: storageBackend(env) === 'vercel-blob',
    token: env.BLOB_READ_WRITE_TOKEN,
    alwaysInsertFields: true,
    // Every stored file gets a unique random suffix, so an upload can never replace an existing
    // file (the plugin itself writes with allowOverwrite: true), and file URLs are not guessable.
    addRandomSuffix: true,
    // Admin uploads go from the browser straight to Blob, past Vercel's 4.5MB request limit.
    clientUploads: { access: canClientUpload },
    // Public store: images load from the Blob CDN, not through a function. Any Vercel deployment other
    // than production (Preview) writes under preview/, so it can never touch production's files even
    // while both share one store; the full separation is a second store linked to Preview only (README).
    collections: {
      media: { disablePayloadAccessControl: true, ...(env.VERCEL_ENV && env.VERCEL_ENV !== 'production' ? { prefix: 'preview' } : {}) },
    },
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
    clientUploads: { access: canClientUpload },
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

/**
 * Hosts next/image may load media from: this project's Blob store only (a wildcard would let anyone
 * spend the image-optimization quota on any public store), and the R2 public domain if set.
 * The store id comes from the token, as the Blob plugin reads it.
 */
export function imageRemotePatterns(env: Env = process.env): { protocol: 'https'; hostname: string }[] {
  const patterns: { protocol: 'https'; hostname: string }[] = []
  const storeId = env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  if (storeId) patterns.push({ protocol: 'https', hostname: `${storeId}.public.blob.vercel-storage.com` })
  if (env.R2_PUBLIC_URL) patterns.push({ protocol: 'https', hostname: new URL(env.R2_PUBLIC_URL).hostname })
  return patterns
}
