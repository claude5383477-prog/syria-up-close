import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Every public page, both languages (SPEC §1 content rules + §7 accessibility).
const PAGES = ['/', '/inside', '/outside', '/outside/first-visit', '/cities', '/cities/damascus', '/inside/bloudan', '/seasons', '/blog', '/about']
const ALL = PAGES.flatMap((p) => [p, p === '/' ? '/en' : `/en${p}`])

// ق5: booking links to the partner only where readers need a stay (city pages, inside, outside);
// the footer names and links the partner on every page (owner decision 2026-10-23).
const PARTNER_ALLOWED = /^(\/en)?\/(cities\/[^/]+|inside(\/[^/]+)?|outside)$/

for (const path of ALL) {
  test.describe(path, () => {
    test('content rules ق1 and ق5', async ({ page }) => {
      await page.goto(path)
      const partnerLinks = await page.locator('main a[href*="ahleen"]').count()
      await expect(page.locator('footer a[href*="ahleen"]')).toHaveCount(1)
      if (PARTNER_ALLOWED.test(path)) {
        expect(partnerLinks, 'stay card expected').toBeGreaterThan(0)
        await expect(page.locator('.disclose').first()).toBeVisible()
      } else {
        expect(partnerLinks, 'no partner booking links on this page').toBe(0)
      }
      // ق1: independence stated in the footer; never presented as an official source.
      await expect(page.locator('footer')).toContainText(path.startsWith('/en') ? 'not an official body' : 'لسنا جهة رسمية')
      const body = (await page.locator('main').innerText()).toLowerCase()
      for (const phrase of ['الموقع الرسمي', 'الدليل الرسمي', 'official site', 'official guide']) expect(body).not.toContain(phrase)
    })

    for (const scheme of ['light', 'dark'] as const) {
      test(`no serious or critical accessibility violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto(path)
        const { violations } = await new AxeBuilder({ page }).analyze()
        const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      })
    }
  })
}
