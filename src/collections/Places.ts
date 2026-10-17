import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'

/** "What to see" entries on a city page. */
export const Places: CollectionConfig = {
  slug: 'places',
  labels: { singular: { ar: 'مكان', en: 'Place' }, plural: { ar: 'ماذا ترى', en: 'Places' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'city', 'order'] },
  defaultSort: 'order',
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'العنوان', en: 'Title' } },
    { name: 'description', type: 'textarea', localized: true, label: { ar: 'الوصف', en: 'Description' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: { ar: 'الصورة', en: 'Image' } },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
