import { expect, test } from '@playwright/test'
import { accounts, login } from './api'

test('home: hero question with both paths, and the four cities', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سوريا كما هي اليوم، عن قرب.')
  await expect(page.getByText('أنت جوّا سوريا أو جاي من برّا؟')).toBeVisible()
  await expect(page.getByRole('link', { name: /جوّا سوريا مشاوير/ })).toHaveAttribute('href', '/inside')
  await expect(page.getByRole('link', { name: /جاي من برّا أول زيارة/ })).toHaveAttribute('href', '/outside')
  for (const name of ['دمشق', 'حلب', 'اللاذقية', 'بلودان']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
})

test('home in English', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Syria as it is today, up close.')
  await expect(page.getByRole('link', { name: /Coming from abroad/ })).toHaveAttribute('href', '/en/outside')
  await expect(page.getByText('Dated field reports from our correspondents (Arabic).')).toBeVisible()
})

test.describe.serial("today's detail", () => {
  test('a fresh site invents no detail', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'بانتظار أول تفصيلة' })).toBeVisible()
    await expect(page.getByText('لكلّ باب مقبض يحكي عن صاحبه')).toHaveCount(0) // prototype sample text never ships
  })

  test("an editor's detail for today shows up", async ({ page, request }) => {
    const auth = await login(request, accounts.admin)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus' }).format(new Date())
    const res = await request.post('/api/dailyDetail', {
      headers: auth,
      data: { date: `${today}T00:00:00.000Z`, sentence: 'شبّاك أزرق فوق باب خشب', place: 'القيمرية' },
    })
    expect(res.status()).toBe(201)
    await expect(async () => {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'شبّاك أزرق فوق باب خشب' })).toBeVisible({ timeout: 500 })
    }).toPass({ timeout: 5000 })
    await expect(page.getByText('تفصيلة اليوم · من القيمرية')).toBeVisible()
  })
})
