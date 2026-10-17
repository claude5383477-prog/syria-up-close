import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access'

const never = () => false

/** Who changed what and when (SPEC §5.2). Written only by server hooks; append-only for everyone. */
export const AuditLog: CollectionConfig = {
  slug: 'auditLog',
  labels: { singular: { ar: 'سجل', en: 'Audit entry' }, plural: { ar: 'سجل التدقيق', en: 'Audit log' } },
  admin: {
    useAsTitle: 'collection',
    defaultColumns: ['at', 'user', 'operation', 'collection', 'docId', 'changedFields'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  defaultSort: '-at',
  access: { read: adminOnly, create: never, update: never, delete: never },
  fields: [
    { name: 'at', type: 'date', required: true, index: true, label: { ar: 'الوقت', en: 'At' }, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'user', type: 'relationship', relationTo: 'users', label: { ar: 'المستخدم', en: 'User' } },
    {
      name: 'operation',
      type: 'select',
      required: true,
      label: { ar: 'العملية', en: 'Operation' },
      options: [
        { value: 'create', label: { ar: 'إنشاء', en: 'Create' } },
        { value: 'update', label: { ar: 'تعديل', en: 'Update' } },
        { value: 'delete', label: { ar: 'حذف', en: 'Delete' } },
        { value: 'confirm', label: { ar: 'تأكيد بلا تغيير', en: 'Confirm' } },
      ],
    },
    { name: 'collection', type: 'text', required: true, index: true, label: { ar: 'المجموعة', en: 'Collection' } },
    { name: 'docId', type: 'text', required: true, index: true, label: { ar: 'المعرّف', en: 'Document' } },
    { name: 'changedFields', type: 'json', label: { ar: 'الحقول المتغيرة', en: 'Changed fields' } },
  ],
}
