import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import sharp from 'sharp'

// Post-deployment check (playwright.prod.config.ts). Uses the seeded accounts from a git-ignored env
// file; never prints them. Everything it creates is deleted at the end, even when a step fails.

const env = parseEnv(readFileSync(process.env.PROD_ENV_FILE ?? '.env.production.local', 'utf8'))
const admin = { email: env.SEED_ADMIN_EMAIL ?? '', password: env.SEED_ADMIN_PASSWORD ?? '' }
const correspondent = { email: env.SEED_CORRESPONDENT_EMAIL ?? '', password: env.SEED_CORRESPONDENT_PASSWORD ?? '' }
// The seeded Damascus correspondent's public name (Users.displayName default), never the real name.
const CORRESPONDENT_NAME = 'مراسل سوريا عن قرب في دمشق'
const CORRESPONDENT_REAL_NAME = 'مراسل دمشق (تجريبي)' // src/seed/seed.ts
// Production stores images on Vercel Blob; a local run (disk storage) skips that one assertion.
const expectBlob = !/localhost|127\.0\.0\.1/.test(process.env.PROD_URL ?? 'https://syria-up-close.vercel.app')

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const ALT = `صورة اختبار آلي ${stamp} (تُحذف)`
const STATUS = `اختبار آلي ${stamp} (يُحذف)`
// Everything this run creates, so the clean-up can remove it and prove the files are gone.
const created: { mediaIds: number[]; fileUrls: string[]; statusId?: number } = { mediaIds: [], fileUrls: [] }
// SPEC §9 criterion 3: a correspondent's update is public within 5 seconds.
const PUBLISH_DEADLINE_MS = 5_000

test.describe.configure({ mode: 'serial' })

/** Payload REST token for the admin: the clean-up and the checks run through the API. */
async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/users/login', { data: admin })
  expect(res.status(), 'admin API login').toBe(200)
  return ((await res.json()) as { token: string }).token
}

async function api(request: APIRequestContext, path: string, init: { method?: 'GET' | 'DELETE' | 'POST' } = {}) {
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
  const id = Number(page.url().match(/media\/(\d+)/)![1])
  created.mediaIds.push(id)

  const doc = await expectFilesServed(request, id)
  expect(doc.alt).toBe(ALT)
})

type Size = { url?: string | null; filename?: string | null }
type MediaDoc = { alt?: string; url?: string; filename?: string; sizes?: Record<string, Size> }

const isBlobUrl = (url: string) => /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url)

/**
 * Headers for downloading a media file. Locally files go through Payload's access check, so the admin
 * token is needed for an unapproved photo. The public Blob CDN must get no Authorization header: it
 * answers `Authorization: JWT …` with 401 "Invalid Authorization header format" (verified 2026-10-19).
 */
async function fileHeaders(request: APIRequestContext, url: string): Promise<Record<string, string>> {
  return isBlobUrl(url) ? {} : { Authorization: `JWT ${await adminToken(request)}` }
}

/** The original and thumb/card/hero exist with distinct names, on Blob, and download as images. Records their URLs. */
async function expectFilesServed(request: APIRequestContext, id: number): Promise<MediaDoc> {
  const doc = (await api(request, `/api/media/${id}?depth=0`)).body as MediaDoc
  const files: [string, Size][] = [['original', { url: doc.url, filename: doc.filename }], ...Object.entries(doc.sizes ?? {})]
  expect(Object.keys(doc.sizes ?? {}).sort(), 'every size was generated').toEqual(['card', 'hero', 'thumb'])
  // The original must not carry a size's file name (the addRandomSuffix bug did exactly that).
  expect(new Set(files.map(([, f]) => f.filename)).size, 'distinct file per size').toBe(files.length)
  for (const [name, f] of files) {
    expect(f.url, `${name} URL`).toBeTruthy()
    if (expectBlob) expect(new URL(f.url!).hostname, `${name} host`).toMatch(/\.public\.blob\.vercel-storage\.com$/)
    created.fileUrls.push(f.url!)
    const res = await request.get(f.url!, { headers: await fileHeaders(request, f.url!) })
    expect(res.status(), `${name} is downloadable`).toBe(200)
    expect(res.headers()['content-type'], `${name} type`).toMatch(/^image\//)
  }
  return doc
}

test('2 · the Damascus correspondent updates electricity; /cities/damascus shows it within 5 seconds, with their public name and today’s date (3 rounds)', async ({ browser, page, request }) => {
  const c = await correspondentPage(browser)
  await expect(c).toHaveURL(/\/correspondent\/damascus$/)
  const today = new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Damascus' }).format(new Date())
  const timings: number[] = []

  for (const round of [1, 2, 3]) {
    const value = `${STATUS} · ${round}`
    await c.goto('/correspondent/damascus')
    const card = c.locator('#electricity')
    await card.getByLabel('الحالة الآن').fill(value)
    await card.getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(c.locator('#electricity [role=status]')).toHaveText('حُفظت ونُشرت.')
    // The clock starts when the correspondent is told it is published.
    const started = Date.now()
    created.statusId ??= (await damascusElectricity(request))[0]?.id
    await expect(async () => {
      await page.goto('/cities/damascus')
      await expect(page.locator('[data-status="electricity"]')).toContainText(value, { timeout: 500 })
    }).toPass({ timeout: PUBLISH_DEADLINE_MS, intervals: [250] })
    timings.push(Date.now() - started)
  }
  console.log(`criterion 3 on production: visible after ${timings.join(' / ')} ms (deadline ${PUBLISH_DEADLINE_MS} ms)`)
  for (const ms of timings) expect(ms, 'visible within 5 seconds').toBeLessThanOrEqual(PUBLISH_DEADLINE_MS)

  const row = page.locator('[data-status="electricity"]')
  await expect(row).toContainText(`تحقق منه: ${CORRESPONDENT_NAME}`)
  await expect(row).not.toContainText(CORRESPONDENT_REAL_NAME)
  await expect(row.locator('.stamp')).toContainText(today)
})

test('2b · the Damascus correspondent uploads a photo from /correspondent: random name, every size on Blob, hidden from visitors', async ({ browser, request }) => {
  const c = await correspondentPage(browser)
  // A phone-like photo (noise compresses poorly): the page shrinks it to WebP before upload.
  const jpeg = await sharp({ create: { width: 3000, height: 2250, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 40 } } })
    .jpeg({ quality: 90 })
    .toBuffer()
  const photoAlt = `${ALT} (مراسل)`
  const card = c.locator('#photo')
  await card.getByLabel('الصورة').setInputFiles({ name: `IMG_${stamp}.jpg`, mimeType: 'image/jpeg', buffer: jpeg })
  await expect(card.getByText(/جاهزة للرفع/)).toBeVisible({ timeout: 30_000 })
  await card.getByLabel('وصف اللقطة (إلزامي)').fill(photoAlt)
  await card.getByRole('button', { name: 'رفع', exact: true }).click()
  await expect(c.locator('#photo [role=status]')).toHaveText('رُفعت الصورة. يختار المحرر أين تُستخدم.', { timeout: 60_000 })

  const found = (await api(request, `/api/media?where[alt][equals]=${encodeURIComponent(photoAlt)}&depth=0&limit=1`)).body.docs as { id: number; filename: string; credit?: string }[]
  expect(found, 'the upload created a media document').toHaveLength(1)
  const photo = found[0]!
  created.mediaIds.push(photo.id)
  expect(photo.filename, 'stored under a random UUID, not the phone file name').toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/)
  expect(photo.credit).toBe(CORRESPONDENT_NAME)
  await expectFilesServed(request, photo.id)
  // Not approved yet: visitors cannot see the document.
  expect((await request.get(`/api/media/${photo.id}`)).status(), 'hidden from visitors until published').toBe(404)
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

/**
 * Deletes everything this run created (idempotent). Every step runs even if an earlier one fails;
 * failures are collected and reported together, so one problem never leaves the rest behind.
 */
async function cleanUp(request: APIRequestContext): Promise<string[]> {
  const problems: string[] = []
  const attempt = async (what: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (err) {
      problems.push(`${what}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  for (const id of created.mediaIds.splice(0)) {
    await attempt(`delete media ${id}`, async () => {
      const res = await api(request, `/api/media/${id}`, { method: 'DELETE' })
      if (![200, 404].includes(res.status)) throw new Error(`status ${res.status}`)
    })
  }
  await attempt('delete the test status item', async () => {
    for (const item of await damascusElectricity(request)) {
      if (item.id !== created.statusId) continue
      const res = await api(request, `/api/statusItems/${item.id}`, { method: 'DELETE' })
      if (res.status !== 200) throw new Error(`status ${res.status}`)
    }
    created.statusId = undefined
  })
  return problems
}

/** Removes Blob files no photo uses (older than 30 minutes); returns the store report. */
async function cleanOrphans(request: APIRequestContext) {
  const cleaned = await api(request, '/api/media/blob-orphans', { method: 'POST' })
  expect(cleaned.status, 'orphan clean-up').toBe(200)
  const after = (await api(request, '/api/media/blob-orphans')).body as { total: number; referenced: number; orphans: number }
  console.log(`blob store: removed ${String(cleaned.body.deleted)} orphan file(s); now ${after.total} file(s), ${after.referenced} in use`)
  return after
}

test.afterAll(async ({ request }) => {
  // Always, even when a test failed and the rest were skipped (serial mode): delete what this run
  // created, then clear orphan files so nothing from a failed run stays at a public URL.
  const problems = await cleanUp(request)
  if (expectBlob) {
    try {
      await cleanOrphans(request)
    } catch (err) {
      problems.push(`orphan clean-up: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (problems.length) throw new Error(`clean-up problems:\n${problems.join('\n')}`)
})

test('4 · clean-up: the photos and their files are gone (404), Damascus electricity is back to "awaiting first check"', async ({ page, request }) => {
  expect(await cleanUp(request), 'clean-up').toEqual([])
  expect(await damascusElectricity(request)).toHaveLength(0)
  // A deleted photo must not stay at a public URL: the original and every size answer 404.
  for (const url of created.fileUrls) {
    const headers = await fileHeaders(request, url)
    await expect
      .poll(
        async () => {
          const status = (await request.get(url, { headers })).status()
          // Blob answers exactly 404; Payload's local disk handler (local runs) refuses with an error instead.
          return expectBlob ? status : status >= 400 ? 404 : status
        },
        { message: `${url} after delete`, timeout: 120_000, intervals: [2_000, 5_000] },
      )
      .toBe(404)
  }
  await expect(async () => {
    await page.goto('/cities/damascus')
    const row = page.locator('[data-status="electricity"]')
    await expect(row.locator('.stamp')).toContainText('بانتظار أول تحقق', { timeout: 1000 })
    await expect(row).not.toContainText(STATUS, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
})

test('5 · the Blob store holds no file that no photo uses (orphans are cleaned up)', async ({ request }) => {
  // Local runs keep media on disk: there is no store to inspect.
  if (!expectBlob) return
  const after = await cleanOrphans(request)
  expect(after.orphans, 'no orphan files left').toBe(0)
  const media = (await api(request, '/api/media?limit=1&depth=0')).body.totalDocs as number
  if (media === 0) expect(after.total, 'no photos, so the store is empty').toBe(0)
})
