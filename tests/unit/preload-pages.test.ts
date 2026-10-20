import { describe, expect, it } from 'vitest'
import { PUBLIC_PAGES, preloadPublicPages } from '@/lib/preload-pages'

const run = async (exists: (p: string) => boolean, fail?: string) => {
  const loaded: string[] = []
  const lines: string[] = []
  await preloadPublicPages({
    root: '/var/task',
    exists,
    load: (p) => {
      if (fail && p.includes(fail)) throw new Error('boom')
      loaded.push(p)
    },
    log: (l) => lines.push(l),
    defer: (fn) => fn(),
  })
  return { loaded, lines }
}

describe('preloadPublicPages (instrumentation, criterion 3)', () => {
  it('loads every public page module from the build, the city page first', async () => {
    const { loaded, lines } = await run(() => true)
    expect(loaded).toHaveLength(PUBLIC_PAGES.length)
    expect(loaded[0]?.replaceAll('\\', '/')).toMatch(/\/\.next\/server\/app\/\(frontend\)\/\[locale\]\/cities\/\[slug\]\/page\.js$/)
    expect(lines.every((l) => /^\[timing\] preload /.test(l))).toBe(true)
  })

  it('skips a page that is not in the build, and keeps going after one that fails to load', async () => {
    const { loaded, lines } = await run((p) => !p.includes('seasons'), 'about')
    expect(loaded.some((p) => p.includes('seasons') || p.includes('about'))).toBe(false)
    expect(loaded.length).toBe(PUBLIC_PAGES.filter((p) => !p.includes('seasons') && !p.includes('about')).length)
    expect(lines.some((l) => l.includes('missing'))).toBe(true)
    expect(lines.some((l) => l.includes('failed'))).toBe(true)
  })
})
