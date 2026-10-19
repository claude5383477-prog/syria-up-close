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

/**
 * Create access for city-bound documents: may this user create here at all?
 * Payload also calls it with empty data to draw the admin UI, so it cannot judge the city itself;
 * the actual city is enforced on every save by the requireAssignedCity hook (src/hooks).
 */
export const canCreateForSomeCity: Access = ({ req }) => {
  const u = userOf(req)
  if (isStaff(u)) return true
  return u?.role === 'correspondent' && assignedCityIds(u).length > 0
}

/** Per-document check: staff may write any city, a correspondent only an assigned one. */
export function isAssignedCity(user: AppUser | null, city: unknown): boolean {
  if (isStaff(user)) return true
  if (user?.role !== 'correspondent') return false
  const id = idOf(city)
  if (id === undefined || id === null) return false
  return assignedCityIds(user).some((a) => String(a) === String(id))
}

const PUBLISHED: Where = { _status: { equals: 'published' } }

/** Drafts are invisible to the public. */
export const publishedOnly: Access = () => PUBLISHED

/** Staff see drafts; everyone else only published documents. */
export const publishedOrStaff: Access = ({ req }) => (isStaff(userOf(req)) ? true : PUBLISHED)

/** Correspondents also see their own drafts (field holds the author). */
export const publishedOrOwn =
  (field: string): Access =>
  ({ req }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return PUBLISHED
    return { or: [PUBLISHED, { [field]: { equals: u.id } }] } as Where
  }

/** Correspondents may save drafts but never publish (SPEC §5.2); otherwise defers to `rule`. */
export const cannotPublish =
  (rule: Access): Access =>
  (args) => {
    const u = userOf(args.req)
    const status = (args.data as Record<string, unknown> | undefined)?._status
    if (!isStaff(u) && status === 'published') return false
    return rule(args)
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

function prefixWhere(where: Where, prefix: string): Where {
  return Object.fromEntries(
    Object.entries(where).map(([key, value]) =>
      key === 'and' || key === 'or' ? [key, (value as Where[]).map((w) => prefixWhere(w, prefix))] : [`${prefix}${key}`, value],
    ),
  ) as Where
}

/**
 * The same rule for a collection's version history (access.readVersions), whose fields sit under
 * `version.`. Without it Payload lets any signed-in user read every version, drafts included.
 */
export const versionsOf =
  (rule: Access): Access =>
  async (args) => {
    const result = await rule(args)
    return typeof result === 'boolean' ? result : prefixWhere(result, 'version.')
  }

const APPROVED: Where = { approved: { equals: true } }

/**
 * Media read (security audit M2): approved photos are public; a correspondent also sees their own
 * unapproved uploads; staff see everything. A photo is approved when staff upload it or when staff
 * publish something that uses it (hooks/approveMedia).
 */
export const approvedOrOwn =
  (field: string): Access =>
  ({ req }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return APPROVED
    return { or: [APPROVED, { [field]: { equals: u.id } }] } as Where
  }

/** Field write rule: staff only. */
export const staffOnlyField: FieldAccess = ({ req }) => isStaff(userOf(req))

/**
 * Media update/delete (second security audit N1): correspondents manage their own photos only until
 * they are approved; after that, only staff may edit, replace or delete them, so a published page
 * cannot be changed from a correspondent account. The Blob client-overwrite path defers to this too.
 */
export const ownUnapprovedOrStaff =
  (field: string): Access =>
  ({ req }) => {
    const u = userOf(req)
    if (isStaff(u)) return true
    if (u?.role !== 'correspondent') return false
    return { and: [{ [field]: { equals: u.id } }, { approved: { not_equals: true } }] } as Where
  }
