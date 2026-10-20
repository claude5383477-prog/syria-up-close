import { LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import { canCreateForSomeCity, cannotPublish, editorOrAdmin, publishedOrOwn, versionsOf } from '@/access'
import { assignedCityOptions } from '@/access/filterOptions'
import { requireAssignedCity } from '@/hooks/requireAssignedCity'
import { seasonSlug } from '@/hooks/seasonSlug'
import { stampCreator } from '@/hooks/stampCreator'
import { textOnlyRichText } from '@/hooks/textOnlyRichText'

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
    readVersions: versionsOf(publishedOrOwn('author')),
    create: cannotPublish(canCreateForSomeCity),
    update: cannotPublish(updateRule),
    delete: editorOrAdmin,
  },
  hooks: { beforeValidate: [seasonSlug], beforeChange: [requireAssignedCity('city'), stampCreator('author', 'authorName'), textOnlyRichText('body')] },
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
      filterOptions: assignedCityOptions,
      access: { update: staffField },
    },
    { name: 'fieldDate', type: 'date', required: true, label: { ar: 'تاريخ المشاهدة', en: 'Field date' } },
    {
      name: 'body',
      type: 'richText',
      label: { ar: 'التقرير', en: 'Body' },
      // Text only (correspondents write here): photos go in the photos field, under the media rules.
      // No photos, relationships or internal links (links to a URL stay).
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((f) => !['upload', 'relationship', 'link'].includes(f.key)),
          LinkFeature({ enabledCollections: [] }),
        ],
      }),
    },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, label: { ar: 'الصور', en: 'Photos' } },
    {
      name: 'authorName',
      type: 'text',
      label: { ar: 'اسم الكاتب (للعرض العام)', en: 'Author name (public)' },
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
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
