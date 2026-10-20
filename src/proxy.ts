import { NextResponse, type NextRequest } from 'next/server'
import { resolveRoute } from '@/lib/routing'
import { mark } from '@/lib/timing'

export function proxy(request: NextRequest) {
  mark(`proxy ${request.method} ${request.nextUrl.pathname}`)
  const decision = resolveRoute(request.nextUrl.pathname)
  if (decision.type === 'next') return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = decision.to
  return decision.type === 'redirect' ? NextResponse.redirect(url, 308) : NextResponse.rewrite(url)
}

export const config = {
  // Skip the CMS, its API, the correspondent app, Next internals and any file with an extension.
  matcher: ['/((?!api|admin|correspondent|_next|.*\\..*).*)'],
}
