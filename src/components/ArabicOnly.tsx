import type { ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'

/** Wraps sections written only in Arabic; under /en it adds an English notice and marks the content as Arabic. */
export function ArabicOnly({ locale, children }: { locale: Locale; children: ReactNode }) {
  if (locale === 'ar') return <>{children}</>
  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <p className="note" style={{ maxWidth: 'none' }}>
          This section is for people inside Syria and is in Arabic only.
        </p>
      </div>
      <div lang="ar" dir="rtl">
        {children}
      </div>
    </>
  )
}
