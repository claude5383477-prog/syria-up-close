import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, Endpoint, GlobalAfterChangeHook } from 'payload'
import { secretMatches } from '@/lib/secret'

/** Collections that never appear on public pages. */
export const PRIVATE_COLLECTIONS = ['users', 'auditLog'] as const

/**
 * On-demand revalidation (SPEC §5.3): any public content change invalidates the whole public site
 * (root layout); pages regenerate on their next visit. The site is small, so one rule beats a
 * per-path map that can drift. Outside a Next request (seed CLI, tests) there is no cache: no-op.
 */
export function revalidateSite(): void {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // not inside a Next.js request
  }
}

const afterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateSite()
  return doc
}
const afterDelete: CollectionAfterDeleteHook = () => {
  revalidateSite()
}
export const revalidateGlobal: GlobalAfterChangeHook = ({ doc }) => {
  revalidateSite()
  return doc
}

export function withRevalidate(c: CollectionConfig): CollectionConfig {
  if ((PRIVATE_COLLECTIONS as readonly string[]).includes(c.slug)) return c
  return {
    ...c,
    hooks: {
      ...c.hooks,
      afterChange: [...(c.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(c.hooks?.afterDelete ?? []), afterDelete],
    },
  }
}

/**
 * POST /api/revalidate-site, for processes outside Next that changed what pages show: the container
 * on boot (its image was built without a database) and `npm run revalidate` after the seed.
 * Authorised by PAYLOAD_SECRET in x-revalidate-secret; it only clears the cache, never returns data.
 */
export const revalidateSiteEndpoint: Endpoint = {
  path: '/revalidate-site',
  method: 'post',
  handler: async (req) => {
    if (!secretMatches(req.headers.get('x-revalidate-secret'), process.env.PAYLOAD_SECRET)) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }
    revalidateSite()
    return Response.json({ revalidated: true })
  },
}
