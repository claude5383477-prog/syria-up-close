import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'

/** "Today's detail" on the home page: one photo and one plain sentence per day. */
export const DailyDetail: CollectionConfig = {
  slug: 'dailyDetail',
  labels: { singular: { ar: 'تفصيلة اليوم', en: 'Daily detail' }, plural: { ar: 'تفاصيل الأيام', en: 'Daily details' } },
  admin: { useAsTitle: 'sentence', defaultColumns: ['date', 'sentence', 'city'] },
  defaultSort: '-date',
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    {
      name: 'date',
      type: 'date',
      required: true,
      unique: true,
      index: true,
      label: { ar: 'اليوم', en: 'Date' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: { ar: 'الصورة', en: 'Photo' } },
    { name: 'sentence', type: 'text', required: true, localized: true, label: { ar: 'الجملة', en: 'Sentence' } },
    { name: 'place', type: 'text', localized: true, label: { ar: 'المكان', en: 'Place' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', label: { ar: 'المدينة', en: 'City' } },
  ],
}
