import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { adminOnly, adminOnlyField, selfOrAdmin, selfOrStaff } from '@/access'

/** The very first account (created from the admin's "create first user" screen) is always an admin. */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req, overrideAccess: true })
  return totalDocs === 0 ? { ...data, role: 'admin' } : data
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: { ar: 'مستخدم', en: 'User' }, plural: { ar: 'المستخدمون', en: 'Users' } },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'] },
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
  hooks: { beforeChange: [firstUserIsAdmin] },
  fields: [
    { name: 'name', type: 'text', required: true, label: { ar: 'الاسم', en: 'Name' } },
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
  ],
}
