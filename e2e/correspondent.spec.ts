import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { accounts, cityId, login } from './api'
import { E2E } from './env'

// Dedicated accounts created by global-setup, so UI logins here never race the shared tokens.
const ONE_CITY = E2E.uiOneCity
const TWO_CITIES = E2E.uiTwoCities

test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true })
// One worker, in order: parallel logins of the same account race on Payload's session list.
test.describe.configure({ mode: 'serial' })

async function signIn(page: Page, who: { email: string; password: string }, { expectSuccess = true } = {}) {
  await page.goto('/correspondent/login')
  await page.getByLabel('البريد الإلكتروني').fill(who.email)
  await page.getByLabel('كلمة السر').fill(who.password)
  await page.getByRole('button', { name: 'دخول' }).click()
  // Wait for the session cookie: the action redirects away from /login only on success.
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.endsWith('/login'))
}

test.describe('T25 · sign-in and city', () => {
  test('visitors are sent to the login page', async ({ page }) => {
    await page.goto('/correspondent/damascus')
    await expect(page).toHaveURL(/\/correspondent\/login$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('a wrong password shows a clear Arabic message and never puts the email in the URL', async ({ page }) => {
    await signIn(page, { email: ONE_CITY.email, password: 'wrong-password' }, { expectSuccess: false })
    await expect(page.locator('main').getByRole('alert')).toHaveText('البريد أو كلمة السر غير صحيحة.')
    expect(page.url()).not.toContain('ui-damascus')
  })

  test('a one-city correspondent lands straight on their city; logout works', async ({ page }) => {
    await signIn(page, ONE_CITY)
    await expect(page).toHaveURL(/\/correspondent\/damascus$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('حال دمشق اليوم')
    await page.getByRole('button', { name: 'خروج' }).click()
    await expect(page).toHaveURL(/\/correspondent\/login$/)
    await page.goto('/correspondent/damascus')
    await expect(page).toHaveURL(/\/correspondent\/login$/)
  })

  test('a two-city correspondent picks from their own cities only', async ({ page }) => {
    await signIn(page, TWO_CITIES)
    await expect(page.getByRole('heading', { name: 'اختر المدينة' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'اللاذقية' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'بلودان' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'دمشق' })).toHaveCount(0)
  })

  test("opening another city's page is refused with a message", async ({ page }) => {
    await signIn(page, ONE_CITY)
    await page.goto('/correspondent/aleppo')
    await expect(page).toHaveURL(/\/correspondent\?error=forbidden$/)
    await expect(page.locator('main').getByRole('alert')).toHaveText('ليس لديك صلاحية على هذه المدينة.')
  })

  test('staff are sent to the full admin', async ({ page }) => {
    await signIn(page, accounts.admin)
    await expect(page).toHaveURL(/\/admin/)
  })
})

test.describe.serial('T26 · status on a phone (acceptance criteria 3 and 4)', () => {
  test('electricity update shows on the public Damascus page within 5 seconds, with name and today’s date', async ({ page }) => {
    await signIn(page, ONE_CITY)
    const card = page.locator('#electricity')
    await card.getByLabel('الحالة الآن').fill('٦ ساعات وصل باليوم')
    await card.getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(page.locator('#electricity [role=status]')).toHaveText('حُفظت ونُشرت.')

    const started = Date.now()
    await expect(async () => {
      await page.goto('/cities/damascus')
      await expect(page.locator('[data-status="electricity"]')).toContainText('٦ ساعات وصل باليوم', { timeout: 500 })
    }).toPass({ timeout: 5000 })
    expect(Date.now() - started).toBeLessThan(5000)

    const row = page.locator('[data-status="electricity"]')
    await expect(row).toContainText(`تحقق منه: ${ONE_CITY.name}`)
    const today = new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Damascus' }).format(new Date())
    await expect(row.locator('.stamp')).toContainText(today)
  })

  test('"no change, verified today" renews the date without touching the text', async ({ page }) => {
    await signIn(page, ONE_CITY)
    await page.locator('#electricity').getByRole('button', { name: 'لا تغيير، تم التحقق اليوم' }).click()
    await expect(page.locator('#electricity [role=status]')).toHaveText('جُدّد تاريخ التحقق.')
    await expect(page.locator('#electricity textarea')).toHaveValue('٦ ساعات وصل باليوم')
  })

  test('a non-https source is refused with a clear message', async ({ page }) => {
    await signIn(page, ONE_CITY)
    const card = page.locator('#roads')
    await card.getByLabel('الحالة الآن').fill('سالكة')
    await card.getByLabel('رابط المصدر (اختياري)').fill('http://example.com')
    await card.getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(page.locator('#roads [role=alert]')).toHaveText('رابط المصدر يجب أن يبدأ بـ https://')
  })

  test('tampering the form to post for Aleppo is refused by the server (criterion 4)', async ({ page, request }) => {
    await signIn(page, ONE_CITY)
    const card = page.locator('#weather')
    await card.locator('input[name="city"]').evaluate((el: HTMLInputElement) => (el.value = 'aleppo'))
    await card.getByLabel('الحالة الآن').fill('محاولة تلاعب')
    await card.getByRole('button', { name: 'حفظ ونشر' }).click()
    await expect(page).toHaveURL(/\/correspondent\?error=forbidden$/)
    const aleppo = await cityId(request, 'aleppo')
    const res = await request.get(`/api/statusItems?where[city][equals]=${aleppo}&where[type][equals]=weather`)
    expect(((await res.json()) as { totalDocs: number }).totalDocs).toBe(0)
  })
})

test.describe('T27 · photos', () => {
  test('a 12MP photo is compressed on the phone before upload (< 600KB, WebP)', async ({ page, request }) => {
    const big = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 40 } } })
      .blur(1)
      .jpeg({ quality: 95 })
      .toBuffer()
    expect(big.length).toBeGreaterThan(1_000_000)

    await signIn(page, ONE_CITY)
    const card = page.locator('#photo')
    await card.getByLabel('الصورة').setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: big })
    await expect(card.getByText(/جاهزة للرفع/)).toBeVisible({ timeout: 20_000 })
    await card.getByLabel('وصف اللقطة (إلزامي)').fill('باب خشب في القيمرية')
    await card.getByRole('button', { name: 'رفع', exact: true }).click()
    await expect(page.locator('#photo [role=status]')).toHaveText('رُفعت الصورة. يختار المحرر أين تُستخدم.')

    const res = await request.get('/api/media?sort=-createdAt&limit=1&depth=0', { headers: login(accounts.admin) })
    const doc = ((await res.json()) as { docs: { filesize: number; mimeType: string; alt: string; credit: string }[] }).docs[0]!
    expect(doc.filesize).toBeLessThan(600 * 1024)
    expect(doc.mimeType).toBe('image/webp')
    expect(doc.alt).toBe('باب خشب في القيمرية')
    expect(doc.credit).toBe(ONE_CITY.name)
  })

  test('a photo without a description is refused by the server too', async ({ page }) => {
    const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#0B4836' } }).jpeg().toBuffer()
    await signIn(page, ONE_CITY)
    const card = page.locator('#photo')
    await card.getByLabel('الصورة').setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: small })
    await card.getByLabel('وصف اللقطة (إلزامي)').evaluate((el: HTMLInputElement) => el.removeAttribute('required'))
    await card.getByRole('button', { name: 'رفع', exact: true }).click()
    await expect(page.locator('#photo [role=alert]')).toHaveText('اكتب وصفاً قصيراً للصورة قبل رفعها.')
  })
})

test('T28 · a season report goes to review as a draft, invisible to visitors', async ({ page, request }) => {
  await signIn(page, ONE_CITY)
  await page.getByRole('link', { name: 'إرسال تقرير موسم' }).click()
  await page.getByLabel('العنوان').fill('ياسمين على الحيطان')
  await page.getByLabel('التقرير').fill('أول زهر بالقيمرية.\nالريحة واصلة للشارع.')
  await page.getByRole('button', { name: 'إرسال للمراجعة' }).click()
  await expect(page).toHaveURL(/\/correspondent\/damascus\?saved=report/)
  await expect(page.locator('#report [role=status]')).toContainText('أُرسل التقرير للمراجعة')

  const res = await request.get('/api/seasonReports?where[title][equals]=ياسمين على الحيطان&draft=true&depth=0', { headers: login(accounts.admin) })
  const doc = ((await res.json()) as { docs: { _status: string; authorName: string }[] }).docs[0]!
  expect(doc).toMatchObject({ _status: 'draft', authorName: ONE_CITY.name })
  await page.goto('/seasons')
  await expect(page.getByText('ياسمين على الحيطان')).toHaveCount(0)
})

test('T29 · offline: the draft is kept on the phone and sent once back online', async ({ page, context }) => {
  await signIn(page, ONE_CITY)
  const card = page.locator('#events')
  // The page must be fully loaded before the network goes away.
  await expect(page).toHaveURL(/\/correspondent\/damascus$/)
  await expect(card.getByLabel('الحالة الآن')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await context.setOffline(true)
  await card.getByLabel('الحالة الآن').fill('حفلة بالقلعة يوم الجمعة')
  await card.getByRole('button', { name: 'حفظ ونشر' }).click()
  await expect(card.getByRole('alert')).toContainText('لا يوجد اتصال')
  await expect(page).toHaveURL(/\/correspondent\/damascus$/)

  await context.setOffline(false)
  await page.reload()
  await expect(card.getByLabel('الحالة الآن')).toHaveValue('حفلة بالقلعة يوم الجمعة')
  await expect(card.getByRole('status')).toContainText('عندك مسودة غير مرسلة')
  await card.getByRole('button', { name: 'أرسلها الآن' }).click()
  await expect(page.locator('#events [role=status]')).toHaveText('حُفظت ونُشرت.')
  await page.reload()
  await expect(page.locator('#events')).not.toContainText('عندك مسودة غير مرسلة')
})

test('T29 · the login page stays within the 150KB budget (compressed, fonts excluded)', async ({ page }) => {
  let bytes = 0
  page.on('response', async (res) => {
    const type = res.request().resourceType()
    if (type === 'font') return
    const sizes = await res.request().sizes().catch(() => null)
    if (sizes) bytes += sizes.responseBodySize + sizes.responseHeadersSize
  })
  await page.goto('/correspondent/login', { waitUntil: 'networkidle' })
  expect(bytes, `${Math.round(bytes / 1024)}KB`).toBeLessThanOrEqual(150 * 1024)
})
