import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS } from '@/lib/security-headers'

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

describe('SECURITY_HEADERS (every response)', () => {
  it('no other site may frame the admin or the correspondent app (clickjacking)', () => {
    expect(header('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(header('Content-Security-Policy')).toMatch(/^frame-ancestors 'self';/)
  })

  it('our pages frame only ourselves and the three video players (عدسات)', () => {
    expect(header('Content-Security-Policy')).toBe(
      "frame-ancestors 'self'; frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com",
    )
  })

  it('no MIME sniffing; the full URL never leaves the site in the Referer', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })
})
