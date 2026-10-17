import type { CollectionConfig } from 'payload'
import { editorOrAdmin, publishedOrStaff } from '@/access'
import { stampOnPublish } from '@/hooks/stampOnPublish'
import { httpsUrl } from '@/lib/validators'

export const FIRST_VISIT_TOPICS = ['visa', 'arrival', 'money', 'connectivity', 'transport'] as const

/** The five practical pages for visitors from abroad. Cannot be published without an official source. */
export const FirstVisitPages: CollectionConfig = {
  slug: 'firstVisitPages',
  labels: { singular: { ar: 'صفحة أول زيارة', en: 'First-visit page' }, plural: { ar: 'دليل أول زيارة', en: 'First-visit pages' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'topic', '_status', 'lastVerifiedAt'] },
  versions: { drafts: true, maxPerDoc: 50 },
  // Correspondents: read only (SPEC §10 س-4).
  access: { read: publishedOrStaff, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  hooks: { beforeChange: [stampOnPublish()] },
  fields: [
    {
      name: 'topic',
      type: 'select',
      required: true,
      unique: true,
      label: { ar: 'الموضوع', en: 'Topic' },
      options: [
        { value: 'visa', label: { ar: 'التأشيرة والدخول', en: 'Visa & entry' } },
        { value: 'arrival', label: { ar: 'الوصول', en: 'Getting there' } },
        { value: 'money', label: { ar: 'المال', en: 'Money' } },
        { value: 'connectivity', label: { ar: 'الاتصالات', en: 'Staying connected' } },
        { value: 'transport', label: { ar: 'التنقل', en: 'Getting around' } },
      ],
    },
    { name: 'title', type: 'text', required: true, localized: true, label: { ar: 'العنوان', en: 'Title' } },
    { name: 'summary', type: 'textarea', localized: true, label: { ar: 'الملخص', en: 'Summary' } },
    { name: 'body', type: 'richText', localized: true, label: { ar: 'المحتوى', en: 'Body' } },
    {
      name: 'officialSourceUrl',
      type: 'text',
      label: { ar: 'رابط المصدر الرسمي (إلزامي للنشر)', en: 'Official source URL (required to publish)' },
      validate: (v: unknown, { data }: { data: Partial<{ _status: string }> }) =>
        httpsUrl(v, { required: data?._status === 'published' }),
    },
    {
      name: 'lastVerifiedAt',
      type: 'date',
      label: { ar: 'آخر تحقق', en: 'Last verified' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'lastVerifiedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { ar: 'تحقق منها', en: 'Verified by' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
