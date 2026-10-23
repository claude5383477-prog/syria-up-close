import type { CollectionConfig } from 'payload'
import { editorOrAdmin } from '@/access'

/** A city's photo gallery: photos from the place itself, with who took them and when. */
export const CityPhotos: CollectionConfig = {
  slug: 'cityPhotos',
  labels: { singular: { ar: 'صورة من المدينة', en: 'City photo' }, plural: { ar: 'معرض الصور', en: 'City photos' } },
  admin: { useAsTitle: 'caption', defaultColumns: ['caption', 'city', 'shotDate'] },
  defaultSort: '-shotDate',
  access: { read: () => true, create: editorOrAdmin, update: editorOrAdmin, delete: editorOrAdmin },
  fields: [
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true, label: { ar: 'المدينة', en: 'City' } },
    { name: 'photo', type: 'upload', relationTo: 'media', required: true, label: { ar: 'الصورة', en: 'Photo' } },
    { name: 'caption', type: 'text', localized: true, label: { ar: 'وصف اللقطة', en: 'Caption' } },
    { name: 'credit', type: 'text', label: { ar: 'المصوّر', en: 'Photographer' } },
    { name: 'shotDate', type: 'date', label: { ar: 'تاريخ التصوير', en: 'Shot on' }, admin: { date: { pickerAppearance: 'dayOnly' } } },
  ],
}
