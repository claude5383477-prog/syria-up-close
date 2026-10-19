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
