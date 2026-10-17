import type { Media } from '@/payload-types'

/** A relationship as Payload returns it: an id (unpopulated) or the document. */
export type Rel<T> = number | T | null | undefined

/** YYYY-MM-DD in Asia/Damascus. */
export function damascusDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export const asMedia = (m: Rel<Media>): Media | null => (m && typeof m === 'object' ? m : null)
export const asDoc = <T,>(m: Rel<T>): T | null => (m && typeof m === 'object' ? (m as T) : null)
