import { Page } from '@/components/Header'
import { ButtonLink } from '@/components/ui'

// not-found receives no params, so it speaks both languages and links to both home pages.
export default function NotFound() {
  return (
    <Page locale="ar" path="/404">
      <section className="s">
        <div className="wrap stack">
          <h1>الصفحة غير موجودة</h1>
          <p lang="en" dir="ltr" style={{ color: 'var(--ink2)' }}>
            Page not found.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ButtonLink href="/">الرئيسية</ButtonLink>
            <ButtonLink href="/en" ghost>
              <span lang="en">Home (English)</span>
            </ButtonLink>
          </div>
        </div>
      </section>
    </Page>
  )
}
