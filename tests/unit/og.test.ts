import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { OG_SIZE, renderOg } from '@/og/render'

describe('renderOg', () => {
  it('produces a 1200×630 PNG in the brand green with light text on it', async () => {
    const png = await renderOg({ kicker: 'المدن', title: 'دمشق', subtitle: 'حارات ضيقة' })
    const img = sharp(png)
    const meta = await img.metadata()
    expect(meta.format).toBe('png')
    expect({ width: meta.width, height: meta.height }).toEqual(OG_SIZE)
    const { channels } = await img.stats()
    // Mostly green (#0B4836) background, with bright text pixels present.
    expect(Math.round(channels[1]!.mean)).toBeGreaterThan(60)
    expect(channels[0]!.max).toBeGreaterThan(200)
  })
})
