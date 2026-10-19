/**
 * The name visitors see (owner decision, 2026-10-19): correspondents' real names are never published.
 * Status "verified by", report authors and photo credits use the display name; the real name stays in
 * the admin, readable by the admin only. Users.displayName is always filled (hooks/displayName).
 */
export const DEFAULT_CORRESPONDENT_NAME = 'مراسل سوريا عن قرب'

export const defaultDisplayName = (cityName?: string | null) =>
  cityName ? `${DEFAULT_CORRESPONDENT_NAME} في ${cityName}` : DEFAULT_CORRESPONDENT_NAME

type NamedUser = { name?: string | null; displayName?: string | null; role?: string | null } | null | undefined

/** Display name, else a safe fallback: never a correspondent's real name. */
export function publicName(user: unknown): string | null {
  const u = user as NamedUser
  if (!u) return null
  if (u.displayName?.trim()) return u.displayName.trim()
  return u.role === 'correspondent' ? DEFAULT_CORRESPONDENT_NAME : (u.name ?? null)
}
