type Env = Record<string, string | undefined>

// The literal process.env.NEXT_PUBLIC_SITE_URL is inlined at build, so an image keeps its URL
// even when the runtime environment doesn't repeat it; the VERCEL_* values are read at runtime.
const runtimeEnv = (): Env => ({ ...process.env, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL })

/** A Vercel Preview deployment: its own address, its own Neon branch, never indexed. */
export const isPreviewDeployment = (env: Env = runtimeEnv()) => env.VERCEL_ENV === 'preview'

const https = (host: string | undefined) => (host ? `https://${host}` : undefined)

/**
 * The site's public origin, no trailing slash: canonical URLs, hreflang, sitemap, JSON-LD, Payload's
 * serverURL. A Preview uses its own address (branch alias first), so nothing there points at production.
 */
export function siteUrl(env: Env = runtimeEnv()): string {
  const preview = isPreviewDeployment(env) ? (https(env.VERCEL_BRANCH_URL) ?? https(env.VERCEL_URL)) : undefined
  return (preview ?? env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

/** Origins allowed to use the admin's cookie auth (Payload csrf/cors). */
export function siteOrigins(env: Env = runtimeEnv()): string[] {
  const origins = [siteUrl(env), https(env.VERCEL_BRANCH_URL), https(env.VERCEL_URL)]
  return [...new Set(origins.filter((o): o is string => Boolean(o)))]
}
