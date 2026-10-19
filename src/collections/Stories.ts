import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff, versionsOf } from '@/access'

/** "Up close" stories. Data model only in phase 1 (SPEC §10 س-6): no public page yet. */
export const Stories: CollectionConfig = {
  slug: 'stories',
  labels: { singular: { ar: 'قصة عن قرب', en: 'Story' }, plural: { ar: 'عن قرب', en: 'Stories' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'city', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: { read: publishedOrStaff, readVersions: versionsOf(publishedOrStaff), create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'العنوان', en: 'Title' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { ar: 'المعرّف في الرابط', en: 'Slug' },
      admin: { position: 'sidebar' },
      validate: (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) || 'حروف لاتينية صغيرة وأرقام وشرطات فقط',
    },
    { name: 'body', type: 'richText', localized: true, label: { ar: 'النص', en: 'Body' } },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, label: { ar: 'الصور', en: 'Photos' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', label: { ar: 'المدينة', en: 'City' } },
    { name: 'tags', type: 'text', hasMany: true, label: { ar: 'الوسوم', en: 'Tags' } },
  ],
}
