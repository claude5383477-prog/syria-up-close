import { expect, test } from '@playwright/test'

// The 2026-10 redesign: the names map, city architecture themes, lore, hotels, planner, blog, about.

test('home: the map names the main cities only, and the card follows the choice', async ({ page }) => {
  await page.goto('/')
  const map = page.getByRole('group', { name: 'خريطة المدن' })
  expect(await map.locator('.cname').count()).toBeGreaterThanOrEqual(3)
  // Resorts moved to their city's countryside (2026-10-26): no resort chips, no resort names on the map.
  await expect(map.getByRole('group', { name: 'المصايف' })).toHaveCount(0)
  await expect(map.getByRole('button', { name: 'بلودان' })).toHaveCount(0)
  await map.getByRole('button', { name: 'حلب' }).click()
  await expect(map.locator('.card3 b')).toHaveText('حلب')
  await expect(map.getByRole('link', { name: /افتح صفحة المدينة/ })).toHaveAttribute('href', '/cities/aleppo')
})

test('home: the hungry section links to city restaurants and the spit makes a sandwich', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'مطاعم المدن ←' })).toHaveAttribute('href', '/cities/damascus#food')
  await page.getByRole('button', { name: 'اضغط لتحضير سندويشة شاورما' }).click()
  await expect(page.getByText('صحتين وعافية!')).toBeVisible()
  await expect(page.locator('.ctile').first()).toBeVisible()
})

test('city page: architecture theme, lore tabs, food and hotels sections', async ({ page }) => {
  await page.goto('/cities/damascus')
  await expect(page.locator('#arch h2')).toHaveText('الأبلق الدمشقي')
  await expect(page.locator('rect[fill="url(#pat-ablaq)"]').first()).toBeAttached()
  for (const id of ['map', 'food', 'sweets', 'status', 'arch', 'sights', 'secrets', 'parks', 'gallery', 'stay']) await expect(page.locator(`#${id}`)).toBeAttached()
  await page.getByRole('button', { name: 'أمثال' }).click()
  await expect(page.locator('#secrets')).toContainText('جارك القريب ولا أخوك البعيد')
  await page.goto('/cities/latakia')
  await expect(page.locator('#arch h2')).toHaveText('أبجدية أوغاريت')
  await page.goto('/en/cities/latakia')
  await expect(page.locator('#arch h2')).toHaveText('The Ugarit alphabet')
  await expect(page.locator('#secrets').getByRole('link', { name: 'Read them on the Arabic page' })).toHaveAttribute('href', '/cities/latakia#secrets')
})

test('city page: the live map filters places and every place links to its location', async ({ page }) => {
  await page.goto('/cities/damascus')
  const map = page.locator('#map')
  // The list sits behind a button since 2026-10-26 (it repeated every place under the map).
  await map.getByRole('button', { name: /عرض كقائمة/ }).click()
  const all = await map.locator('.lm-list li').count()
  expect(all).toBeGreaterThan(5)
  await map.getByRole('button', { name: /^كافيهات/ }).click()
  await expect.poll(() => map.locator('.lm-list li').count()).toBeLessThan(all)
  expect(await map.locator('.lm-list li').count()).toBeGreaterThan(0)
  await map.locator('.lm-list li button').first().click()
  await expect(map.locator('.lm-card .go')).toHaveAttribute('href', /google\.com\/maps/)
  await expect(page.locator('#sweets h2')).toHaveText('حلويات دمشق')
  await expect(page.locator('#sweets')).toContainText('البوظة العربية المدقوقة')
  const where = page.locator('#food .where').first()
  await expect(where).toHaveAttribute('href', /google\.com\/maps/)
  await expect(page.locator('#sights .where').first()).toHaveAttribute('href', /google\.com\/maps/)
})

test('city page: only hotels on Ahleen get a booking link', async ({ page }) => {
  await page.goto('/cities/damascus')
  const stay = page.locator('#stay')
  const linked = await stay.locator('.hotel:not(.off) a[href*="ahleen"]').count()
  expect(await stay.locator('.hotel:not(.off)').count()).toBe(linked)
  expect(await stay.locator('.hotel.off a').count()).toBe(0)
})

test('outside: the planner reacts, and the hotels section books through Ahleen', async ({ page }) => {
  await page.goto('/outside')
  const plan = page.locator('.plan')
  await expect(plan).toContainText('خطتك: 7 أيام')
  await expect(plan.locator('.day-card')).toHaveCount(7)
  await page.getByRole('button', { name: '10 أيام' }).click()
  await expect(plan).toContainText('خطتك: 10 أيام')
  await expect(plan.locator('.day-card')).toHaveCount(10)
  await page.getByRole('button', { name: 'أخرى' }).click()
  await page.getByLabel('كم يوم بالضبط؟').fill('12')
  await expect(plan.locator('.day-card')).toHaveCount(12)
  await expect(plan).toContainText('المجموع: 12 يوماً')
  await page.getByRole('group', { name: 'المدن (اختياري)' }).getByRole('button', { name: 'حلب' }).click()
  await expect(plan.locator('.day-card').first()).toContainText('حلب')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'نزّل الخطة PDF' }).click()])
  const file = await download.path()
  const { readFileSync, copyFileSync } = await import('node:fs')
  const pdf = readFileSync(file)
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdf.toString('latin1')).toContain('ahleenbooking.com')
  if (process.env.PLAN_PDF_OUT) copyFileSync(file, process.env.PLAN_PDF_OUT)
  await expect(page.locator('#hotels h2')).toHaveText('احجز فندقك عن طريق أهلين')
  await expect(page.locator('#hotels').getByRole('link', { name: /كل الفنادق على ahleenbooking.com/ })).toBeVisible()
})

test('inside: trips can be filtered by city', async ({ page }) => {
  await page.goto('/inside')
  const groups = page.locator('.trip-group')
  const all = await groups.count()
  expect(all).toBeGreaterThan(1)
  await page.getByRole('group', { name: 'اختر المدينة' }).getByRole('button', { name: 'دمشق' }).click()
  await expect(groups).toHaveCount(1)
  await expect(groups.first()).toContainText('من دمشق')
})

test('blog lists season reports and is in the navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'الأقسام' }).getByRole('link', { name: 'المدونة' }).click()
  await expect(page).toHaveURL(/\/blog$/)
  await expect(page.locator('h1')).toHaveText('قصص من الأرض.')
})

test('about: flip a promise, raise a step, clean the tile with soap', async ({ page }) => {
  await page.goto('/about')
  const card = page.getByRole('button', { name: /مستقلون/ })
  await card.click()
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'صابونة غار: اضغط لصنع رغوة' }).click()
  await expect(page.getByText('رغوة جاهزة، امسح البلاطة')).toBeVisible()
  const tile = page.getByRole('img', { name: 'بلاطة متسخة تُنظَّف بالرغوة' })
  const box = (await tile.boundingBox())!
  for (let i = 0; i < 150; i++) await page.mouse.move(box.x + 20 + ((i * 13) % (box.width - 40)), box.y + 20 + ((i * 7) % (box.height - 40)))
  await expect(page.getByText(/النظافة \d+%/)).not.toHaveText('النظافة 0%')
})
