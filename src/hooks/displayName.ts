import type { CollectionBeforeValidateHook } from 'payload'
import { DEFAULT_CORRESPONDENT_NAME, defaultDisplayName } from '@/lib/public-name'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/**
 * Users beforeValidate: keeps the public display name right (the field is required in effect).
 * - Empty: correspondents get "مراسل سوريا عن قرب في {first assigned city}", staff their own name.
 * - A correspondent's display name never equals their real name (e.g. staff demoted to correspondent,
 *   whose display name was their own name): it is replaced by the default.
 * - A correspondent still on the default name follows city changes; a name someone chose is kept.
 */
export const fillDisplayName: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const role = data.role ?? originalDoc?.role ?? 'correspondent'
  const realName = text(data.name ?? originalDoc?.name)
  const stored = text(originalDoc?.displayName)
  // On update Payload passes the stored value along; only a different value is the caller's choice.
  const current = 'displayName' in data ? text(data.displayName) : stored
  const nameChosenNow = current !== stored
  const cityIds = (v: unknown) => (Array.isArray(v) ? v.map((c) => String(idOf(c))).join(',') : '')
  const citiesChanged = 'assignedCities' in data && cityIds(data.assignedCities) !== cityIds(originalDoc?.assignedCities)

  const recompute =
    !current ||
    (role === 'correspondent' && realName !== '' && current === realName) ||
    (role === 'correspondent' && !nameChosenNow && current.startsWith(DEFAULT_CORRESPONDENT_NAME) && citiesChanged)
  if (!recompute) return data

  if (role !== 'correspondent') return { ...data, displayName: data.name ?? originalDoc?.name }
  const first = idOf((data.assignedCities ?? originalDoc?.assignedCities ?? [])[0])
  let cityName: string | null = null
  if (typeof first === 'number' || typeof first === 'string') {
    const city = await req.payload
      .findByID({ collection: 'cities', id: first, depth: 0, locale: 'ar', overrideAccess: true, req })
      .catch(() => null)
    cityName = typeof city?.name === 'string' ? city.name : null
  }
  return { ...data, displayName: defaultDisplayName(cityName) }
}
