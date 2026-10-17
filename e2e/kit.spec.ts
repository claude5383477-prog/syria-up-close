import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const LOCALES = [
  ['ar', '/kit'],
  ['en', '/en/kit'],
] as const
const SCHEMES = ['light', 'dark'] as const
const WIDTHS = [
  [360, 800],
  [1280, 900],
] as const

for (const [locale, path] of LOCALES) {
  for (const scheme of SCHEMES) {
    test.describe(`${locale} · ${scheme}`, () => {
      test.use({ colorScheme: scheme })

      for (const [width, height] of WIDTHS) {
        test(`screenshot @${width}`, async ({ page }) => {
          await page.setViewportSize({ width, height })
          await page.goto(path)
          await page.evaluate(() => document.fonts.ready)
          await expect(page.locator('.stamp')).toHaveCount(3)
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
          expect(scrollWidth, 'no horizontal scroll').toBeLessThanOrEqual(width)
          await page.screenshot({ path: `e2e/__screenshots__/kit/kit-${locale}-${scheme}-${width}.png`, fullPage: true })
        })
      }

      test('no serious or critical axe violations', async ({ page }) => {
        await page.goto(path)
        const { violations } = await new AxeBuilder({ page }).analyze()
        const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      })
    })
  }
}

test('the three stamp states render with their own styles', async ({ page }) => {
  await page.goto('/kit')
  await expect(page.locator('.stamp:not(.stale):not(.pending)')).toContainText('آخر تحديث')
  await expect(page.locator('.stamp.stale')).toContainText('قد تكون قديمة')
  await expect(page.locator('.stamp.pending')).toHaveText('بانتظار أول تحقق')
  const border = await page.locator('.stamp.pending').evaluate((el) => getComputedStyle(el).borderStyle)
  expect(border).toBe('dashed')
})
