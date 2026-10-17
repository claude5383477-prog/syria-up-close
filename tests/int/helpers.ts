import config from '@payload-config'
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import type { User } from '@/payload-types'

let instance: Payload | undefined

export async function payload(): Promise<Payload> {
  instance ??= await getPayload({ config })
  return instance
}

/** Empties every table (versions, relations, locales included) so each test file starts from a clean database. */
export async function resetDatabase(): Promise<void> {
  const p = await payload()
  const pool = (p.db as unknown as { pool: { query: (sql: string) => Promise<{ rows: { tablename: string }[] }> } }).pool
  const { rows } = await pool.query(
    "select tablename from pg_tables where schemaname = 'public' and tablename not in ('payload_migrations')",
  )
  if (rows.length) await pool.query(`truncate ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`)
}

/**
 * Same, plus a bootstrap admin, because the first account ever created is forced to admin
 * (Users.firstUserIsAdmin). Without it the first test user would silently become an admin.
 */
export async function resetWithAdmin(): Promise<User> {
  await resetDatabase()
  return makeUser('admin')
}

export type { CollectionSlug }

let seq = 0
type Role = NonNullable<User['role']>

/** Creates a user directly (bypassing access) and returns it as Payload's Local API expects for `user:`. */
export async function makeUser(role: Role, extra: Partial<User> = {}): Promise<User> {
  const p = await payload()
  seq += 1
  const user = await p.create({
    collection: 'users',
    overrideAccess: true,
    data: { name: `${role}-${seq}`, email: `${role}-${seq}@test.local`, password: 'correct-horse-battery', role, ...extra },
  })
  return { ...user, collection: 'users' } as User
}
