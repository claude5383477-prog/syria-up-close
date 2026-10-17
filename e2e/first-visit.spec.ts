import { expect, test } from '@playwright/test'
import { accounts, login } from './api'

const paragraph = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'rtl',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'rtl',
        textFormat: 0,
        children: [{ type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
      },
    ],
  },
})

test('/outside: the prototype sections, with "soon" items', async ({ page }) => {
  await page.goto('/outside')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('زيارتك الأولى، أو أول زيارة من سنين')
  await expect(page.getByRole('heading', { name: 'قبل السفر' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /خطط رحلات جاهزة/ })).toContainText('قريباً')
  await expect(page.getByRole('heading', { name: /اسأل ابن البلد/ })).toContainText('قريباً')
  await page.goto('/en/outside')
  await expect(page.getByRole('heading', { name: 'Before you go' })).toBeVisible()
})

test.describe.serial('first-visit guide', () => {
  let visaId = 0

  test('all five topics start as "awaiting first check", with no links', async ({ page }) => {
    await page.goto('/outside/first-visit')
    const items = page.locator('li[data-topic]')
    await expect(items).toHaveCount(5)
    await expect(items.locator('.stamp.pending')).toHaveCount(5)
    await expect(items.locator('a')).toHaveCount(0)
    expect((await page.goto('/outside/first-visit/visa'))?.status()).toBe(404)
  })

  test('publishing without an official source is refused', async ({ request }) => {
    const auth = login(accounts.admin)
    const res = await request.get('/api/firstVisitPages?where[topic][equals]=visa&draft=true&depth=0', { headers: auth })
    const body = await res.text()
    expect(res.ok(), body).toBe(true)
    const docs = (JSON.parse(body) as { docs: { id: number }[] }).docs
    expect(docs, body).toHaveLength(1)
    visaId = docs[0]!.id
    const publish = await request.patch(`/api/firstVisitPages/${visaId}`, { headers: auth, data: { _status: 'published' } })
    expect(publish.status()).toBe(400)
  })

  test('published with a source: dated, signed, linked to the source', async ({ page, request }) => {
    const auth = login(accounts.admin)
    const publish = await request.patch(`/api/firstVisitPages/${visaId}?locale=ar`, {
      headers: auth,
      data: { _status: 'published', officialSourceUrl: 'https://www.example.gov.sy/visa', body: paragraph('نص الصفحة بعد التحقق.') },
    })
    expect(publish.ok()).toBe(true)

    await expect(async () => {
      await page.goto('/outside/first-visit')
      await expect(page.locator('li[data-topic="visa"] a')).toBeVisible({ timeout: 500 })
    }).toPass({ timeout: 5000 })
    await expect(page.locator('li[data-topic="visa"] .stamp')).toContainText('آخر تحديث')
    await expect(page.locator('li[data-topic="money"] .stamp.pending')).toBeVisible()

    await page.locator('li[data-topic="visa"] a').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('التأشيرة والدخول')
    await expect(page.getByText('نص الصفحة بعد التحقق.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'www.example.gov.sy' })).toHaveAttribute('href', 'https://www.example.gov.sy/visa')
    await expect(page.getByText('تحقق منها: المدير')).toBeVisible()
  })

  test('English page without an English body shows the Arabic text marked as Arabic, and is noindex', async ({ page }) => {
    await page.goto('/en/outside/first-visit/visa')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visa & entry')
    await expect(page.locator('.prose[lang="ar"][dir="rtl"]')).toContainText('نص الصفحة بعد التحقق.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('the Arabic page is indexable', async ({ page }) => {
    await page.goto('/outside/first-visit/visa')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })
})
