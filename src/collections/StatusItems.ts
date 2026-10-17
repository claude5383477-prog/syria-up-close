import type { CollectionConfig, FieldAccess } from 'payload'
import { cityScoped, cityScopedCreate, editorOrAdmin } from '@/access'
import { confirmEndpoint } from '@/endpoints/confirmStatusItem'
import { stampVerification } from '@/hooks/stampVerification'
import { httpsUrl } from '@/lib/validators'

export const STATUS_TYPES = ['electricity', 'internet', 'roads', 'weather', 'events'] as const

const staffOnlyOnUpdate: FieldAccess = ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor'

/** "Status today" board (SPEC §5.2). Published immediately; each save is kept as a version. */
export const StatusItems: CollectionConfig = {
  slug: 'statusItems',
  labels: { singular: { ar: 'بند حالة', en: 'Status item' }, plural: { ar: 'حال البلد اليوم', en: 'Status items' } },
  admin: { useAsTitle: 'type', defaultColumns: ['city', 'type', 'value', 'verifiedBy', 'verifiedAt'] },
  access: {
    read: () => true,
    create: cityScopedCreate('city'),
    update: cityScoped('city'),
    delete: editorOrAdmin,
  },
  versions: { drafts: false, maxPerDoc: 0 },
  indexes: [{ fields: ['city', 'type'], unique: true }],
  endpoints: [confirmEndpoint],
  hooks: { beforeChange: [stampVerification()] },
  fields: [
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
      required: true,
      index: true,
      label: { ar: 'المدينة', en: 'City' },
      access: { update: staffOnlyOnUpdate },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: { ar: 'البند', en: 'Type' },
      access: { update: staffOnlyOnUpdate },
      options: [
        { value: 'electricity', label: { ar: 'الكهرباء', en: 'Electricity' } },
        { value: 'internet', label: { ar: 'الإنترنت', en: 'Internet' } },
        { value: 'roads', label: { ar: 'الطرق', en: 'Roads' } },
        { value: 'weather', label: { ar: 'الطقس', en: 'Weather' } },
        { value: 'events', label: { ar: 'الفعاليات', en: 'Events' } },
      ],
    },
    { name: 'value', type: 'textarea', required: true, localized: true, maxLength: 280, label: { ar: 'الحالة', en: 'Status' } },
    {
      name: 'sourceUrl',
      type: 'text',
      label: { ar: 'رابط المصدر (اختياري)', en: 'Source URL (optional)' },
      validate: (v: unknown) => httpsUrl(v),
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { ar: 'تحقق منه', en: 'Verified by' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      index: true,
      label: { ar: 'تاريخ التحقق', en: 'Verified at' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
