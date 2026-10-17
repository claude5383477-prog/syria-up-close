import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'
import { httpsUrl } from '@/lib/validators'

/** "Where to stay" cards (content rule ق5). Deliberately no price field (ق4). */
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
      required: true,
      label: { ar: 'رابط الحجز على أهلين', en: 'Ahleen booking URL' },
      validate: (v: unknown) => httpsUrl(v, { required: true }),
    },
  ],
}
