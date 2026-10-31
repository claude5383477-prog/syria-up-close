import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff } from '@/access'
import { videoCover } from '@/hooks/videoCover'
import { videoFromUrl } from '@/hooks/videoFromUrl'
import { PLATFORMS, PLATFORM_LABELS, videoUrlError } from '@/lib/video'

/**
 * "عدسات": chosen videos about Syria (batch 4). Only through the platform's own embed, with the creator's
 * name always shown and a link to the original; never downloaded or re-uploaded. The seed has none: the
 * owner adds real links after permission.
 */
export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: { singular: { ar: 'مقطع (عدسات)', en: 'Video' }, plural: { ar: 'عدسات: المقاطع', en: 'Videos' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'platform', 'author', 'city', '_status'] },
  defaultSort: 'order',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, readVersions: editorOrAdmin, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  hooks: { beforeChange: [videoFromUrl, videoCover()] },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: { ar: 'رابط المقطع', en: 'Video link' },
      admin: { description: { ar: 'الصق الرابط فقط: المنصة والمقاس يُقرآن منه.', en: 'Paste the link; platform and shape are read from it.' } },
      validate: (v: unknown) => videoUrlError(v),
    },
    {
      type: 'row',
      fields: [
        { name: 'platform', type: 'select', options: PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] })), label: { ar: 'المنصة', en: 'Platform' }, admin: { readOnly: true } },
        { name: 'videoId', type: 'text', label: { ar: 'معرّف المقطع', en: 'Video id' }, admin: { readOnly: true } },
        { name: 'orientation', type: 'select', options: [{ value: 'wide', label: { ar: 'أفقي 16:9', en: 'Landscape' } }, { value: 'tall', label: { ar: 'عمودي', en: 'Vertical' } }], label: { ar: 'الاتجاه', en: 'Shape' }, admin: { readOnly: true } },
      ],
    },
    { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'العنوان', en: 'Title' } },
    { name: 'author', type: 'text', required: true, label: { ar: 'صاحب المقطع (يظهر دائماً)', en: 'Creator (always shown)' } },
    { name: 'city', type: 'relationship', relationTo: 'cities', index: true, label: { ar: 'المدينة (اختياري)', en: 'City (optional)' } },
    { name: 'duration', type: 'text', label: { ar: 'المدة (18:24)', en: 'Duration (18:24)' }, validate: (v: unknown) => v == null || v === '' || /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(String(v)) || 'مثل 18:24 أو 1:02:03' },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      label: { ar: 'الصورة المصغّرة', en: 'Thumbnail' },
      admin: { description: { ar: 'تُؤخذ تلقائياً عند الحفظ (غلاف المقطع من المنصة). ارفع صورة فقط لتغييرها.', en: 'Fetched automatically on save (the platform cover). Upload one only to replace it.' } },
    },
    { name: 'publishedOn', type: 'date', label: { ar: 'تاريخ نشر المقطع الأصلي', en: 'Original upload date' } },
    { name: 'order', type: 'number', defaultValue: 0, label: { ar: 'الترتيب', en: 'Order' } },
  ],
}
