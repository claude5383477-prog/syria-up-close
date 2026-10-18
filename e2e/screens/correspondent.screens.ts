// Checkpoint D review: the correspondent app on a 360px phone (run with `npm run screens`).
import { expect, test } from '@playwright/test'
import { E2E } from '../env'

const OUT = 'e2e/__screenshots__/correspondent'
test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true })
test.describe.configure({ mode: 'serial' })

for (const scheme of ['light', 'dark'] as const) {
  test(`correspondent screens (${scheme})`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/correspondent/login')
    await page.screenshot({ path: `${OUT}/1-login-${scheme}.png`, fullPage: true })

    await page.getByLabel('البريد الإلكتروني').fill(E2E.uiOneCity.email)
    await page.getByLabel('كلمة السر').fill('wrong-password')
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page.locator('main').getByRole('alert')).toBeVisible()
    await page.screenshot({ path: `${OUT}/2-login-error-${scheme}.png`, fullPage: true })

    await page.getByLabel('البريد الإلكتروني').fill(E2E.uiOneCity.email) // React resets the form after an action
    await page.getByLabel('كلمة السر').fill(E2E.uiOneCity.password)
    await page.getByRole('button', { name: 'دخول' }).click()
    await expect(page).toHaveURL(/\/correspondent\/damascus$/)
    await page.screenshot({ path: `${OUT}/3-city-${scheme}.png`, fullPage: true })

    const card = page.locator('#electricity')
    await card.getByLabel('الحالة الآن').fill('٦ ساعات وصل باليوم، والقطع بالليل')
    await card.getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(page.locator('#electricity [role=status]')).toBeVisible()
    await page.locator('#electricity').screenshot({ path: `${OUT}/4-saved-${scheme}.png` })

    await page.waitForLoadState('networkidle')
    await context.setOffline(true)
    await page.locator('#events').getByLabel('الحالة الآن').fill('حفلة بالقلعة يوم الجمعة')
    await page.locator('#events').getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(page.locator('#events').getByRole('alert')).toBeVisible()
    await page.locator('#events').screenshot({ path: `${OUT}/5-offline-${scheme}.png` })
    await context.setOffline(false)

    await page.goto('/correspondent/damascus/report')
    await page.screenshot({ path: `${OUT}/6-report-${scheme}.png`, fullPage: true })
  })
}
