import { describe, expect, it } from 'vitest'
import { PLAYER_CSP, PLAYER_PAGES, SECURITY_HEADERS } from '@/lib/security-headers'

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

describe('SECURITY_HEADERS (every response)', () => {
  it('no other site may frame the admin or the correspondent app (clickjacking)', () => {
    expect(header('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(header('Content-Security-Policy')).toBe("frame-ancestors 'self'")
  })

  it('video pages frame only ourselves and the three players, and keep the anti-framing rule (عدسات)', () => {
    expect(PLAYER_CSP.value).toBe("frame-ancestors 'self'; frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com")
    expect(PLAYER_PAGES).toContain('/videos')
    expect(PLAYER_PAGES).toContain('/en/cities/:slug')
  })

  it('no MIME sniffing; the full URL never leaves the site in the Referer', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })
})
