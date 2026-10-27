import { expect, test } from '@playwright/test'

// 2026-10-26: countryside pages, main cities only, drawn sweets, shorter city pages, search, phone menu, GEO files.

test('a resort’s old city page moves to its countryside page', async ({ page }) => {
  const res = await page.goto('/cities/bloudan')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveURL(/\/inside\/bloudan$/)
  await expect(page.locator('h1')).toHaveText('بلودان')
})

test('countryside page: in short, map, its sections, FAQ and sources', async ({ page }) => {
  await page.goto('/inside/bloudan')
  await expect(page.locator('.crumbs')).toContainText('ريف دمشق')
  await expect(page.locator('.short dl')).toContainText('نبع أبو زاد')
  for (const id of ['map', 'stay', 'food', 'nature', 'ruins', 'picnic', 'gallery', 'faq']) await expect(page.locator(`#${id}`)).toBeAttached()
  await expect(page.locator('#nature')).toContainText('نبع عين النسور')
  await expect(page.locator('#ruins')).toContainText('دير القديس جاورجيوس')
  // Owner decision 2026-10-27: no dashed placeholders next to real places.
  await expect(page.locator('main .slot-card')).toHaveCount(0)
  await expect(page.locator('#picnic .venue').first()).toBeVisible()
  await expect(page.locator('#stay a[href*="maps/dir"]').first()).toHaveAttribute('href', /33\.72135,36\.12424/)
  await expect(page.locator('#faq .faq').first()).toBeVisible()
  await expect(page.locator('.sources')).toContainText('syrmh.com')
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ld.some((s) => s.includes('"FAQPage"'))).toBe(true)
  expect(ld.some((s) => s.includes('"BreadcrumbList"'))).toBe(true)
  // Arabic-only section: the WebPage says so; the destination itself carries no page properties.
  const graph = ld.map((s) => JSON.parse(s) as { '@graph'?: Record<string, unknown>[] }).find((d) => d['@graph'])?.['@graph']
  expect(graph?.find((n) => n['@type'] === 'WebPage')).toMatchObject({ inLanguage: 'ar', mainEntity: { '@id': expect.stringMatching(/\/inside\/bloudan#destination$/) } })
  expect(graph?.find((n) => n['@type'] === 'TouristDestination')).not.toHaveProperty('inLanguage')
})

test('countryside page without picnic places leaves the section and its tab out', async ({ page }) => {
  await page.goto('/inside/mari')
  await expect(page.locator('#ruins')).toContainText('قصر زمري ليم')
  await expect(page.locator('#picnic')).toHaveCount(0)
  await expect(page.locator('.city-tabs a[href="#picnic"]')).toHaveCount(0)
  await expect(page.locator('main .slot-card')).toHaveCount(0)
})

test('inside: every trip opens its page', async ({ page }) => {
  await page.goto('/inside')
  await page.locator('.trip-group a.pcard', { hasText: 'بلودان' }).first().click()
  await expect(page).toHaveURL(/\/inside\/bloudan$/)
})

test('city page: countryside section, show-all, list behind a button, hotels after food', async ({ page }) => {
  await page.goto('/cities/damascus')
  await expect(page.locator('#rural a[href="/inside/bloudan"]')).toBeVisible()
  const ids = await page.locator('main section[id]').evaluateAll((els) => els.map((e) => e.id))
  expect(ids.indexOf('stay')).toBe(ids.indexOf('food') + 1)
  await expect(page.locator('.lm-list')).toHaveCount(0)
  await page.getByRole('button', { name: /عرض كقائمة/ }).click()
  await expect(page.locator('.lm-list')).toBeVisible()
  await expect(page.locator('#city-pick option[value="bloudan"]')).toHaveCount(0)
})

test('city page: Ahleen links carry UTM tags and "all stays" goes to the city on Ahleen', async ({ page }) => {
  await page.goto('/cities/damascus')
  const links = page.locator('#stay a[href*="ahleenbooking.com"]')
  expect(await links.count()).toBeGreaterThan(0)
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) {
    expect(href).toContain('utm_source=upclosesyria')
    expect(href).toContain('utm_campaign=city-damascus')
  }
})

test('city page: the drawn sweet opens on a press', async ({ page }) => {
  await page.goto('/cities/damascus')
  const art = page.locator('#sweets .swt')
  await expect(art).toHaveAttribute('aria-pressed', 'false')
  await art.click()
  await expect(art).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#sweets .said')).toHaveText('دقّ يا معلّم!')
})

test('home: search finds a countryside place', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('ابحث عن مدينة أو مكان أو أكلة').fill('بلود')
  await expect(page.locator('.site-search li a').first()).toHaveAttribute('href', '/inside/bloudan')
})

test('phone: the sections are in a menu', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('/')
  await expect(page.locator('header.top nav.main')).toBeHidden()
  await page.locator('.mnav summary').click()
  await expect(page.getByRole('navigation', { name: 'قائمة الأقسام' }).getByRole('link', { name: 'من نحن' })).toBeVisible()
  await page.close()
})

test('GEO files: llms.txt lists the guide, robots.txt welcomes AI search, the site has an icon', async ({ request }) => {
  const llms = await (await request.get('/llms.txt')).text()
  expect(llms).toContain('# سوريا عن قرب | Syria Up Close')
  expect(llms).toContain('/inside/bloudan')
  expect(llms).not.toContain('/cities/bloudan')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('User-Agent: ClaudeBot')
  expect(robots).toContain('User-Agent: GPTBot')
  expect((await request.get('/icon.svg')).ok()).toBe(true)
  expect((await request.get('/manifest.webmanifest')).ok()).toBe(true)
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/inside/bloudan')
  expect(sitemap).not.toContain('/cities/bloudan<')
})
