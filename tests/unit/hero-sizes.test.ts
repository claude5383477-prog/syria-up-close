import { describe, expect, it } from 'vitest'
import { HERO_LAYERS, heroSizes } from '@/lib/heroSizes'

// The hero photos fill fixed boxes with object-fit: cover (src/styles/site.css .stage, v2.css .trip-pics).
// `sizes` must describe the width the photo is actually drawn at, or the browser downloads the 100vw file.

/** The comma-separated entries of a sizes attribute (commas inside max() are not separators). */
const bands = (sizes: string) => sizes.split(/, (?=\(max-width|\d+px$)/)

describe('heroSizes', () => {
  it('describes each viewport band: phones, full-width stage, then the fixed desktop column', () => {
    const s = heroSizes('city-main', 0.8)
    const parts = bands(s)
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^\(max-width: 700px\) /)
    expect(parts[1]).toMatch(/^\(max-width: 1020px\) /)
    expect(parts[2]).not.toMatch(/^\(/)
  })

  it('a portrait photo is as wide as its box: the box width wins inside max()', () => {
    // City cover on phones: box 56% of the content width, 228px tall (300px stage × 76%).
    expect(bands(heroSizes('city-main', 0.8))[0]).toBe('(max-width: 700px) max(calc((100vw - 32px) * 0.56), 182px)')
  })

  it('a landscape photo is cropped at the sides: its drawn width follows the box height', () => {
    // 3:2 in a 228px-tall box is drawn 342px wide, wider than a phone-sized box.
    expect(bands(heroSizes('city-main', 1.5))[0]).toBe('(max-width: 700px) max(calc((100vw - 32px) * 0.56), 342px)')
  })

  it('the desktop column is a fixed width, so the last value is in pixels', () => {
    // Content 1088px: intro (basis 420) and stage (basis 520) share the 100px left after the 48px gap → stage 570px.
    // The cover takes 56% of it (319px), and a 3:2 photo in its 350px height is drawn 524px wide.
    expect(bands(heroSizes('city-main', 0.8))[2]).toBe('319px')
    expect(bands(heroSizes('city-main', 1.5))[2]).toBe('524px')
  })

  it('falls back to a 3:2 photo when the size is unknown, never to the full viewport', () => {
    expect(heroSizes('city-main', undefined)).toBe(heroSizes('city-main', 1.5))
    expect(heroSizes('city-main', 0)).toBe(heroSizes('city-main', 1.5))
    expect(heroSizes('city-main', Number.NaN)).toBe(heroSizes('city-main', 1.5))
  })

  it('never claims more than the viewport', () => {
    for (const layer of Object.keys(HERO_LAYERS) as (keyof typeof HERO_LAYERS)[]) {
      for (const aspect of [0.5, 1, 1.5, 3]) {
        expect(heroSizes(layer, aspect)).not.toContain('100vw)')
        expect(heroSizes(layer, aspect)).not.toMatch(/^100vw|, 100vw/)
      }
    }
  })

  it('covers both hero layouts (city stage and countryside grid)', () => {
    expect(Object.keys(HERO_LAYERS).sort()).toEqual(['city-back', 'city-main', 'city-side', 'rural-main', 'rural-side'].sort())
    // Countryside main photo on phones: (W - 12px gap) × 1.4/2.4 wide, 260px tall.
    expect(bands(heroSizes('rural-main', 0.8))[0]).toBe('(max-width: 700px) max(calc((100vw - 44px) * 0.5833), 208px)')
  })
})
