import type { Payload } from 'payload'

export type NewCorrespondent = { email: string; name: string; city: string; password: string }

/**
 * Creates a correspondent account for one city (admin script, scripts/create-correspondent.mjs).
 * The display name is left empty, so the users hook sets "مراسل سوريا عن قرب في {المدينة}".
 */
export async function createCorrespondent(payload: Payload, { email, name, city, password }: NewCorrespondent) {
  const { docs } = await payload.find({ collection: 'cities', where: { slug: { equals: city } }, limit: 1, depth: 0, overrideAccess: true })
  const found = docs[0]
  if (!found) throw new Error(`no city with slug "${city}"`)
  const { totalDocs } = await payload.count({ collection: 'users', where: { email: { equals: email.toLowerCase() } }, overrideAccess: true })
  if (totalDocs) throw new Error('an account with this email already exists')
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { email, name, password, role: 'correspondent', assignedCities: [found.id] },
  })
  return { id: user.id, email: user.email, displayName: user.displayName, city }
}
