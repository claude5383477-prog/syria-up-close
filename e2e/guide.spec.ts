import { expect, test } from '@playwright/test'

// The 2026-10 redesign: 3D map, city architecture themes, lore, hotels, planner, blog, about.

test('home: the map has a pin per city and the card follows the chosen city', async ({ page }) => {
  await page.goto('/')
  const map = page.getByRole('group', { name: 'خريطة المدن' })
  await expect(map.locator('.pin')).toHaveCount(await page.locator('.map3d .pin').count())
  expect(await map.locator('.pin').count()).toBeGreaterThanOrEqual(4)
  await map.getByRole('button', { name: 'حلب' }).click()
  await expect(map.locator('.card3 b')).toHaveText('حلب')
  await expect(map.getByRole('link', { name: /افتح صفحة المدينة/ })).toHaveAttribute('href', '/cities/aleppo')
})

test('home: the hungry section links to city restaurants and credits the photo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'مطاعم المدن ←' })).toHaveAttribute('href', '/cities/damascus#food')
  await expect(page.getByRole('link', { name: /CC BY-SA 4.0/ })).toHaveAttribute('href', /commons\.wikimedia\.org/)
})

test('city page: architecture theme, lore tabs, food and hotels sections', async ({ page }) => {
  await page.goto('/cities/damascus')
  await expect(page.locator('#arch h2')).toHaveText('الأبلق الدمشقي')
  await expect(page.locator('rect[fill="url(#pat-ablaq)"]').first()).toBeAttached()
  for (const id of ['status', 'arch', 'sights', 'secrets', 'food', 'parks', 'gallery', 'stay']) await expect(page.locator(`#${id}`)).toBeAttached()
  await page.getByRole('button', { name: 'أمثال' }).click()
  await expect(page.locator('#secrets')).toContainText('لا أمثال منشورة بعد')
  await page.goto('/cities/latakia')
  await expect(page.locator('#arch h2')).toHaveText('أبجدية أوغاريت')
  await page.goto('/en/cities/latakia')
  await expect(page.locator('#arch h2')).toHaveText('The Ugarit alphabet')
  await expect(page.locator('#secrets').getByRole('link', { name: 'Read them on the Arabic page' })).toHaveAttribute('href', '/cities/latakia#secrets')
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
  await expect(plan).toContainText('خطتك: 5 أيام')
  await page.getByRole('button', { name: '10 أيام' }).click()
  await expect(plan).toContainText('خطتك: 10 أيام')
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
