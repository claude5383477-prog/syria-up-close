import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'

export const Cities: CollectionConfig = {
  slug: 'cities',
  labels: { singular: { ar: 'مدينة', en: 'City' }, plural: { ar: 'المدن', en: 'Cities' } },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'tag'] },
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { ar: 'المعرّف في الرابط', en: 'Slug' },
      validate: (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) || 'حروف لاتينية صغيرة وأرقام وشرطات فقط',
    },
    { name: 'name', type: 'text', required: true, localized: true, label: { ar: 'الاسم', en: 'Name' } },
    { name: 'tag', type: 'text', localized: true, label: { ar: 'الوسم', en: 'Tag' } },
    { name: 'lede', type: 'textarea', localized: true, label: { ar: 'المقدمة', en: 'Lede' } },
    { name: 'eat', type: 'textarea', localized: true, label: { ar: 'ماذا تأكل', en: 'What to eat' } },
    { name: 'coverImage', type: 'upload', relationTo: 'media', label: { ar: 'صورة الغلاف', en: 'Cover image' } },
    { name: 'coverShotNote', type: 'text', localized: true, label: { ar: 'وصف لقطة الغلاف', en: 'Cover shot note' } },
  ],
}
