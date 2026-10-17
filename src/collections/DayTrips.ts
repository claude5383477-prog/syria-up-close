import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'

/** Weekend trips on /inside (Arabic only, SPEC §10 س-5). */
export const DayTrips: CollectionConfig = {
  slug: 'dayTrips',
  labels: { singular: { ar: 'مشوار', en: 'Day trip' }, plural: { ar: 'مشاوير نهاية الأسبوع', en: 'Day trips' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'fromCity', 'order'] },
  defaultSort: 'order',
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'fromCity', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'من مدينة', en: 'From city' } },
    { name: 'title', type: 'text', required: true, label: { ar: 'العنوان', en: 'Title' } },
    { name: 'description', type: 'textarea', label: { ar: 'الوصف', en: 'Description' } },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
