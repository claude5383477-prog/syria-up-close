import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'
import { BOOKING_STATUSES, STATUS_LABELS, TOUR_LANGUAGES, bookingCode } from '@/lib/booking'
import { bookingEndpoints } from '@/endpoints/bookings'

const never = () => false

// The request number comes from the row id, so it is set right after the row exists.
const setCode: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || doc.code) return doc
  const code = bookingCode(doc.id as number)
  await req.payload.update({ collection: 'bookings', id: doc.id, data: { code }, req, overrideAccess: true, depth: 0 })
  return { ...doc, code }
}

/**
 * Guide booking requests (batch 4). Personal data: only editors and admins read them, nobody creates one
 * through the REST API (the public form goes through POST /api/bookings/request, which checks the input,
 * the honeypot and the same-IP limit). Never shown on the site, never sent to anyone but the guide, after
 * confirmation. No price or payment field (ق4).
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: { ar: 'طلب حجز', en: 'Booking request' }, plural: { ar: 'الحجوزات', en: 'Bookings' } },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'status', 'guide', 'date', 'createdAt'],
    group: { ar: 'الأدلاء', en: 'Guides' },
    components: { views: { list: { Component: '/components/admin/BookingsView#BookingsView' } } },
  },
  defaultSort: '-createdAt',
  access: { read: editorOrAdmin, create: never, update: editorOrAdmin, delete: editorOrAdmin },
  hooks: { afterChange: [setCode] },
  endpoints: bookingEndpoints,
  fields: [
    { name: 'code', type: 'text', unique: true, index: true, label: { ar: 'رقم الطلب', en: 'Request number' }, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      label: { ar: 'الحالة', en: 'Status' },
      options: BOOKING_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
    },
    { name: 'guide', type: 'relationship', relationTo: 'guides', required: true, index: true, label: { ar: 'الدليل', en: 'Guide' } },
    { name: 'trip', type: 'text', required: true, label: { ar: 'المشوار', en: 'Trip' } },
    { name: 'date', type: 'text', required: true, label: { ar: 'التاريخ', en: 'Date' } },
    { name: 'people', type: 'number', required: true, min: 1, max: 30, label: { ar: 'عدد الأشخاص', en: 'People' } },
    { name: 'language', type: 'select', required: true, options: Object.entries(TOUR_LANGUAGES).map(([value, label]) => ({ value, label: { ...label } })), label: { ar: 'لغة الجولة', en: 'Tour language' } },
    { name: 'name', type: 'text', required: true, label: { ar: 'اسم الزائر', en: 'Visitor name' } },
    { name: 'phone', type: 'text', label: { ar: 'واتساب أو هاتف', en: 'WhatsApp or phone' } },
    { name: 'email', type: 'email', required: true, label: { ar: 'الإيميل', en: 'E-mail' } },
    { name: 'note', type: 'textarea', label: { ar: 'ملاحظة الزائر', en: 'Visitor note' } },
    { name: 'consent', type: 'checkbox', required: true, label: { ar: 'وافق على مشاركة بياناته مع الدليل', en: 'Agreed to share details with the guide' } },
    { name: 'internalNote', type: 'textarea', label: { ar: 'ملاحظة داخلية (لا يراها الزائر)', en: 'Internal note' } },
    // Same-IP limit: a one-way key, never the address. Not readable by anyone, not even staff.
    { name: 'clientKey', type: 'text', index: true, access: { read: never, update: never }, admin: { hidden: true } },
    { name: 'remindedAt', type: 'date', admin: { hidden: true } },
  ],
}
