import Link from 'next/link'
import { Page } from '@/components/Header'
import { ButtonLink } from '@/components/ui'
import { text } from '@/components/content'
import { getMainCities, type CityDoc } from '@/data/queries'

// not-found receives no params, so it speaks both languages and links to both home pages and every
// city guide (SEO day 4). Next answers it with a real 404 status.
export default async function NotFound() {
  let cities: CityDoc[] = []
  try {
    cities = await getMainCities()
  } catch {
    // The page must render even when the database is unreachable: the home links are enough then.
  }
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
          {cities.length > 0 && (
            <>
              <h2>دليل المدن</h2>
              <ul className="pills related-links">
                {cities.map((c) => (
                  <li key={c.id}>
                    <Link className="pill" href={`/cities/${c.slug}`}>
                      {text(c.name, 'ar') ?? c.slug}
                    </Link>
                  </li>
                ))}
              </ul>
              <h2 lang="en" dir="ltr">
                City guides
              </h2>
              <ul className="pills related-links" lang="en" dir="ltr">
                {cities.map((c) => (
                  <li key={c.id}>
                    <Link className="pill" href={`/en/cities/${c.slug}`}>
                      {text(c.name, 'en') ?? text(c.name, 'ar') ?? c.slug}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </Page>
  )
}
