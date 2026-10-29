import { resendAdapter } from '@payloadcms/email-resend'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { emailChoice } from '@/lib/email'

/** Payload's e-mail adapter from the environment (lib/email); undefined = log to the console. */
export function emailAdapter() {
  const c = emailChoice()
  if (c.kind === 'resend') return resendAdapter({ apiKey: c.apiKey, defaultFromAddress: c.from, defaultFromName: c.fromName })
  if (c.kind === 'smtp')
    return nodemailerAdapter({
      defaultFromAddress: c.from,
      defaultFromName: c.fromName,
      transportOptions: { host: c.host, port: c.port, secure: c.secure, ...(c.user ? { auth: { user: c.user, pass: c.pass } } : {}) },
    })
  return undefined
}
