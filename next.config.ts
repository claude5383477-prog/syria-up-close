import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { PLAYER_CSP, PLAYER_PAGES, SECURITY_HEADERS } from './src/lib/security-headers'
import { imageRemotePatterns } from './src/lib/storage'

const nextConfig: NextConfig = {
  // Standalone for the Docker image; Vercel packages the build itself.
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
  // Media URLs from Vercel Blob (production) or the R2 public domain; local media is same-origin.
  // Optimizer off everywhere (owner decision 2026-10-29): the Vercel plan's image quota ran out and new
  // images returned 402. Media already stores WebP sizes (thumb 400, card 800, hero 1600) to serve directly.
  images: { remotePatterns: imageRemotePatterns(), unoptimized: true },
  reactStrictMode: true,
  headers: async () => [
    // Anti-framing and basic security headers on every response (lib/security-headers).
    { source: '/:path*', headers: [...SECURITY_HEADERS] },
    // Video pages: the same anti-framing, plus the three video players as the only frame sources (عدسات).
    ...PLAYER_PAGES.map((source) => ({ source, headers: [PLAYER_CSP] })),
    // Subset fonts are versioned in their file names (plex-arabic-400.v1.woff2), so cache them for a year.
    { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ],
  // Open Graph images read the subset TTFs from disk at runtime; include them in the standalone build.
  outputFileTracingIncludes: { '/**': ['./src/og/fonts/*.ttf'] },
  // Testing on a phone over the LAN in dev: ALLOWED_DEV_ORIGINS=192.168.1.20 (comma-separated hosts).
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',').map((h) => h.trim()).filter(Boolean),
  experimental: {
    // Correspondent photos go through server actions; the browser compresses them first and the
    // action itself refuses anything over 3MB (src/correspondent/actions.ts).
    serverActions: { bodySizeLimit: '4mb' },
    // Off on purpose: inlined CSS is repeated in the RSC payload (measured: the correspondent page went
    // over its 150KB budget). With the subset fonts, public pages score better without it anyway.
    inlineCss: false,
  },
}

const config = withPayload(nextConfig)

/**
 * withPayload sends `Critical-CH: Sec-CH-Prefers-Color-Scheme` on every path so the admin can match the
 * OS theme. On public pages that makes Chrome restart each first navigation (an internal 307 and an extra
 * round-trip, ~600ms on mobile). Our pages theme with CSS media queries, so the hint is scoped to /admin.
 */
const payloadHeaders = config.headers
config.headers = async () =>
  (await payloadHeaders!()).map((rule) =>
    rule.source === '/:path*' && rule.headers.some((h) => h.key === 'Critical-CH') ? { ...rule, source: '/admin/:path*' } : rule,
  )

export default config
