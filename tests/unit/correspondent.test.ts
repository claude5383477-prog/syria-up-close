import { describe, expect, it } from 'vitest'
import { MESSAGES, errorCode, field, fitWithin, formatBytes, homeFor, messageFor, textToLexical } from '@/correspondent/logic'

describe('fitWithin / formatBytes', () => {
  it('scales the longest edge down to 2000px, keeps aspect, never upscales', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1500, height: 2000 })
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 })
    expect(fitWithin(4032, 3024, 1000)).toEqual({ width: 1000, height: 750 })
  })

  it('formats sizes in Arabic units', () => {
    expect(formatBytes(1536 * 1024)).toBe('1.5 م.ب')
    expect(formatBytes(640 * 1024)).toBe('640 ك.ب')
    expect(formatBytes(10)).toBe('1 ك.ب')
  })
})

describe('textToLexical', () => {
  it('makes one rtl paragraph per non-empty line', () => {
    const out = textToLexical('أول سطر\n\n  ثاني سطر  \r\n')
    expect(out.root.children.map((p) => p.children[0]!.text)).toEqual(['أول سطر', 'ثاني سطر'])
    expect(out.root.children[0]!.direction).toBe('rtl')
    expect(textToLexical('   ').root.children).toEqual([])
  })
})

describe('field', () => {
  it('reads trimmed strings and ignores files or missing fields', () => {
    const f = new FormData()
    f.set('a', '  نص  ')
    f.set('file', new Blob(['x']), 'x.png')
    expect(field(f, 'a')).toBe('نص')
    expect(field(f, 'file')).toBe('')
    expect(field(f, 'missing')).toBe('')
  })
})

describe('errorCode (Payload/Next errors → stable codes)', () => {
  // Production builds minify class names (error.name becomes "A"), so only status and shape count.
  it('maps 401 to wrong credentials and 403/404 to permission', () => {
    expect(errorCode({ name: 'A', status: 401 })).toBe('auth')
    expect(errorCode({ status: 403 })).toBe('forbidden')
    expect(errorCode({ status: 404 })).toBe('forbidden')
  })

  it('maps 400 validation errors, keeping the https case specific', () => {
    expect(errorCode({ status: 400, data: { errors: [{ path: 'sourceUrl', message: 'يجب أن يبدأ الرابط بـ https://' }] } })).toBe('https')
    expect(errorCode({ status: 400, data: { errors: [{ path: 'value', message: 'x' }] } })).toBe('invalid')
  })

  it('maps other 400s (upload problems) to file', () => {
    expect(errorCode({ status: 400 })).toBe('file')
  })

  it('falls back to unknown', () => {
    expect(errorCode(new Error('boom'))).toBe('unknown')
    expect(errorCode({ status: 500 })).toBe('unknown')
    expect(errorCode(null)).toBe('unknown')
  })
})
describe('messageFor', () => {
  it('has a clear Arabic message for every code, and ignores unknown codes from the URL', () => {
    for (const code of Object.keys(MESSAGES)) expect(messageFor(code)).toMatch(/[؀-ۿ]/)
    expect(messageFor('auth')).toBe(MESSAGES.auth)
    expect(messageFor('<script>')).toBeNull()
    expect(messageFor(undefined)).toBeNull()
  })
})

describe('homeFor (where a signed-in user lands)', () => {
  const cities = [
    { id: 1, slug: 'damascus' },
    { id: 2, slug: 'aleppo' },
  ]
  it('staff go to the full admin', () => {
    expect(homeFor({ role: 'editor', assignedCities: [] })).toEqual({ kind: 'admin' })
    expect(homeFor({ role: 'admin', assignedCities: cities })).toEqual({ kind: 'admin' })
  })

  it('a correspondent with one city goes straight to it; several get a picker; none get an explanation', () => {
    expect(homeFor({ role: 'correspondent', assignedCities: [cities[0]!] })).toEqual({ kind: 'city', slug: 'damascus' })
    expect(homeFor({ role: 'correspondent', assignedCities: cities })).toEqual({ kind: 'pick', cities })
    expect(homeFor({ role: 'correspondent', assignedCities: [] })).toEqual({ kind: 'none' })
    expect(homeFor({ role: 'correspondent', assignedCities: [3] })).toEqual({ kind: 'none' })
  })
})
