// Server-only half of lib/booking (node:crypto): lib/booking itself is also used by the admin board in the browser.
import { createHash } from 'node:crypto'

/** A one-way key for the same-IP limit: the address itself is never stored. */
export function clientKey(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32)
}
