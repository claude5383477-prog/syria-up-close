import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff } from '@/access'

/**
 * Secrets, jokes and proverbs told by people of the city, signed with the teller's name. Arabic
 * only. Editors publish after review: nothing invented, no stereotyping of a city's people.
 */
export const CityLore: CollectionConfig = {
  slug: 'cityLore',
  labels: { singular: { ar: 'سرّ أو نهفة أو مثل', en: 'City lore' }, plural: { ar: 'أسرار ونهفات وأمثال', en: 'City lore' } },
  admin: { useAsTitle: 'text', defaultColumns: ['text', 'kind', 'city', '_status'] },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, readVersions: editorOrAdmin, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    {
      name: 'kind',
      type: 'select',
      required: true,
      label: { ar: 'النوع', en: 'Kind' },
      options: [
        { value: 'secret', label: { ar: 'سرّ', en: 'Secret' } },
        { value: 'joke', label: { ar: 'نهفة', en: 'Joke' } },
        { value: 'proverb', label: { ar: 'مثل', en: 'Proverb' } },
      ],
    },
    { name: 'text', type: 'textarea', required: true, label: { ar: 'النص كما يُروى', en: 'Text as told' } },
    { name: 'meaning', type: 'textarea', label: { ar: 'المعنى (للأمثال)', en: 'Meaning (proverbs)' } },
    { name: 'tellerName', type: 'text', required: true, label: { ar: 'اسم الراوي', en: 'Told by' } },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
