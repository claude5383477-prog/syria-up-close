// Pure helpers for the correspondent app (/correspondent). No Payload or Next imports here.

export const MESSAGES = {
  auth: 'البريد أو كلمة السر غير صحيحة.',
  locked: 'الحساب مقفل مؤقتاً بعد محاولات دخول خاطئة. جرّب بعد ربع ساعة.',
  forbidden: 'ليس لديك صلاحية على هذه المدينة.',
  https: 'رابط المصدر يجب أن يبدأ بـ https://',
  invalid: 'تحقق من الحقول: النص مطلوب وبحد أقصى 280 حرفاً.',
  file: 'تعذّر رفع الصورة. استخدم صورة JPG أو PNG أو WebP.',
  too_large: 'الصورة كبيرة جداً بعد الضغط. جرّب صورة أصغر.',
  alt: 'اكتب وصفاً قصيراً للصورة قبل رفعها.',
  offline: 'لا يوجد اتصال. حُفظت مسودتك على هذا الجهاز، وأرسلها حين يعود الاتصال.',
  unknown: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
} as const

export type ErrorCode = keyof typeof MESSAGES

type ErrLike = { status?: number; data?: { errors?: { path?: string; message?: string }[] } } | null | undefined

/**
 * Payload errors → stable codes. Production builds minify class names, so this relies only on
 * the HTTP status and the error shape. A 401 is "wrong credentials"; whether the account is
 * locked is decided by the login action from the user's lockUntil.
 */
export function errorCode(err: unknown): ErrorCode {
  const e = err as ErrLike
  switch (e?.status) {
    case 401:
      return 'auth'
    case 403:
    case 404:
      return 'forbidden'
    case 400:
      if (Array.isArray(e.data?.errors)) return e.data.errors.some((x) => x.path === 'sourceUrl') ? 'https' : 'invalid'
      return 'file'
  }
  return 'unknown'
}
/** Message for a code taken from the URL; anything unrecognised shows nothing. */
export function messageFor(code: string | undefined): string | null {
  return code && Object.hasOwn(MESSAGES, code) ? MESSAGES[code as ErrorCode] : null
}

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024

export { storedPhotoName } from '@/lib/stored-name'
export const PHOTO_MAX_EDGE = 2000
/** Encoder qualities tried in order until the photo fits PHOTO_TARGET_BYTES (busy scenes need more). */
export const PHOTO_QUALITIES = [0.8, 0.7, 0.6, 0.5] as const
export const PHOTO_TARGET_BYTES = 600 * 1024

/** Target size for in-browser compression: longest edge ≤ max, never upscaled, aspect kept. */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** "1.2 م.ب" / "640 ك.ب" for the size hint under the photo field. */
export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} م.ب` : `${Math.max(1, Math.round(n / 1024))} ك.ب`
}
export const MAX_STATUS_CHARS = 280

/** Plain text from a phone textarea → Lexical rich text (one paragraph per non-empty line). */
export function textToLexical(text: string) {
  const paragraph = (t: string) => ({
    type: 'paragraph',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'rtl' as const,
    textFormat: 0,
    children: [{ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
  })
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return { root: { type: 'root', format: '' as const, indent: 0, version: 1, direction: 'rtl' as const, children: lines.map(paragraph) } }
}

/** A form field as a trimmed string ('' when missing or a File). */
export function field(form: FormData, name: string): string {
  const v = form.get(name)
  return typeof v === 'string' ? v.trim() : ''
}

type CityRef = { id: number; slug: string }
type Home = { kind: 'admin' } | { kind: 'city'; slug: string } | { kind: 'pick'; cities: CityRef[] } | { kind: 'none' }

/** Where a signed-in user lands. Expects assignedCities populated (depth ≥ 1). */
export function homeFor(user: { role?: string | null; assignedCities?: (number | CityRef)[] | null }): Home {
  if (user.role === 'admin' || user.role === 'editor') return { kind: 'admin' }
  const cities = (user.assignedCities ?? []).filter((c): c is CityRef => typeof c === 'object' && c !== null)
  if (cities.length === 0) return { kind: 'none' }
  if (cities.length === 1) return { kind: 'city', slug: cities[0]!.slug }
  return { kind: 'pick', cities }
}
