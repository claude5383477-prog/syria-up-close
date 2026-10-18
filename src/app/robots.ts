import type { MetadataRoute } from 'next'
import { isPreviewDeployment, siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  // A Vercel Preview is a copy of the site on another address: keep every crawler out.
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } }
  const base = siteUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/correspondent', '/kit', '/en/kit'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
