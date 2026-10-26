import type { Payload } from 'payload'
import { BLOUDAN, CITIES, DAY_TRIPS, FIRST_VISIT } from './data'

export type SeedEnv = {
  SEED_ADMIN_EMAIL?: string
  SEED_ADMIN_PASSWORD?: string
  SEED_CORRESPONDENT_EMAIL?: string
  SEED_CORRESPONDENT_PASSWORD?: string
}

const REQUIRED = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_CORRESPONDENT_EMAIL', 'SEED_CORRESPONDENT_PASSWORD'] as const

/**
 * Initial data (SPEC §5.2). Idempotent: upserts by slug / title / email, never duplicates.
 * Creates no status items, reports, photos, stays or daily details — those wait for a human (ق2).
 * First-visit pages are created as empty drafts only.
 */
export async function seed(payload: Payload, env: SeedEnv): Promise<void> {
  const missing = REQUIRED.filter((k) => !env[k])
  if (missing.length) throw new Error(`Missing seed variables: ${missing.join(', ')} (see .env.example)`)

  const cityIds: Record<string, number> = {}
  for (const c of CITIES) {
    const ar = { slug: c.slug, name: c.name.ar, tag: c.tag.ar, lede: c.lede.ar, eat: c.eat.ar, coverShotNote: c.coverShotNote.ar }
    const en = { name: c.name.en, tag: c.tag.en, lede: c.lede.en, eat: c.eat.en, coverShotNote: c.coverShotNote.en }
    const found = await payload.find({ collection: 'cities', where: { slug: { equals: c.slug } }, limit: 1, depth: 0 })
    const city = found.docs[0]
      ? await payload.update({ collection: 'cities', id: found.docs[0].id, data: ar, locale: 'ar' })
      : await payload.create({ collection: 'cities', data: ar, locale: 'ar' })
    await payload.update({ collection: 'cities', id: city.id, data: en, locale: 'en' })
    cityIds[c.slug] = city.id

    for (const [order, place] of c.places.entries()) {
      const existing = await payload.find({
        collection: 'places',
        where: { and: [{ city: { equals: city.id } }, { title: { equals: place.title.ar } }] },
        locale: 'ar',
        limit: 1,
        depth: 0,
      })
      const ar = { city: city.id, title: place.title.ar, description: place.description.ar, order }
      const doc = existing.docs[0]
        ? await payload.update({ collection: 'places', id: existing.docs[0].id, data: ar, locale: 'ar' })
        : await payload.create({ collection: 'places', data: ar, locale: 'ar' })
      await payload.update({ collection: 'places', id: doc.id, data: { title: place.title.en, description: place.description.en }, locale: 'en' })
    }
  }

  // Resorts belong to a main city's countryside.
  for (const c of CITIES) {
    const parent = c.parent ? cityIds[c.parent] : undefined
    const id = cityIds[c.slug]
    if (parent !== undefined && id !== undefined) await payload.update({ collection: 'cities', id, data: { parentCity: parent } })
  }

  let order = 0
  for (const group of DAY_TRIPS) {
    const fromCity = cityIds[group.from]
    if (fromCity === undefined) throw new Error(`Unknown city in DAY_TRIPS: ${group.from}`)
    for (const [title, description, slug, tag, placeSlug] of group.items) {
      const existing = await payload.find({ collection: 'dayTrips', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
      const place = placeSlug ? cityIds[placeSlug] : undefined
      const data = { fromCity, title, description, slug, tag, order: order++, ...(place !== undefined ? { place } : {}) }
      const doc = existing.docs[0]
        ? await payload.update({ collection: 'dayTrips', id: existing.docs[0].id, data })
        : await payload.create({ collection: 'dayTrips', data })
      // Bloudan's sourced spots, only while the trip has none (an editor's list is never replaced).
      if (slug === 'bloudan' && !(doc.spots?.length)) {
        const { spots, ...rest } = BLOUDAN
        await payload.update({ collection: 'dayTrips', id: doc.id, data: { ...rest, spots } })
      }
    }
  }

  // Five first-visit pages as empty drafts. Existing pages are left alone: once an editor works on one, it is theirs.
  for (const page of FIRST_VISIT) {
    const existing = await payload.find({ collection: 'firstVisitPages', where: { topic: { equals: page.topic } }, draft: true, limit: 1, depth: 0 })
    if (existing.docs[0]) continue
    const doc = await payload.create({
      collection: 'firstVisitPages',
      draft: true,
      locale: 'ar',
      data: { topic: page.topic, title: page.title.ar, summary: page.summary.ar, _status: 'draft' },
    })
    await payload.update({
      collection: 'firstVisitPages',
      id: doc.id,
      draft: true,
      locale: 'en',
      data: { title: page.title.en, summary: page.summary.en, _status: 'draft' },
    })
  }

  await upsertUser(payload, { email: env.SEED_ADMIN_EMAIL!, password: env.SEED_ADMIN_PASSWORD!, name: 'المدير', role: 'admin' })
  const damascus = cityIds.damascus
  await upsertUser(payload, {
    email: env.SEED_CORRESPONDENT_EMAIL!,
    password: env.SEED_CORRESPONDENT_PASSWORD!,
    name: 'مراسل دمشق (تجريبي)',
    role: 'correspondent',
    assignedCities: damascus === undefined ? [] : [damascus],
  })
}

async function upsertUser(
  payload: Payload,
  u: { email: string; password: string; name: string; role: 'admin' | 'correspondent'; assignedCities?: number[] },
) {
  const found = await payload.find({ collection: 'users', where: { email: { equals: u.email } }, limit: 1, depth: 0 })
  const { password, ...rest } = u
  // Existing accounts keep their password; only role, name and cities are re-applied.
  if (found.docs[0]) await payload.update({ collection: 'users', id: found.docs[0].id, data: rest })
  else await payload.create({ collection: 'users', data: { ...rest, password } })
}
