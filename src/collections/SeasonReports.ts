import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import { cannotPublish, cityScopedCreate, editorOrAdmin, publishedOrOwn } from '@/access'
import { seasonSlug } from '@/hooks/seasonSlug'
import { stampCreator } from '@/hooks/stampCreator'

const staffField: FieldAccess = ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor'

/** Correspondents edit only their own reports while still drafts; staff edit everything. */
const updateRule: Access = ({ req }) => {
  const role = req.user?.role
  if (role === 'admin' || role === 'editor') return true
  if (role !== 'correspondent' || !req.user) return false
  return { and: [{ author: { equals: req.user.id } }, { _status: { equals: 'draft' } }] } as Where
}

/** Field reports (Arabic only). Correspondents submit drafts; editors review and publish. */
export const SeasonReports: CollectionConfig = {
  slug: 'seasonReports',
  labels: { singular: { ar: 'تقرير موسم', en: 'Season report' }, plural: { ar: 'تقارير الموسم', en: 'Season reports' } },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'city', 'fieldDate', 'author', '_status'] },
  defaultSort: '-fieldDate',
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: publishedOrOwn('author'),
    create: cannotPublish(cityScopedCreate('city')),
    update: cannotPublish(updateRule),
    delete: editorOrAdmin,
  },
  hooks: { beforeValidate: [seasonSlug], beforeChange: [stampCreator('author')] },
  fields: [
    { name: 'title', type: 'text', required: true, label: { ar: 'العنوان', en: 'Title' } },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { ar: 'المعرّف في الرابط', en: 'Slug' },
      admin: { position: 'sidebar', description: { ar: 'يُولَّد تلقائياً من المدينة والتاريخ.', en: 'Generated from city and date.' } },
      access: { update: staffField },
    },
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
      required: true,
      index: true,
      label: { ar: 'المدينة', en: 'City' },
      access: { update: staffField },
    },
    { name: 'fieldDate', type: 'date', required: true, label: { ar: 'تاريخ المشاهدة', en: 'Field date' } },
    { name: 'body', type: 'richText', label: { ar: 'التقرير', en: 'Body' } },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, label: { ar: 'الصور', en: 'Photos' } },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: { ar: 'الكاتب', en: 'Author' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
