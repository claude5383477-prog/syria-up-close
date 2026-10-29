import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff, staffOnlyField } from '@/access'
import { TOUR_LANGUAGES } from '@/lib/booking'

/**
 * Local tour guides (batch 4, 2026-10-29). A guide is published only after the team has met and checked
 * them (verifiedAt). Never invented: the seed creates none. No price field (ق4): the cost is agreed
 * between the guide and the visitor.
 */
export const Guides: CollectionConfig = {
  slug: 'guides',
  labels: { singular: { ar: 'دليل سياحي', en: 'Tour guide' }, plural: { ar: 'الأدلاء السياحيون', en: 'Tour guides' } },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'city', 'verifiedAt', '_status'], group: { ar: 'الأدلاء', en: 'Guides' } },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, readVersions: editorOrAdmin, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true, label: { ar: 'الاسم', en: 'Name' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { ar: 'المعرّف في الرابط', en: 'Slug' },
      admin: { description: { ar: 'الصفحة: /guides/<المعرّف>', en: 'Page: /guides/<slug>' } },
      validate: (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) || 'حروف لاتينية صغيرة وأرقام وشرطات فقط',
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: { ar: 'الصورة (بإذن الدليل)', en: 'Photo (with the guide’s permission)' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    { name: 'area', type: 'text', localized: true, label: { ar: 'المنطقة التي يغطيها', en: 'Area covered' } },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      required: true,
      label: { ar: 'لغات الجولة', en: 'Tour languages' },
      options: Object.entries(TOUR_LANGUAGES).map(([value, label]) => ({ value, label: { ...label } })),
    },
    { name: 'interests', type: 'text', hasMany: true, localized: true, label: { ar: 'الاهتمامات (المدينة القديمة، الأكل…)', en: 'Interests' } },
    { name: 'bio', type: 'textarea', localized: true, label: { ar: 'النبذة (يكتبها الدليل ويراجعها الفريق)', en: 'Bio' } },
    {
      name: 'trips',
      type: 'array',
      label: { ar: 'المشاوير', en: 'Trips' },
      labels: { singular: { ar: 'مشوار', en: 'Trip' }, plural: { ar: 'مشاوير', en: 'Trips' } },
      fields: [
        { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'العنوان', en: 'Title' } },
        { name: 'duration', type: 'text', localized: true, label: { ar: 'المدة (3 ساعات، يوم…)', en: 'Duration' } },
      ],
    },
    {
      name: 'verifiedAt',
      type: 'date',
      label: { ar: 'تاريخ تحقق الفريق', en: 'Checked by the team on' },
      admin: { description: { ar: 'يظهر على الصفحة: "تحقّق منه الفريق" بهذا التاريخ.', en: 'Shown on the page as "checked by the team".' } },
    },
    {
      // Private: only staff see it. Used for the guide's copy after a booking is confirmed.
      name: 'contactEmail',
      type: 'email',
      label: { ar: 'إيميل الدليل (داخلي)', en: 'Guide e-mail (internal)' },
      access: { read: staffOnlyField },
    },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
