import type { CollectionBeforeValidateHook } from 'payload'

/** `{city-slug}-{YYYY-MM-DD}`, with -2, -3… when taken. Editors may override it later. */
export const seasonSlug: CollectionBeforeValidateHook = async ({ data, req, originalDoc }) => {
  if (!data || data.slug || originalDoc?.slug) return data
  const cityId = typeof data.city === 'object' && data.city ? data.city.id : data.city
  if (!cityId || !data.fieldDate) return data
  const city = await req.payload.findByID({ collection: 'cities', id: cityId, depth: 0, req, overrideAccess: true })
  const base = `${city.slug}-${String(data.fieldDate).slice(0, 10)}`
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const taken = await req.payload.count({
      collection: 'seasonReports',
      where: { slug: { equals: slug } },
      req,
      overrideAccess: true,
    })
    if (taken.totalDocs === 0) return { ...data, slug }
  }
}
