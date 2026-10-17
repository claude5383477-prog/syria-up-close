import { expect, test } from '@playwright/test'
import { accounts, cityId, login } from './api'

test('/inside: day trips grouped by city, the Bloudan stay card, Arabic only', async ({ page }) => {
  await page.goto('/inside')
  await expect(page.getByRole('heading', { name: 'مشاوير نهاية الأسبوع' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'من دمشق' })).toBeVisible()
  await expect(page.getByText('معلولا وصيدنايا')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'من اللاذقية' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'إقامات في بلودان' })).toBeVisible()
  await page.goto('/en/inside')
  await expect(page.getByText('This section is for people inside Syria and is in Arabic only.')).toBeVisible()
  await expect(page.locator('main [lang="ar"] h1')).toHaveText('وين نروح هالجمعة؟')
})

test.describe.serial('season reports: draft → review → publish', () => {
  let id = 0
  let slug = ''

  test('the list starts with an honest empty state', async ({ page }) => {
    await page.goto('/seasons')
    await expect(page.getByText('لا تقارير منشورة بعد')).toBeVisible()
  })

  test('a correspondent draft stays invisible to visitors', async ({ page, request }) => {
    const auth = await login(request, accounts.damascus)
    const city = await cityId(request, 'damascus')
    const res = await request.post('/api/seasonReports?draft=true', {
      headers: auth,
      data: { title: 'أول ثلج على قاسيون', city, fieldDate: '2026-12-01T00:00:00.000Z' },
    })
    expect(res.status()).toBe(201)
    ;({ id, slug } = ((await res.json()) as { doc: { id: number; slug: string } }).doc)
    expect(slug).toBe('damascus-2026-12-01')

    await page.goto('/seasons')
    await expect(page.getByText('أول ثلج على قاسيون')).toHaveCount(0)
    expect((await page.goto(`/seasons/${slug}`))?.status()).toBe(404)
  })

  test('the correspondent cannot publish it', async ({ request }) => {
    const auth = await login(request, accounts.damascus)
    const res = await request.patch(`/api/seasonReports/${id}`, { headers: auth, data: { _status: 'published' } })
    expect(res.status()).toBe(403)
  })

  test('once an editor publishes, it appears on /seasons, /inside, home and its own page', async ({ page, request }) => {
    const auth = await login(request, accounts.admin)
    const res = await request.patch(`/api/seasonReports/${id}`, { headers: auth, data: { _status: 'published' } })
    expect(res.ok()).toBe(true)

    await expect(async () => {
      await page.goto('/seasons')
      await expect(page.getByRole('link', { name: 'أول ثلج على قاسيون' })).toBeVisible({ timeout: 500 })
    }).toPass({ timeout: 5000 })
    await page.goto('/inside')
    await expect(page.getByRole('link', { name: 'أول ثلج على قاسيون' })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'أول ثلج على قاسيون' })).toBeVisible()

    await page.getByRole('link', { name: 'أول ثلج على قاسيون' }).click()
    await expect(page).toHaveURL(`/seasons/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('أول ثلج على قاسيون')
    await expect(page.getByText('كتبه: مراسل دمشق (تجريبي)')).toBeVisible()
    await expect(page.getByText('تاريخ المشاهدة:')).toBeVisible()
  })
})
