import { Forbidden, type CollectionBeforeChangeHook } from 'payload'
import { isAssignedCity, type AppUser } from '@/access'

/**
 * Server-side city check on every create/update by a signed-in user (SPEC §5.2):
 * a correspondent can only write documents of their assigned cities. System writes (no user) pass.
 */
export const requireAssignedCity =
  (field = 'city'): CollectionBeforeChangeHook =>
  ({ data, originalDoc, req }) => {
    if (!req.user) return data
    const city = data?.[field] ?? originalDoc?.[field]
    if (!isAssignedCity(req.user as unknown as AppUser, city)) throw new Forbidden(req.t)
    return data
  }
