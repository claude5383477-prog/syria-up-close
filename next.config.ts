import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Correspondent photos go through server actions; the browser compresses them first and the
    // action itself refuses anything over 3MB (src/correspondent/actions.ts).
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default withPayload(nextConfig)
