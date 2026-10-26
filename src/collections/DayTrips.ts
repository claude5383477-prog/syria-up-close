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
    {
      // Each trip has its own page at /inside/<slug> (owner decision 2026-10-26).
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { ar: 'المعرّف في الرابط', en: 'Slug' },
      validate: (v: unknown) => v == null || v === '' || (typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) || 'حروف لاتينية صغيرة وأرقام وشرطات فقط',
    },
    { name: 'tag', type: 'text', label: { ar: 'نوع المكان (مصيف، آثار، نبع…)', en: 'Kind of place' } },
    {
      name: 'place',
      type: 'relationship',
      relationTo: 'cities',
      label: { ar: 'صفحة المكان القديمة (إن كان مصيفاً)', en: 'Resort record' },
      admin: { description: { ar: 'للمصايف: فنادقها ومطاعمها وصورها تظهر في صفحة المشوار.', en: 'For resorts: its stays, venues and photos show on the trip page.' } },
    },
    { name: 'lat', type: 'number', label: { ar: 'خط العرض', en: 'Latitude' } },
    { name: 'lng', type: 'number', label: { ar: 'خط الطول', en: 'Longitude' } },
    { name: 'distanceNote', type: 'text', label: { ar: 'المسافة من المدينة', en: 'Distance from the city' } },
    { name: 'checkedAt', type: 'date', label: { ar: 'تاريخ آخر تحديث', en: 'Last updated' } },
    { name: 'sources', type: 'textarea', label: { ar: 'المصادر (سطر لكل مصدر)', en: 'Sources (one per line)' } },
    {
      // Named spots on the page and its map. Real places with a source only (ق2); no prices (ق4).
      name: 'spots',
      type: 'array',
      label: { ar: 'أماكن الصفحة', en: 'Spots' },
      labels: { singular: { ar: 'مكان', en: 'Spot' }, plural: { ar: 'أماكن', en: 'Spots' } },
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          options: [
            { value: 'stay', label: { ar: 'إقامة', en: 'Stay' } },
            { value: 'food', label: { ar: 'مطعم أو كافيه', en: 'Food' } },
            { value: 'nature', label: { ar: 'ينابيع وطبيعة', en: 'Nature' } },
            { value: 'ruins', label: { ar: 'آثار', en: 'Ruins' } },
            { value: 'picnic', label: { ar: 'سيران وتخييم', en: 'Picnic and camping' } },
          ],
        },
        { name: 'name', type: 'text', required: true, label: { ar: 'الاسم', en: 'Name' } },
        { name: 'note', type: 'textarea', label: { ar: 'سطر عنه', en: 'One line' } },
        { name: 'lat', type: 'number', label: { ar: 'خط العرض', en: 'Latitude' } },
        { name: 'lng', type: 'number', label: { ar: 'خط الطول', en: 'Longitude' } },
        { name: 'image', type: 'upload', relationTo: 'media', label: { ar: 'صورة', en: 'Photo' } },
      ],
    },
  ],
}
