import { describe, expect, it, vi } from 'vitest'
import { fillDisplayName } from '@/hooks/displayName'

const reqWith = (city: unknown) => ({ payload: { findByID: vi.fn(async () => city) } })
const run = (args: object) => fillDisplayName({ req: reqWith({ name: 'دمشق' }), ...args } as never)

describe('fillDisplayName (users beforeValidate)', () => {
  it('keeps a display name someone chose, on create and on update', async () => {
    expect(await run({ data: { displayName: 'عين على الشام', role: 'correspondent' } })).toMatchObject({ displayName: 'عين على الشام' })
    const data = { role: 'correspondent' }
    expect(await run({ data, originalDoc: { displayName: 'سابق' } })).toBe(data)
  })

  it('a correspondent gets the default for their first city (role defaults to correspondent)', async () => {
    expect(await run({ data: { assignedCities: [{ id: 3 }] } })).toMatchObject({ displayName: 'مراسل سوريا عن قرب في دمشق' })
    expect(await run({ data: {}, originalDoc: { role: 'correspondent', assignedCities: [3] } })).toMatchObject({ displayName: 'مراسل سوريا عن قرب في دمشق' })
  })

  it('falls back to the generic default with no city, or when the city cannot be read', async () => {
    expect(await run({ data: { role: 'correspondent' } })).toMatchObject({ displayName: 'مراسل سوريا عن قرب' })
    const failing = { payload: { findByID: vi.fn(async () => Promise.reject(new Error('gone'))) } }
    expect(await fillDisplayName({ req: failing, data: { role: 'correspondent', assignedCities: [9] } } as never)).toMatchObject({ displayName: 'مراسل سوريا عن قرب' })
  })

  it('staff default to their own name; no data passes through', async () => {
    expect(await run({ data: { role: 'editor', name: 'هالة' } })).toMatchObject({ displayName: 'هالة' })
    expect(await run({ data: undefined })).toBeUndefined()
  })
})

describe('fillDisplayName: role and city changes', () => {
  it('a correspondent whose display name is their real name gets the default instead', async () => {
    expect(await run({ data: { role: 'correspondent', assignedCities: [3] }, originalDoc: { role: 'editor', name: 'هالة', displayName: 'هالة' } })).toMatchObject({
      displayName: 'مراسل سوريا عن قرب في دمشق',
    })
    expect(await run({ data: { displayName: 'هالة' }, originalDoc: { role: 'correspondent', name: 'هالة', assignedCities: [3] } })).toMatchObject({
      displayName: 'مراسل سوريا عن قرب في دمشق',
    })
  })

  it('the default follows a city change; a chosen name and an untouched city do not change', async () => {
    const moved = await run({ data: { assignedCities: [3] }, originalDoc: { role: 'correspondent', displayName: 'مراسل سوريا عن قرب في حلب' } })
    expect(moved).toMatchObject({ displayName: 'مراسل سوريا عن قرب في دمشق' })
    const chosen = { assignedCities: [3] }
    expect(await run({ data: chosen, originalDoc: { role: 'correspondent', displayName: 'عين على الشام' } })).toBe(chosen)
    const other = { alt: 'x' }
    expect(await run({ data: other, originalDoc: { role: 'correspondent', displayName: 'مراسل سوريا عن قرب في حلب' } })).toBe(other)
  })
})
