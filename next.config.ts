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
  },
}

export default withPayload(nextConfig)
