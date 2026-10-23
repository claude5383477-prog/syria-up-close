import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff } from '@/access'

/** Restaurants, cafes, sweet shops and parks on a city page. Added after a visit (ق2), never invented. No price field (ق4). */
export const VENUE_KINDS = ['restaurant', 'cafe', 'sweets', 'park'] as const

export const Venues: CollectionConfig = {
  slug: 'venues',
  labels: { singular: { ar: 'مكان أكل أو حديقة', en: 'Venue' }, plural: { ar: 'مطاعم وكافيهات وحدائق', en: 'Venues' } },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'kind', 'city', '_status'] },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, readVersions: editorOrAdmin, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      label: { ar: 'النوع', en: 'Kind' },
      options: [
        { value: 'restaurant', label: { ar: 'مطعم', en: 'Restaurant' } },
        { value: 'cafe', label: { ar: 'كافيه', en: 'Cafe' } },
        { value: 'sweets', label: { ar: 'حلويات', en: 'Sweets' } },
        { value: 'park', label: { ar: 'حديقة أو منتزه', en: 'Park' } },
      ],
    },
    { name: 'name', type: 'text', required: true, localized: true, label: { ar: 'الاسم', en: 'Name' } },
    { name: 'neighbourhood', type: 'text', localized: true, label: { ar: 'الحي', en: 'Neighbourhood' } },
    { name: 'note', type: 'textarea', localized: true, label: { ar: 'لماذا نحبه (سطر واحد)', en: 'Why we like it (one line)' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: { ar: 'صورة من المكان نفسه', en: 'Photo of the place' } },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
