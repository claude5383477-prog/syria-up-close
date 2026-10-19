import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import sharp from 'sharp'

// Post-deployment check (playwright.prod.config.ts). Uses the seeded accounts from a git-ignored env
// file; never prints them. Everything it creates is deleted at the end, even when a step fails.

const env = parseEnv(readFileSync(process.env.PROD_ENV_FILE ?? '.env.production.local', 'utf8'))
const admin = { email: env.SEED_ADMIN_EMAIL ?? '', password: env.SEED_ADMIN_PASSWORD ?? '' }
const correspondent = { email: env.SEED_CORRESPONDENT_EMAIL ?? '', password: env.SEED_CORRESPONDENT_PASSWORD ?? '' }
const CORRESPONDENT_NAME = 'مراسل دمشق (تجريبي)' // src/seed/seed.ts
// Production stores images on Vercel Blob; a local run (disk storage) skips that one assertion.
const expectBlob = !/localhost|127\.0\.0\.1/.test(process.env.PROD_URL ?? 'https://syria-up-close.vercel.app')

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const ALT = `صورة اختبار آلي ${stamp} (تُحذف)`
const STATUS = `اختبار آلي ${stamp} (يُحذف)`
const created: { mediaId?: number; statusId?: number } = {}

test.describe.configure({ mode: 'serial' })

/** Payload REST token for the admin: the clean-up and the checks run through the API. */
async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/users/login', { data: admin })
  expect(res.status(), 'admin API login').toBe(200)
  return ((await res.json()) as { token: string }).token
}

async function api(request: APIRequestContext, path: string, init: { method?: 'GET' | 'DELETE' } = {}) {
  const token = await adminToken(request)
  const res = await request.fetch(path, { method: init.method ?? 'GET', headers: { Authorization: `JWT ${token}` } })
  return { status: res.status(), body: (await res.json().catch(() => ({}))) as Record<string, unknown> }
}

async function damascusElectricity(request: APIRequestContext) {
  const city = (await api(request, '/api/cities?where[slug][equals]=damascus&limit=1&depth=0')).body.docs as { id: number }[]
  const items = (await api(request, `/api/statusItems?where[city][equals]=${city[0]!.id}&where[type][equals]=electricity&depth=0`)).body
  return items.docs as { id: number; value?: unknown }[]
}

async function correspondentPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true })).newPage()
  await page.goto('/correspondent/login')
  await page.getByLabel('البريد الإلكتروني').fill(correspondent.email)
  await page.getByLabel('كلمة السر').fill(correspondent.password)
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/login'))
  return page
}

test.beforeAll(async ({ request }) => {
  for (const [k, v] of Object.entries({ ...admin, cEmail: correspondent.email, cPassword: correspondent.password })) {
    if (!v) throw new Error(`missing ${k} in the env file`)
  }
  // Never touch real data: the status step creates the Damascus electricity item and later deletes it.
  const existing = await damascusElectricity(request)
  if (existing.length) throw new Error('Damascus already has an electricity item; this check would overwrite real data. Not running.')
})

test('1 · admin signs in to /admin, uploads a test image with a description; the original and every size are served from Vercel Blob', async ({ page, request }) => {
  await page.goto('/admin/login')
  await page.locator('input[name="email"]').fill(admin.email)
  await page.locator('input[name="password"]').fill(admin.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((u) => /\/admin\/?$/.test(u.pathname), { timeout: 30_000 })

  // Wider than the largest size (hero, 1600px), so Payload generates thumb, card and hero too.
  const png = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#0B4836' } }).png().toBuffer()
  await page.goto('/admin/collections/media/create')
  await page.locator('input[type="file"]').setInputFiles({ name: `test-${stamp}.png`, mimeType: 'image/png', buffer: png })
  await page.locator('input[name="alt"]').fill(ALT)
  await page.locator('#action-save').click()
  await page.waitForURL(/\/admin\/collections\/media\/\d+/, { timeout: 60_000 })
  created.mediaId = Number(page.url().match(/media\/(\d+)/)![1])

  type Size = { url?: string | null; filename?: string | null; width?: number | null }
  const doc = (await api(request, `/api/media/${created.mediaId}?depth=0`)).body as { alt?: string; url?: string; filename?: string; sizes?: Record<string, Size> }
  expect(doc.alt).toBe(ALT)
  const files: [string, Size][] = [['original', { url: doc.url, filename: doc.filename }], ...Object.entries(doc.sizes ?? {})]
  expect(Object.keys(doc.sizes ?? {}).sort(), 'every size was generated').toEqual(['card', 'hero', 'thumb'])
  // The original must not carry a size's file name (the addRandomSuffix bug did exactly that).
  expect(new Set(files.map(([, f]) => f.filename)).size, 'distinct file per size').toBe(files.length)
  for (const [name, f] of files) {
    expect(f.url, `${name} URL`).toBeTruthy()
    if (expectBlob) expect(new URL(f.url!).hostname, `${name} host`).toMatch(/\.public\.blob\.vercel-storage\.com$/)
    const res = await request.get(f.url!)
    expect(res.status(), `${name} is downloadable`).toBe(200)
    expect(res.headers()['content-type'], `${name} type`).toMatch(/^image\//)
  }
})

test('2 · the Damascus correspondent updates electricity; /cities/damascus shows it with their name and today’s date', async ({ browser, page, request }) => {
  const c = await correspondentPage(browser)
  await expect(c).toHaveURL(/\/correspondent\/damascus$/)
  const card = c.locator('#electricity')
  await card.getByLabel('الحالة الآن').fill(STATUS)
  await card.getByRole('button', { name: 'حفظ ونشر' }).click()
  await expect(c.locator('#electricity [role=status]')).toHaveText('حُفظت ونُشرت.')
  created.statusId = (await damascusElectricity(request))[0]?.id

  const today = new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Damascus' }).format(new Date())
  await expect(async () => {
    await page.goto('/cities/damascus')
    const row = page.locator('[data-status="electricity"]')
    await expect(row).toContainText(STATUS, { timeout: 1000 })
    await expect(row).toContainText(`تحقق منه: ${CORRESPONDENT_NAME}`, { timeout: 1000 })
    await expect(row.locator('.stamp')).toContainText(today, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
})

test('3 · the Damascus correspondent cannot edit Aleppo (page and tampered form)', async ({ browser, request }) => {
  const c = await correspondentPage(browser)
  await c.goto('/correspondent/aleppo')
  await expect(c).toHaveURL(/\/correspondent\?error=forbidden$/)

  const aleppo = ((await api(request, '/api/cities?where[slug][equals]=aleppo&limit=1&depth=0')).body.docs as { id: number }[])[0]!.id
  const count = async () => ((await api(request, `/api/statusItems?where[city][equals]=${aleppo}&depth=0`)).body.totalDocs as number)
  const before = await count()
  await c.goto('/correspondent/damascus')
  const card = c.locator('#weather')
  await card.locator('input[name="city"]').evaluate((el: HTMLInputElement) => (el.value = 'aleppo'))
  await card.getByLabel('الحالة الآن').fill('محاولة تلاعب (اختبار آلي)')
  await card.getByRole('button', { name: 'حفظ ونشر' }).click()
  await expect(c).toHaveURL(/\/correspondent\?error=forbidden$/)
  expect(await count(), 'no Aleppo item was written').toBe(before)
})

test.afterAll(async ({ request }) => {
  // 4 · clean-up: delete the test image (and its Blob files) and the test status item.
  if (created.mediaId) expect((await api(request, `/api/media/${created.mediaId}`, { method: 'DELETE' })).status).toBe(200)
  for (const item of await damascusElectricity(request)) {
    if (item.id === created.statusId) expect((await api(request, `/api/statusItems/${item.id}`, { method: 'DELETE' })).status).toBe(200)
  }
})

test('4 · after clean-up, Damascus electricity is back to "awaiting first check"', async ({ page, request }) => {
  // Runs last; the clean-up above has not run yet, so do it here too (idempotent) and then check the page.
  if (created.mediaId) {
    expect((await api(request, `/api/media/${created.mediaId}`, { method: 'DELETE' })).status).toBe(200)
    expect((await api(request, `/api/media/${created.mediaId}`)).status).toBe(404)
    created.mediaId = undefined
  }
  for (const item of await damascusElectricity(request)) {
    if (item.id === created.statusId) expect((await api(request, `/api/statusItems/${item.id}`, { method: 'DELETE' })).status).toBe(200)
  }
  created.statusId = undefined
  expect(await damascusElectricity(request)).toHaveLength(0)
  await expect(async () => {
    await page.goto('/cities/damascus')
    const row = page.locator('[data-status="electricity"]')
    await expect(row.locator('.stamp')).toContainText('بانتظار أول تحقق', { timeout: 1000 })
    await expect(row).not.toContainText(STATUS, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
})
