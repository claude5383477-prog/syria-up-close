import type { Endpoint, Payload, PayloadRequest } from 'payload'
import type { StatusItem, User } from '@/payload-types'

/**
 * "No change, verified today": re-save the item as the current user so stampVerification renews
 * verifiedBy/verifiedAt. Runs with the user's own access, so another city's item is refused.
 */
export async function confirmStatusItem(payload: Payload, id: number | string, user: User, req?: Partial<PayloadRequest>): Promise<StatusItem> {
  return payload.update({
    collection: 'statusItems',
    id,
    data: {},
    user,
    overrideAccess: false,
    depth: 0,
    context: { auditOperation: 'confirm' },
    ...(req ? { req } : {}),
  })
}

export const confirmEndpoint: Endpoint = {
  path: '/:id/confirm',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'يجب تسجيل الدخول' }, { status: 401 })
    const id = req.routeParams?.id
    if (typeof id !== 'string' && typeof id !== 'number') return Response.json({ message: 'معرّف غير صالح' }, { status: 400 })
    try {
      const doc = await confirmStatusItem(req.payload, id, req.user as User, req)
      return Response.json({ doc })
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return Response.json({ message: status === 403 ? 'لا تملك صلاحية على هذه المدينة' : 'تعذّر التأكيد' }, { status })
    }
  },
}
