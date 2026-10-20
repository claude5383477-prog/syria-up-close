import { randomBytes } from 'node:crypto'

/** A new account's password: 24 random bytes (192 bits), URL-safe, 32 characters. */
export const generatePassword = (): string => randomBytes(24).toString('base64url')

/**
 * A correspondent's email must be an alias: the admin and the person can read it, and a leaked
 * address that carries the real name would identify them. Refuses an address with any Latin part
 * (3+ letters) of the real name in it. An Arabic name cannot be matched against a Latin address,
 * so the owner still checks transliterations by eye. Returns the reason, or null when acceptable.
 */
export function checkAliasEmail(email: string, realName: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'not an email address'
  const local = email.slice(0, at).toLowerCase().replace(/[^a-z]/g, '')
  const parts = realName.toLowerCase().split(/[^a-z]+/).filter((p) => p.length >= 3)
  const found = parts.find((p) => local.includes(p))
  return found ? `the address contains "${found}" from the real name; use an alias` : null
}
