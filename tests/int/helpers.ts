import config from '@payload-config'
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import type { User } from '@/payload-types'

let instance: Payload | undefined

export async function payload(): Promise<Payload> {
  instance ??= await getPayload({ config })
  return instance
}

/** Empties every collection (versions included) so each test file starts from a clean database. */
export async function resetDatabase(): Promise<void> {
  const p = await payload()
  for (const c of p.config.collections) {
    await p.db.deleteMany({ collection: c.slug as CollectionSlug, where: {} })
    if (c.versions) await p.db.deleteVersions({ collection: c.slug as CollectionSlug, where: {} })
  }
}

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
