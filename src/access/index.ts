import type { Access, FieldAccess, Where } from 'payload'

// Role rules from SPEC §5.2. Enforced server-side by Payload; every rule here has a unit test
// (tests/unit/access.test.ts) and an integration test against Postgres (tests/int).

export type Role = 'admin' | 'editor' | 'correspondent'
type Id = number | string
export type AppUser = {
  id: Id
  role?: Role | null
  assignedCities?: (Id | { id: Id })[] | null
}

const userOf = (req: { user?: unknown }) => (req.user ?? null) as AppUser | null
const isStaff = (u: AppUser | null) => u?.role === 'admin' || u?.role === 'editor'
const idOf = (v: unknown): Id | undefined =>
  typeof v === 'number' || typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: Id }).id : undefined

export function assignedCityIds(user: AppUser): Id[] {
  return (user.assignedCities ?? []).map(idOf).filter((v): v is Id => v !== undefined)
}

export const authenticated: Access = ({ req }) => Boolean(userOf(req))

export const adminOnly: Access = ({ req }) => userOf(req)?.role === 'admin'

export const adminOnlyField: FieldAccess = ({ req }) => userOf(req)?.role === 'admin'

export const editorOrAdmin: Access = ({ req }) => isStaff(userOf(req))

/** Users collection: admins manage everyone; everyone else only their own account. */
export const selfOrAdmin: Access = ({ req }) => {
  const u = userOf(req)
  if (!u) return false
  return u.role === 'admin' ? true : { id: { equals: u.id } }
}

/** Users collection read: staff see the team; correspondents only themselves. */
export const selfOrStaff: Access = ({ req }) => {
  const u = userOf(req)
  if (!u) return false
  return isStaff(u) ? true : { id: { equals: u.id } }
}

/** Read/update/delete filter: correspondents only touch documents of their assigned cities. */
export const cityScoped =
  (field: string): Access =>
  ({ req }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return false
    const ids = assignedCityIds(u)
    return ids.length ? ({ [field]: { in: ids } } as Where) : false
  }

/** Create cannot return a Where, so the incoming city is checked against the assignment. */
export const cityScopedCreate =
  (field: string): Access =>
  ({ req, data }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return false
    const city = idOf((data as Record<string, unknown> | undefined)?.[field])
    if (city === undefined) return false
    return assignedCityIds(u).some((id) => String(id) === String(city))
  }

/** Correspondents only touch documents they created themselves (field holds the creator). */
export const ownOrStaff =
  (field: string): Access =>
  ({ req }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return false
    return { [field]: { equals: u.id } } as Where
  }
