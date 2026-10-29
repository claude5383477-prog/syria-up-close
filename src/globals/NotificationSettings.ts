import type { GlobalConfig } from 'payload'
import { editorOrAdmin } from '@/access'
import { testMailEndpoint } from '@/endpoints/bookings'

/** Who hears about guide bookings, and when (batch 4). Staff only: the addresses are private. */
export const NotificationSettings: GlobalConfig = {
  slug: 'notificationSettings',
  label: { ar: 'إشعارات الحجوزات', en: 'Booking notifications' },
  admin: { group: { ar: 'الأدلاء', en: 'Guides' } },
  access: { read: editorOrAdmin, update: editorOrAdmin },
  endpoints: [testMailEndpoint],
  fields: [
    {
      name: 'emails',
      type: 'array',
      label: { ar: 'الإيميلات التي يصلها الإشعار', en: 'E-mails to notify' },
      labels: { singular: { ar: 'إيميل', en: 'E-mail' }, plural: { ar: 'إيميلات', en: 'E-mails' } },
      fields: [{ name: 'email', type: 'email', required: true, label: { ar: 'الإيميل', en: 'E-mail' } }],
    },
    { name: 'onNew', type: 'checkbox', defaultValue: true, label: { ar: 'إيميل لكل طلب جديد (فوري، فيه التفاصيل ورابط الطلب)', en: 'E-mail every new request' } },
    { name: 'dailyDigest', type: 'checkbox', defaultValue: false, label: { ar: 'ملخص يومي الساعة 9 صباحاً: الطلبات التي بلا رد', en: 'Daily digest at 9 a.m.' } },
    { name: 'reminder24h', type: 'checkbox', defaultValue: true, label: { ar: 'تذكير إذا بقي طلب "جديد" يوماً كاملاً', en: 'Reminder after 24 hours' } },
    { name: 'copyToGuide', type: 'checkbox', defaultValue: true, label: { ar: 'نسخة للدليل بعد التأكيد فقط', en: 'Copy to the guide after confirmation' } },
    {
      name: 'testButton',
      type: 'ui',
      admin: { components: { Field: '/components/admin/TestMailButton#TestMailButton' } },
    },
  ],
}
