import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'
import { adminOnly, adminOnlyField, selfOrAdmin, selfOrStaff } from '@/access'
import { fillDisplayName } from '@/hooks/displayName'
import { DEFAULT_CORRESPONDENT_NAME } from '@/lib/public-name'

/** The very first account (created from the admin's "create first user" screen) is always an admin. */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req, overrideAccess: true })
  if (totalDocs !== 0) return data
  // Promoted to admin: a correspondent default display name would be wrong; use their own name.
  const defaulted = typeof data.displayName === 'string' && data.displayName.startsWith(DEFAULT_CORRESPONDENT_NAME)
  return { ...data, role: 'admin', ...(defaulted ? { displayName: data.name } : {}) }
}

/** The real name: the admin and the person themselves only (owner decision; visitors and editors see displayName). */
const realNameAccess: FieldAccess = ({ req, doc, id }) => {
  const user = req.user as { id?: unknown; role?: string } | null
  return user?.role === 'admin' || (user?.id !== undefined && user.id === (doc?.id ?? id))
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: { ar: 'مستخدم', en: 'User' }, plural: { ar: 'المستخدمون', en: 'Users' } },
  admin: { useAsTitle: 'displayName', defaultColumns: ['displayName', 'email', 'role'] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 7 * 24 * 60 * 60,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    create: adminOnly,
    read: selfOrStaff,
    update: selfOrAdmin,
    delete: adminOnly,
    admin: ({ req }) => Boolean(req.user),
  },
  hooks: { beforeValidate: [fillDisplayName], beforeChange: [firstUserIsAdmin] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { ar: 'الاسم الحقيقي', en: 'Real name' },
      access: { read: realNameAccess },
      admin: { description: { ar: 'لا يظهر للعامة ولا للمحررين؛ يراه المدير وصاحب الحساب فقط.', en: 'Never public; admin and the person only.' } },
    },
    {
      name: 'displayName',
      type: 'text',
      maxLength: 80,
      // Required in effect: hooks/displayName fills an empty value before validation runs.
      validate: (value: unknown) => (typeof value === 'string' && value.trim() ? true : 'الاسم المعروض مطلوب'),
      label: { ar: 'الاسم المعروض', en: 'Display name' },
      admin: {
        description: {
          ar: 'ما يظهر للزوار (تحقق منه، كاتب التقرير، تصوير). للمراسل: اتركه فارغاً ليصبح "مراسل سوريا عن قرب في {المدينة}".',
          en: 'What visitors see. Leave empty for a correspondent to use the city default.',
        },
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'correspondent',
      label: { ar: 'الدور', en: 'Role' },
      options: [
        { value: 'admin', label: { ar: 'مدير', en: 'Admin' } },
        { value: 'editor', label: { ar: 'محرر', en: 'Editor' } },
        { value: 'correspondent', label: { ar: 'مراسل', en: 'Correspondent' } },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
      saveToJWT: true,
    },
    {
      name: 'assignedCities',
      type: 'relationship',
      relationTo: 'cities',
      hasMany: true,
      label: { ar: 'المدن المعيّنة', en: 'Assigned cities' },
      admin: { description: { ar: 'للمراسلين فقط: المدن التي يحدّث حالتها.', en: 'Correspondents only.' } },
      access: { create: adminOnlyField, update: adminOnlyField },
      saveToJWT: true,
    },
  ],
}
