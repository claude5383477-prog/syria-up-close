import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'
import { ahleenUrl } from '@/lib/validators'

/**
 * Hotels on a city page (content rule ق5). A stay listed on Ahleen carries its booking URL and gets a
 * booking button; one that is not on Ahleen has no URL and is shown for information only, unlinked.
 * Deliberately no price field (ق4).
 */
export const Stays: CollectionConfig = {
  slug: 'stays',
  labels: { singular: { ar: 'إقامة', en: 'Stay' }, plural: { ar: 'أين تقيم', en: 'Stays' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'city'] },
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'الاسم', en: 'Title' } },
    { name: 'description', type: 'textarea', localized: true, label: { ar: 'الوصف', en: 'Description' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: { ar: 'صورة من الإقامة نفسها', en: 'Photo of the stay' } },
    {
      name: 'ahleenUrl',
      type: 'text',
      label: { ar: 'رابط الحجز على أهلين (اتركه فارغاً إن لم يكن الفندق على أهلين)', en: 'Ahleen booking URL (empty if not on Ahleen)' },
      validate: (v: unknown) => ahleenUrl(v),
    },
  ],
}
