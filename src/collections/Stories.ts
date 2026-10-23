import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff } from '@/access'

/** Blog posts ("up close" stories, food, trails, first-visit notes), listed on /blog. */
export const Stories: CollectionConfig = {
  slug: 'stories',
  labels: { singular: { ar: 'قصة عن قرب', en: 'Story' }, plural: { ar: 'عن قرب', en: 'Stories' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'city', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: { read: publishedOrStaff, readVersions: editorOrAdmin /* history keeps removed text: staff only */, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
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
    {
      name: 'category',
      type: 'select',
      defaultValue: 'story',
      index: true,
      label: { ar: 'التصنيف في المدونة', en: 'Blog category' },
      options: [
        { value: 'story', label: { ar: 'عن قرب', en: 'Up close' } },
        { value: 'food', label: { ar: 'مطبخ', en: 'Food' } },
        { value: 'firstVisit', label: { ar: 'أول زيارة', en: 'First visit' } },
        { value: 'trails', label: { ar: 'دروب سوريا', en: 'Syria trails' } },
      ],
    },
    { name: 'publishedAt', type: 'date', label: { ar: 'تاريخ النشر', en: 'Published on' }, admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } } },
    { name: 'tags', type: 'text', hasMany: true, label: { ar: 'الوسوم', en: 'Tags' } },
  ],
}
