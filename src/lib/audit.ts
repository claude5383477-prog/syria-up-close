const IGNORED = new Set(['id', 'createdAt', 'updatedAt', 'loginAttempts', 'lockUntil', 'resetPasswordToken', 'resetPasswordExpiration', 'sessions', '_verificationToken'])
const CREDENTIALS = new Set(['hash', 'salt', 'password'])

const norm = (v: unknown) => JSON.stringify(v ?? null)

/** Names (never values) of the top-level fields that differ between two versions of a document. */
export function changedFields(prev: Record<string, unknown> | undefined, next: Record<string, unknown>): string[] {
  const before = prev ?? {}
  const keys = new Set([...Object.keys(before), ...Object.keys(next)])
  const out = new Set<string>()
  for (const k of keys) {
    if (IGNORED.has(k)) continue
    if (norm(before[k]) === norm(next[k])) continue
    out.add(CREDENTIALS.has(k) ? 'password' : k)
  }
  return [...out]
}
