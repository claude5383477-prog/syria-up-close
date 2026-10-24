import { expect, test } from '@playwright/test'

test('Arabic is served at / as rtl, English at /en as ltr', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.goto('/en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('explicit /ar URLs redirect permanently to the unprefixed form', async ({ request }) => {
  const res = await request.get('/ar/inside', { maxRedirects: 0 })
  expect(res.status()).toBe(308)
  expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe('/inside')
})

test('language toggle goes to the same page in the other language', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/en$/)
  await page.getByRole('link', { name: 'عربي' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('nav marks the current section', async ({ page }) => {
  await page.goto('/inside')
  await expect(page.getByRole('navigation').getByRole('link', { name: 'جوّا سوريا' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation').getByRole('link', { name: 'الرئيسية' })).not.toHaveAttribute('aria-current', 'page')
})

test.describe('server HTML with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('prerendered pages carry the right nav highlight and language link', async ({ page }) => {
    await page.goto('/cities/damascus')
    await expect(page.locator('nav.main a[aria-current="page"]')).toHaveText('المدن')
    await expect(page.locator('a.lang')).toHaveAttribute('href', '/en/cities/damascus')
    await page.goto('/')
    await expect(page.locator('nav.main a[aria-current="page"]')).toHaveText('الرئيسية')
    await expect(page.locator('a.lang')).toHaveAttribute('href', '/en')
    await page.goto('/en/about')
    await expect(page.locator('nav.main a[aria-current="page"]')).toHaveText('About')
    await expect(page.locator('a.lang')).toHaveAttribute('href', '/about')
  })
})

test('Arabic-only section under /en: English notice, Arabic content, toggle disabled', async ({ page }) => {
  await page.goto('/en/inside')
  await expect(page.getByText('This section is for people inside Syria and is in Arabic only.')).toBeVisible()
  await expect(page.locator('main [lang="ar"][dir="rtl"] h1')).toHaveText('جوّا سوريا')
  await expect(page.locator('.lang')).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('link', { name: 'عربي' })).toHaveCount(0)
})

test('Arabic-only section in Arabic shows no notice', async ({ page }) => {
  await page.goto('/inside')
  await expect(page.getByText('Arabic only')).toHaveCount(0)
})

test('footer states independence and links the partner with its logo', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  await expect(footer).toContainText('لسنا جهة رسمية')
  await expect(footer).toContainText('بالشراكة مع أهلين')
  const partner = footer.locator('a[href*="ahleen"]')
  await expect(partner).toHaveCount(1)
  await expect(partner).toHaveAttribute('href', 'https://ahleenbooking.com')
  await expect(partner).toHaveAttribute('target', '_blank')
  await expect(partner.locator('img')).toHaveAttribute('src', /ahleen-cream\.svg/)
})
