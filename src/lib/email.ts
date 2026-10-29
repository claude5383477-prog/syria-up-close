// Which e-mail adapter Payload uses (batch 4): Resend when RESEND_API_KEY is set, else SMTP when SMTP_HOST
// is set, else none. With none, Payload writes mail to the log and a booking is still saved (never lost
// because mail is not configured).

type Env = Record<string, string | undefined>

export type EmailChoice =
  | { kind: 'resend'; apiKey: string; from: string; fromName: string }
  | { kind: 'smtp'; host: string; port: number; secure: boolean; user?: string; pass?: string; from: string; fromName: string }
  | { kind: 'none' }

export const FROM_NAME = 'سوريا عن قرب'

export function emailChoice(env: Env = process.env): EmailChoice {
  const from = env.EMAIL_FROM?.trim() || 'bookings@upclosesyria.com'
  if (env.RESEND_API_KEY) return { kind: 'resend', apiKey: env.RESEND_API_KEY, from, fromName: FROM_NAME }
  if (env.SMTP_HOST) {
    const port = Number(env.SMTP_PORT) || 587
    return { kind: 'smtp', host: env.SMTP_HOST, port, secure: port === 465, user: env.SMTP_USER || undefined, pass: env.SMTP_PASS || undefined, from, fromName: FROM_NAME }
  }
  return { kind: 'none' }
}
