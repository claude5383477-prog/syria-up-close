import type { S3StorageOptions } from '@payloadcms/storage-s3'

/**
 * Media storage: local disk (MEDIA_DIR) unless S3_BUCKET is set, then any S3-compatible bucket,
 * Cloudflare R2 in production (SPEC §10 س-3).
 *
 * Files are served through Payload (/api/media/file/…) until R2_PUBLIC_URL names the bucket's
 * public domain; setting that one variable (and redeploying) moves every image URL to R2 directly.
 * Media is public anyway (collections/Media read: () => true), so skipping Payload's access check
 * changes nothing about who can see a file.
 */
export function mediaStorage(env: Record<string, string | undefined> = process.env): S3StorageOptions {
  const publicUrl = env.R2_PUBLIC_URL?.replace(/\/+$/, '')
  return {
    enabled: Boolean(env.S3_BUCKET),
    // The plugin adds media.prefix; insert it everywhere so dev, Docker and Vercel share one schema.
    alwaysInsertFields: true,
    bucket: env.S3_BUCKET ?? '',
    // Admin uploads go from the browser straight to the bucket, past Vercel's 4.5MB request limit.
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
