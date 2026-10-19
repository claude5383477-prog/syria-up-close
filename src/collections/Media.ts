import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { approvedOrOwn, authenticated, ownUnapprovedOrStaff, staffOnlyField } from '@/access'
import { approveStaffUploads } from '@/hooks/approveMedia'
import { blobOrphansEndpoint, deleteBlobFilesAfterDelete } from '@/hooks/blobCleanup'
import { stampCreator } from '@/hooks/stampCreator'

const webp = { format: 'webp' as const, options: { quality: 80 } }

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: { ar: 'صورة', en: 'Image' }, plural: { ar: 'الصور', en: 'Media' } },
  admin: { useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'credit', 'uploadedBy'] },
  access: {
    // Private until published: see access/approvedOrOwn and hooks/approveMedia.
    read: approvedOrOwn('uploadedBy'),
    create: authenticated,
    // Once approved (published), only staff may edit, replace or delete a photo.
    update: ownUnapprovedOrStaff('uploadedBy'),
    delete: ownUnapprovedOrStaff('uploadedBy'),
  },
  upload: {
    // Local disk unless the S3 plugin takes over (S3_BUCKET set), see payload.config.ts.
    staticDir: path.resolve(process.env.MEDIA_DIR ?? 'media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    formatOptions: webp,
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true },
    imageSizes: [
      { name: 'thumb', width: 400, formatOptions: webp },
      { name: 'card', width: 800, formatOptions: webp },
      { name: 'hero', width: 1600, formatOptions: webp },
    ],
    adminThumbnail: 'thumb',
  },
  hooks: { beforeChange: [stampCreator('uploadedBy'), approveStaffUploads], afterDelete: [deleteBlobFilesAfterDelete] },
  endpoints: blobOrphansEndpoint,
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true, label: { ar: 'وصف الصورة (إلزامي)', en: 'Alt text (required)' } },
    { name: 'credit', type: 'text', label: { ar: 'المصوّر / المراسل', en: 'Credit' } },
    { name: 'shotDate', type: 'date', label: { ar: 'تاريخ اللقطة', en: 'Shot date' } },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { ar: 'منشورة للعامة', en: 'Public' },
      access: { create: staffOnlyField, update: staffOnlyField },
      admin: {
        position: 'sidebar',
        description: {
          ar: 'صور المراسلين خاصة حتى ينشر المحرر شيئاً يستخدمها، أو يعلّم هذا الخيار.',
          en: 'Correspondent photos stay private until an editor publishes something that uses them, or ticks this.',
        },
      },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: { ar: 'رفعها', en: 'Uploaded by' },
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
