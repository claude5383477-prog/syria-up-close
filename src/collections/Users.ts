import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'
import { adminOnly, adminOnlyField, selfOrAdmin, selfOrStaff } from '@/access'
import { fillDisplayName } from '@/hooks/displayName'
import { hideLockedAccount } from '@/hooks/loginError'
import { passwordRules } from '@/hooks/passwordRules'
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

/** The real name and email: the admin and the person themselves only (owner decision; editors and visitors see displayName). */
const realNameAccess: FieldAccess = ({ req, doc, id }) => {
  const user = req.user as { id?: unknown; role?: string } | null
  return user?.role === 'admin' || (user?.id !== undefined && user.id === (doc?.id ?? id))
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: { ar: 'مستخدم', en: 'User' }, plural: { ar: 'المستخدمون', en: 'Users' } },
  admin: { useAsTitle: 'displayName', defaultColumns: ['displayName', 'role'] },
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
    // Payload's default lets any signed-in user unlock any address: a 200/403 oracle for who has an
    // account, and a way to reset another account's failed-login count.
    unlock: adminOnly,
    admin: ({ req }) => Boolean(req.user),
  },
  hooks: { beforeOperation: [passwordRules], beforeValidate: [fillDisplayName], beforeChange: [firstUserIsAdmin], afterError: [hideLockedAccount] },
  fields: [
    // Overrides the auth email field to restrict who reads it: an address often carries the real
    // name, so like the name it is for the admin and the person only (sign-in reads it with full access).
    // Only the admin changes it: a self-service change answered "already taken" for a registered address.
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: { ar: 'البريد الإلكتروني', en: 'Email' },
      access: { read: realNameAccess, update: adminOnlyField },
    },
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
