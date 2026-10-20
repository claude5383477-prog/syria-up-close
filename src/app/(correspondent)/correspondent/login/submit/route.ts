import config from '@payload-config'
import { login } from '@payloadcms/next/auth'
import { NextResponse, type NextRequest } from 'next/server'
import { payloadClient } from '@/data/queries'
import { errorCode, type ErrorCode } from '@/correspondent/logic'

/**
 * Correspondent sign-in (POST from /correspondent/login). A route of its own rather than a server
 * action: an action can be invoked through any page that renders it, which the WAF sign-in rate
 * limit (path-based, README) did not cover. Server actions checked the origin themselves; this
 * route does the same, so another site cannot sign a visitor in to an account it controls.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return new NextResponse('Forbidden', { status: 403 })

  const form = await request.formData()
  const email = String(form.get('email') ?? '').trim()
  let code: ErrorCode | null = null
  try {
    await login({ collection: 'users', config, email, password: String(form.get('password') ?? '') })
  } catch (err) {
    // A locked account gets the same answer as a wrong password: "locked" would tell anyone
    // that the address has an account (only existing accounts can be locked).
    code = errorCode(err)
    if (code === 'unknown') (await payloadClient()).logger.error({ err, action: 'login' }, 'correspondent action failed')
  }
  // Never echo the email into the URL (privacy); only the error code. 303: the browser follows with a GET.
  return NextResponse.redirect(new URL(code ? `/correspondent/login?error=${code}` : '/correspondent', request.nextUrl), 303)
}
