import type { ListViewServerProps } from 'payload'
import { bookingStats, type BookingStatus } from '@/lib/booking'
import { toRow } from '@/endpoints/bookings'
import type { Booking } from '@/payload-types'
import { BookingsBoard, type BoardRow } from './BookingsBoard'

/**
 * The "الحجوزات" screen (batch 4, prototype "لوحة التحكم: الحجوزات"): summary numbers, a status filter,
 * the table, and a drawer per request with confirm / cancel and the e-mail preview; CSV export.
 * Reads as the signed-in user, so access rules apply (editors and admins only).
 */
export async function BookingsView({ payload, user }: ListViewServerProps) {
  const { docs } = await payload.find({ collection: 'bookings', user, overrideAccess: false, depth: 1, limit: 500, sort: '-createdAt' })
  const bookings = docs as Booking[]
  const published = await payload.count({ collection: 'guides', where: { _status: { equals: 'published' } }, overrideAccess: true })
  const rows: BoardRow[] = bookings.map((b) => ({ ...toRow(b), id: b.id, internalNote: b.internalNote ?? '', updatedAt: b.updatedAt }))
  const stats = bookingStats(rows.map((r) => ({ status: r.status as BookingStatus, createdAt: r.createdAt, updatedAt: r.updatedAt })), new Date())
  return <BookingsBoard rows={rows} stats={{ ...stats, guides: published.totalDocs }} />
}
