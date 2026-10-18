import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Testing on a phone over the LAN in dev: ALLOWED_DEV_ORIGINS=192.168.1.20 (comma-separated hosts).
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',').map((h) => h.trim()).filter(Boolean),
  experimental: {
    // Correspondent photos go through server actions; the browser compresses them first and the
    // action itself refuses anything over 3MB (src/correspondent/actions.ts).
    serverActions: { bodySizeLimit: '4mb' },
    // Our CSS is ~6KB: inlining it removes render-blocking requests on slow mobile connections.
    inlineCss: true,
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
