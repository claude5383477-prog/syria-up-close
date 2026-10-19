import type { CollectionBeforeValidateHook } from 'payload'
import { defaultDisplayName } from '@/lib/public-name'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/**
 * Users beforeValidate: an empty display name is filled before validation (the field is required).
 * Correspondents get "مراسل سوريا عن قرب في {first assigned city}" (never their real name); staff
 * default to their own name. A name someone chose is never overwritten.
 */
export const fillDisplayName: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const chosen = data.displayName ?? originalDoc?.displayName
  if (typeof chosen === 'string' && chosen.trim()) return data
  const role = data.role ?? originalDoc?.role ?? 'correspondent'
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
