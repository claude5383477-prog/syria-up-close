import type { MetadataRoute } from 'next'
import { isPreviewDeployment, siteUrl } from '@/lib/site-url'

const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'DuckAssistBot', 'meta-externalagent']

export default function robots(): MetadataRoute.Robots {
  // A Vercel Preview is a copy of the site on another address: keep every crawler out.
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } }
  const base = siteUrl()
  const disallow = ['/admin', '/api/', '/correspondent', '/kit', '/en/kit']
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // AI search and assistants may read and cite the guide (owner decision 2026-10-26, GEO).
      { userAgent: AI_CRAWLERS, allow: '/', disallow },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
