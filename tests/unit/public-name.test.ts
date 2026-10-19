import { describe, expect, it } from 'vitest'
import { DEFAULT_CORRESPONDENT_NAME, defaultDisplayName, publicName } from '@/lib/public-name'

describe('publicName', () => {
  it('is the display name when set', () => {
    expect(publicName({ name: 'حقيقي', displayName: '  عين على الشام ', role: 'correspondent' })).toBe('عين على الشام')
  })

  it("never falls back to a correspondent's real name", () => {
    expect(publicName({ name: 'حقيقي', displayName: '', role: 'correspondent' })).toBe(DEFAULT_CORRESPONDENT_NAME)
  })

  it('staff without a display name keep their own name; nobody is null', () => {
    expect(publicName({ name: 'هالة', role: 'editor' })).toBe('هالة')
    expect(publicName({ role: 'editor' })).toBeNull()
    expect(publicName(null)).toBeNull()
  })
})

describe('defaultDisplayName', () => {
  it('names the city when known', () => {
    expect(defaultDisplayName('دمشق')).toBe('مراسل سوريا عن قرب في دمشق')
    expect(defaultDisplayName(null)).toBe('مراسل سوريا عن قرب')
  })
})
