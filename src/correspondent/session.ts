import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { payloadClient } from '@/data/queries'
import type { City, User } from '@/payload-types'
import { homeFor } from './logic'

/** The signed-in user from Payload's auth cookie, or null. */
export async function currentUser(): Promise<User | null> {
  const p = await payloadClient()
  const { user } = await p.auth({ headers: await headers() })
  return (user as User | null) ?? null
}

export type Correspondent = Omit<User, 'assignedCities'> & { assignedCities: City[]; collection: 'users' }

/** A correspondent with populated cities; visitors go to login, staff to the full admin. */
export async function requireCorrespondent(): Promise<Correspondent> {
  const user = await currentUser()
  if (!user) redirect('/correspondent/login')
  const p = await payloadClient()
  const full = await p.findByID({ collection: 'users', id: user.id, depth: 1, user, overrideAccess: false })
  if (homeFor(full).kind === 'admin') redirect('/admin')
  const cities = (full.assignedCities ?? []).filter((c): c is City => typeof c === 'object' && c !== null)
  return { ...full, collection: 'users', assignedCities: cities }
}

/** One of the correspondent's own cities, or back to the picker with a clear message. */
export async function requireCity(slug: string) {
  const user = await requireCorrespondent()
  const city = user.assignedCities.find((c) => c.slug === slug)
  if (!city) redirect('/correspondent?error=forbidden')
  return { user, city }
}
