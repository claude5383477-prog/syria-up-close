import { expect, test } from '@playwright/test'
import { accounts, cityId, login, sql } from './api'

test('the cities list shows the four seeded cities in both languages', async ({ page }) => {
  await page.goto('/cities')
  for (const name of ['دمشق', 'حلب', 'اللاذقية', 'بلودان']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await page.goto('/en/cities')
  for (const name of ['Damascus', 'Aleppo', 'Latakia', 'Bloudan']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
})

test('a city page has the prototype sections and text', async ({ page }) => {
  await page.goto('/cities/damascus')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('دمشق')
  await expect(page.getByText('حارات ضيقة وأبواب خشب وأسواق مسقوفة.', { exact: false })).toBeVisible()
  for (const h of ['حال البلد اليوم', 'ماذا ترى', 'ماذا تأكل', 'مشي معنا']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'الجامع الأموي' })).toBeVisible()
  await expect(page.getByText('فتة حمص بالسمن')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'إقامات في دمشق' })).toBeVisible()
  await expect(page.getByText('أهلين شريك هذا الدليل.')).toBeVisible()
})

test('unknown city slugs are 404', async ({ page }) => {
  const res = await page.goto('/cities/atlantis')
  expect(res?.status()).toBe(404)
})

test.describe.serial('status board', () => {
  test('a fresh database shows five "awaiting first check" rows and nothing invented', async ({ page }) => {
    await page.goto('/cities/aleppo')
    const board = page.getByTestId('status-board')
    await expect(board.locator('.stamp.pending')).toHaveCount(5)
    await expect(board.getByText('ينشر مراسل حلب الحالة هنا')).toHaveCount(5)
  })

  test('a correspondent update appears on the city page within 5 seconds, signed and dated', async ({ page, request }) => {
    const auth = login(accounts.damascus)
    const city = await cityId(request, 'damascus')
    await page.goto('/cities/damascus') // warm the cache first, so this proves on-publish revalidation

    const res = await request.post('/api/statusItems', { headers: auth, data: { city, type: 'internet', value: '4G بطيء بالمسا' } })
    expect(res.status()).toBe(201)

    const started = Date.now()
    await expect(async () => {
      await page.reload()
      await expect(page.locator('[data-status="internet"]')).toContainText('4G بطيء بالمسا', { timeout: 500 })
    }).toPass({ timeout: 5000 })
    expect(Date.now() - started).toBeLessThan(5000)

    const row = page.locator('[data-status="internet"]')
    // The public display name, never the correspondent's real name (src/seed/seed.ts: 'مراسل دمشق (تجريبي)').
    await expect(row).toContainText('مراسل سوريا عن قرب في دمشق')
    await expect(row).not.toContainText('مراسل دمشق (تجريبي)')
    await expect(row.locator('.stamp')).not.toHaveClass(/pending|stale/)
    await expect(row.locator('.stamp')).toContainText('آخر تحديث')
  })

  test('an item verified more than 7 days ago is marked "may be out of date"', async ({ page, request }) => {
    const auth = login(accounts.damascus)
    const city = await cityId(request, 'damascus')
    const res = await request.post('/api/statusItems', { headers: auth, data: { city, type: 'roads', value: 'سالكة' } })
    const { doc } = (await res.json()) as { doc: { id: number } }
    await sql(`update status_items set verified_at = now() - interval '8 days' where id = $1`, [doc.id])
    // The SQL write bypasses hooks, so touch another public document to revalidate the site.
    await request.post('/api/statusItems', { headers: auth, data: { city, type: 'weather', value: 'مشمس' } })

    await expect(async () => {
      await page.goto('/cities/damascus')
      await expect(page.locator('[data-status="roads"] .stamp')).toHaveClass(/stale/, { timeout: 500 })
    }).toPass({ timeout: 5000 })
    await expect(page.locator('[data-status="roads"] .stamp')).toContainText('قد تكون قديمة')
  })

  test('the Damascus correspondent cannot post for Aleppo', async ({ request }) => {
    const auth = login(accounts.damascus)
    const aleppo = await cityId(request, 'aleppo')
    const res = await request.post('/api/statusItems', { headers: auth, data: { city: aleppo, type: 'internet', value: 'x' } })
    expect(res.status()).toBe(403)
  })
})

test('English city page uses English text and labels', async ({ page }) => {
  await page.goto('/en/cities/latakia')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latakia')
  await expect(page.getByRole('heading', { name: 'Status today' })).toBeVisible()
  await expect(page.getByText('Grilled fish, sayadieh')).toBeVisible()
  await expect(page.locator('main [lang="ar"]')).toHaveCount(0)
})
