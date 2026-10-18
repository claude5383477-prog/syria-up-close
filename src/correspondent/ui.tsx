import type { ReactNode } from 'react'
import { BrandPlain } from '@/components/Mark'
import { logoutAction } from './actions'
import { messageFor } from './logic'

export function Shell({ children, signedIn = true }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <>
      <header className="c-top">
        <div className="c-wrap">
          {/* Plain links throughout the correspondent app: no client router or prefetching on weak phones. */}
          <BrandPlain href="/correspondent" size={28} />
          {signedIn && (
            <form action={logoutAction}>
              <button type="submit">خروج</button>
            </form>
          )}
        </div>
      </header>
      <main className="c-wrap c-main">{children}</main>
    </>
  )
}

/** Error from ?error=code (only known codes render). */
export function ErrorNote({ code }: { code?: string }) {
  const text = messageFor(code)
  return text ? (
    <p className="c-msg err" role="alert">
      {text}
    </p>
  ) : null
}

export function OkNote({ children }: { children: ReactNode }) {
  return (
    <p className="c-msg ok" role="status">
      {children}
    </p>
  )
}
