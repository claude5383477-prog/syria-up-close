import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { AUTH_FILE } from './global-setup'
import { accounts, cityId, login } from './api'

// Batch 4 (2026-10-29): light identity, restaurant classes, tour guides and booking, "عدسات".

const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

test.describe('light identity', () => {
  test('white header, sand footer, light map; nothing scrolls sideways at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    for (const path of ['/', '/cities/damascus', '/guides', '/videos', '/en/guides']) {
      await page.goto(path)
      await noSideScroll(page)
    }
    await page.goto('/')
    const bg = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await bg('header.top')).toBe('rgb(255, 255, 255)')
    expect(await bg('footer.site')).toBe('rgb(241, 232, 217)')
    expect(await bg('.citymap .board')).toBe('rgb(255, 255, 255)')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#FFFFFF')
  })

  test('the map lens still glides to a city and the logo still turns', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const lens = page.locator('.citymap .cm-lens')
    const before = await lens.getAttribute('style')
    await page.locator('.citymap .cname', { hasText: 'حلب' }).click()
    await expect(page.locator('.citymap .cname', { hasText: 'حلب' })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => lens.getAttribute('style')).not.toBe(before)
    await expect(page.locator('.citymap .cname[aria-pressed="true"]')).toHaveCSS('color', 'rgb(255, 255, 255)')
    expect(await page.locator('header .lens-mark .ticks').first().evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none')
  })
})

test('restaurants: two classes, their sections with counts, dashed cards for empty sections', async ({ page }) => {
  await page.goto('/cities/damascus')
  const food = page.locator('#food')
  const tourist = food.getByRole('button', { name: /مطاعم سياحية/ })
  const popular = food.getByRole('button', { name: /مطاعم مشهورة وشعبية/ })
  await expect(tourist).toHaveAttribute('aria-pressed', 'true')
  await expect(food.getByRole('button', { name: /^كافيهات/ })).toBeVisible()
  await popular.click()
  await expect(popular).toHaveAttribute('aria-pressed', 'true')
  await expect(food.getByRole('button', { name: /^كافيهات/ })).toHaveCount(0)
  await food.getByRole('button', { name: /^شاورما/ }).click()
  // Cards of the other class and sections stay in the HTML, hidden (SEO day 5): count what shows.
  const shown = food.locator('.venue.slot-card:visible')
  await expect(shown.getByText('شاورما: مكان مشهور في دمشق')).toBeVisible()
  await expect(shown).toHaveCount(1)
  await expect(page.locator('.city-tabs a[href="#guides"]')).toHaveText('أدلاء دمشق')
})

test.describe.serial('tour guides and booking', () => {
  let slug = ''
  test('a published guide shows on /guides, its city page, and filters by language', async ({ page, request }) => {
    const auth = login(accounts.admin)
    const city = await cityId(request, 'damascus')
    slug = `e2e-guide-${Date.now()}`
    for (const [s, langs] of [[slug, ['ar', 'en']], [`${slug}-fr`, ['ar', 'fr']]] as const) {
      const res = await request.post('/api/guides?locale=ar', {
        headers: auth,
        data: { name: `دليل ${s}`, slug: s, city, languages: langs, trips: [{ title: 'المدينة القديمة', duration: '3 ساعات' }], verifiedAt: '2026-10-26T00:00:00.000Z', _status: 'published' },
      })
      expect(res.status()).toBe(201)
    }
    await expect(async () => {
      await page.goto('/guides')
      await expect(page.locator('.gcard').filter({ hasText: slug })).toHaveCount(2, { timeout: 500 })
    }).toPass({ timeout: 8000 })
    const before = await page.locator('.gcard').count()
    await page.getByLabel('اللغة').selectOption('fr')
    await expect(page.locator('.gcard')).toHaveCount(1)
    await page.getByLabel('اللغة').selectOption('')
    await expect(page.locator('.gcard')).toHaveCount(before)
    await page.goto('/cities/damascus')
    await expect(page.locator('#guides .gcard').filter({ hasText: slug }).first()).toBeVisible()
  })

  test('a visitor books; the request shows in the control panel', async ({ page, context, request }) => {
    await page.goto(`/guides/${slug}`)
    await expect(page.getByText('تحقّق منه الفريق').first()).toBeVisible()
    await page.getByLabel('التاريخ').fill(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10))
    await page.getByLabel('عدد الأشخاص').fill('3')
    await page.getByLabel('لغة الجولة').selectOption('en')
    await page.getByLabel('اسمك').fill('زائر الاختبار')
    await page.getByLabel('الإيميل').fill('visitor@e2e.test')
    // Without consent the form refuses.
    await page.getByRole('button', { name: 'ابعت طلب الحجز' }).click()
    await expect(page.getByText('لازم توافق على مشاركة بياناتك')).toBeVisible()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'ابعت طلب الحجز' }).click()
    await expect(page.getByRole('status')).toContainText('وصلنا طلبك')
    const code = (await page.locator('.done .code').innerText()).trim()
    expect(code).toMatch(/^SUC-\d{4}$/)

    // Not readable by visitors.
    expect((await request.get('/api/bookings')).status()).toBe(403)
    const tokens = JSON.parse(readFileSync(AUTH_FILE, 'utf8')) as Record<string, string>
    await context.addCookies([{ name: 'payload-token', value: tokens.admin!, domain: 'localhost', path: '/' }])
    await page.goto('/admin/collections/bookings')
    await expect(page.getByRole('heading', { name: 'حجوزات الأدلاء' })).toBeVisible({ timeout: 20_000 })
    await page.locator('.suc-table tr', { hasText: code }).click()
    await expect(page.getByRole('dialog', { name: `تفاصيل الطلب ${code}` })).toContainText('visitor@e2e.test')
  })

  test('notification e-mails: add one, then remove it', async ({ page, context }) => {
    const tokens = JSON.parse(readFileSync(AUTH_FILE, 'utf8')) as Record<string, string>
    await context.addCookies([{ name: 'payload-token', value: tokens.admin!, domain: 'localhost', path: '/' }])
    await page.goto('/admin/globals/notificationSettings')
    // The admin follows the browser language (Arabic or English labels).
    await page.getByRole('button', { name: /أضف إيميل|Add E-mail/ }).click()
    await page.locator('#field-emails__0__email').fill('team@e2e.test')
    await page.getByRole('button', { name: /^(حفظ|Save)$/ }).click()
    await expect(page.locator('#field-emails__0__email')).toHaveValue('team@e2e.test')
    await page.reload()
    await expect(page.locator('#field-emails__0__email')).toHaveValue('team@e2e.test')
    await page.locator('.array-actions__button').first().click()
    await page.locator('.array-actions__remove').first().click()
    await page.getByRole('button', { name: /^(حفظ|Save)$/ }).click()
    await expect(page.getByText(/تم التحديث|updated successfully/i).first()).toBeVisible()
    await page.reload()
    await expect(page.locator('#field-emails__0__email')).toHaveCount(0)
  })
})

test.describe.serial('عدسات', () => {
  test('tabs by platform, the player loads only on play, share copies the link', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const auth = login(accounts.admin)
    const city = await cityId(request, 'damascus')
    for (const [url, title] of [
      ['https://youtu.be/dQw4w9WgXcQ', 'مقطع يوتيوب للاختبار'],
      ['https://www.tiktok.com/@e2e/video/7312345678901234567', 'مقطع تيك توك للاختبار'],
    ]) {
      const res = await request.post('/api/videos?locale=ar', { headers: auth, data: { url, title, author: 'صانع الاختبار', city, duration: '0:41', _status: 'published' } })
      expect(res.status()).toBe(201)
    }
    await expect(async () => {
      await page.goto('/videos')
      await expect(page.locator('.vcard')).toHaveCount(2, { timeout: 500 })
    }).toPass({ timeout: 8000 })
    await expect(page.locator('iframe')).toHaveCount(0)
    // Only the video pages allow the players as frame sources; the anti-framing rule stays everywhere.
    const csp = async (path: string) => (await request.get(path)).headers()['content-security-policy']
    expect(await csp('/videos')).toContain("frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com")
    expect(await csp('/videos')).toContain("frame-ancestors 'self'")
    expect(await csp('/about')).toBe("frame-ancestors 'self'")
    await page.getByRole('button', { name: /^تيك توك/ }).click()
    await expect(page.locator('.vcard')).toHaveCount(1)
    await page.getByRole('button', { name: 'شغّل: مقطع تيك توك للاختبار' }).click()
    await expect(page.locator('dialog.player iframe')).toHaveAttribute('src', /^https:\/\/www\.tiktok\.com\/player\/v1\/7312345678901234567/)
    await expect(page.locator('dialog.player')).toContainText('صانع الاختبار')
    await page.locator('dialog.player').getByRole('button', { name: /شارك/ }).click()
    await expect(page.getByRole('status').filter({ hasText: 'انسخ رابط المقطع' })).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toMatch(/\/videos#v-\d+$/)
    await page.locator('dialog.player').getByRole('button', { name: 'إغلاق' }).click()
    await expect(page.locator('iframe')).toHaveCount(0)
    // The shared link opens that video directly.
    await page.goto(new URL(copied).pathname + new URL(copied).hash)
    await expect(page.locator('dialog.player iframe')).toHaveCount(1)
  })
})
