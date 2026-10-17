import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseTokenBlocks } from '@/lib/contrast'

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8')
const { light, dark, darkMedia } = parseTokenBlocks(css)

// [text token, background token, minimum ratio]. 4.5 = AA body text; 3 = AA large text / UI.
// Copper 500 (--accent) is decoration-only per the brand, so it never appears as text here.
const PAIRS: [string, string, number][] = [
  ['--ink', '--bg', 4.5],
  ['--ink', '--surface', 4.5],
  ['--ink2', '--bg', 4.5],
  ['--ink2', '--surface', 4.5],
  ['--ink2', '--sunk', 4.5],
  ['--brand', '--bg', 4.5],
  ['--brand', '--surface', 4.5],
  ['--brand', '--sunk', 4.5],
  ['--btn-fg', '--btn-bg', 4.5],
  ['--band-fg', '--band-bg', 4.5],
  ['--band-muted', '--band-bg', 4.5],
  ['--band-accent', '--band-bg', 4.5],
  ['--accent-text', '--bg', 4.5],
  ['--accent-text', '--aud-bg', 4.5],
  ['--chip-fg', '--chip-bg', 4.5],
  ['--ink', '--warn-bg', 4.5],
  ['--stale-fg', '--stale-bg', 4.5],
  ['--pend-fg', '--pend-bg', 4.5],
]

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5)
  })

  it('rejects anything that is not a hex colour', () => {
    expect(() => contrastRatio('var(--x)', '#fff')).toThrow(/hex/)
  })
})

describe('brand tokens', () => {
  it('defines the dark palette identically for the media query and [data-theme="dark"]', () => {
    expect(darkMedia).toEqual(dark)
  })

  it('defines every colour token in both modes', () => {
    const colourKeys = (t: Record<string, string>) => Object.keys(t).filter((k) => t[k]!.startsWith('#')).sort()
    expect(colourKeys(dark)).toEqual(colourKeys(light))
  })

  for (const [mode, tokens] of [['light', light], ['dark', dark]] as const) {
    describe(`${mode} mode meets WCAG AA`, () => {
      for (const [fg, bg, min] of PAIRS) {
        it(`${fg} on ${bg} ≥ ${min}:1`, () => {
          const a = tokens[fg]
          const b = tokens[bg]
          expect(a, `${fg} missing`).toBeDefined()
          expect(b, `${bg} missing`).toBeDefined()
          expect(contrastRatio(a!, b!)).toBeGreaterThanOrEqual(min)
        })
      }
    })
  }
})
