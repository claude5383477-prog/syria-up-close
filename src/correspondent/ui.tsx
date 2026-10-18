import type { ReactNode } from 'react'
import { Brand } from '@/components/Logo'
import { logoutAction } from './actions'
import { messageFor } from './logic'

export function Shell({ children, signedIn = true }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <>
      <header className="c-top">
        <div className="c-wrap">
          {/* No prefetch: phones on weak connections shouldn't download pages they didn't open. */}
          <Brand href="/correspondent" size={28} prefetch={false} />
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
