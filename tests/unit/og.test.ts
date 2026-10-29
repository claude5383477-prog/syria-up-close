import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { OG_SIZE, renderOg } from '@/og/render'

describe('renderOg', () => {
  it('produces a 1200×630 PNG on the light paper with green text on it', async () => {
    const png = await renderOg({ kicker: 'المدن', title: 'دمشق', subtitle: 'حارات ضيقة' })
    const img = sharp(png)
    const meta = await img.metadata()
    expect(meta.format).toBe('png')
    expect({ width: meta.width, height: meta.height }).toEqual(OG_SIZE)
    const { channels } = await img.stats()
    // Mostly paper (#FBF8F2) background, with dark green text pixels present.
    expect(Math.round(channels[0]!.mean)).toBeGreaterThan(200)
    expect(channels[0]!.min).toBeLessThan(40)
    // Renders on one libvips thread by design (src/og/render.ts); under coverage load that takes
    // longer than vitest's default 5s. The assertions are unchanged.
  }, 20_000)
})
