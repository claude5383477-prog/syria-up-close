/** Optional https URL (official sources, status sources). Returns true or an Arabic error message. */
export function httpsUrl(value: unknown, { required = false } = {}): true | string {
  if (value == null || value === '') return required ? 'رابط المصدر مطلوب' : true
  if (typeof value !== 'string') return 'رابط غير صالح'
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && Boolean(u.hostname.includes('.')) ? true : 'يجب أن يبدأ الرابط بـ https://'
  } catch {
    return 'رابط غير صالح'
  }
}

/** A stay's booking link: empty (not on Ahleen) or an https page on ahleenbooking.com. */
export function ahleenUrl(value: unknown): true | string {
  const base = httpsUrl(value)
  if (base !== true || value == null || value === '') return base
  const host = new URL(value as string).hostname
  return host === 'ahleenbooking.com' || host.endsWith('.ahleenbooking.com') ? true : 'رابط الحجز يجب أن يكون على ahleenbooking.com'
}
