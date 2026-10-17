import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, GlobalAfterChangeHook } from 'payload'

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
