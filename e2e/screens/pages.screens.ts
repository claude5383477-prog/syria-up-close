// Checkpoint review screenshots: every public page next to the matching prototype route.
// Run with `npm run screens` (own Playwright config; not part of the regular e2e suite).
import { test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const PROTOTYPE = pathToFileURL(resolve('docs/source/syria-up-close.html')).href
const PAGES: [name: string, path: string, protoHash: string][] = [
  ['home', '/', 'home'],
  ['inside', '/inside', 'inside'],
  ['outside', '/outside', 'outside'],
  ['first-visit', '/outside/first-visit', 'first-visit'],
  ['cities', '/cities', 'cities'],
  ['damascus', '/cities/damascus', 'damascus'],
  ['bloudan', '/cities/bloudan', 'bloudan'],
  ['seasons', '/seasons', 'seasons'],
  ['about', '/about', 'about'],
]
const OUT = 'e2e/__screenshots__'

for (const [name, path, hash] of PAGES) {
  for (const locale of ['ar', 'en'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const width of [360, 1280]) {
        const id = `${name}-${locale}-${scheme}-${width}`
        test(id, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.emulateMedia({ colorScheme: scheme })

          await page.goto(locale === 'ar' ? path : path === '/' ? '/en' : `/en${path}`)
          await page.evaluate(() => document.fonts.ready)
          await page.screenshot({ path: `${OUT}/pages/${id}.png`, fullPage: true })

          await page.addInitScript((l) => localStorage.setItem('suc-lang', l), locale)
          await page.goto(`${PROTOTYPE}#${hash}`)
          await page.evaluate(() => document.fonts.ready)
          await page.screenshot({ path: `${OUT}/prototype/${id}.png`, fullPage: true })
        })
      }
    }
  }
}
